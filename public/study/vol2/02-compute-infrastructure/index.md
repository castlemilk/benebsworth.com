---
title: "Compute Infrastructure — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html"
canonical_url: "https://benebsworth.com/study/vol2/02-compute-infrastructure/"
---

# Compute Infrastructure: Study Packet

Your serving fleet must decode a 2 TB model under a 150 ms per-token floor. Option A advertises 4,000+ TFLOP/s FP8 on HBM3 (~8 TB/s); option B is a next-generation part with half the FLOPs but HBM4 (~16 TB/s). The FLOP-heavy spec sheet looks obviously better. Which part actually meets the floor?

*Working through [Compute Infrastructure](https://www.mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html), chapter 2 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The nameplate is a promise the hierarchy won't keep.** A chip's peak FLOP rate exists only above its roofline ridge, the node's memory holds only a slice of the job's state, and every step down the bandwidth staircase, from HBM to NVLink to InfiniBand to storage, drops throughput roughly an order of magnitude while latency climbs. Compute infrastructure is the discipline of reading which wall actually binds at each level: silicon, package, node, rack, pod. Option B wins the opening case: at batch-1 decode the job moves **2 TB of weights per token, so only memory bandwidth sets the floor** *(why it matters: 2 TB ÷ 8 TB/s ≈ 250 ms on HBM3, over target; ≈125 ms on HBM4, under it. The 4,000 TFLOP/s column never enters the arithmetic, because batch-1 decode runs at 1 FLOP per byte and sits far below the ridge.)*. The staircase lives at [the bandwidth figure](#fig-bandwidth-staircase); the roofline that explains it at [the ridge map](#fig-ridge-map).

> **note: How to read this packet**
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Infrastructure Walls

The chapter runs one scenario end to end: a 1,024-GPU reference cluster (128 nodes of 8 GPUs) training GPT-3's 175B parameters at FP16, on 400 Gb/s InfiniBand NDR, inside a ~100 MW facility. Three walls frame everything below: the **memory wall** *(why it matters: Compute per device has grown ~18× (dense FP16, V100→B200 era) while memory bandwidth grew ~8.9× and power ~3.3×, so the arithmetic intensity required to keep a chip fed roughly doubles every hardware generation. The wall is not that memory is slow; it is that compute outgrows feeding it.)*, the **power wall** *(why it matters: A DGX H100 rack draws 33.5 kW where a traditional enterprise rack draws ~12 kW; seven years of packages took TDP from ~300 W toward ~2,000 W. Cooling and electrical delivery, not silicon, now bound rack density.)*, and the **scale wall** *(why it matters: At 25,000 GPUs the fleet MTBF is ~2 hours (ch1); the infrastructure itself, rails, cooling, fabric, power sequencing, must be engineered for interruption, not just for speed.)*.

## The Accelerator and the Nameplate

The H100 SXM carries 132 SMs; its spec sheet leads with >900 TFLOP/s dense FP16 (and >1,000 TFLOP/s in FP8, where ~half the per-watt gain over FP16 comes from the lower precision itself). The B200 pushes past 4,000 TFLOP/s FP8 at a 1,000 W TDP with 1,800 GB/s of NVLink. Two structural tricks hide inside those numbers: **chiplet packaging** *(why it matters: A single reticle exposure tops out at 26×33 mm ≈ 858 mm². B200's dual-die footprint exceeds one reticle, so the package stitches two dies with a die-to-die link faster than the chip's own NVLink total. The "one chip" in the spec sheet is already two.)* and **precision as a throughput dial** *(why it matters: The same silicon advertises a different peak per precision: FP16 ≈900 TFLOP/s, FP8 >1,000 on H100; 175B of FP16 weights needs 5×80 GB devices, INT8 needs 3, INT4 needs 2. Precision is a capacity and rate lever, not just an accuracy one.)*.

At the exotic end, Cerebras' WSE-3 puts 900,000 cores and 44 GB of on-wafer SRAM on one wafer, trading the network problem for a capacity wall (44 GB cannot hold 175B of FP16 weights). TPU pods aggregate instead: a TPU v3 pod exceeds 100 PFLOP/s through its ICI fabric.


**The bandwidth staircase — each tier ~7–9× down**

| Hierarchy tier | GB/s per GPU |
|---|---|
| HBM3 (on-package) | 3350 |
| NVLink (in-chassis) | 900 |
| InfiniBand NDR (fabric) | 50 |
| Storage (network) | 7 |

*Per-GPU data-movement bandwidth at each hierarchy boundary on H100: on-package HBM3 3.35 TB/s, NVLink 900 GB/s, InfiniBand NDR 50 GB/s, storage ~7 GB/s. Drops of 7.4×, 9× and 7.1× decide which kind of parallelism may live on each tier.*

## The Memory Wall

The roofline makes the wall quantitative. A kernel's time is bounded below by **the larger of compute time and memory time** *(why it matters: T ≥ max(FLOPs ÷ peak rate, bytes ÷ bandwidth). Below the ridge intensity the memory term governs; above it, the compute term. This is the iron law from volume I wearing a memory-bound lens.)*:

**Eq 1 · Roofline time bound**
$$
T \geq \max\!\left(\frac{F}{r_{peak}},\ \frac{B}{BW_{mem}}\right)
$$

The crossover, the **ridge point** *(why it matters: H100 at FP16: peak ≈ 989 TFLOP/s ÷ 3.35 TB/s ≈ 295 FLOP/byte. Any workload with intensity below ~295 FLOP/B is memory-bound on this part, and batch-1 decode sits at 1 FLOP/B, using about 0.34% of the advertised peak.)*, tells you whether the nameplate is reachable at all:

**Eq 2 · Ridge-point intensity**
$$
I^{*} = \frac{r_{peak}}{BW_{mem}} \;\;(\approx 295\ \mathrm{FLOP/B\ on\ H100\ FP16})
$$

Decode serving is the wall's sharpest case: at batch 1 the model reads every weight once per token, an intensity of **1 FLOP per byte** *(why it matters: Nearly 300× below the H100 ridge. Batching rescues intensity linearly only while other terms don't bind; this is why serving economics obsess over KV cache and why the token floor is a bandwidth statement, not a compute one.)*. The per-token floor is therefore bytes ÷ bandwidth:

**Eq 3 · Decode latency floor**
$$
t_{token} \geq \frac{W_{bytes}}{BW_{mem}} \;\;(\sim 250\ \mathrm{ms\ at\ 2\ TB,\ 8\ TB/s})
$$

The wall is also an energy wall: an HBM operand fetch costs ~30-60× the energy of the MAC that consumes it (~63.5 units against ~1-2), and off-package DRAM sits another ~5× above HBM per bit. HBM3 widens the interface and lowers per-bit signaling energy by stacking dies on an interposer centimeters from the logic, one stack supplies ~670 GB/s, and the interposer spans ≥10× the stack area. This is why bandwidth cannot be bought after the fact: it is baked into the package.

![Below the ridge the nameplate is fiction](https://benebsworth.com/study/vol2/02-compute-infrastructure/diagrams/ridge-map.svg)

*Roofline landscape: the ridge sits at ~295 FLOP/byte on H100 FP16. Batch-1 decode (1 FLOP/B) uses ~0.34% of peak; batch-32 decode and the CNN point still sit below; 512-token prefill and training clear it. The workload, not the chip, picks the wall.*
## Sustained Compute and Precision

Peak is a laboratory number; **sustained throughput is what fits in the schedule** *(why it matters: Measured as model FLOPs usage (MFU): achieved rate ÷ nameplate. A run estimated at 1,000 GPU-hours from peak needs 2,500 real hours at MFU 0.4. Every plan that books peak rate under-books the job by 1/MFU.)*:

**Eq 5 · Sustained GPU-hours**
$$
H_{needed} = \frac{H_{peak}}{MFU} \;\;(1{,}000 \to 2{,}500\ \mathrm{GPU\!-\!h\ at\ MFU\,0.4})
$$

Precision plays the same trick at the device level: the FP8 column on the spec sheet is a second nameplate reachable only if the model tolerates the format, the kernels exist, and the run actually converts (the book's FP8 accounting shows ~2× of the H100's per-watt gain is the precision change alone). Always ask **which nameplate the plan priced** *(why it matters: A GPU-hour budget computed at FP8 peak and run at FP16 throughput is a 2× budget error before MFU is even considered.)*.

## The Node

Inside the chassis the staircase is literal. Each boundary drops bandwidth and raises latency:

- **HBM3** 3.35 TB/s on-package
- **NVLink** 900 GB/s bidirectional (450 GB/s per direction), a 7.4× drop
- **InfiniBand NDR** 50 GB/s per port, another 9× drop
- **Storage** ~7 GB/s, 7.1× further

![Four tiers, three falls](https://benebsworth.com/study/vol2/02-compute-infrastructure/diagrams/bandwidth-staircase.svg)

*Per-GPU bandwidth down the hierarchy: HBM3 3.35 TB/s, NVLink 900 GB/s (7.4× down), InfiniBand NDR 50 GB/s (9×), storage 7 GB/s (7.1×). Each step also raises latency. Parallelism maps onto the stairs: TP stays inside NVLink, PP crosses nodes, DP tolerates the fabric.*
The numbers decide where parallelism may live. Tensor parallelism's frequent small exchanges (<1 ms each on NVLink) belong inside the node, the same exchanges over PCIe would put ~47% of the step in communication versus ~11% on NVLink. Pipeline parallelism's rare large sends can cross nodes; data parallelism's infrequent gradient all-reduce tolerates the fabric. Meanwhile the node's own memory partitions the job: eight 80 GB devices give 640 GiB of HBM against **~2.1 TB of static training state** *(why it matters: For the 175B reference model at the standard FP16 layout: ~350 GB weights + ~350 GB gradients + ~1.4 TB FP32 optimizer moments and master weights, roughly 12 bytes per parameter. ZeRO-3 sharding inside one node would still leave each GPU holding over 3× its HBM.)*:

**Eq 4 · Static training state**
$$
S_{static} \approx 12 \times P\ \mathrm{bytes} \;\;(\sim 2.1\ \mathrm{TB\ at\ }P{=}175\mathrm{B})
$$

The reference layout answers with TP=8 × PP=8 × DP=16: tensor parallelism stays on the node's NVSwitch fabric (four switch chips in a DGX H100, whose fabric alone outdraws a whole V100), pipeline stages cross nodes, and data parallel replicas spread across the fleet, with ~42 GB of headroom per GPU and ~13 GB/GPU once FP32 state shards across replicas. Reliability compounds at the node too: **the node's MTBF is a composite** *(why it matters: Every component (GPU, CPU, NIC, drive, power supply) contributes its own failure rate; the node's outage rate is the sum. An eight-GPU node fails far more often than any GPU in it, which is why health checking runs at node granularity.)* of every component inside it:

**Eq 6 · Composite node failure rate**
$$
\lambda_{node} = \sum_{i} \lambda_{i} \;\;\Rightarrow\;\; MTBF_{node} < MTBF_{component}
$$

## The Rack

The rack is where silicon meets plumbing. A DGX H100 rack draws 33.5 kW of IT power versus ~12 kW for a traditional enterprise rack; eight InfiniBand cables leave each node (one per GPU); 32 racks house the 1,024-GPU cluster. Heat flux is the binding number: an H100's 700 W spread over ~814 mm² is **~86 W/cm², well past air's practical range** *(why it matters: Air needs tens of liters per second to carry what ~0.01 L/s of water moves, water's specific heat is over four times air's per volume and copper conducts far better than air. The flow-rate difference is thousands-fold, which is why direct-to-chip liquid stops being optional at ~1,000 W packages.)*. A GB200-class NVL72 rack needs ~170 L/min of coolant at a 10 K rise.

Power is also dynamic: a synchronized training step swings the cluster's draw by >300 kW in a ramp measured in GW/s, and provisioning for the ~500 W average rather than the 700 W TDP is how you trip breakers on the first all-reduce. Even the voltage rail notices: a 300 W step at 0.8 V is several hundred amperes of current slew, and decoupling capacitance is what keeps the droop inside tolerance.

![Power compounds up the hierarchy](https://benebsworth.com/study/vol2/02-compute-infrastructure/diagrams/power-ladder.svg)

*700 W at the die becomes ~10 kW at the node, 33.5 kW at the rack, and ~8 MW at the pod. Each rung is a different engineering discipline: transistor, chassis, cooling loop, facility.*
## The Pod

![2.1 TB of state against 640 GiB of node](https://benebsworth.com/study/vol2/02-compute-infrastructure/diagrams/state-budget.svg)

*The 175B reference job's static state: ~350 GB weights + ~350 GB gradients + ~1.4 TB FP32 optimizer state, against 8×80 GB of node HBM. ZeRO-3 inside one node still leaves each GPU holding over 3× its capacity — the optimizer term is the one that breaks the budget.*
At pod scale the room becomes the computer. Eight scale-ups of the reference cluster means 1,024 nodes, >130 metric tons of hardware, and 7-10 MW of rack power with ~9.9 EFLOP/s of aggregate FP16, and a job-level interruption roughly every **five hours** *(why it matters: The composite of node-level composite rates. Facility commissioning, power sequencing, and fabric bring-up are on the critical path months before the first checkpoint writes.)*. The training math layers over ch1's physics: a ~24 h compute-only baseline becomes ~51 h once failure-recovery and maintenance overhead are priced in; the reference cluster's compute-only ~8 days for the run is a floor, not a plan.

## Accelerator Selection

Selection is the chapter's applied payoff: match the **workload's intensity to the part's ridge** *(why it matters: Batch-1 decode at 1 FLOP/B cares only about memory bandwidth and capacity; a 512-token prefill or training step above the ridge cares about peak FLOPs. The same model is a different purchase at different batch sizes and phases.)*. The running example makes it concrete: serving 175B at ~13 ms per TP-8 decode step needs on the order of 100 replicas, a serving fleet about the size of most of the reference cluster. And scale itself is priced honestly: measured efficiency falls from 256 to 1,024 to 8,192 GPUs, so eight times the accelerators buys less than eight times the speed.

Comparisons need a common currency. The chapter normalizes by equivalent H100-hours (H100/A100 ≈ 3.2×, H100/V100 ≈ 7.9× per generation of peak), because an hour on a B200 is not an hour on an A100. In-fleet GPU-hours also beat standalone pricing: the cluster's reservation amortizes what a single rental cannot.

## Fallacies and Pitfalls

- **Reading the FP8 column as the chip's speed**, it is a second nameplate gated by model tolerance and kernel support; the FP16 column is what the run actually gets.
- **Scheduling at peak**: MFU under 1 means the booked hours are optimistic by 1/MFU before a single failure occurs.
- **Treating bandwidth as uniform**: each hierarchy boundary drops it ~7-9×; a tensor-parallel ring across InfiniBand is a different machine than one across NVSwitch.
- **Provisioning power at the average**: synchronized steps ramp hundreds of kW in GW/s; breakers see the TDP, not the mean.
- **Weights fit, so the job fits**, static state is ~12 bytes/param; the optimizer dominates the budget and offloading it alone does not make the node fit.
- **Wafer-scale eliminates the network**, 44 GB of SRAM eliminates chip-to-chip links and replaces them with a capacity wall larger than the network was.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Reference cluster | 1,024 GPUs = 128 nodes × 8, GPT-3 175B | The chapter's running scenario |
| H100 SXM | 132 SMs; >900 TF/s FP16; >1,000 TF/s FP8; 700 W | Nameplate vs sustained |
| B200 | >4,000 TF/s FP8; 1,000 W; 1,800 GB/s NVLink; 180 GB HBM | ~55% of GPT-3 FP16 weights on one package |
| Generational growth | compute 18× / bandwidth 8.9× / TDP 3.3× (7 yr) | Required intensity ~doubles per gen |
| Efficiency | V100→B200 ~5.4×; ~1.2×/yr (~4 yr doubling) | Slow end of the improvement curve |
| Reticle limit | 26×33 mm ≈ 858 mm²; H100 die ~814 mm² | Why B200 is two dies |
| H100 ridge (FP16) | ≈ 295 FLOP/byte | Nameplate only reachable above it |
| Decode intensity | 1 FLOP/byte → ~0.34% of peak | Why serving buys bandwidth |
| Token floor | t ≥ W/BW: 2 TB → ~250 ms (HBM3), ~125 ms (HBM4) | The opening question's arithmetic |
| Bandwidth staircase | 3.35 TB/s → 900 GB/s (7.4×) → 50 GB/s (9×) → 7 GB/s (7.1×) | Where each parallelism may live |
| Energy per operand | HBM fetch ~30-60× the MAC; DRAM ~5× HBM | The wall is also an energy wall |
| HBM3 vs DDR5 | ~17× bandwidth; ~670 GB/s per stack; interposer ≥10× stack | Bandwidth is baked into the package |
| Static state | ~12 B/param → ~2.1 TB at 175B vs 640 GiB node HBM | Why sharding is mandatory |
| Reference layout | TP8 × PP8 × DP16; ~42 GB headroom; ~13 GB/GPU sharded | Parallelism mapped onto the staircase |
| Node comm share | NVLink ~11% vs PCIe ~47% of step | Why TP stays in the chassis |
| DGX rack | 33.5 kW vs 12 kW traditional; 8 IB cables/node; 32 racks | Power and cabling at rack scale |
| Heat | H100 ~86 W/cm²; ~170 L/min at 10 K rise (GB200 rack) | Why liquid is not optional |
| Power dynamics | >300 kW step ramp, GW/s rate; rail droop at 0.8 V | Provision TDP, not the average |
| Pod | 1,024 nodes >130 t; 7-10 MW; ~9.9 EFLOP/s FP16; MTBF ~5 h | The room is the computer |
| Run time | ~24 h compute-only → ~51 h with failure+maintenance | Physics vs plan |
| Precision fit | 350 GB weights: FP16 5 → INT8 3 → INT4 2 devices | Precision is a capacity dial |
| Selection | TP-8 decode ~13 ms; ~100 replicas; eff falls 256→8,192 | Match intensity to ridge |

## Glossary

- **Nameplate**: the advertised peak rate of a part; reachable only above the ridge and below sustained-throttling limits.
- **Roofline model**: bound T ≥ max(compute time, memory time); ridge point where the two terms cross.
- **Ridge point** ($I^*$): peak rate ÷ memory bandwidth; the intensity a workload must exceed to be compute-bound.
- **Arithmetic intensity**: FLOPs per byte moved; decode at batch 1 is 1 FLOP/B, training can exceed 2,000.
- **Bandwidth hierarchy**: the staircase HBM → NVLink → IB → storage, each step ~7-9× slower and higher-latency.
- **HBM**: stacked DRAM dies on an interposer beside the logic; ~670 GB/s per stack, baked into the package.
- **NVLink / NVSwitch**: intra-node accelerator fabric (900 GB/s bidirectional on H100) and the switch chips that all-to-all it.
- **Chiplet / reticle**: a die pattern limited to ~858 mm² per exposure; multi-die packages stitch past it.
- **MFU**: model FLOPs usage, achieved ÷ nameplate; the conversion between paper hours and booked hours.
- **Static state**: weights + gradients + optimizer moments, ~12 bytes per parameter at the standard layout.
- **TP / PP / DP**: tensor, pipeline, data parallelism; ordered by exchange frequency from intra-node to cross-fleet.
- **TDP**: thermal design power; the sustained draw the cooling and rails must survive, not the average.
- **PUE**: facility power ÷ IT power; liquid cooling lowers it while raising rack density.
- **WSC**: warehouse-scale computer; the pod as one machine, ~10 EFLOP/s of FP16 with a ~5 h composite MTBF.
- **Equivalent H100-hours**: normalizing currency for cross-generation comparisons (H100/A100 ≈ 3.2×).

## → Ben's world

- **The staircase is your `→` budget.** Same shape as the droplet: HBM↔NVLink↔IB↔storage is 3.35T→900→50→7 GB/s; your co-located services' loopback↔LAN↔WAN↔disk staircase is why the crawler's fan-out design mattered more than its concurrency count. Every parallelism decision is a which-tier-does-this-exchange-live-on decision.
- **Provision the TDP, not the average.** The 300 kW step-ramp breaker story is your p99-versus-mean lesson again, one layer down: provisioning for average draw is the same bug as provisioning for average latency.
- **Precision as a capacity dial.** The 5→3→2 device count for FP16→INT8→INT4 is the same tradeoff you make choosing float vs quantized weights for the local-LLM bench, Ollama's q4 models fit where fp16 wouldn't, and the ridge argument says the memory-bound decode path barely notices the FLOPs it gives up.
- **MFU is the honest-hours conversion.** The benchmark's tok/s numbers are your MFU: nameplate says 4,000 TFLOP/s, the achieved column says something else. Quoting either alone is the same error as quoting peak.

## Open questions

- The node composite-MTBF section lists components but not the per-part rates the ~5 h pod number assumes; which component dominates the sum in practice?
- The 8.71 s reference step recurs from ch1 with TP8×PP8×DP16 now named; how does the compute/bubble/exchange split move under TP8×PP4 with the extra headroom spent on a larger microbatch?
- Equivalent-H100-hours normalizes by peak ratio (3.2×/7.9×); does the normalization hold for memory-bound work where the bandwidth ratio differs from the peak ratio (HBM3 vs HBM2e is ~1.65×)?


---

## Key equations

**Eq 1 · Roofline time bound**

$$
T \geq \max\!\left(\frac{F}{r_{peak}},\ \frac{B}{BW_{mem}}\right)
$$

*A kernel's time is bounded by the worse of its compute term and its memory term. Below the ridge intensity the bandwidth term governs — the nameplate rate is unreachable no matter how the kernel is tuned.*

**Eq 2 · Ridge-point intensity**

$$
I^{*} = \frac{r_{peak}}{BW_{mem}} \approx 295\ \mathrm{FLOP/byte} \ \text{(H100 FP16)}
$$

*The arithmetic intensity where compute time and memory time balance. Workloads below I* are memory-bound; above it, compute-bound. Compute growing 18× against bandwidth's 8.9× pushes the ridge right each generation — the same part needs ~2× the intensity to stay fed.*

**Eq 3 · Decode latency floor**

$$
t_{token} \geq \frac{W_{bytes}}{BW_{mem}}
$$

*At batch 1 every token re-reads all weights, so the floor is weight bytes divided by bandwidth. A 2 TB model: ~250 ms/token on ~8 TB/s HBM3, ~125 ms on HBM4. FLOPs never enter the formula — the opening question's answer.*

**Eq 4 · Static training state**

$$
S_{static} \approx 12 \times P\ \mathrm{bytes}
$$

*FP16 weights (2 B/param) + FP16 gradients (2 B/param) + FP32 optimizer moments and master weights (~8 B/param): ~12 bytes per parameter before activations. 175B params → ~2.1 TB against 640 GiB of node HBM — sharding is mandatory, and the optimizer term dominates.*

**Eq 5 · Sustained GPU-hours**

$$
H_{needed} = \frac{H_{peak}}{MFU}
$$

*Peak-rate estimates are optimistic by 1/MFU. A job quoted at 1,000 GPU-hours from the nameplate books 2,500 real hours at MFU 0.4 — before a single interruption. Plans priced at peak under-budget the run.*

**Eq 6 · Composite node failure rate**

$$
\lambda_{node} = \sum_{i} \lambda_{i} \ \Rightarrow\ MTBF_{node} < MTBF_{component}
$$

*Every component in the node — GPU, CPU, NIC, drive, PSU — adds its own failure rate. An eight-GPU node interrupts more often than any part inside it, which is why health monitoring and replacement run at node granularity and why the pod composes to a ~5 h job MTBF.*

## Charts

**Precision is a capacity dial — 350 GB of GPT-3 weights**

| Weight precision | Devices for weights only |
|---|---|
| FP16 (2 B/param) | 5 |
| INT8 (1 B/param) | 3 |
| INT4 (0.5 B/param) | 2 |

*Devices needed just to hold 175B of weights on 80 GB accelerators: 5 at FP16, 3 at INT8, 2 at INT4. The same silicon spec carries a different nameplate per precision — and the weights fit differently too.*


## From the book

- [Roofline model (book)](https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html) — The book's decode-focused roofline with the landscape points annotated. Ours keeps the ridge and the five workload dots so the memory-bound verdict for decode reads at a glance.
- [Bandwidth hierarchy (book)](https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html) — The book's tier diagram including the latency direction. Ours draws the four drops as a literal staircase with the 7.4×/9×/7.1× multipliers between steps.
- [GPU architecture evolution (book)](https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html) — The accelerator spectrum from CPU through GPU/TPU to wafer-scale as the book lays it out. Ours compresses the lesson to the 18×/8.9×/3.3× growth split in the physics table.
- [HBM packaging (book)](https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html) — Stacked DRAM on the interposer as the book draws it. Our packet keeps the ~670 GB/s-per-stack and interposer-area numbers without redrawing the package.
- [DGX H100 node anatomy (book)](https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html) — The book's node topology comparison across GPU interconnects. Ours uses the state-budget figure instead — the number that decides whether the node fits the job.
- [Rack elevation (book)](https://mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html) — The book's air-vs-liquid cooling comparison. Our power-ladder abstracts the rung sequence without the thermal engineering detail.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A vendor's next accelerator exceeds the single-reticle exposure limit (~858 mm²) and moves to a dual-die chiplet package. What is the main architectural consequence?
   - A. The two dies need an on-package die-to-die link fast enough to behave as one device, B200's die link exceeds even its NVLink total.
   - B. The two dies must share a single memory controller, which halves effective HBM bandwidth per die relative to an equivalent monolithic design.
   - C. Only one die can be active in a step, reticle stitching requires the partner die to idle during all communication phases.
   - D. The chiplet design removes the memory wall entirely, since two dies each bring their own HBM stacks and the effective ridge point halves.

2. A successor part doubles dense FP16 peak but ships the same HBM bandwidth. For a batch-1 decode job at 1 FLOP/byte, what does the upgrade buy?
   - A. Roughly half the per-token latency, because decode wall-clock divides evenly across whichever resource doubled in the new part.
   - B. Almost nothing: decode sits ~295× below the ridge, so the floor is weight bytes ÷ bandwidth, and bandwidth did not change.
   - C. A two-times latency gain from the doubled peak rate, since decode reads weights at full HBM speed regardless of batch size.
   - D. Better aggregate throughput at unchanged latency, since the doubled peak lets more requests share each weight read for free.

3. A run is estimated at 800 GPU-hours by dividing its FLOP count by the accelerator's peak rate. Profiling shows MFU 0.32 for the real step. How many GPU-hours should the schedule book?

4. A team proposes 8-way tensor parallelism across eight single-GPU servers on 50 GB/s InfiniBand NDR rather than inside one NVSwitch node. What does the bandwidth staircase say?
   - A. Fine, tensor-parallel exchanges are large, infrequent sends, so they tolerate the 50 GB/s fabric tier without hurting the step.
   - B. It works only at batch one, where each exchange payload is small enough that fabric latency stops being visible in the step.
   - C. Poor fit, TP exchanges are frequent and latency-sensitive; stepping from 900 GB/s NVLink to 50 GB/s IB (~18× down) puts a large communication share in every step.
   - D. Better, spreading TP across nodes removes the NVSwitch bottleneck, and the fabric link draws less power than the switch fabric.

5. HBM3 gives ~17× the bandwidth of socketed DDR5 at lower signaling energy per bit. Which packaging mechanism explains both advantages?
   - A. HBM stacks sit on an interposer millimeters from the logic with a very wide interface, short reach, thousands of lanes, low per-bit energy.
   - B. HBM uses a much faster signaling clock than DDR5, so each lane carries more bits per second at roughly similar per-transfer energy.
   - C. HBM compresses operands in transit between the stack and the logic die, trading a little compute for lower signaling energy per useful bit.
   - D. HBM places the DRAM stacks directly on top of the compute die in true 3D, eliminating the interposer and its wire energy entirely.

6. A facilities team provisions rack power for the ~500 W average GPU draw observed during training rather than the 700 W TDP. What breaks first?
   - A. Nothing, average draw is what electrical and cooling systems must dissipate; TDP is a burst-only rating that infrastructure never sees.
   - B. The voltage rail droops out of tolerance first, because average-based provisioning ignores how decoupling capacitance must be sized.
   - C. Thermal throttling lowers achieved MFU below plan, but breakers and cooling hold, average is the right budget for steady-state design.
   - D. Breakers trip when synchronized steps ramp the cluster >300 kW in a GW/s event, the fleet moves together, so the excursion, not the mean, is what the infrastructure must survive.

7. How many 80 GB accelerators are needed just to hold 175B parameters of weights, at FP16 (2 bytes/param)? Give a number.

8. Barroso and Hölzle's warehouse-scale computer thesis reframes an ML pod as 'a single computer that fills a room.' Which property makes that framing literal rather than rhetorical?
   - A. All nodes run one vendor's silicon and firmware, so the pod presents a uniform ISA to the scheduler like a single machine would.
   - B. The pod's aggregate ~9.9 EFLOP/s FP16 peak exceeds any single chip's by orders, which is what 'one computer' quantitatively means.
   - C. Components share fate and are engineered as one system, one synchronized program, a composite ~5 h MTBF, shared power/cooling/fabric, the way a laptop's parts are designed together, not a room of independent machines.
   - D. A pod fits inside one failure domain, so operators can reboot and reimage it atomically the way they reboot a single machine.

9. A four-node DGX H100 rack draws ~33.5 kW. Which heat-transfer property makes direct-to-chip liquid attractive at this density?
   - A. Water's specific heat is over four times air's per unit flow, ~0.01 L/s of water carries what tens of L/s of air would, a thousands-fold flow difference.
   - B. Liquid coolant boils on contact with the cold plate, carrying heat away as latent energy without needing pump-driven flow loops.
   - C. Liquid cooling is mainly an acoustic measure, the fans needed to move 33.5 kW of air would exceed the facility's noise limits for staff.
   - D. Copper cold plates conduct heat far better than air does, which alone explains the flow-rate reduction without invoking water's heat capacity.

10. Doubling a cluster from 1,024 to 2,048 GPUs cuts wall-clock training from 14 days to 10 days rather than 7. Which explanation is consistent with the chapter's scaling model?
    - A. Scaling efficiency declines with fleet size (measured ordering: 256 > 1,024 > 8,192 GPUs), so the second thousand GPUs buys less than the first, communication and coordination terms grow.
    - B. The larger cluster is power-throttled by the datacenter's fixed envelope, which caps achieved MFU at half the small-cluster value.
    - C. The extra 1,024 GPUs are reserved for checkpointing and failover duties and never contribute compute to the training step.
    - D. Per-replica batch was held fixed, so the global batch doubled and each step simply costs twice as much wall-clock to run.

11. Explain how relieving a constraint at one level of the stack can expose the next level's constraint, walk the chain accelerator → node → rack → pod.

## Answer key

1. A. The reticle limit (~26×33 mm) caps what one exposure can print, so B200-class parts are already two dies. The package must fuse them with a die-to-die interconnect faster than the off-chip fabric, otherwise the 'one chip' abstraction leaks.

2. B. At 1 FLOP/byte the job is ~295× under the ridge: the floor is bytes÷bandwidth. Doubling peak while holding bandwidth moves the ridge, not the token time, this is why serving upgrades should be priced in GB/s, not TFLOP/s.

3. 800 / 0.32 = 2,500 GPU-hours. Peak-rate estimates are optimistic by exactly 1/MFU; the booked number must come from the sustained rate, before any failure or maintenance overhead is added.

4. C. TP's small frequent exchanges are why it lives inside the chassis: on NVLink they cost under a millisecond each and the compute share stays ~89%; the same pattern over PCIe/IB can put ~47% of the step into communication. Frequent exchanges need the fast tier; rare large sends can cross it.

5. A. Bandwidth is baked into the package: DRAM dies stacked on a silicon interposer centimeters from the logic get a huge interface at tiny wire lengths, ~670 GB/s per stack at a fraction of DDR5's per-bit signaling energy. Neither can be retrofitted.

6. D. Synchronous training makes the whole fleet draw in phase: step boundaries are ramp events measured in GW/s. Provisioning at the mean is provisioning for a draw the system never actually makes, the same bug as sizing serving capacity for average latency.

7. 350 GB ÷ 80 GB = 4.4 → 5 devices. (The book walks the same count down at lower precision: INT8 → 3, INT4 → 2, precision is a capacity dial as much as a rate dial.)

8. C. The WSC claim is about co-design: the synchronous step makes 1,024 nodes one computer with a composite MTBF (~5 h), shared power sequencing, and a fabric engineered as its backplane. Treating it as 'more servers' misses that the parts' behaviors are coupled every step.

9. A. Specific heat per volume does the work: water carries over 4× the heat per unit flow of air, so ~170 L/min handles a GB200-class rack where air would need thousands-fold more volume. At ~86 W/cm² die flux, air simply can't reach the plate fast enough.

10. A. 1.4× speedup on 2× hardware ≈ 70% marginal efficiency, exactly the decay pattern the chapter models: communication and coordination terms don't shrink with N, so each added GPU contributes less. Fleet size is bought with diminishing returns, not in linear units.

11. Each level's fix hands the problem up. Feed the accelerator with more HBM bandwidth and the node's job becomes fitting the state (2.1 TB vs 640 GiB) and moving it on NVLink vs IB. Solve the node with TP8×PP8×DP16 and the rack's 33.5 kW heat and >300 kW ramp rates become the constraint, liquid cooling and TDP provisioning. Solve the rack and the pod inherits the composite: 7–10 MW of power sequencing, a ~5 h MTBF, and facility commissioning on the critical path. No wall disappears; the cheapest wall to relieve moves.

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol2/02-compute-infrastructure.m4a) — a generated podcast walking this packet's argument.
