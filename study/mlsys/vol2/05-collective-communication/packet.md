---
openingQuestion: "1,024 GPUs each hold a 1 GB gradient that must become one shared sum. A central server moves ~1 TB through its own port; a ring moves ~2 GB per GPU. Same operation, 512× different per-port load — what did the schedule buy?"
---

# Collective Communication: Study Packet

*Working through [Collective Communication](https://mlsysbook.ai/books/vol2/05_collective_communication/05_collective_communication.html), chapter 5 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The operation is a contract; the cost is the schedule.** AllReduce specifies a result: every rank ends holding the same reduced tensor. It says nothing about who sends what to whom, and that silence is where the entire cost lives. ==The parameter server concentrates N × M bytes on one port; the ring spreads ~2M per rank=={At 1,024 workers the star's byte time is ~N/2 ≈ 512× the ring's before contention. The bottleneck is concentration, not total traffic: every algorithm moves more aggregate bytes as N grows, but only some route those bytes through one endpoint.}. Every algorithm this chapter prices is a different answer to the same contract, and choosing between them is a matter of which term, startup rounds or bytes moved, dominates at your message size and topology.

> [!note] How to read this packet
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Contract

Six primitives standardize what each rank holds afterward, inherited from MPI:

| Primitive | What every rank holds after |
|---|---|
| AllReduce | the same reduced tensor (Σ) |
| AllGather | the concatenation of all shards |
| ReduceScatter | one reduced shard (Σ_i) |
| AllToAll | the transpose: rank j's chunk i goes to rank i |
| Broadcast | rank 0's data, on every rank |
| Reduce | the sum, on rank 0 only |

The contract fixes the result; ==the process group fixes who participates=={DP AllReduce runs over all replicas, TP over one node's GPUs, PP stage-boundary sends over two ranks. Classical MPI called this a communicator. GPU libraries inherited the same algorithm-selection problem and added contention between overlapping groups.}. The schedule is the algorithm that executes it, and schedules differ in two currencies: startup rounds (latency) and bytes per rank (bandwidth).

A 70B BF16 gradient is ==140 GB of payload per replica per step=={70B params × 2 bytes. As a communication-only baseline at 50 GB/s per NDR link, a ring's bandwidth budget is ~2 × 140 / 50 ≈ 5.6 s of transfer per step. Model partitioning shrinks each rank's share, and only the portion left exposed after overlap lands in the Fleet Law's step time.}. The per-rank volume is what surprises people: ==ring AllReduce keeps each GPU's send volume at ~2M however large the cluster grows=={2 × (N−1)/N × M approaches 2M asymptotically. The common misconception is that ring makes every GPU exchange with every other GPU; it does not. The scaling pressure comes from latency rounds and topology, not quadratic per-rank traffic.}.

::fig[primitive-contracts]

## The Physics of a Moved Byte

Communication has an energy ladder that makes the movement itself the meter: ==~0.5 pJ/bit inside SRAM, ~20 pJ/bit to HBM, ~100 pJ/bit on NVLink, ~1,000 pJ/bit on InfiniBand NDR=={Serialization, laser transceivers, optical fiber. A single ring AllReduce of the chapter's 1 GB buffer across 10,000 ranks at ~35 pJ/bit prices in the kilojoules: N × 2(N−1)/N × M bits × per-bit cost. The check's guard bounds it between 3 and 10 kJ, the energy of bringing a kettle toward boil, for one collective.}.

Within the fabric, the α-β model from chapter 3 prices each *step's chunk*, not the tensor: ==a 1 GB bucket on a 1,024-rank ring travels in ~1 MB chunks that may sit below the latency-bound regime=={NDR n* = α·β ≈ 75 KB; NVLink's crossover is above 500 KB, inter-node fabrics below ~100 KB. A 64-rank ring's ~16 MB chunks stay bandwidth-bound on NDR; a 1,024-rank ring's ~1 MB chunks still clear n*, but shrink the margin. The regime belongs to the per-round message size, not the buffer.}. Message fusion is the direct lever: ==100 separate small messages cost ~100α=={Routing metadata per message is far below n*, so each pays nearly pure startup. Fusing them into one buffer above n* trades 100 startups for one plus a bandwidth term, which is why bucket fusion exists in DDP and why gradient buckets are sized to cross n*.}.

## Pricing the Schedule

The endpoint lower bound: reducing N contributions and returning the result to N ranks needs at least 2(N−1) item transfers, so the minimum per-rank sent volume is 2(N−1)M/N.

::eq[bandwidth-lower-bound]

$$
T_{bw} = \frac{2(N-1)}{N} \cdot \frac{M}{\beta}
$$

Ring AllReduce reaches that bound: scatter-reduce then all-gather, 2(N−1) rounds of M/N chunks.

::eq[ring-allreduce]

$$
T_{ring} = 2(N-1)\,\alpha + \frac{2(N-1)}{N}\cdot\frac{M}{\beta}
$$

::fig[ring-trace]

The alternative schedules trade the two terms differently:

| Schedule | latency term | byte term | optimal? |
|---|---|---|---|
| Ring | O(N)α | 2(N−1)/N · M/β | yes |
| Simple tree | O(log N)α | O(log N) · M/β | no: full-msg hops |
| Butterfly | O(log N)α | 2(N−1)/N · M/β | yes; needs N = 2^k |
| Double binary tree | O(log N)α | ≈ 2M/β | near; paired trees |

::chart[schedule-cost-split]

The crossover falls where ring's extra startup (~O(N)α) equals tree's extra byte time (~O(log N) · M/β): ==M* ≈ N·α·β / log₂N=={At 256 GPUs on a 200 Gbps fabric with α = 1 μs, the modeled crossover sits near 1 MB: below it the tree's fewer rounds win, above it the ring's smaller byte volume wins. In the worked comparison, ring pays ~1,260 μs of latency against tree's ~120 μs, while tree pays ~1,200 μs of byte time against ring's ~200 μs.}.

::eq[algorithm-crossover]

$$
M^{*} \approx \frac{N\,\alpha\,\beta}{\log_2 N}
$$

::fig[crossover-map]

So the default question is never "ring or tree" but "which side of the crossover is this collective?" ==Small control collectives are latency-bound even when the bucket is large=={A fallacy the chapter names directly: bandwidth is not the only metric. A message that spends 5 μs in a software path gains nothing from 400G. The regime belongs to each schedule step's chunk, and a large buffer can still travel in latency-bound steps on a large ring.}.

## Topology-Aware Schedules

A flat ring across nodes runs at the rate of its slowest edge: ==one cross-node NDR port at 50 GB/s, not the 450 GB/s per direction NVLink provides inside the node=={The 9× cliff from chapter 3 returns as a schedule constraint. Hierarchical AllReduce exploits it: intra-node reduce over NVLink, one inter-node ring per shard group across independent ports, intra-node broadcast. The inter-node payload per port falls 8×.}. The worked example: 128 nodes × 8 GPUs, a ==350 GB gradient for a 175B model in BF16=={Modeling puts the hierarchical gain at ~4-5× over the flat bound, with the inter-node phase itself costing ~4.4 ms. The gain depends on genuinely independent port capacity; a multichannel flat schedule using the same ports needs its own accounting.}.

::eq[hierarchical-allreduce]

$$
T_{hier} = T_{intra} + T_{inter} + T_{bcast}
$$

Topology-aware variants go further: ==dimension-ordered reduction on a torus=={On a 4×4 grid, reducing along each dimension in turn takes 12 rounds against a flat ring's 30; on TPU pods' 3D tori, each dimension's ring runs on independent links.}, rail-optimized routing ==which keeps same-indexed GPUs on one fabric rail so an 8-way AllReduce stays off the spine=={3 hops → 1 hop from chapter 3's fabric accounting; a rail crossing the spine triples the hop count.}, and ==SHARP, which moves reduction arithmetic into the switch silicon=={Scalable Hierarchical Aggregation and Reduction Protocol: intermediate sums computed in the network, not at endpoints. It changes both the byte floor and who performs the arithmetic, on supported paths only.}.

## AllToAll and the MoE Exchange

Expert parallelism doesn't reduce, it routes: ==each token's embedding must reach whichever GPU hosts its assigned expert=={512 tokens per GPU × 4.096 KB per token × 8 experts per GPU, in the book's worked MoE cell: each rank sends 8 distinct 262.144 KB transfers at ~6.5 μs each, and the injection-bound lower bound is ~38.2 μs if every port runs in parallel.}. The hazard is imbalance: ==uniform routing sends 448 remote tokens per GPU while a hot expert pulls 672=={A 1.5× imbalance on one link stretches the step's tail while other links idle. AllToAll performance is governed by injection bandwidth, bisection cuts, skew, and message granularity, none of which the logical primitive names.}.

## Trading Bits for Schedule

When the link cannot be widened, shrink the payload. Each lever trades convergence control for bytes:

| Method | Ratio vs FP32 | vs BF16 | The catch |
|---|---|---|---|
| INT8 + block scales | ~3.88× | ~2× | scale metadata per block |
| 1-bit + error feedback | ≤32× | ≤16× | sign only; needs residual + optimizer care |
| Top-k 1% + error FB | ≤50× | ≤25× | index overhead: ratio = d/(2k), not d/k |
| 1-bit Adam | ~5× end-to-end | — | warmup runs uncompressed |

::chart[compression-effective]

==Top-k at 0.1% retention advertises 1,000× and delivers ~500×=={Values plus INT32 indices cost 8 bytes per kept element, so effective compression is d/(2k). Aggregation costs more: workers keep different coordinates, and the union of selections exceeds any single worker's k. Local compression ratios do not directly set collective traffic.}. And ==naive Top-k converges nowhere=={The rounding trace: five sub-threshold gradients transmit 0 without feedback; with a residual accumulator the same sequence transmits 2, holds −0.4 in residual, and conserves the true 1.6. The residual e_{t+1} = (g_t + e_t) − v_t is what turns a biased compressor into a convergent method.}.

==1-bit Adam compresses momentum, not gradients=={Adam's variance estimate stabilizes early; the method runs full-precision Adam through warmup, freezes the variance as a fixed preconditioner, then ships sign-only momentum with a scale factor plus per-worker residual. Up to 5× end-to-end communication-volume reduction across 256 GPUs, with reported throughput gains of 3.3× on BERT-Large and 2.9× on SQuAD.}.

The payback condition is the whole decision: ==a compressed slow network went 50,000 → 38,500 total steps; the same compression on a fast network went to 33,825 and lost=={The overhead only pays when saved communication time exceeds the compression cost plus any convergence slowdown. A 100× communication speedup that doubles iteration count loses. Evaluate on time-to-target-quality, never on a synthetic AllReduce microbenchmark.}.

## Hiding the Exchange

Whatever communication remains, the question is whether independent computation can run beneath it. LogP splits the transfer: ==network latency L is overlappable; processor overhead o is not=={In the worked toy: L = 100 μs of transit hides entirely under a 500 μs compute window, but 2o = 100 μs of initiation/completion stays exposed on the execution resource. Effective time: 2o + max(compute, L) = 600 μs.}. DDP exploits this with gradient hooks and bucket fusion: ==each layer's AllReduce launches the moment its backward finishes=={Nine 100 MB buckets against 875 MB per layer in the book's 7B example; only the last bucket's transfer is exposed because it has no later compute to hide behind. One late gradient can stall a whole bucket: registration order and observed-ready ordering set the launch timing.}.

::fig[overlap-lanes]

::eq[logp-overlap]

$$
T_{eff} = 2o + \max(T_{compute}, L)
$$

==async_op=True returns control, not hidden latency=={The CPU continues, but hiding requires: enough independent work to cover the transfer interval, a runtime that actually progresses the transfer, and consumers that do not wait early. The LogP split says the processor-overhead portion can never be hidden regardless of the flag.}.

## Calibration Before Diagnosis

`nccl-tests` on a healthy fabric reports ==roughly half the link's specified bandwidth for ring AllReduce=={Not a failure: the naive α + M/β omits the collective's ~2 traffic factor. Bus bandwidth multiplies tensor-size-over-time by the ring factor, a normalization that matches only the schedule that ran. A tree, hierarchical, or switch-assisted collective carries a different factor.}. So a calibrated model fits effective α and β ==to measurements from the same collective, process group, algorithm, protocol, and topology=={Parameters apply only to the measured regime; change any term and recalibrate. Diagnosis compares the workload against a matched bare-collective baseline: a healthy baseline with a slow step points at granularity, contention, stragglers, or overlap, not the fabric.}.

## Fallacies and Pitfalls

The chapter's own audit, the ones the numbers above refute directly:

- ==Bandwidth is the only metric that matters=={Small-message collectives are latency-bound; the regime belongs to each step's chunk.},
- ==AllReduce works for everything=={MoE and DLRM routing is destination-specific; that is AllToAll, priced by injection and skew, not ring factors.},
- ==Pipeline parallelism eliminates communication overhead=={Stage-boundary sends sit on the critical path and the fill/drain bubble adds its own idle time.},
- ==Ring AllReduce by default=={Ring pays O(N) latency; below the crossover the tree's log rounds win.},
- ==Compression is safe without error feedback=={Uncorrected Top-k discards 99% of updates with bias that can break convergence.},
- ==Async collectives always hide latency=={The flag yields the CPU; only network transit is overlappable, overhead o is not.},
- ==Flat ring is good enough multi-node=={It runs at the slowest edge, one NDR port, while hierarchical phases exploit 9× faster NVLink inside each node.},
- ==One cost formula fits intra-node=={NVSwitch connectivity is not a one-step reduction; endpoints still run a scheduled algorithm unless the path does in-network reduction.},
- ==Network corruption always surfaces as an error=={Silent bit corruption passes under the framework; checksums, collective checks, and gradient-norm tests are the only net.},

## The physics

| Quantity | Value | Where it binds |
|---|---|---|
| 70B BF16 gradient | 140 GB/replica/step | payload before partitioning |
| Ring bandwidth floor | ~2 × 140 / 50 ≈ 5.6 s on NDR | communication-only baseline |
| Star vs ring per-port bytes | ~N/2 ≈ 512× at 1,024 | concentration bottleneck |
| Per-rank send volume | ~2M asymptotically | ring's scale invariance |
| Energy ladder | 0.5→1,000 pJ per bit | SRAM, HBM, NVLink, NDR |
| One 1 GB ring, 10k ranks | 3-10 kJ | energy of one collective |
| Ring rounds | 2(N−1) | latency term's origin |
| Chunk regime | 64-rank > n*; 1,024-rank near it | bucket sizing matters |
| Message fusion | 100α → 1α + byte term | why buckets exist |
| NVLink vs fabric n* | >500 KB vs <100 KB | intra- vs inter-node |
| Ring vs tree crossover | ~1 MB @ 256 GPU, 1 μs | algorithm selection |
| Worked terms | ring 1,260α+200 vs tree 120α+1,200 (μs) | which term dominates |
| Hierarchical | 128×8 GPU, 350 GB, ~4-5× flat | three-phase schedule |
| Torus rounds | 12 vs flat 30 on 4×4 | dimension-ordered |
| MoE AllToAll | 512 tok × 4 KB, 6.5 μs each | injection floor ~38 μs |
| Expert imbalance | 448 uniform vs 672 hot | tail-latency multiplier |
| INT8 + block-128 | ~3.88× | scale-factor overhead |
| Top-k 0.1% | ~500× effective, not 1,000× | index overhead d/(2k) |
| 1-bit Adam | ~5× e2e; 3.3× BERT | optimizer-aware |
| Compression payback | 50,000→38,500 slow; 33,825 fast | payback condition |
| LogP toy | L=100 μs hidden, 2o=100 μs exposed | effective 600 μs |
| DDP buckets | 875 MB/layer, ~100 MB buckets | last bucket exposed |
| Bus bandwidth | ~half of link spec on ring | traffic factor ≈ 2, not loss |

## Glossary

- **AllReduce**: every rank ends holding the same reduced tensor; the gradient-sync contract.
- **AllGather**: every rank ends with the concatenation of all shards; FSDP parameter pull.
- **AllToAll**: the transpose; rank i sends chunk j to rank j; MoE token routing.
- **α-β model**: per-transfer cost α + n/β; prices each schedule step's chunk.
- **Bandwidth optimality**: matching the 2(N−1)M/N per-rank byte floor; ring and butterfly attain it.
- **Bus bandwidth**: tensor size ÷ measured time × schedule's traffic factor; normalizes what the algorithm moved.
- **Bucket fusion**: merging ready gradients into ~100 MB buffers to amortize α and cross n*.
- **Butterfly (recursive halving-doubling)**: log rounds + optimal bytes, at power-of-two sizes.
- **Crossover M***: payload size where ring's startup cost equals tree's byte excess, ≈ Nαβ/log₂N.
- **Error feedback**: residual accumulator e_{t+1} = (g_t + e_t) − v_t; recovers biased compression.
- **Hierarchical AllReduce**: intra-node reduce + inter-node ring per shard + intra-node broadcast.
- **LogP model**: L (network, hidable) vs o (processor overhead, exposed) vs gap vs N.
- **Process group**: the rank subset a collective runs on; MPI's communicator.
- **Rail-optimized routing**: same-index GPUs share a fabric rail, keeping collectives off the spine.
- **SHARP**: in-switch aggregation; moves reduction arithmetic into the fabric.
- **Top-k**: keep the k largest-magnitude coordinates; biased without error feedback.

## → Ben's world

- **Doc-analyser fan-out**: AllToAll's skew is the same shape as per-document fan-out where one hot record stretches the batch tail; aggregate rate hides it.
- **Cuttlefish**: hierarchical vs flat is the map vs two-phase question again: keep the slow hop few and the fast hops parallel.
- **Knowledge console**: bus bandwidth's normalization is the same trap as reading a benchmark without its traffic factor; ask what the number multiplies.
- **Greenveil**: error feedback is exactly the queueing lesson: dropped sub-threshold work is bias, conserved residual work is convergence.

## Open questions

- The crossover formula M* ≈ Nαβ/log₂N assumes the endpoint model; how does it move once SHARP shifts reduction off endpoints entirely?
- At 1,024 ranks the ~1 MB ring chunks still clear NDR n*; at what N do ring chunks fall latency-bound and force a different schedule?
- Error feedback conserves the total but not the timing: gradients arriving late still arrive biased in order. Does that ordering bias matter in practice at 1% retention?
- AllToAll's tail is set by the hottest expert's link. Can capacity-aware routing fix the tail without breaking the model's assignment logic?
