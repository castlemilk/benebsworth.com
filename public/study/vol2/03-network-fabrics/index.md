---
title: "Network Fabrics — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html"
canonical_url: "https://benebsworth.com/study/vol2/03-network-fabrics/"
---

# Network Fabrics: Study Packet

During an AllGather on a SuperPOD scalable unit, 256 senders converge on one egress port. The switch buffer is 32 MB, which sounds generous. Roughly how long does the buffer hold before it overflows: a second, a millisecond, or microseconds?

*Working through [Network Fabrics](https://mlsysbook.ai/books/vol2/03_network_fabrics/03_network_fabrics.html), chapter 3 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The fabric is not a bandwidth pipe; it is a synchronization mechanism with a physics, and the bill arrives at the slowest link.** The buffer answer is microseconds: 256 senders each driving 50 GB/s offer 12.8 TB/s into a port that drains at 50 GB/s, so the 32 MB buffer holds 640 μs of backlog in theory but overflows in under 5 μs in practice. That is the chapter in one number pair: **the offered load outruns the drain 256 to 1** *(why it matters: 256 senders × 50 GB/s NDR = 12.8 TB/s offered into a 50 GB/s egress; the bandwidth-delay product at a 5 μs feedback round trip is only 250 KB, so congestion feedback arrives hundreds of kilobytes too late.)*, and no bandwidth figure on the spec sheet tells you the fabric can absorb a synchronized burst. The staircase that produces the cliff lives at [the bandwidth cliff figure](#fig-bandwidth-cliff); the model that prices message size at [the alpha-beta map](#fig-alpha-beta-map).

> **note: How to read this packet**
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Synchronization Backbone

Chapter 2 ended at the node boundary: 8 GPUs on NVLink 4, 450 GB/s per direction each. This chapter picks up where the node ends: the first hop off the node is a 400 Gb/s NDR InfiniBand port, **50 GB/s per direction** *(why it matters: 450 → 50 GB/s is a ~9× per-direction cliff. NVLink 5 (B200) doubles the inside to 900 GB/s per direction while XDR doubles the outside to 100 GB/s; the ratio holds. The aggregate NVLink budget has exceeded external-port budgets since NVLink's first product year in 2016, and the gap has never closed.)*. Everything the fabric does is downstream of that ratio: what crosses the node boundary is nine times narrower than what moves inside it.

What crosses is **collectives** *(why it matters: AllReduce sums a gradient across workers and returns it to all; AllGather concatenates shards; AllToAll exchanges pairwise slices (MoE expert traffic, tensor-parallel activations). AllReduce and AllToAll stress bisection bandwidth; AllGather's synchronized fan-in is the incast generator.)*: a 175B-parameter model at FP16 produces a 350 GB gradient every step, and the synchronous step ends when the last contribution lands. The fabric is the gradient bus, the memory bus of the fleet.

![Nine times narrower at the node boundary](https://benebsworth.com/study/vol2/03-network-fabrics/diagrams/bandwidth-cliff.svg)

*The per-direction budget on each side of the node edge: 8 GPUs at 450 GB/s each inside the NVLink domain, a 50 GB/s NDR port at the first hop off the node. The ~9x cliff has persisted since NVLink's first product year in 2016; placement, deciding what may cross, is the design response.*
## The Workload Inversion

The five-level model organizes the chapter: wire and link, transport, switch and topology, fabric behavior, and cluster design. Each level hides a case where **generic data-center intuition fails** *(why it matters: Web fleets assume many small independent requests, statistical multiplexing, drop-tolerant TCP, and north-south traffic. ML inverts each: flows are elephant-sized, lockstep-synchronized, loss-intolerant at the transport, and mostly east-west between accelerators. ECMP hashing that spreads web flows evenly maps training's few fat flows onto colliding paths and produces persistent hot spots.)*. The inversion is why the rest of the chapter's machinery (RDMA, lossless transport, PFC, rail-optimized topology) exists at all.

## Level 1: Wire and Link

PAM4 moved the industry to 4-level signaling: **2 bits per symbol instead of NRZ's 1** *(why it matters: Four voltage levels lose most of the signal-to-noise margin, so forward error correction became mandatory. FEC costs real time: ~100-300 ns across a three-hop one-way path and up to ~1,200 ns on a six-hop round trip, latency that lands inside the alpha term below.)*, doubling per-lane rate while spending margin. That margin also shortens copper's reach: **DAC dies at 1-3 m** *(why it matters: Passive copper reach shrinks as per-lane rate climbs; active optical cables stretch to 3-30 m, and pluggable optics own everything past ~30 m. A spine link in a fat-tree is an optical module at each end.)*, which matters because the modules are not cheap or free of power.

Optics are a power line item, not an afterthought: a 400G pluggable module draws ~20 W, and a 10,000-GPU cluster's ~20,000 spine-side modules draw **~400 kW just to move light** *(why it matters: About 10% of GPU power goes to the interconnect: ~3 switch-side ports per GPU at ~25 W is ~75 W against a 700 W H100. The 400 kW spine figure counts module ends only, before switch ASICs.)*.

## Level 2: Transport and the Alpha-Beta Model

RDMA removes the kernel from the data path: NICs read and write registered memory directly, and GPUDirect extends that to HBM, so a gradient goes GPU memory to wire without staging through CPU RAM. InfiniBand does this natively; RoCE carries it over Ethernet (v2 over UDP/IP). The choice matters less than **what loss means on each** *(why it matters: InfiniBand's link layer is lossless by credit; RoCE needs the Ethernet fabric configured lossless too, which is where PFC (below) enters. A drop on a lossy path triggers retransmission across a feedback round trip: at 50 GB/s and 5 μs RTT, one lost packet resends ~250 KB of flight.)*.

The performance model is one line: time is a fixed startup plus size over sustained rate.

**Eq 1 · Alpha-beta message time**
$$
T(n) = \alpha + \frac{n}{\beta}
$$

**Eq 2 · Crossover size**
$$
n^{*} = \alpha \cdot \beta \approx 75\ \mathrm{KB\ (NDR)}
$$

With the chapter's modeled anchors (α = 1.5 μs on NDR, 5 μs on RoCEv2; β = 50 GB/s and 12.5 GB/s), the model says the **small message buys latency, not bandwidth** *(why it matters: 4 KB control message: 1.58 μs on NDR vs 5.32 μs on 100G RoCE, a 3.4× gap that is almost all alpha. 350 MB gradient shard: 7.0 ms vs 28.0 ms, a 4× gap that is almost all beta. Below the crossover (α·β ≈ 75 KB on NDR) the transfer term is a rounding error; doubling link rate cannot fix the wrong half.)*. Measured reality is worse: NCCL AllReduce on one NVSwitch node shows a **~17 μs floor, not 1.5** *(why it matters: The measured curve sits an order of magnitude above the model at small sizes and runs up to ~2× the model mid-range, converging only past a knee at a few MB. Effective per-collective alpha on a real stack is ~1-3 μs for NDR and ~5-10 μs for RoCE. The model ranks paths and sizes correctly; it does not predict the floor.)*.

![Two regimes, one line](https://benebsworth.com/study/vol2/03-network-fabrics/diagrams/alpha-beta-map.svg)

*Message time T(n) = alpha + n/beta on log axes: the alpha floor rules below the crossover (75 KB on NDR), the beta slope rules above. The 4 KB control message lives on the flat part at 1.58 us; the 350 MB shard lives on the slope at 7.0 ms. Doubling beta halves the slope and leaves the floor untouched.*
## Level 3: Switch and Topology

The top-of-rack switch is **the failure domain boundary** *(why it matters: A ToR failure isolates its rack's GPUs; the design question is how much of a job lives inside one domain. A 64-port leaf at 1:1 puts 32 ports down and 32 up, matching the 32-GPU rack.)*, and the fat-tree math falls out of the port count: with radix k, two tiers reach k²/2 hosts and three reach k³/4.

**Eq 3 · Fat-tree host capacity**
$$
H_{2} = \frac{k^{2}}{2}, \qquad H_{3} = \frac{k^{3}}{4}
$$

For k = 64 (Quantum-2 class), that is **2,048 hosts in two tiers, 65,536 in three** *(why it matters: A three-tier pod holds 1,024 hosts; the four-pod scale-out is 4,096. The same arithmetic runs in reverse for next-generation silicon: a 102.4 Tb/s ASIC exposing 64 × 1.6 Tb/s ports can spend capacity on radix instead of rate, and k²/2 growth is what flattens a three-tier cluster to two.)*.

Saving money with oversubscription costs exactly the ratio: a 4:1 spine **quarters bisection and quadruples crossing time** *(why it matters: 1:1 bisection is 25.6 TB/s vs 6.4 at 4:1. Worst-case placement of a ring AllReduce across the cut runs 0.80 s instead of 0.20 s; at 30% of the step communicating and a \$300M cluster, the book prices the 4:1 design's waste at ≈\$142.1M. A 2:1 spine still gives up 23.1% of throughput.)*. Rail-optimized topologies keep each rank-index's traffic on one switch where the model allows it: **3 hops collapse to 1** *(why it matters: Same-rail exchange is one switch hop vs source-leaf, spine, destination-leaf (3 hops at ~0.6 μs each), a 3× hop-count reduction on traffic the topology was built to localize.)*.

**Eq 4 · Oversubscription tax**
$$
T_{comm}(r) \approx r \cdot T_{comm}(1{:}1)
$$

![Oversubscription prices the cut](https://benebsworth.com/study/vol2/03-network-fabrics/diagrams/fattree-cut.svg)

*A two-tier fat-tree at radix 64 reaching 2,048 hosts at 1:1 (bisection 25.6 TB/s) versus the same leaves oversubscribed 4:1 (6.4 TB/s). Worst-case ring AllReduce crossing the cut: 0.20 s vs 0.80 s. The 2:1 middle still costs 23.1% of throughput and, on the book's \$300M cluster, the 4:1 choice burns ~\$142.1M.*
Alternatives buy different trade-offs: a 16-ary 3D torus holds the same 4,096 endpoints with a diameter of 24 hops and **512 links crossing the bisection cut vs the fat-tree's 2,048** *(why it matters: Bisection ordering on the scenario: torus < rail < dragonfly < fat-tree. Tori and dragonflies trade worst-case cut bandwidth for fewer long links and shorter cables; fat-trees buy uniform worst-case bandwidth at the price of the deepest spine.)*. Optical circuit switches add reconfigurability: the topology itself can be rewired at millisecond scale.

## Level 4: Congestion, PFC, and Incast

Lossless transport needs back-pressure, and PFC is the blunt version: **a pause frame stops all traffic on a priority class** *(why it matters: PFC cannot distinguish victims from causes; pause storms propagate upstream, cyclic buffer dependency deadlocks the fabric, and recovery needs a watchdog that drops the lossless guarantee briefly. The cure is end-to-end congestion control (DCQCN, HPCC) marking rates before queues build, plus adaptive routing so flows do not pile onto hash-collided paths.)*.

Incast is the burst the opening case priced: a synchronized collective has **all senders finishing at once** *(why it matters: 32 MB at 50 GB/s holds 640 μs of traffic in the steady state, but the arrival burst oversubscribes the egress 256×, so the buffer overflows in a few microseconds, before any 5 μs feedback signal can even return. Deeper buffers buy microseconds, not safety; the fix is scheduling and rate control, not hardware.)*.

**Eq 5 · Incast buffer survival**
$$
t_{hold} = \frac{B_{buf}}{BW_{egress}} \ll t_{rtt}
$$

![256 senders, one port, five microseconds](https://benebsworth.com/study/vol2/03-network-fabrics/diagrams/incast-cascade.svg)

*One SuperPOD scalable unit worth of senders converging on a single 50 GB/s egress: 12.8 TB/s offered, a 32 MB buffer that nominally holds 640 us of backlog, overflow in under 5 us. The bandwidth-delay product at a 5 us feedback RTT is only 250 KB, so reaction always arrives late; scheduling, not buffering, is the fix.*
## Level 5: Cluster Design

At the top level the fabric is **the gradient bus at cluster scale** *(why it matters: DGX SuperPOD builds 1,024 GPUs as four 256-GPU scalable units; Meta's Grand Teton pairs two clusters of equal size and equal endpoint rate, one InfiniBand and one RoCE, an A/B experiment at fleet scale. The design questions are SU size, oversubscription at each tier, and where the collective's crossing traffic lands.)*.

## Virtualization

SR-IOV slices one NIC into eight virtual functions with rate caps: **isolation, not immunity** *(why it matters: A neighboring job's 100 GB checkpoint at 50 GB/s occupies the port for 2 s regardless of the VF split; virtualization meters the queue, not the physics.)*.

## Monitoring and Debugging

The debugging case is the quietest number in the chapter: on day 3, step time moves 4.2 s to 4.8 s **(+14%) with GPU busy rate dropping 92% to 85%** *(why it matters: The workflow bisects by pair: a pairwise ib_write_bw reports one link at half the healthy rate (96% payload efficiency is normal). The cause was a single degraded lane negotiation, invisible to fleet-level dashboards.)*, and the silent version never fires an alarm at all: a transceiver degrading 10% of one link's bandwidth slows every step 2-3% on a **737,280 GPU-hour run** *(why it matters: 1,024 GPUs × 30 days; the book prices the silent waste in the tens of thousands of dollars. In a 4,096-GPU RoCE cluster the exposure is 12,288 links and 24,576 transceivers, and at 0.001% per module per day the probability that something is degrading today is ~22%.)*.

**Eq 6 · Silent-degradation tax**
$$
W = N \cdot T_{run} \cdot f_{slow} \cdot r_{gpu}
$$

## What Moves the Ceiling

XDR doubles the port to 800 Gb/s; Ethernet roadmaps point at 1.6 Tb/s, and **one 1.6T port is four 400G ports** *(why it matters: A 102.4 Tb/s ASIC equals 64 × 1.6T ports; spending capacity on radix instead of rate is what collapses a tier.)*. Co-packaged optics moves the optical engine from the faceplate to the package: **~1.28 kW saved per switch** *(why it matters: 64 ports × 20 W pluggable module power, before the ASIC's own savings from a shorter electrical path. The SerDes-to-optics path shrinks from centimeters to millimeters.)*. Disaggregation (composable fabrics, CXL-style pooling) pushes the same logic up a level: the interconnect becomes the machine's backplane.

## Fallacies and Pitfalls

The chapter's own audit, the ones the numbers above refute directly:

- **Doubling the link rate halves transfer time** *(why it matters: HDR→NDR doubles beta and leaves alpha untouched; the end-to-end speedup lands under 25%, not 100%. Only messages well past the ~75 KB crossover see the full doubling.)*,
- **Raw bandwidth numbers are comparable across fabrics** *(why it matters: NDR's 400 Gb/s and 400GbE's 400 Gb/s differ in delivery efficiency (ib_write_bw sees ~96% payload on a healthy link) and far more in alpha; the header rate is not the achieved rate.)*,
- **Oversubscription is a free cost saving** *(why it matters: The 4:1 spine's \$142.1M waste on a \$300M cluster exceeds the switches it saved; bisection is priced by the collective's worst crossing, not the average.)*,
- **Buffers absorb incast** *(why it matters: A 32 MB buffer overflows in <5 μs at 256× oversubscription; buffers buy microseconds, scheduling buys safety.)*,
- **The network is fine if the GPUs are busy** *(why it matters: nvidia-smi still reads 85-92% busy while one degraded link silently taxes every step; link-level telemetry, not device dashboards, holds the truth.)*.

## The physics

| Quantity | Value | Where it binds |
|---|---|---|
| Per-direction cliff (NVLink 4 → NDR) | 450 → 50 GB/s ≈ 9× | placement: what stays on-node vs crosses |
| FP16 gradient (175B) | 350 GB / step | every step's crossing volume |
| Alpha anchors | NDR 1.5 μs · RoCE 5 μs | messages below the crossover |
| Crossover size n* = α·β | ~75 KB NDR · ~62.5 KB 100G | where bandwidth starts to matter |
| 4 KB control / 350 MB shard | 3.4× / 4× (NDR vs 100G) | alpha vs beta dominance |
| Measured NCCL floor | ~17 μs, knee ~few MB | model vs real collective cost |
| FEC cost | ≥300 ns 3-hop · ≤1,200 ns 6-hop RTT | inside alpha |
| Reach ladder | DAC 1-3 m · AOC 3-30 m · optics >30 m | what each hop physically is |
| Spine optics (10K GPUs) | ~400 kW | interconnect ≈10% of GPU power |
| Fat-tree hosts (k=64) | 2,048 (2-tier) · 65,536 (3-tier) | cluster sizes per tier count |
| Oversubscription | 2:1 → −23.1% · 4:1 → 4× / \$142.1M | spine design economics |
| Rail speedup | 3 hops → 1 hop = 3× | topology-aware placement |
| Torus vs fat-tree cut | 512 vs 2,048 links | topology trade-off shape |
| Incast | 12.8 TB/s offered · 32 MB dies <5 μs | burst coherence limit |
| Silent degradation | 2-3% step tax, tens of thousands of dollars | monitoring requirement |
| 4,096-GPU exposure | 12,288 links · 24,576 xcvr · ~22%/day | fleet-scale failure surface |
| Checkpoint interference | 100 GB at 50 GB/s = 2 s | virtualization is queueing, not isolation |
| Next ceiling | XDR 800 Gb/s · 1.6TbE = 4×400G · 102.4 Tb/s ASIC · CPO −1.28 kW/switch | radix vs rate, package optics |

## Glossary

- **AllReduce / AllGather / AllToAll**: the collectives the fabric exists to serve; sum-and-return, concat-and-return, pairwise exchange.
- **α-β model**: T(n) = α + n/β; fixed startup plus per-byte rate. The model's whole value is splitting the two.
- **Bandwidth-delay product**: bytes in flight during one round trip; 250 KB at 50 GB/s × 5 μs. The amount resent per drop, and the amount feedback arrives too late for.
- **Bisection bandwidth**: the capacity crossing the worst cut that splits the fabric in half; the number collectives actually feel.
- **DAC / AOC / optics**: the reach ladder, passive copper ~3 m, active optical cable ~30 m, pluggable optics beyond.
- **ECMP**: hash-based multipath spreading; fine for many small flows, hot-spot generator for few fat ones.
- **FEC**: forward error correction; mandatory since PAM4 spent the SNR margin, costs hundreds of ns.
- **GPUDirect / RDMA**: NIC-to-HBM data path with the kernel and CPU staged out.
- **Incast**: synchronized many-to-one arrival; the burst pattern collectives create.
- **NVLink / NVSwitch**: the intra-node interconnect (450-900 GB/s per direction) the fabric is always nine times narrower than.
- **Oversubscription**: less uplink capacity than downlink demand at a tier, 2:1 or 4:1; priced in crossing time.
- **PAM4**: 4-level signaling, 2 bits per symbol; bought the rate doubling, spent the noise margin.
- **PFC**: priority flow control, the pause-frame mechanism that makes Ethernet lossless, and the storm/deadlock hazard it brings.
- **Rail-optimized**: topology giving each rank-index its own switch path, 1 hop for same-rail traffic.
- **SR-IOV**: NIC virtualization into virtual functions with rate caps.
- **Scalable unit (SU)**: the pod-building block, 256 GPUs on SuperPOD.
- **XDR / HDR / NDR**: InfiniBand generations, 800 / 200 / 400 Gb/s per port.

## → Ben's world

- **Greenveil's edge path**: the α-β split is the same reason a short RPC costs latency, not bandwidth; the crossover n* = α·β is the payload size where the transport's flat fee stops dominating.
- **Cuttlefish orchestration**: oversubscription pricing applies to any shared tier, a task queue's workers all waking on one deploy is incast on a slower clock.
- **Knowledge console**: the five-level model is a debugging order too, check the wire before the topology before blaming the workload.
- **Doc-analyser pipeline**: the degraded-transceiver case is the infra cousin of silent accuracy drift: a 2-3% tax that no dashboard names, found by bisecting to the pair that differs.

## Open questions

- At 900 GB/s per direction on NVLink 5, does the intra/inter-node ratio stay ~9× when XDR lands at 100 GB/s, or does the cliff keep widening?
- What does rail-optimized placement cost a workload that is *not* rank-symmetric, MoE expert traffic is explicitly all-to-all?
- If CPO saves ~1.28 kW per switch, what does it cost in serviceability when an optical engine dies inside the package?
- Can congestion control ever beat scheduling for incast, or is a synchronized collective structurally always a burst?


---

## Key equations

**Eq 1 · Alpha-beta message time**

$$
T(n) = \alpha + \frac{n}{\beta}
$$

*Message transfer time splits into a fixed startup (protocol, queuing, FEC, software stack) and a size-over-rate term. Doubling the link rate attacks only the second term: a 4 KB handoff barely notices while a 350 MB shard halves. Collectives pay alpha once per communication round, so the fixed cost grows with participant count even on short physical paths.*

**Eq 2 · Crossover size**

$$
n^{*} = \alpha \cdot \beta \approx 75\ \mathrm{KB\ (NDR)}
$$

*The message size where the transfer term equals the startup term. Below n* the link rate is nearly irrelevant: 4 KB on NDR spends ~95% of its 1.58 us in startup. Above it, bandwidth dominates: a 350 MB shard spends 99.98% in transfer. The crossover is the dividing line between buying latency and buying bandwidth.*

**Eq 3 · Fat-tree host capacity**

$$
H_{2} = \frac{k^{2}}{2}, \qquad H_{3} = \frac{k^{3}}{4}
$$

*A folded Clos built from k-port switches reaches k^2/2 hosts in two tiers (half each leaf's ports face down, half up) and k^3/4 in three. At radix 64 (Quantum-2 class): 2,048 and 65,536 hosts. Spending next-generation port capacity on radix instead of per-port rate is what removes a whole switching tier.*

**Eq 4 · Oversubscription tax**

$$
T_{comm}(r) \approx r \cdot T_{comm}(1{:}1)
$$

*When crossing traffic fills the bisection, time scales with the oversubscription ratio: a ring AllReduce with every ring edge cut runs 0.80 s on a 4:1 spine vs 0.20 s at 1:1, and 2:1 still surrenders 23.1% of throughput. At 30% of the step communicating, the book prices the 4:1 design at ~\$142.1M of waste on a \$300M cluster.*

**Eq 5 · Incast buffer survival**

$$
t_{hold} = \frac{B_{buf}}{BW_{egress}} \ll t_{rtt}
$$

*A 32 MB egress buffer at 50 GB/s holds 640 us of steady backlog, but 256 synchronized senders arrive at 12.8 TB/s: the buffer overflows in under 5 us, before a congestion signal could return. Buffers buy microseconds; only scheduling and rate control buy safety.*

**Eq 6 · Silent-degradation tax**

$$
W = N \cdot T_{run} \cdot f_{slow} \cdot r_{gpu}
$$

*A single degraded link slows the synchronous step: 10% link loss becomes a 2-3% step tax after overlap. On 737,280 GPU-hours (1,024 x 30 days) that is tens of thousands of dollars, with no alarm because every dashboard reads the aggregate, not the link.*

## Charts

**The intra-node budget never stops outrunning the port**

| Reported product year | NVLink (per GPU, summed) | InfiniBand (per port) | Ethernet (per port) | PCIe x16 (per direction) |
|---|---|---|---|---|
| 2010-01-01 |  |  | 5 |  |
| 2012-01-01 |  |  | 5 | 15.75 |
| 2014-01-01 |  | 7 | 12.5 | 15.75 |
| 2016-01-01 | 80 | 12.5 | 12.5 | 15.75 |
| 2017-01-01 | 150 | 12.5 | 12.5 | 31.5 |
| 2018-01-01 | 150 | 25 | 50 | 31.5 |
| 2020-01-01 | 300 | 25 | 50 | 31.5 |
| 2021-01-01 | 300 | 50 | 50 | 63 |
| 2022-01-01 | 450 | 50 | 50 | 63 |
| 2023-01-01 | 450 | 50 | 50 | 63 |
| 2024-01-01 | 900 | 50 | 100 | 63 |
| 2025-01-01 | 900 | 100 | 100 | 128 |

*Per-direction bandwidth by reported product year (log scale). NVLink sums a GPU's links; Ethernet and InfiniBand are per port; PCIe is per x16 link. The shaded spread between NVLink and InfiniBand from 2016 on is the cliff: the external port has never caught the aggregate intra-node budget.*

**Who pays for the message — startup vs transfer on NDR**

| Message size | alpha (startup) share | n/beta (transfer) share |
|---|---|---|
| 4 KB control | 94.9 | 5.1 |
| 64 KB | 53.4 | 46.6 |
| 1 MB | 6.7 | 93.3 |
| 350 MB shard | 0.02 | 99.98 |

*Share of modeled message time spent in startup alpha (1.5 us) versus transfer n/beta at 50 GB/s. At 4 KB the message is 95% startup; at 64 KB the two terms are near parity (~75 KB crossover); at 350 MB startup is a rounding error. Buying bandwidth fixes the right bar and the wrong end of the left ones.*


## From the book

- [The five-level model (book)](https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html) — The book's layered map: wire/link, transport, topology, fabric behavior, cluster design. The packet follows the same order; each level is where a different assumption from generic networking breaks.
- [PAM4 vs NRZ (book)](https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html) — Four levels carry 2 bits per symbol where NRZ carried 1, at the price of a third of the SNR margin, which is why FEC is now mandatory and costs hundreds of nanoseconds.
- [Physical reach ladder (book)](https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html) — Package at millimeters, DAC at 1-3 m, AOC at 3-30 m, optics past 30 m. The packet uses the ladder to explain why spine links are pairs of ~20 W pluggable modules.
- [GPUDirect data path (book)](https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html) — The NIC reading and writing GPU HBM directly, no CPU staging. The packet's Level 2 keeps this as the reason RDMA collectives can reach line rate at all.
- [Rail-optimized topology (book)](https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html) — The book's rail diagram: same-index GPUs share a switch path, collapsing 3 hops to 1 for traffic the layout localizes. Our cut figure draws the cost side (oversubscription) of the same design space.
- [Incast flow (book)](https://mlsysbook.ai/vol2/03_network_fabrics/03_network_fabrics.html) — The book's many-to-one incast illustration with 256 senders. Ours recomposes the same event as a buffer-survival timeline: 640 us of hold against a <5 us overflow.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. An AllReduce step must move gradient shards off the node. On an H100-class node, per-direction bandwidth falls from NVLink inside the chassis to a single NDR InfiniBand port at the first hop off. By roughly what factor does the per-direction budget drop?
   - A. About 2×, the optical conversion at the transceiver adds latency while keeping the wire transfer rate nearly unchanged.
   - B. About 9×, from roughly 450 GB/s per direction inside the node to 50 GB/s on the NDR port, a gap that has held since 2016.
   - C. About 50×, because inter-node packets must be staged through CPU system memory and kernel TCP/IP stacks before transmission.
   - D. About 100×, since NVLink aggregates all eight GPUs' links while the fabric port serves the whole node through a single lane.

2. Using T(n) = α + n/β with the chapter's modeled anchors (α = 1.5 μs, β = 50 GB/s on NDR), compute the modeled time for a 4 KB pipeline control message, and identify which term dominates it.

3. The α-β model defines a crossover size n* = α·β (~75 KB on NDR). What does the crossover physically separate?
   - A. The regime where startup latency dominates from the regime where sustained bandwidth dominates, below n* buying more link rate buys almost nothing.
   - B. Copper-reachable links from optics-requiring links, since messages under n* stay inside the rack and their packets never reach the spine's pluggable optical modules.
   - C. Messages that fit in one packet from messages that need segmentation, below n* the NIC sends a single frame and skips all queuing.
   - D. Lossless delivery from best-effort delivery, the transport only engages RDMA credit accounting once the transfer exceeds the crossover size.

4. A training job keeps stalling on the same few fabric links while neighboring links sit idle. The fabric uses standard ECMP routing, which worked fine for web traffic. Why does ECMP produce persistent hot spots here?
   - A. ECMP requires per-packet reordering at the receiving NIC, and RDMA adapters cannot reorder flows, so colliding transfers stall on the hashed path until a timeout forces a reset.
   - B. ECMP was designed for optical circuits, and on electrical links the hash degenerates to a single active path per switch generation.
   - C. ECMP spreads flows evenly only when flows are many, small, and short-lived; training offers few, fat, synchronized flows, so hash collisions pin them onto shared paths for the whole run.
   - D. ECMP routes around failures but disables load balancing whenever PFC pause frames are active, which is nearly always during collectives.

5. A fat-tree is built from 64-port switches. Using the chapter's capacity rule (two tiers reach k²/2 hosts, three reach k³/4), how many hosts can a two-tier fabric serve, and what does a three-tier pod hold?

6. To cut switch count, a design team oversubscribes the spine 4:1 on a 1,024-GPU cluster (\$300M build). For a worst-placed ring AllReduce, what does the book's accounting show?
   - A. Crossing bandwidth halves and step time rises a few percent, an acceptable trade since collectives overlap compute anyway.
   - B. The loss is bounded by one rank's local NVLink rate, so the total slowdown caps near 9 times but converges toward baseline once rings overlap the spines.
   - C. Only small latency-bound messages suffer, since the 4:1 ratio still leaves each flow its full negotiated burst rate on average.
   - D. Bisection falls 25.6 to 6.4 TB/s, the collective quadruples from 0.20 s to 0.80 s, and the wasted compute is priced near \$142.1M.

7. Per-lane signaling moved from NRZ to PAM4 (4 levels, 2 bits per symbol). What is the primary physical trade-off this bought, and its consequence?
   - A. It spends clock rate for voltage levels: the symbol rate halves for the same throughput, so tight jitter budgets require active retimer chips inside every cable assembly.
   - B. It spends noise margin for symbol density: four levels cut the eye height, making forward error correction mandatory and adding ~300 ns to a three-hop one-way path.
   - C. It spends reach for rate: four levels only survive inside the package, so all board-level links moved to co-packaged optics first.
   - D. It spends idle cycles for density: four levels require continuous scrambling, which doubles idle power on links that carry no traffic.

8. 256 senders at 50 GB/s each converge on one 50 GB/s egress port with a 32 MB buffer. Roughly how long until the buffer overflows, and why can't congestion feedback prevent it?

9. On day 3 of a 30-day run, steps slow from 4.2 s to 4.8 s (+14%) and GPU busy rate reads 85% instead of 92%. Fleet dashboards show nothing. What does the chapter's debugging workflow find, and what is the systemic lesson?
   - A. A single link negotiated at half rate; a pairwise ib_write_bw bisects to it. The lesson is that synchronous steps transmit one link's degradation to every GPU while aggregate telemetry stays silent.
   - B. Thermal throttling on the ToR switch ASIC reducing port rates; the lesson is that switch cooling, not GPU cooling, ends up bounding sustained fabric throughput under load.
   - C. A driver regression in the collective library; the lesson is to pin NCCL versions across the fleet before launch.
   - D. Checkpoint traffic from a neighboring tenant's job; the lesson is that SR-IOV rate caps must be tightened before multi-tenant training.

10. RoCE is configured on the same 400 Gb/s links as InfiniBand NDR. At equal line rate, how do the modeled transfer times compare for a 4 KB control message and a 350 MB shard?
    - A. Both match NDR within ~1%, equal line rate means equal transfer time at every message size.
    - B. Both run ~4× slower on RoCE, the Ethernet header overhead multiplies against every byte regardless of size.
    - C. The 4 KB message matches but the shard diverges, since RoCE's lossless fabric halts large transfers whenever a PFC pause storm forms inside the shared Ethernet segment.
    - D. The 350 MB shard matches within ~1% but the 4 KB message stays several times slower, RoCE's ~5 μs alpha, not its rate, is the gap at small sizes.

11. Explain to a new engineer why 'upgrade the links from HDR to NDR' did not halve the job's collective time, and name the two independent levers the fabric actually offers.

## Answer key

1. B. NVLink 4 gives each GPU 450 GB/s per direction (900 GB/s bidirectional); the first hop off the node is a 400 Gb/s NDR port at 50 GB/s. The ~9× cliff is why placement, deciding what may cross the boundary, is the first-order fabric design decision.

2. T = 1.5 μs + 4,000 B / 50 GB/s = 1.5 + 0.08 = 1.58 μs. The startup term carries ~95% of the total, the transfer term is a rounding error at this size. Raising the link rate cannot fix a message that lives below the ~75 KB crossover.

3. A. At n* the transfer term n/β equals the startup α. Below it (~75 KB on NDR, ~62.5 KB on 100G RoCE) the fixed startup is most of the bill, so doubling the rate does nearly nothing. Above it bandwidth rules, and the same doubling halves the time.

4. C. Statistical multiplexing assumes many small independent flows. Lockstep collectives invert that: a handful of elephant flows start together, and a hash collision that lands two on one path persists for the duration. Adaptive routing exists precisely to repair this.

5. Two tiers: k²/2 = 64²/2 = 2,048 hosts. Three tiers: k³/4 = 64³/4 = 65,536, organized as pods of 1,024 in the chapter's scale-out. The exponent on radix is why next-generation switches that spend capacity on port count, not per-port rate, can collapse an entire tier.

6. D. The slowdown matches the oversubscription ratio on crossing traffic: 25.6→6.4 TB/s, 0.20→0.80 s. At ~30% of the step communicating, the throughput surrender prices to ~\$142.1M on a \$300M cluster, more than the switches it saved. Even 2:1 gives up 23.1%.

7. B. PAM4 doubles the bits per symbol at the cost of roughly a third of NRZ's SNR margin. The link can no longer run naked: FEC is required, and its encode-decode passes contribute ~100-300 ns per hop direction, inside the alpha term of every message.

8. Offered minus drained ≈ 12.75 TB/s, so the buffer fills in 32 MB / 12.75 TB/s ≈ 2.5 μs, under 5 μs at any accounting. A congestion-feedback round trip is itself ~5 μs: the signal cannot return before the buffer is gone. The bandwidth-delay product is only ~250 KB. Scheduling prevents incast; buffers only rename the loss.

9. A. The healthy link delivers ~96% of line rate on ib_write_bw; the measured pair showed 50%. One degraded lane transmitted a 2-3% step tax (after overlap) to all 1,024 GPUs, silent at fleet level, priced in the tens of thousands of dollars on a 737,280 GPU-hour run.

10. D. Same β makes the transfer term equal; RoCE's modeled startup is 5 μs vs NDR's 1.5 μs. At 350 MB the α difference is a rounding error (~1% total); at 4 KB it is most of the time. Protocol choice is a latency purchase more than a bandwidth one.

11. The α-β model splits every message into a fixed startup α and a per-byte rate β. HDR→NDR doubles β only. Messages below the ~75 KB crossover (control handoffs, small collectives) are almost all startup: α stays ~1.5 μs and they gain nothing. Only large transfers see the doubling, so the end-to-end gain lands under 25%. The two levers are startup (protocol path, hop count, FEC, queueing) and rate (per-port bandwidth, radix, oversubscription), and they fix different message sizes.

## Audio overview

[Listen to the Marcus & Iris read-along (~7 min)](https://benebsworth.com/study-audio/vol2/03-network-fabrics.m4a) — a generated podcast walking this packet's argument.
