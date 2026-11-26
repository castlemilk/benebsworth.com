---
openingQuestion: "Your serving fleet must decode a 2 TB model under a 150 ms per-token floor. Option A advertises 4,000+ TFLOP/s FP8 on HBM3 (~8 TB/s); option B is a next-generation part with half the FLOPs but HBM4 (~16 TB/s). The FLOP-heavy spec sheet looks obviously better. Which part actually meets the floor?"
---

# Compute Infrastructure: Study Packet

*Working through [Compute Infrastructure](https://www.mlsysbook.ai/vol2/02_compute_infrastructure/02_compute_infrastructure.html), chapter 2 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The nameplate is a promise the hierarchy won't keep.** A chip's peak FLOP rate exists only above its roofline ridge, the node's memory holds only a slice of the job's state, and every step down the bandwidth staircase, from HBM to NVLink to InfiniBand to storage, drops throughput roughly an order of magnitude while latency climbs. Compute infrastructure is the discipline of reading which wall actually binds at each level: silicon, package, node, rack, pod. Option B wins the opening case: at batch-1 decode the job moves ==2 TB of weights per token, so only memory bandwidth sets the floor=={2 TB ÷ 8 TB/s ≈ 250 ms on HBM3, over target; ≈125 ms on HBM4, under it. The 4,000 TFLOP/s column never enters the arithmetic, because batch-1 decode runs at 1 FLOP per byte and sits far below the ridge.}. The staircase lives at [the bandwidth figure](#fig-bandwidth-staircase); the roofline that explains it at [the ridge map](#fig-ridge-map).

> [!note] How to read this packet
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Infrastructure Walls

The chapter runs one scenario end to end: a 1,024-GPU reference cluster (128 nodes of 8 GPUs) training GPT-3's 175B parameters at FP16, on 400 Gb/s InfiniBand NDR, inside a ~100 MW facility. Three walls frame everything below: the ==memory wall=={Compute per device has grown ~18× (dense FP16, V100→B200 era) while memory bandwidth grew ~8.9× and power ~3.3×, so the arithmetic intensity required to keep a chip fed roughly doubles every hardware generation. The wall is not that memory is slow; it is that compute outgrows feeding it.}, the ==power wall=={A DGX H100 rack draws 33.5 kW where a traditional enterprise rack draws ~12 kW; seven years of packages took TDP from ~300 W toward ~2,000 W. Cooling and electrical delivery, not silicon, now bound rack density.}, and the ==scale wall=={At 25,000 GPUs the fleet MTBF is ~2 hours (ch1); the infrastructure itself, rails, cooling, fabric, power sequencing, must be engineered for interruption, not just for speed.}.

## The Accelerator and the Nameplate

The H100 SXM carries 132 SMs; its spec sheet leads with >900 TFLOP/s dense FP16 (and >1,000 TFLOP/s in FP8, where ~half the per-watt gain over FP16 comes from the lower precision itself). The B200 pushes past 4,000 TFLOP/s FP8 at a 1,000 W TDP with 1,800 GB/s of NVLink. Two structural tricks hide inside those numbers: ==chiplet packaging=={A single reticle exposure tops out at 26×33 mm ≈ 858 mm². B200's dual-die footprint exceeds one reticle, so the package stitches two dies with a die-to-die link faster than the chip's own NVLink total. The "one chip" in the spec sheet is already two.} and ==precision as a throughput dial=={The same silicon advertises a different peak per precision: FP16 ≈900 TFLOP/s, FP8 >1,000 on H100; 175B of FP16 weights needs 5×80 GB devices, INT8 needs 3, INT4 needs 2. Precision is a capacity and rate lever, not just an accuracy one.}.

At the exotic end, Cerebras' WSE-3 puts 900,000 cores and 44 GB of on-wafer SRAM on one wafer, trading the network problem for a capacity wall (44 GB cannot hold 175B of FP16 weights). TPU pods aggregate instead: a TPU v3 pod exceeds 100 PFLOP/s through its ICI fabric.

::chart[bandwidth-stairs]

## The Memory Wall

The roofline makes the wall quantitative. A kernel's time is bounded below by ==the larger of compute time and memory time=={T ≥ max(FLOPs ÷ peak rate, bytes ÷ bandwidth). Below the ridge intensity the memory term governs; above it, the compute term. This is the iron law from volume I wearing a memory-bound lens.}:

::eq[roofline-bound]

$$
T \geq \max\!\left(\frac{F}{r_{peak}},\ \frac{B}{BW_{mem}}\right)
$$

The crossover, the ==ridge point=={H100 at FP16: peak ≈ 989 TFLOP/s ÷ 3.35 TB/s ≈ 295 FLOP/byte. Any workload with intensity below ~295 FLOP/B is memory-bound on this part, and batch-1 decode sits at 1 FLOP/B, using about 0.34% of the advertised peak.}, tells you whether the nameplate is reachable at all:

::eq[ridge-intensity]

$$
I^{*} = \frac{r_{peak}}{BW_{mem}} \;\;(\approx 295\ \mathrm{FLOP/B\ on\ H100\ FP16})
$$

Decode serving is the wall's sharpest case: at batch 1 the model reads every weight once per token, an intensity of ==1 FLOP per byte=={Nearly 300× below the H100 ridge. Batching rescues intensity linearly only while other terms don't bind; this is why serving economics obsess over KV cache and why the token floor is a bandwidth statement, not a compute one.}. The per-token floor is therefore bytes ÷ bandwidth:

::eq[decode-floor]

$$
t_{token} \geq \frac{W_{bytes}}{BW_{mem}} \;\;(\sim 250\ \mathrm{ms\ at\ 2\ TB,\ 8\ TB/s})
$$

The wall is also an energy wall: an HBM operand fetch costs ~30-60× the energy of the MAC that consumes it (~63.5 units against ~1-2), and off-package DRAM sits another ~5× above HBM per bit. HBM3 widens the interface and lowers per-bit signaling energy by stacking dies on an interposer centimeters from the logic, one stack supplies ~670 GB/s, and the interposer spans ≥10× the stack area. This is why bandwidth cannot be bought after the fact: it is baked into the package.

::fig[ridge-map]

## Sustained Compute and Precision

Peak is a laboratory number; ==sustained throughput is what fits in the schedule=={Measured as model FLOPs usage (MFU): achieved rate ÷ nameplate. A run estimated at 1,000 GPU-hours from peak needs 2,500 real hours at MFU 0.4. Every plan that books peak rate under-books the job by 1/MFU.}:

::eq[sustained-hours]

$$
H_{needed} = \frac{H_{peak}}{MFU} \;\;(1{,}000 \to 2{,}500\ \mathrm{GPU\!-\!h\ at\ MFU\,0.4})
$$

Precision plays the same trick at the device level: the FP8 column on the spec sheet is a second nameplate reachable only if the model tolerates the format, the kernels exist, and the run actually converts (the book's FP8 accounting shows ~2× of the H100's per-watt gain is the precision change alone). Always ask ==which nameplate the plan priced=={A GPU-hour budget computed at FP8 peak and run at FP16 throughput is a 2× budget error before MFU is even considered.}.

## The Node

Inside the chassis the staircase is literal. Each boundary drops bandwidth and raises latency:

- **HBM3** 3.35 TB/s on-package
- **NVLink** 900 GB/s bidirectional (450 GB/s per direction), a 7.4× drop
- **InfiniBand NDR** 50 GB/s per port, another 9× drop
- **Storage** ~7 GB/s, 7.1× further

::fig[bandwidth-staircase]

The numbers decide where parallelism may live. Tensor parallelism's frequent small exchanges (<1 ms each on NVLink) belong inside the node, the same exchanges over PCIe would put ~47% of the step in communication versus ~11% on NVLink. Pipeline parallelism's rare large sends can cross nodes; data parallelism's infrequent gradient all-reduce tolerates the fabric. Meanwhile the node's own memory partitions the job: eight 80 GB devices give 640 GiB of HBM against ==~2.1 TB of static training state=={For the 175B reference model at the standard FP16 layout: ~350 GB weights + ~350 GB gradients + ~1.4 TB FP32 optimizer moments and master weights, roughly 12 bytes per parameter. ZeRO-3 sharding inside one node would still leave each GPU holding over 3× its HBM.}:

::eq[state-budget]

$$
S_{static} \approx 12 \times P\ \mathrm{bytes} \;\;(\sim 2.1\ \mathrm{TB\ at\ }P{=}175\mathrm{B})
$$

The reference layout answers with TP=8 × PP=8 × DP=16: tensor parallelism stays on the node's NVSwitch fabric (four switch chips in a DGX H100, whose fabric alone outdraws a whole V100), pipeline stages cross nodes, and data parallel replicas spread across the fleet, with ~42 GB of headroom per GPU and ~13 GB/GPU once FP32 state shards across replicas. Reliability compounds at the node too: ==the node's MTBF is a composite=={Every component (GPU, CPU, NIC, drive, power supply) contributes its own failure rate; the node's outage rate is the sum. An eight-GPU node fails far more often than any GPU in it, which is why health checking runs at node granularity.} of every component inside it:

::eq[node-mtbf]

$$
\lambda_{node} = \sum_{i} \lambda_{i} \;\;\Rightarrow\;\; MTBF_{node} < MTBF_{component}
$$

## The Rack

The rack is where silicon meets plumbing. A DGX H100 rack draws 33.5 kW of IT power versus ~12 kW for a traditional enterprise rack; eight InfiniBand cables leave each node (one per GPU); 32 racks house the 1,024-GPU cluster. Heat flux is the binding number: an H100's 700 W spread over ~814 mm² is ==~86 W/cm², well past air's practical range=={Air needs tens of liters per second to carry what ~0.01 L/s of water moves, water's specific heat is over four times air's per volume and copper conducts far better than air. The flow-rate difference is thousands-fold, which is why direct-to-chip liquid stops being optional at ~1,000 W packages.}. A GB200-class NVL72 rack needs ~170 L/min of coolant at a 10 K rise.

Power is also dynamic: a synchronized training step swings the cluster's draw by >300 kW in a ramp measured in GW/s, and provisioning for the ~500 W average rather than the 700 W TDP is how you trip breakers on the first all-reduce. Even the voltage rail notices: a 300 W step at 0.8 V is several hundred amperes of current slew, and decoupling capacitance is what keeps the droop inside tolerance.

::fig[power-ladder]

## The Pod

::fig[state-budget]

At pod scale the room becomes the computer. Eight scale-ups of the reference cluster means 1,024 nodes, >130 metric tons of hardware, and 7-10 MW of rack power with ~9.9 EFLOP/s of aggregate FP16, and a job-level interruption roughly every ==five hours=={The composite of node-level composite rates. Facility commissioning, power sequencing, and fabric bring-up are on the critical path months before the first checkpoint writes.}. The training math layers over ch1's physics: a ~24 h compute-only baseline becomes ~51 h once failure-recovery and maintenance overhead are priced in; the reference cluster's compute-only ~8 days for the run is a floor, not a plan.

## Accelerator Selection

Selection is the chapter's applied payoff: match the ==workload's intensity to the part's ridge=={Batch-1 decode at 1 FLOP/B cares only about memory bandwidth and capacity; a 512-token prefill or training step above the ridge cares about peak FLOPs. The same model is a different purchase at different batch sizes and phases.}. The running example makes it concrete: serving 175B at ~13 ms per TP-8 decode step needs on the order of 100 replicas, a serving fleet about the size of most of the reference cluster. And scale itself is priced honestly: measured efficiency falls from 256 to 1,024 to 8,192 GPUs, so eight times the accelerators buys less than eight times the speed.

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
