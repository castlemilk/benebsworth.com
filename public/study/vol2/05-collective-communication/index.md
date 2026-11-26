---
title: "Collective Communication — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html"
canonical_url: "https://benebsworth.com/study/vol2/05-collective-communication/"
---

# Collective Communication: Study Packet

1,024 GPUs each hold a 1 GB gradient that must become one shared sum. A central server moves ~1 TB through its own port; a ring moves ~2 GB per GPU. Same operation, 512× different per-port load — what did the schedule buy?

*Working through [Collective Communication](https://mlsysbook.ai/books/vol2/05_collective_communication/05_collective_communication.html), chapter 5 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The operation is a contract; the cost is the schedule.** AllReduce specifies a result: every rank ends holding the same reduced tensor. It says nothing about who sends what to whom, and that silence is where the entire cost lives. **The parameter server concentrates N × M bytes on one port; the ring spreads ~2M per rank** *(why it matters: At 1,024 workers the star's byte time is ~N/2 ≈ 512× the ring's before contention. The bottleneck is concentration, not total traffic: every algorithm moves more aggregate bytes as N grows, but only some route those bytes through one endpoint.)*. Every algorithm this chapter prices is a different answer to the same contract, and choosing between them is a matter of which term, startup rounds or bytes moved, dominates at your message size and topology.

> **note: How to read this packet**
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

The contract fixes the result; **the process group fixes who participates** *(why it matters: DP AllReduce runs over all replicas, TP over one node's GPUs, PP stage-boundary sends over two ranks. Classical MPI called this a communicator. GPU libraries inherited the same algorithm-selection problem and added contention between overlapping groups.)*. The schedule is the algorithm that executes it, and schedules differ in two currencies: startup rounds (latency) and bytes per rank (bandwidth).

A 70B BF16 gradient is **140 GB of payload per replica per step** *(why it matters: 70B params × 2 bytes. As a communication-only baseline at 50 GB/s per NDR link, a ring's bandwidth budget is ~2 × 140 / 50 ≈ 5.6 s of transfer per step. Model partitioning shrinks each rank's share, and only the portion left exposed after overlap lands in the Fleet Law's step time.)*. The per-rank volume is what surprises people: **ring AllReduce keeps each GPU's send volume at ~2M however large the cluster grows** *(why it matters: 2 × (N−1)/N × M approaches 2M asymptotically. The common misconception is that ring makes every GPU exchange with every other GPU; it does not. The scaling pressure comes from latency rounds and topology, not quadratic per-rank traffic.)*.

![Four contracts, one degree of freedom](https://benebsworth.com/study/vol2/05-collective-communication/diagrams/primitive-contracts.svg)

*The four collective primitives as input-to-output contracts over ranks 0-3. AllReduce leaves the same sum on every rank, AllGather leaves the concatenation of all shards, ReduceScatter leaves each rank one reduced shard, and AllToAll transposes chunks. The contract fixes the result; the schedule underneath is where the cost lives.*
## The Physics of a Moved Byte

Communication has an energy ladder that makes the movement itself the meter: **~0.5 pJ/bit inside SRAM, ~20 pJ/bit to HBM, ~100 pJ/bit on NVLink, ~1,000 pJ/bit on InfiniBand NDR** *(why it matters: Serialization, laser transceivers, optical fiber. A single ring AllReduce of the chapter's 1 GB buffer across 10,000 ranks at ~35 pJ/bit prices in the kilojoules: N × 2(N−1)/N × M bits × per-bit cost. The check's guard bounds it between 3 and 10 kJ, the energy of bringing a kettle toward boil, for one collective.)*.

Within the fabric, the α-β model from chapter 3 prices each *step's chunk*, not the tensor: **a 1 GB bucket on a 1,024-rank ring travels in ~1 MB chunks that may sit below the latency-bound regime** *(why it matters: NDR n* = α·β ≈ 75 KB; NVLink's crossover is above 500 KB, inter-node fabrics below ~100 KB. A 64-rank ring's ~16 MB chunks stay bandwidth-bound on NDR; a 1,024-rank ring's ~1 MB chunks still clear n*, but shrink the margin. The regime belongs to the per-round message size, not the buffer.)*. Message fusion is the direct lever: **100 separate small messages cost ~100α** *(why it matters: Routing metadata per message is far below n*, so each pays nearly pure startup. Fusing them into one buffer above n* trades 100 startups for one plus a bandwidth term, which is why bucket fusion exists in DDP and why gradient buckets are sized to cross n*.)*.

## Pricing the Schedule

The endpoint lower bound: reducing N contributions and returning the result to N ranks needs at least 2(N−1) item transfers, so the minimum per-rank sent volume is 2(N−1)M/N.

**Eq 5.1 · The per-rank byte floor**
$$
T_{bw} = \frac{2(N-1)}{N} \cdot \frac{M}{\beta}
$$

Ring AllReduce reaches that bound: scatter-reduce then all-gather, 2(N−1) rounds of M/N chunks.

**Eq 5.2 · Ring AllReduce cost**
$$
T_{ring} = 2(N-1)\,\alpha + \frac{2(N-1)}{N}\cdot\frac{M}{\beta}
$$

![Six steps to one sum](https://benebsworth.com/study/vol2/05-collective-communication/diagrams/ring-trace.svg)

*A four-rank Ring AllReduce trace: three scatter-reduce steps leave each rank owning one fully-reduced chunk, three all-gather steps circulate the completed chunks. Per-rank send volume stays ~2M however large N grows; the price is 2(N-1) startup rounds.*
The alternative schedules trade the two terms differently:

| Schedule | latency term | byte term | optimal? |
|---|---|---|---|
| Ring | O(N)α | 2(N−1)/N · M/β | yes |
| Simple tree | O(log N)α | O(log N) · M/β | no: full-msg hops |
| Butterfly | O(log N)α | 2(N−1)/N · M/β | yes; needs N = 2^k |
| Double binary tree | O(log N)α | ≈ 2M/β | near; paired trees |


**Where the time goes, by schedule**

| schedule (64 GPUs, 1 GB buffer, 50 GB/s NDR) | startup term 2(N-1)·alpha / log-depth | byte-transfer term |
|---|---|---|
| Ring | 0.2 | 39.4 |
| Simple tree | 0.12 | 240 |
| Hierarchical (inter phase) | 0.05 | 4.4 |

*Startup versus byte-transfer terms on the chapter's reference collective. The ring spends nearly nothing on latency at this size but the term is O(N) — at 1,024 ranks it dominates. The simple tree inverts the profile: few rounds, full-message hops. Hierarchical pays a middle path by keeping the slow hop parallel.*

The crossover falls where ring's extra startup (~O(N)α) equals tree's extra byte time (~O(log N) · M/β): **M* ≈ N·α·β / log₂N** *(why it matters: At 256 GPUs on a 200 Gbps fabric with α = 1 μs, the modeled crossover sits near 1 MB: below it the tree's fewer rounds win, above it the ring's smaller byte volume wins. In the worked comparison, ring pays ~1,260 μs of latency against tree's ~120 μs, while tree pays ~1,200 μs of byte time against ring's ~200 μs.)*.

**Eq 5.3 · The ring-tree crossover**
$$
M^{*} \approx \frac{N\,\alpha\,\beta}{\log_2 N}
$$

![Tree below, ring above](https://benebsworth.com/study/vol2/05-collective-communication/diagrams/crossover-map.svg)

*Modeled AllReduce time against message size on log axes for a 256-GPU group at 200 Gbps with 1 us startup. The simple tree's fewer rounds win below the ~1 MB crossover; the ring's smaller byte term wins above it. M* ~ N alpha beta / log2 N moves the boundary with the group size and the fabric.*
So the default question is never "ring or tree" but "which side of the crossover is this collective?" **Small control collectives are latency-bound even when the bucket is large** *(why it matters: A fallacy the chapter names directly: bandwidth is not the only metric. A message that spends 5 μs in a software path gains nothing from 400G. The regime belongs to each schedule step's chunk, and a large buffer can still travel in latency-bound steps on a large ring.)*.

## Topology-Aware Schedules

A flat ring across nodes runs at the rate of its slowest edge: **one cross-node NDR port at 50 GB/s, not the 450 GB/s per direction NVLink provides inside the node** *(why it matters: The 9× cliff from chapter 3 returns as a schedule constraint. Hierarchical AllReduce exploits it: intra-node reduce over NVLink, one inter-node ring per shard group across independent ports, intra-node broadcast. The inter-node payload per port falls 8×.)*. The worked example: 128 nodes × 8 GPUs, a **350 GB gradient for a 175B model in BF16** *(why it matters: Modeling puts the hierarchical gain at ~4-5× over the flat bound, with the inter-node phase itself costing ~4.4 ms. The gain depends on genuinely independent port capacity; a multichannel flat schedule using the same ports needs its own accounting.)*.

**Eq 5.4 · Three-phase hierarchical cost**
$$
T_{hier} = T_{intra} + T_{inter} + T_{bcast}
$$

Topology-aware variants go further: **dimension-ordered reduction on a torus** *(why it matters: On a 4×4 grid, reducing along each dimension in turn takes 12 rounds against a flat ring's 30; on TPU pods' 3D tori, each dimension's ring runs on independent links.)*, rail-optimized routing **which keeps same-indexed GPUs on one fabric rail so an 8-way AllReduce stays off the spine** *(why it matters: 3 hops → 1 hop from chapter 3's fabric accounting; a rail crossing the spine triples the hop count.)*, and **SHARP, which moves reduction arithmetic into the switch silicon** *(why it matters: Scalable Hierarchical Aggregation and Reduction Protocol: intermediate sums computed in the network, not at endpoints. It changes both the byte floor and who performs the arithmetic, on supported paths only.)*.

## AllToAll and the MoE Exchange

Expert parallelism doesn't reduce, it routes: **each token's embedding must reach whichever GPU hosts its assigned expert** *(why it matters: 512 tokens per GPU × 4.096 KB per token × 8 experts per GPU, in the book's worked MoE cell: each rank sends 8 distinct 262.144 KB transfers at ~6.5 μs each, and the injection-bound lower bound is ~38.2 μs if every port runs in parallel.)*. The hazard is imbalance: **uniform routing sends 448 remote tokens per GPU while a hot expert pulls 672** *(why it matters: A 1.5× imbalance on one link stretches the step's tail while other links idle. AllToAll performance is governed by injection bandwidth, bisection cuts, skew, and message granularity, none of which the logical primitive names.)*.

## Trading Bits for Schedule

When the link cannot be widened, shrink the payload. Each lever trades convergence control for bytes:

| Method | Ratio vs FP32 | vs BF16 | The catch |
|---|---|---|---|
| INT8 + block scales | ~3.88× | ~2× | scale metadata per block |
| 1-bit + error feedback | ≤32× | ≤16× | sign only; needs residual + optimizer care |
| Top-k 1% + error FB | ≤50× | ≤25× | index overhead: ratio = d/(2k), not d/k |
| 1-bit Adam | ~5× end-to-end | — | warmup runs uncompressed |


**Advertised versus effective compression**

| method (ratios quoted against FP32) | effective reduction (×) |
|---|---|
| INT8 + block-128 | 3.88 |
| 1-bit + error FB | 32 |
| Top-k 1% + error FB | 50 |
| Top-k 0.1% | 500 |
| 1-bit Adam (e2e) | 5 |

*Headline ratios discounted by what actually ships. Top-k 0.1% advertises 1,000× and delivers ~500× once index bytes count; INT8 with block-128 scales reaches 3.88× of its 4× ceiling; 1-bit Adam's end-to-end gain is ~5× because warmup runs uncompressed. Against a BF16 baseline every ratio halves.*

**Top-k at 0.1% retention advertises 1,000× and delivers ~500×** *(why it matters: Values plus INT32 indices cost 8 bytes per kept element, so effective compression is d/(2k). Aggregation costs more: workers keep different coordinates, and the union of selections exceeds any single worker's k. Local compression ratios do not directly set collective traffic.)*. And **naive Top-k converges nowhere** *(why it matters: The rounding trace: five sub-threshold gradients transmit 0 without feedback; with a residual accumulator the same sequence transmits 2, holds −0.4 in residual, and conserves the true 1.6. The residual e_{t+1)* = (g_t + e_t) − v_t is what turns a biased compressor into a convergent method.}.

**1-bit Adam compresses momentum, not gradients** *(why it matters: Adam's variance estimate stabilizes early; the method runs full-precision Adam through warmup, freezes the variance as a fixed preconditioner, then ships sign-only momentum with a scale factor plus per-worker residual. Up to 5× end-to-end communication-volume reduction across 256 GPUs, with reported throughput gains of 3.3× on BERT-Large and 2.9× on SQuAD.)*.

The payback condition is the whole decision: **a compressed slow network went 50,000 → 38,500 total steps; the same compression on a fast network went to 33,825 and lost** *(why it matters: The overhead only pays when saved communication time exceeds the compression cost plus any convergence slowdown. A 100× communication speedup that doubles iteration count loses. Evaluate on time-to-target-quality, never on a synthetic AllReduce microbenchmark.)*.

## Hiding the Exchange

Whatever communication remains, the question is whether independent computation can run beneath it. LogP splits the transfer: **network latency L is overlappable; processor overhead o is not** *(why it matters: In the worked toy: L = 100 μs of transit hides entirely under a 500 μs compute window, but 2o = 100 μs of initiation/completion stays exposed on the execution resource. Effective time: 2o + max(compute, L) = 600 μs.)*. DDP exploits this with gradient hooks and bucket fusion: **each layer's AllReduce launches the moment its backward finishes** *(why it matters: Nine 100 MB buckets against 875 MB per layer in the book's 7B example; only the last bucket's transfer is exposed because it has no later compute to hide behind. One late gradient can stall a whole bucket: registration order and observed-ready ordering set the launch timing.)*.

![What overlap can and cannot hide](https://benebsworth.com/study/vol2/05-collective-communication/diagrams/overlap-lanes.svg)

*The LogP split as two lanes: 100 us of network latency hides beneath 500 us of backward compute, while 2o = 100 us of processor overhead stays exposed on the execution resource. DDP bucket fusion hides every gradient's transfer except the last bucket, which has no later compute left to hide behind.*
**Eq 5.5 · What overlap can hide**
$$
T_{eff} = 2o + \max(T_{compute}, L)
$$

**async_op=True returns control, not hidden latency** *(why it matters: The CPU continues, but hiding requires: enough independent work to cover the transfer interval, a runtime that actually progresses the transfer, and consumers that do not wait early. The LogP split says the processor-overhead portion can never be hidden regardless of the flag.)*.

## Calibration Before Diagnosis

`nccl-tests` on a healthy fabric reports **roughly half the link's specified bandwidth for ring AllReduce** *(why it matters: Not a failure: the naive α + M/β omits the collective's ~2 traffic factor. Bus bandwidth multiplies tensor-size-over-time by the ring factor, a normalization that matches only the schedule that ran. A tree, hierarchical, or switch-assisted collective carries a different factor.)*. So a calibrated model fits effective α and β **to measurements from the same collective, process group, algorithm, protocol, and topology** *(why it matters: Parameters apply only to the measured regime; change any term and recalibrate. Diagnosis compares the workload against a matched bare-collective baseline: a healthy baseline with a slow step points at granularity, contention, stragglers, or overlap, not the fabric.)*.

## Fallacies and Pitfalls

The chapter's own audit, the ones the numbers above refute directly:

- **Bandwidth is the only metric that matters** *(why it matters: Small-message collectives are latency-bound; the regime belongs to each step's chunk.)*,
- **AllReduce works for everything** *(why it matters: MoE and DLRM routing is destination-specific; that is AllToAll, priced by injection and skew, not ring factors.)*,
- **Pipeline parallelism eliminates communication overhead** *(why it matters: Stage-boundary sends sit on the critical path and the fill/drain bubble adds its own idle time.)*,
- **Ring AllReduce by default** *(why it matters: Ring pays O(N) latency; below the crossover the tree's log rounds win.)*,
- **Compression is safe without error feedback** *(why it matters: Uncorrected Top-k discards 99% of updates with bias that can break convergence.)*,
- **Async collectives always hide latency** *(why it matters: The flag yields the CPU; only network transit is overlappable, overhead o is not.)*,
- **Flat ring is good enough multi-node** *(why it matters: It runs at the slowest edge, one NDR port, while hierarchical phases exploit 9× faster NVLink inside each node.)*,
- **One cost formula fits intra-node** *(why it matters: NVSwitch connectivity is not a one-step reduction; endpoints still run a scheduled algorithm unless the path does in-network reduction.)*,
- **Network corruption always surfaces as an error** *(why it matters: Silent bit corruption passes under the framework; checksums, collective checks, and gradient-norm tests are the only net.)*,

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


---

## Key equations

**Eq 5.1 · The per-rank byte floor**

$$
T_{bw} = \frac{2(N-1)}{N} \cdot \frac{M}{\beta}
$$

*Reducing N contributions and returning the result needs at least 2(N-1) item transfers in aggregate: N-1 to combine, N-1 to distribute. A balanced schedule gives every rank the average share, so the per-rank sent volume approaches 2M as N grows. This is the floor every AllReduce schedule is judged against.*

**Eq 5.2 · Ring AllReduce cost**

$$
T_{ring} = 2(N-1)\,\alpha + \frac{2(N-1)}{N}\cdot\frac{M}{\beta}
$$

*The ring hits the byte floor and pays for it with rounds: 2(N-1) steps of M/N chunks, each charged one startup alpha. On the chapter's 64-GPU, 1 GB, 50 GB/s case the byte term is ~39.4 ms against a simple tree's ~240 ms, but the latency column grows linearly with N.*

**Eq 5.3 · The ring-tree crossover**

$$
M^{*} \approx \frac{N\,\alpha\,\beta}{\log_2 N}
$$

*Ring's excess startup (~N alpha) balances tree's excess byte time (~log2 N x M/beta) at this message size. At 256 GPUs on a 200 Gbps fabric with alpha = 1 us the crossover sits near 1 MB: tree schedules win small collectives, ring wins large ones. The boundary moves with group size and fabric.*

**Eq 5.4 · Three-phase hierarchical cost**

$$
T_{hier} = T_{intra} + T_{inter} + T_{bcast}
$$

*Exploits the bandwidth cliff instead of paying it: reduce inside each node over fast NVLink, ring per-shard across the slow inter-node ports in parallel, broadcast the shard result back inside the node. On 128 nodes x 8 GPUs with a 350 GB gradient the modeled gain is ~4-5x over the flat bound; the inter-node phase alone runs ~4.4 ms.*

**Eq 5.5 · What overlap can hide**

$$
T_{eff} = 2o + \max\!\left(T_{compute},\, L\right)
$$

*LogP separates network transit (L, overlappable beneath independent computation) from processor overhead (o per side, never overlappable because it occupies the execution resource). In the worked toy: 100 us of L hides under 500 us of compute, but 100 us of 2o stays exposed, giving 600 us effective. This is why kernel-bypass and GPUDirect matter more to hiding than raw link bandwidth.*

**Eq 5.6 · The residual accumulator**

$$
e_{t+1} = (g_t + e_t) - v_t
$$

*The correction that turns a biased compressor into a convergent method: add the residual to the new gradient, compress and transmit the corrected vector, keep the untransmitted difference. In the book's trace the naive run transmits 0 of a true 1.6 while error feedback transmits 2 and holds -0.4 in residual. A finite run ends with residual still untransmitted, but the telescope prevents systematic loss.*

## From the book

- [Four Central Collective Primitives](https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html) — undefined
- [Ring AllReduce](https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html) — undefined
- [Hierarchical AllReduce](https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html) — undefined
- [Dimension-ordered reduction on a torus](https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html) — undefined
- [Communication-computation overlap](https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html) — undefined
- [SHARP in-network reduction](https://mlsysbook.ai/vol2/05_collective_communication/05_collective_communication.html) — undefined

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A dense-model training run triples its fleet from 64 to 192 GPUs while holding the global work per update fixed. Step time drops by only 30%, and per-GPU compute occupancy falls. Which mechanism best explains the shortfall?
   - A. The dataset becomes the bottleneck because per-GPU sample throughput must triple and the storage tier cannot deliver three times the batch bytes per step.
   - B. The collective-communication term grows relative to compute: synchronization, startup rounds, and exposed transfer time eat what the added accelerators were meant to buy.
   - C. Gradient noise scales with the worker count, so the optimizer rejects more updates and effective occupancy falls even though every device reports healthy busy cycles.
   - D. The scheduler is leaving GPUs unassigned: at this scale the orchestrator fragments the placement across racks and a third of the fleet sits outside the communication group entirely.

2. A parameter server (star) reduces gradients from N workers, each holding an M-byte buffer. A ring performs the same AllReduce. What is the asymptotic relationship between their per-endpoint byte loads?
   - A. The ring rank sends N x M bytes spread across rounds while the server sends 2M once, so the star is asymptotically cheaper per endpoint for large clusters.
   - B. Both move the same bytes per endpoint because the server's sharded parameter tier distributes the aggregation across multiple servers exactly as the ring's neighbor exchange does across ranks.
   - C. The star server's port carries N x M bytes while each ring rank sends about 2M, so the server's byte time is roughly N/2 times the ring rank's before contention is counted.
   - D. The ratio is log2 N: the server's serialized transfers grow logarithmically while the ring's chunk pipeline keeps every rank's volume proportional to the group count.

3. A logical Ring AllReduce runs on 64 ranks with alpha = 1.5 us startup and beta = 50 GB/s per link, over a 140 GB gradient (70B in BF16). Compute the bandwidth term and explain which term dominates at this N.

4. On the same fabric, one collective exchanges a hundred small routing messages per step while another moves a single fused buffer well above n* = alpha x beta. Why does fusing the small messages pay?
   - A. The hundred messages cost roughly 100 x alpha in startup; fused above n* they pay one startup plus a bandwidth term, trading a hundred latencies for a single pipeline.
   - B. Small messages bypass the switch queue entirely while fused buffers must serialize, so fusing shifts cost from queue depth into a single predictable DMA burst.
   - C. Fusion compresses the payload itself: a hundred small messages carry redundant headers and routing metadata that the fused buffer deduplicates down to one envelope for the whole exchange.
   - D. The fused buffer can use a different algorithm entirely, so the exchange drops from O(N) rounds to O(log N) once the messages share one envelope.

5. An infrastructure engineer sizes AllReduce algorithms for a 256-GPU group on 200 Gbps links with effective alpha = 1 us. A batch of small ~64 KB collectives and one ~4 GB collective must both run. What does the crossover model prescribe?
   - A. Double binary tree for the 4 GB collective and parameter-server star for the small ones, since the star's dedicated port amortizes the small-message startup best.
   - B. Ring for both: it is the schedule that reaches the bandwidth lower bound under the endpoint model, and bandwidth optimality dominates the cost at every message size once the group grows this large.
   - C. Tree for both: its O(log N) rounds are strictly better than the ring's O(N) at any message size, since startups outnumber transfers.
   - D. Below M* ~ 1 MB a tree or recursive-halving schedule wins on startup rounds; the 64 KB collectives should take the log-depth path while the 4 GB gradient takes the ring.

6. On an 8-node cluster with 8 GPUs per node, fast NVLink inside each node, and eight independent 50 GB/s NDR ports per node, how does hierarchical AllReduce beat a flat ring?
   - A. It assigns every node's gradient to a single port so the seven remaining ports stay free for prefetch traffic, cutting the fabric's total bytes eightfold.
   - B. Intra-node reduce at NVLink rates, then one inter-node ring per shard across all eight ports at once, then intra-node broadcast: each port's inter-node payload falls 8x and the flat ring's slowest-edge serialization is avoided.
   - C. It replaces the ring's 2(N-1) sequential rounds with log-depth rounds across the node hierarchy, so the measured saving comes almost entirely from cutting startup latency rather than from the eight independent ports moving shards in parallel.
   - D. It deduplicates gradients that are identical across replicas, so each node transmits only the delta from the previous step to the inter-node ring.

7. MoE token routing with AllToAll hits contention and tail latency even though each worker's payload is smaller than the gradient AllReduce. What is the mechanism?
   - A. The transpose forces every chunk through the spine twice, doubling the bisection load relative to a ring on the same topology.
   - B. AllToAll inserts a global barrier before any chunk may route through the fabric, so the collective waits on the slowest rank's entire buffer to arrive and be acknowledged at every stage boundary before the transpose can start routing.
   - C. Each rank sends distinct chunks to every other rank, and expert demand is skewed: a hot expert's ingress link carries 672 remote tokens where uniform routing would carry 448, so one link stretches the step while others idle.
   - D. AllToAll cannot use NVLink inside the node, so every intra-node chunk pays the inter-node NDR rate and the payload penalty multiplies by the cliff ratio.

8. Top-k sparsification retains 0.1% of a gradient's d elements (k = 0.001d). Values ship in FP32 with INT32 indices. What is the effective compression ratio, and why does it differ from the 1,000x headline?

9. A team applies gradient compression and reports a large per-step communication speedup. When does that speedup actually improve the training run?
   - A. Only when saved communication time exceeds the compression overhead plus any extra iterations the distorted gradients require: a 100x transfer gain that doubles the step count is a net loss.
   - B. Whenever communication is more than a fifth of step time: once the fabric share passes 20% any compression ratio above 4x is guaranteed to pay back in wall-clock.
   - C. Whenever the compressed collective stays above the fabric's n* crossover threshold, because below that point the removed bytes were only costing startup latency rather than actual transfer time on the wire.
   - D. When compression runs on the same GPU as the backward pass, since host-side compression is what turns the saved wire time into exposed CPU work.

10. A PyTorch job sets async_op=True on every collective call but step time barely improves. Under the LogP model, what is the most accurate diagnosis?
    - A. The improvement is real but masked: the saved communication time is exactly offset by the additional synchronization the asynchronous API inserts at each gradient hook.
    - B. async_op quietly serializes the collectives behind the scenes: the flag queues all communication work onto one runtime progress stream, so the concurrent AllReduces still execute sequentially under the hood.
    - C. The flag only hides latency when NCCL selects a kernel-bypass protocol; on the default path the runtime falls back to synchronous progress after the first call.
    - D. async_op returns control to the CPU but only the network-transit portion of a transfer is overlappable; the 2o processor overhead and the last bucket's unhidden transfer still land in the step.

11. nccl-tests reports roughly half of the fabric's rated bandwidth for a healthy ring AllReduce. What is the correct interpretation?
    - A. NCCL is choosing a tree schedule whose byte term is log N times worse, so the correct fix is to force the ring algorithm in the environment.
    - B. The fabric is degraded: reporting half of rated bandwidth is the signature of a link that trained down a speed class at bring-up, matching the half-rate pathology the fabric chapter profiles on the day-three step regression.
    - C. The naive alpha + M/beta omits the ring's ~2 traffic factor; bus bandwidth normalizes by the schedule's factor, so half-spec is expected, and calibrated alpha/beta must be fit from the same collective, group, and topology.
    - D. The benchmark measures unidirectional traffic while the collective is duplex, so the observed half reflects counting one direction of a two-way transfer.

12. Explain to a teammate why a flat ring AllReduce across 1,024 GPUs in 128 nodes is slower than the hierarchical schedule even though both move the same gradient bytes in aggregate.

## Answer key

1. B. Holding global work fixed means each GPU's compute share shrinks while the synchronization cost does not shrink with it. Communication is global and scales differently from arithmetic; the exposed remainder of the collective lands directly in step time.

2. C. The bottleneck is concentration: the star funnels all N buffers through one endpoint, the ring spreads the same aggregate work so each rank sends about 2(N-1)/N x M. At 1,024 workers the gap is ~512x per port.

3. Bandwidth term = 2 x (63/64) x 140 GB / 50 GB/s ~ 5.5 s. The startup term is 2 x 63 x 1.5 us ~ 189 us, four orders below the byte term: at 64 ranks the ring is deep in the bandwidth-bound regime, and it is the startup term, not the byte term, that O(N) growth attacks first.

   The bandwidth term approximates 2M/beta. The latency term 2(N-1)alpha is what scales with N; at 1,024 ranks it reaches ~3 ms, still far under the byte term, which is why the ring stays the default at large payloads.

4. A. Below n* each message is nearly pure startup cost, so a hundred messages is ~100 alpha. Bucket fusion exists to push the per-round message above the crossover where the bandwidth term, not startup, dominates.

5. D. The crossover M* ~ N alpha beta / log2 N sits near 1 MB for this group. Under it the log-rounds schedules win on latency; over it the ring's optimal byte term wins. Runtime selection evaluates both regimes with the actual placement.

6. B. A flat ring runs at its slowest edge, one cross-node port. The hierarchical schedule keeps the fast hop (NVLink) dense and fans the slow hop across eight independent ports, so each port moves an eighth of the payload in parallel. The modeled gain is ~4-5x.

7. C. AllToAll is a routing contract, not a reduction. Its cost is governed by injection bandwidth, bisection capacity, and skew: when one expert attracts disproportionate tokens, that ingress link becomes the step's tail.

8. Each kept element ships value + index = 8 bytes against the original 4, so the ratio is 4d / 8k = d/(2k) = 500x, not 1,000x. Index overhead halves the headline, and the collective adds a second cost: different workers keep different coordinates, so the union of selections exceeds any single worker's k.

   The kept-fraction is not the compression ratio. Metadata (indices, scales) and aggregation semantics both take a cut before the advertised number reaches the wire.

9. A. The book's worked condition: on a slow network the compressed run went 50,000 to 38,500 total steps (gain); on a fast network the same method went to 33,825 and lost. Evaluate time-to-quality, not microbenchmark speedup.

10. D. Hiding requires three things beyond the flag: independent work long enough to cover the interval, a runtime that progresses the transfer, and consumers that do not wait early. The o term can never be hidden, and the last bucket has no compute left to cover it.

11. C. Half-of-spec is the ring's ~2 traffic factor showing through the naive formula, not a fault. Calibration records operation, datatype, ranks, algorithm, protocol, topology, placement, and achieved bus bandwidth, then fits effective alpha and beta to that same configuration.

12. The flat ring is one cycle through all 1,024 ranks, and its throughput is set by the slowest edge: an NDR port at 50 GB/s, nine times slower than the NVLink inside a node. Its 2(N-1) rounds also charge 2,046 startups. The hierarchical schedule does three phases: reduce inside each of the 128 nodes at NVLink rates, run one inter-node ring per shard group so the eight ports per node each carry an eighth of the payload in parallel, then broadcast the result inside each node. Same contract, same aggregate bytes; the win is exploiting the bandwidth cliff, keeping the slow hop few and parallel instead of serialized through every rank.

    The schedule, not the payload, is the cost. Same bytes, different placement of the slow hops.

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol2/05-collective-communication.m4a) — a generated podcast walking this packet's argument.
