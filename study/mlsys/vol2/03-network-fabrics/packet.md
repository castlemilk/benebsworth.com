---
openingQuestion: "During an AllGather on a SuperPOD scalable unit, 256 senders converge on one egress port. The switch buffer is 32 MB, which sounds generous. Roughly how long does the buffer hold before it overflows: a second, a millisecond, or microseconds?"
---

# Network Fabrics: Study Packet

*Working through [Network Fabrics](https://mlsysbook.ai/books/vol2/03_network_fabrics/03_network_fabrics.html), chapter 3 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The fabric is not a bandwidth pipe; it is a synchronization mechanism with a physics, and the bill arrives at the slowest link.** The buffer answer is microseconds: 256 senders each driving 50 GB/s offer 12.8 TB/s into a port that drains at 50 GB/s, so the 32 MB buffer holds 640 μs of backlog in theory but overflows in under 5 μs in practice. That is the chapter in one number pair: ==the offered load outruns the drain 256 to 1=={256 senders × 50 GB/s NDR = 12.8 TB/s offered into a 50 GB/s egress; the bandwidth-delay product at a 5 μs feedback round trip is only 250 KB, so congestion feedback arrives hundreds of kilobytes too late.}, and no bandwidth figure on the spec sheet tells you the fabric can absorb a synchronized burst. The staircase that produces the cliff lives at [the bandwidth cliff figure](#fig-bandwidth-cliff); the model that prices message size at [the alpha-beta map](#fig-alpha-beta-map).

> [!note] How to read this packet
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Synchronization Backbone

Chapter 2 ended at the node boundary: 8 GPUs on NVLink 4, 450 GB/s per direction each. This chapter picks up where the node ends: the first hop off the node is a 400 Gb/s NDR InfiniBand port, ==50 GB/s per direction=={450 → 50 GB/s is a ~9× per-direction cliff. NVLink 5 (B200) doubles the inside to 900 GB/s per direction while XDR doubles the outside to 100 GB/s; the ratio holds. The aggregate NVLink budget has exceeded external-port budgets since NVLink's first product year in 2016, and the gap has never closed.}. Everything the fabric does is downstream of that ratio: what crosses the node boundary is nine times narrower than what moves inside it.

What crosses is ==collectives=={AllReduce sums a gradient across workers and returns it to all; AllGather concatenates shards; AllToAll exchanges pairwise slices (MoE expert traffic, tensor-parallel activations). AllReduce and AllToAll stress bisection bandwidth; AllGather's synchronized fan-in is the incast generator.}: a 175B-parameter model at FP16 produces a 350 GB gradient every step, and the synchronous step ends when the last contribution lands. The fabric is the gradient bus, the memory bus of the fleet.

::fig[bandwidth-cliff]

## The Workload Inversion

The five-level model organizes the chapter: wire and link, transport, switch and topology, fabric behavior, and cluster design. Each level hides a case where ==generic data-center intuition fails=={Web fleets assume many small independent requests, statistical multiplexing, drop-tolerant TCP, and north-south traffic. ML inverts each: flows are elephant-sized, lockstep-synchronized, loss-intolerant at the transport, and mostly east-west between accelerators. ECMP hashing that spreads web flows evenly maps training's few fat flows onto colliding paths and produces persistent hot spots.}. The inversion is why the rest of the chapter's machinery (RDMA, lossless transport, PFC, rail-optimized topology) exists at all.

## Level 1: Wire and Link

PAM4 moved the industry to 4-level signaling: ==2 bits per symbol instead of NRZ's 1=={Four voltage levels lose most of the signal-to-noise margin, so forward error correction became mandatory. FEC costs real time: ~100-300 ns across a three-hop one-way path and up to ~1,200 ns on a six-hop round trip, latency that lands inside the alpha term below.}, doubling per-lane rate while spending margin. That margin also shortens copper's reach: ==DAC dies at 1-3 m=={Passive copper reach shrinks as per-lane rate climbs; active optical cables stretch to 3-30 m, and pluggable optics own everything past ~30 m. A spine link in a fat-tree is an optical module at each end.}, which matters because the modules are not cheap or free of power.

Optics are a power line item, not an afterthought: a 400G pluggable module draws ~20 W, and a 10,000-GPU cluster's ~20,000 spine-side modules draw ==~400 kW just to move light=={About 10% of GPU power goes to the interconnect: ~3 switch-side ports per GPU at ~25 W is ~75 W against a 700 W H100. The 400 kW spine figure counts module ends only, before switch ASICs.}.

## Level 2: Transport and the Alpha-Beta Model

RDMA removes the kernel from the data path: NICs read and write registered memory directly, and GPUDirect extends that to HBM, so a gradient goes GPU memory to wire without staging through CPU RAM. InfiniBand does this natively; RoCE carries it over Ethernet (v2 over UDP/IP). The choice matters less than ==what loss means on each=={InfiniBand's link layer is lossless by credit; RoCE needs the Ethernet fabric configured lossless too, which is where PFC (below) enters. A drop on a lossy path triggers retransmission across a feedback round trip: at 50 GB/s and 5 μs RTT, one lost packet resends ~250 KB of flight.}.

The performance model is one line: time is a fixed startup plus size over sustained rate.

::eq[alpha-beta]

$$
T(n) = \alpha + \frac{n}{\beta}
$$

::eq[crossover]

$$
n^{*} = \alpha \cdot \beta \approx 75\ \mathrm{KB\ (NDR)}
$$

With the chapter's modeled anchors (α = 1.5 μs on NDR, 5 μs on RoCEv2; β = 50 GB/s and 12.5 GB/s), the model says the ==small message buys latency, not bandwidth=={4 KB control message: 1.58 μs on NDR vs 5.32 μs on 100G RoCE, a 3.4× gap that is almost all alpha. 350 MB gradient shard: 7.0 ms vs 28.0 ms, a 4× gap that is almost all beta. Below the crossover (α·β ≈ 75 KB on NDR) the transfer term is a rounding error; doubling link rate cannot fix the wrong half.}. Measured reality is worse: NCCL AllReduce on one NVSwitch node shows a ==~17 μs floor, not 1.5=={The measured curve sits an order of magnitude above the model at small sizes and runs up to ~2× the model mid-range, converging only past a knee at a few MB. Effective per-collective alpha on a real stack is ~1-3 μs for NDR and ~5-10 μs for RoCE. The model ranks paths and sizes correctly; it does not predict the floor.}.

::fig[alpha-beta-map]

## Level 3: Switch and Topology

The top-of-rack switch is ==the failure domain boundary=={A ToR failure isolates its rack's GPUs; the design question is how much of a job lives inside one domain. A 64-port leaf at 1:1 puts 32 ports down and 32 up, matching the 32-GPU rack.}, and the fat-tree math falls out of the port count: with radix k, two tiers reach k²/2 hosts and three reach k³/4.

::eq[fattree-hosts]

$$
H_{2} = \frac{k^{2}}{2}, \qquad H_{3} = \frac{k^{3}}{4}
$$

For k = 64 (Quantum-2 class), that is ==2,048 hosts in two tiers, 65,536 in three=={A three-tier pod holds 1,024 hosts; the four-pod scale-out is 4,096. The same arithmetic runs in reverse for next-generation silicon: a 102.4 Tb/s ASIC exposing 64 × 1.6 Tb/s ports can spend capacity on radix instead of rate, and k²/2 growth is what flattens a three-tier cluster to two.}.

Saving money with oversubscription costs exactly the ratio: a 4:1 spine ==quarters bisection and quadruples crossing time=={1:1 bisection is 25.6 TB/s vs 6.4 at 4:1. Worst-case placement of a ring AllReduce across the cut runs 0.80 s instead of 0.20 s; at 30% of the step communicating and a \$300M cluster, the book prices the 4:1 design's waste at ≈\$142.1M. A 2:1 spine still gives up 23.1% of throughput.}. Rail-optimized topologies keep each rank-index's traffic on one switch where the model allows it: ==3 hops collapse to 1=={Same-rail exchange is one switch hop vs source-leaf, spine, destination-leaf (3 hops at ~0.6 μs each), a 3× hop-count reduction on traffic the topology was built to localize.}.

::eq[oversubscription]

$$
T_{comm}(r) \approx r \cdot T_{comm}(1{:}1)
$$

::fig[fattree-cut]

Alternatives buy different trade-offs: a 16-ary 3D torus holds the same 4,096 endpoints with a diameter of 24 hops and ==512 links crossing the bisection cut vs the fat-tree's 2,048=={Bisection ordering on the scenario: torus < rail < dragonfly < fat-tree. Tori and dragonflies trade worst-case cut bandwidth for fewer long links and shorter cables; fat-trees buy uniform worst-case bandwidth at the price of the deepest spine.}. Optical circuit switches add reconfigurability: the topology itself can be rewired at millisecond scale.

## Level 4: Congestion, PFC, and Incast

Lossless transport needs back-pressure, and PFC is the blunt version: ==a pause frame stops all traffic on a priority class=={PFC cannot distinguish victims from causes; pause storms propagate upstream, cyclic buffer dependency deadlocks the fabric, and recovery needs a watchdog that drops the lossless guarantee briefly. The cure is end-to-end congestion control (DCQCN, HPCC) marking rates before queues build, plus adaptive routing so flows do not pile onto hash-collided paths.}.

Incast is the burst the opening case priced: a synchronized collective has ==all senders finishing at once=={32 MB at 50 GB/s holds 640 μs of traffic in the steady state, but the arrival burst oversubscribes the egress 256×, so the buffer overflows in a few microseconds, before any 5 μs feedback signal can even return. Deeper buffers buy microseconds, not safety; the fix is scheduling and rate control, not hardware.}.

::eq[incast-overflow]

$$
t_{hold} = \frac{B_{buf}}{BW_{egress}} \ll t_{rtt}
$$

::fig[incast-cascade]

## Level 5: Cluster Design

At the top level the fabric is ==the gradient bus at cluster scale=={DGX SuperPOD builds 1,024 GPUs as four 256-GPU scalable units; Meta's Grand Teton pairs two clusters of equal size and equal endpoint rate, one InfiniBand and one RoCE, an A/B experiment at fleet scale. The design questions are SU size, oversubscription at each tier, and where the collective's crossing traffic lands.}.

## Virtualization

SR-IOV slices one NIC into eight virtual functions with rate caps: ==isolation, not immunity=={A neighboring job's 100 GB checkpoint at 50 GB/s occupies the port for 2 s regardless of the VF split; virtualization meters the queue, not the physics.}.

## Monitoring and Debugging

The debugging case is the quietest number in the chapter: on day 3, step time moves 4.2 s to 4.8 s ==(+14%) with GPU busy rate dropping 92% to 85%=={The workflow bisects by pair: a pairwise ib_write_bw reports one link at half the healthy rate (96% payload efficiency is normal). The cause was a single degraded lane negotiation, invisible to fleet-level dashboards.}, and the silent version never fires an alarm at all: a transceiver degrading 10% of one link's bandwidth slows every step 2-3% on a ==737,280 GPU-hour run=={1,024 GPUs × 30 days; the book prices the silent waste in the tens of thousands of dollars. In a 4,096-GPU RoCE cluster the exposure is 12,288 links and 24,576 transceivers, and at 0.001% per module per day the probability that something is degrading today is ~22%.}.

::eq[silent-tax]

$$
W = N \cdot T_{run} \cdot f_{slow} \cdot r_{gpu}
$$

## What Moves the Ceiling

XDR doubles the port to 800 Gb/s; Ethernet roadmaps point at 1.6 Tb/s, and ==one 1.6T port is four 400G ports=={A 102.4 Tb/s ASIC equals 64 × 1.6T ports; spending capacity on radix instead of rate is what collapses a tier.}. Co-packaged optics moves the optical engine from the faceplate to the package: ==~1.28 kW saved per switch=={64 ports × 20 W pluggable module power, before the ASIC's own savings from a shorter electrical path. The SerDes-to-optics path shrinks from centimeters to millimeters.}. Disaggregation (composable fabrics, CXL-style pooling) pushes the same logic up a level: the interconnect becomes the machine's backplane.

## Fallacies and Pitfalls

The chapter's own audit, the ones the numbers above refute directly:

- ==Doubling the link rate halves transfer time=={HDR→NDR doubles beta and leaves alpha untouched; the end-to-end speedup lands under 25%, not 100%. Only messages well past the ~75 KB crossover see the full doubling.},
- ==Raw bandwidth numbers are comparable across fabrics=={NDR's 400 Gb/s and 400GbE's 400 Gb/s differ in delivery efficiency (ib_write_bw sees ~96% payload on a healthy link) and far more in alpha; the header rate is not the achieved rate.},
- ==Oversubscription is a free cost saving=={The 4:1 spine's \$142.1M waste on a \$300M cluster exceeds the switches it saved; bisection is priced by the collective's worst crossing, not the average.},
- ==Buffers absorb incast=={A 32 MB buffer overflows in <5 μs at 256× oversubscription; buffers buy microseconds, scheduling buys safety.},
- ==The network is fine if the GPUs are busy=={nvidia-smi still reads 85-92% busy while one degraded link silently taxes every step; link-level telemetry, not device dashboards, holds the truth.}.

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
