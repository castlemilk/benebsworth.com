---
title: "Distributed Training — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html"
canonical_url: "https://benebsworth.com/study/vol2/06-distributed-training/"
---

# Distributed Training: Study Packet

The 175B model needs 2.8 TB of training state; one accelerator holds 80 GB. Four layouts all run the same step: pure DP, TP, TP+pipeline, the full 3D grid: but three of them cannot exist. Which constraint picks the winner?

*Working through [Distributed Training](https://mlsysbook.ai/books/vol2/06_distributed_training/06_distributed_training.html), chapter 6 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**Adding accelerators can make training slower, and the reason is arithmetic, not magic.** Every way of splitting a job buys parallel compute by selling something else: replicas buy batch throughput at the price of a synchronization; tensor splits buy memory relief at the price of constant intra-layer collectives; pipeline stages buy memory relief at the price of idle bubbles. The chapter's reference job makes the trade concrete: 175B parameters, 16 bytes each of training state, **2.8 TB that no single 80 GB accelerator can hold** *(why it matters: BF16 weights alone are 350 GB, more than four H100s. The mixed-precision Adam contract adds a 2-byte gradient buffer and a 12-byte optimizer — FP32 master, momentum, variance, per parameter. Distribution here is not a performance choice; it is a capacity requirement.)*. Speed is what the split costs afterward, and whether it was worth paying is a question the step-time model answers, not the accelerator count.

> **note: How to read this packet**
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Wall That Forced the Split

The memory wall is a ratio, not a slogan. Single-accelerator memory grew ~15× from K80 to B200 (12 GB to 180 GB), while the state needed to train frontier models grew ~4 orders of magnitude. **The first plotted model to exceed one accelerator was GPT-3 in 2020, at ~35× the largest GPU of its year** *(why it matters: 80 GB per device at 16 bytes per parameter puts the crossover near 5B parameters: anything larger must be distributed just to fit; the speed case is downstream of capacity. Below that line, distribution is a throughput choice; above it, a necessity.)*. Since then the gap has only widened: the chapter's working model needs at least 35 H100s of state before a single FLOP moves.

**Eq 6.2 · The training-state contract**
$$
M_{state} = 16 \times P \;\Rightarrow\; 175\mathrm{B} \times 16 = 2{,}800\ \mathrm{GB}
$$

Reliability is the second forcing function, and it is also arithmetic: a 1,024-GPU cluster at 50,000-hour per-GPU MTBF sees a failure roughly every **49 hours** *(why it matters: At fleet scale the question is not whether workers die but how the schedule absorbs them; it is why the orchestration and fault-tolerance chapters exist at all.)*.

## The Design Space Is Three Axes

Splitting the training loop is a compiler problem: the same program, repartitioned across iterators. The chapter's analogy maps each axis to a loop transformation: **data parallelism is a parallel-for over the batch, tensor parallelism is vectorization inside each layer's matmuls, pipeline parallelism is instruction pipelining across layer groups** *(why it matters: The analogy is structural, not literal: devices still exchange shards over an interconnect, so each 'loop split' introduces a communication pattern the original program did not have.)*. Device count is their product:

**Eq 6.1 · The 3D grid**
$$
N = \mathrm{DP} \times \mathrm{PP} \times \mathrm{TP}
$$

Every point in that cube is a legal answer only if it satisfies three constraints at once: the model divides evenly, each device's memory holds its slice, and the fabric tier can carry that axis's traffic. **The hierarchy decides the parallelism** *(why it matters: Tensor exchanges are the most frequent and stay inside the node's fast NVLink domain; pipeline activations cross neighboring nodes; data-parallel gradients are the largest but rarest transfer and can ride the slow tier. Matching each axis to the cheapest domain that carries it is the whole placement problem.)*.

![Four layouts, one constraint](https://benebsworth.com/study/vol2/06-distributed-training/diagrams/config-abcd.svg)

*The four candidate partitions of the same 175B step on 1,024 GPUs, drawn as per-GPU state bars against the 80 GB HBM line. A's pure data parallelism would replicate 2.8 TB; B's tensor shard leaves ~350 GB; C reaches ~87.5 GB and crosses under the line only with ZeRO-1; D fits unsharded at ~43.8 GB. Communication differs by three efficiency points; memory decides.*
## Data Parallelism and the Sharding Ladder

Data parallelism is the baseline: replicate the model, partition the batch, synchronize gradients once per step. Its five-stage workflow: partition, assign, local forward/backward, AllReduce, identical update: preserves single-device SGD semantics exactly. Its cost is the replicated state and the exposed synchronization.

ZeRO turns replication into progressive sharding, and each stage buys memory with a different collective schedule:

| Stage | What is sharded | 7B model per GPU | Communication |
|---|---|---|---|
| DDP | nothing | 112 GB | AllReduce (1×) |
| ZeRO-1 | optimizer state | ~29.3 GB | Reduce-to-owner + AllGather (1×) |
| ZeRO-2 | + gradients | ~15.5 GB | ReduceScatter + AllGather (1×) |
| ZeRO-3 / FSDP | + parameters | ~1.75 GB | AllGather before each layer (1.5×) |


**ZeRO: what stays on the GPU**

| sharding stage (7B model, 64-GPU group) | weights (FP16) | gradients (FP16) | optimizer (master + 2 moments) |
|---|---|---|---|
| DDP (replicated) | 14 | 14 | 84 |
| ZeRO-1 | 14 | 14 | 1.31 |
| ZeRO-2 | 14 | 0.22 | 1.31 |
| ZeRO-3 / FSDP | 0.22 | 0.22 | 1.31 |

*The 112 GB replicated footprint decomposes as weights 14 GB, gradients 14 GB, optimizer 84 GB. ZeRO-1 removes the replicated optimizer (the fat target), ZeRO-2 the gradients, ZeRO-3 the weights. The 80 GB HBM line is crossed after the first stage; full sharding reaches 1.75 GB.*

**Optimizer state is the fat target: three-quarters of the replicated footprint** *(why it matters: The 12-of-16 bytes are Adam's FP32 master, momentum, and variance, so ZeRO-1 alone brings a modestly-oversized model back under the accelerator ceiling while keeping DDP's byte volume. ZeRO-3 reaches near-linear memory scaling by gathering each layer's parameters just in time: the trade is a third more traffic and a collective before every layer, so the fabric must keep pace with the compute stream, not just the step boundary.)*.

![What each stage shards](https://benebsworth.com/study/vol2/06-distributed-training/diagrams/zero-ladder.svg)

*Per-GPU static state for a 7B model under DDP and the three ZeRO stages: 112 GB replicated, ~29.3 GB with optimizer sharding, ~15.5 GB adding gradients, ~1.75 GB fully sharded. ZeRO-1 and 2 keep DDP's byte volume; ZeRO-3 pays 1.5x for near-linear memory scaling.*
## What Scale-Out Actually Buys

The scaling-efficiency equation prices the whole step:

**Eq 6.3 · Scaling efficiency**
$$
\eta = \frac{1}{1 + N\,(T_{comm}(N) + T_{sync}(N) - T_{overlap}) / T_{compute}}
$$

The numerator hides nothing: every accelerator's exposed communication, synchronization, and straggler wait is charged against one device's compute. Measured results keep it honest: the chapter's series lands **71–84 percent efficiency at the largest sizes, and no series reaches ideal** *(why it matters: The reference scaling numbers: 8 workers at batch 256 get 6.8× speedup; 64 workers at batch 2,048 get 40.1×; a stale-synchronous schedule buys 38.1× by relaxing the barrier. Eos's published figure: 21× accelerators for a 14.9× time cut.)*.


**Speedup achieved, and the gap to ideal**

| worker count and schedule (GPT-2 scale-out) | measured speedup | gap to ideal (exposed comm + sync) |
|---|---|---|
| 8 workers · BSP | 6.8 | 1.2 |
| 64 workers · BSP | 40.1 | 23.9 |
| 64 workers · SSP | 38.1 | 25.9 |

*Each bar's total is ideal linear speedup for that worker count; the filled share is what the measured run achieved. BSP reaches 6.8 of 8 and 40.1 of 64; the stale-synchronous schedule at 64 workers relaxes the barrier and loses slightly more, 38.1 of 64.*

Two silent multipliers sit inside those numbers: **a straggler-free step is rarer than one in ten thousand** *(why it matters: Every synchronous step waits on the slowest worker, and at fleet scale there is almost always a slow one.)*, and **a 1 percent residual at 512 workers is ~84 percent of the step** *(why it matters: Tiny per-worker overheads multiply by N in the efficiency equation's numerator; what looks negligible on one device dominates the bill at scale.)*.

The statistical side has its own ceiling. The **critical batch size** *(why it matters: Estimated by the gradient noise scale B* ≈ tr(Σ)/‖∇L‖²: below it, bigger batches cut optimization steps nearly proportionally; above it, extra samples buy progressively less. It is a statistical crossover, not a hard wall: a reminder that hardware efficiency and sample efficiency are different budgets.)* bounds how much parallelism the optimizer can use, and learning-rate schedules must be revalidated when the synchronization model changes: stale-synchronous workers read parameters that are already behind.

**Eq 6.5 · Critical batch size**
$$
B^{*} \approx \frac{\mathrm{tr}(\Sigma)}{\|\nabla \mathcal{L}(\theta)\|^{2}}
$$

## Model Parallelism's Menu

When one device cannot hold the model, the axes inside the cube become the options, and each charges a different toll:

- **Layer-wise (naive)**: stack layers per device, serialize the batch between them. Simple, but adjacent devices idle while they wait: the pipeline is the fix, not the layer split itself.
- **Pipeline**: split layers into stages and stream microbatches through. The toll is the bubble: **(p−1)/(m+p−1) of the slot grid is idle** *(why it matters: PP-16 at 32 microbatches idles nearly a third of compute (~32%); PP-4 at the same count wastes ~9%; the reference PP-8 at 96 microbatches pays ~6.8%. Deeper pipelines need more microbatches to stay full, which pushes against the critical batch size.)*.
- **Tensor**: split each matmul's weight matrix across devices. The toll is activation traffic: GPT-3 at TP-8 moves **~68 GB of forward collectives per step, ~4.2 GB per stage boundary** *(why it matters: The per-boundary handoff is about 200 MB per microbatch, tens of MB per activation. Tensor parallelism lives inside the node because at NVLink rates the exchange fits under compute; on InfiniBand it cannot. The 2(t−1)/t ring factor is 1.75 at t=8.)*.
- **Sequence/context**: shard the token axis where activation memory dwarfs weights: O(B·S·H·L) for linear layers, **O(B·A·S²·L) for un-tiled attention** *(why it matters: FlashAttention removes the stored score matrix but activations still scale with context length; at 32K–1M+ token contexts the sequence dimension is the footprint that breaks memory first.)*.
- **Expert (MoE)**: conditional compute decouples parameter count from per-token FLOPs. The toll is routing: **two AllToAll collectives per MoE layer, dispatch and return** *(why it matters: Top-1 or top-2 gating sends each token to whichever rank hosts its expert. Capacity-limited routing drops tokens that overflow the expert's allocation; the skew problem from chapter 5 returns as a tail-latency multiplier.)*.
- **Embedding sharding**: sparse tables live on parameter servers, a different traffic pattern the collective primitives do not describe.

![What tensor splitting ships](https://benebsworth.com/study/vol2/06-distributed-training/diagrams/tp-traffic.svg)

*TP-8 traffic for one GPT-3 step: ~68 GB of forward collectives against ~4.2 GB per stage boundary, drawn as the exchange every layer pays for splitting its matmuls eight ways. The 2(t-1)/t ring factor is 1.75 at t=8. It fits under compute on NVLink and cannot on InfiniBand, which is why tensor parallelism lives inside the node.*
**Eq 6.6 · Activation memory scaling**
$$
M_{act} = \mathcal{O}(B \cdot S \cdot H \cdot L) \;\text{linear};\qquad \mathcal{O}(B \cdot A \cdot S^{2} \cdot L) \;\text{un-tiled attn}
$$

**Eq 6.4 · The pipeline bubble**
$$
f_{bubble} = \frac{p-1}{m+p-1}
$$

## The Four Configurations

The worked example fixes everything except the partition: same 175B model, same 1,536-sequence batch, same 1,024 GPUs, same per-GPU compute. Only the layout changes:

| | Layout | State per GPU | Fits? | Modeled efficiency |
|---|---|---|---|---|
| A | DP-1,024 | 2,800 GB | never | n/a (1.5 seqs/replica) |
| B | TP-8 + DP-128 | ~350 GB | no | 86% |
| C | TP-8 × PP-4 + DP-32 | ~87.5 GB | only with ZeRO-1 | 84% |
| D | TP-8 × PP-8 + DP-16 | ~43.8 GB | yes | 83% |

The lesson is the ordering. **Communication barely separates the layouts: B, C, D land within three efficiency points: but memory disqualifies three of the four** *(why it matters: A is a counterfactual: replication is impossible, though its counterfactual communication (~3.1 s raw, ~0.47 s exposed at 85% overlap) is not the blocker. B's tensor shard still overflows HBM; C crosses under 80 GB only after ZeRO-1 shards the optimizer across its DP group; D fits unsharded by paying a deeper bubble: the shallowest pipeline where the 16-byte state fits, ~0.04 s/step worse than C with ZeRO-1.)*. And the 16,384-GPU layout (TP-8 × PP-16 × DP-128, 16× the reference cluster) pushes persistent state to ~21.9 GB per device: but at 32 microbatches its pipeline idles ~32%, versus ~9% for C's depth.

![The slots the pipe cannot fill](https://benebsworth.com/study/vol2/06-distributed-training/diagrams/bubble-grid.svg)

*A pipeline schedule as a stage-by-slot grid: m + p - 1 slots deep, p - 1 of them idle while the pipe fills and drains. PP-16 at 32 microbatches idles ~32 percent; PP-4 at the same count wastes ~9 percent. Microbatches are the fill, and they push on the critical batch size.*
## Many Models at Once

Alignment training breaks the single-model assumption. PPO coordinates four: **the active policy generates autoregressively, a reward model scores, a frozen reference constrains drift, and a value model estimates returns** *(why it matters: On the chapter's Llama-2 70B scenario the policy's training state alone is ~1,120 GB; the full PPO working set is ~1,494 GB spread across 32 GPUs (~35-39 GB static each). The phases are asymmetric: generation is memory-bandwidth-bound on the KV cache (~86 GB with GQA vs ~687 GB dense attention), the update is compute-bound, and >50% of a generation batch can be padding.)*. DPO simplifies to two models and no online generation: less exploration, far less coordination. The headroom accounting is the engineering: releasing the rollout KV restores ~2.7 GB per GPU of update-phase budget, and that margin is the difference between fitting and not.

## Choosing a Layout

The decision framework is the memory-first ordering: DDP where it fits, ZeRO stages as the footprint overflows, model parallelism where weights alone exceed the device, hybrid where both bind. And **the measured headline is not the forecast** *(why it matters: 45% local MFU times 83% scaling efficiency is 37% fleet MFU: applying efficiency twice forecasts 31%, which is the error. MFU and scaling efficiency are different measurements that must never be multiplied twice.)*. Frameworks (DDP, FSDP, Megatron-style 3D, DeepSpeed) make the switch a config line, but the physics governs the step: one GPT-2 moved from a single NVLink node to four Ethernet nodes quadrupled GPUs and cut parallel efficiency: the same model, a different tier, a worse deal.

## Fallacies and Pitfalls

- *Linear speedup with enough engineering.* Amdahl's law with communication: exposed comm + sync − overlap, scaled by N. Linear scaling is a demonstrated operating range, not a device-count entitlement.
- *MFU optimization in isolation.* Local MFU × η = fleet MFU; multiplying η twice under-forecasts by ~6 points and is a procurement error.
- *Communication is the bottleneck.* Memory feasibility usually binds first; three of the four worked layouts fail on capacity while their transfers are affordable.
- *Gradient accumulation is free scale-out.* It batches communication but not the batch itself: the statistical ceiling (critical batch) still binds.
- *One-line config means one-line physics.* Frameworks hide the API, not the tier crossing; the same model on slower links can lose efficiency faster than it gains throughput.

## The physics

| Quantity | Value | Where it binds |
|---|---|---|
| Memory wall | GPU ~15× (K80→B200); demand ~4 orders | crossover GPT-3 2020, ~35× |
| 80 GB crossover | ~5B params @16 B | distribution becomes capacity-forced |
| 175B state | 350 GB weights + 2,800 GB total | 35+ H100s before one FLOP |
| Reference cluster | 1,024 GPU = 128 × 8 | MTBF ~49 h @50k h |
| ZeRO ladder (7B) | 112 → 29.3 → 15.5 → 1.75 GB | 1×, 1×, 1.5× DDP volume |
| Pipeline bubble | (p−1)/(m+p−1) | PP-16@32 ≈ 32%; PP-4@32 ≈ 9% |
| TP-8 traffic | ~68 GB fwd; ~4.2 GB/stage | ~200 MB per boundary |
| Ring factor | 2(t−1)/t = 1.75 @t=8 | intra-node TP collectives |
| Scaling | 71–84% η at largest; 6.8×@8w, 40.1×@64w, 38.1× SSP | Eos 21× GPU → 14.9× less time |
| Stragglers | p(no straggler) < 10⁻⁴ | every step waits on the tail |
| Residual tax | 1% per-worker → ~84% of step @512 | the silent multiplier |
| Critical batch | B* ≈ tr(Σ)/‖∇L‖² | statistical ceiling on DP |
| A/B/C/D | 2,800 / 350 / 87.5 / 43.8 GB; 86/84/83% | memory picks the winner |
| 16K layout | TP8×PP16×DP128; ~21.9 GB/GPU | bubble ~32% |
| Activations | >1 TB raw; <25 GB checkpointed (b=4, s=2048) | recompute trades compute for memory |
| PPO 70B | ~1,494 GB set; ~35 GB/GPU; KV ~86 GB GQA vs ~687 GB dense | >50% padding in generation |
| MFU math | 45% local × 83% η = 37% fleet (≠ 31%) | never apply η twice |

## Glossary

- **3D parallelism**: the joint TP × PP × DP grid; N devices = product of the three degrees.
- **Pipeline bubble**: the (p−1)/(m+p−1) idle share while stages fill and drain.
- **ZeRO / FSDP**: progressive sharding of optimizer (Z1), gradients (Z2), parameters (Z3); each trades memory for a different collective schedule.
- **Scaling efficiency (η)**: useful compute fraction after exposed communication, synchronization, and stragglers.
- **Critical batch size (B*)**: the statistical crossover where added samples buy diminishing step-count reductions.
- **MFU vs fleet MFU**: per-device utilization before vs after the scaling factor; never multiply η twice.
- **Staleness (BSP/SSP/ASP)**: how fresh the parameters each worker reads are; relaxing the barrier buys speed at revalidation cost.

## → Ben's world

The ordering is the transferable skill: **capacity first, bandwidth second, elegance last**. Any sharding/splitting decision: a document-analysis corpus across services, a benchmark harness across machines: fails the same way the four configs fail: the layout that fits is the only one that runs, and the residual overhead of the split (the 1%-per-worker tax) is the part that multiplies. And the η-twice error is the general forecasting bug: two different efficiency measurements multiplied as if they were one. It is the distributed-training version of compounding a margin.

## Open questions

- Where does the next axis land? Expert and sequence/context parallelism already add degrees beyond the cube; does routing parallelism become a fourth named axis as MoE dominates?
- Does the bubble formula survive heterogeneous fleets? The slot-grid model assumes symmetric stages; mixed-accelerator pods break the symmetry assumption.
- How far can staleness relax before convergence pays more than the barrier costs? SSP bought 38.1× here: the answer is workload-dependent and unmeasured for most.


---

## Key equations

**Eq 6.1 · The 3D grid**

$$
N = \mathrm{DP} \times \mathrm{PP} \times \mathrm{TP}
$$

*Every layout is a point in the parallelism cube: data-parallel replicas times pipeline stages times tensor-parallel shards. The reference job sits at 16 x 8 x 8 = 1,024; the 16K layout at 128 x 16 x 8 = 16,384. A legal point must divide the model evenly, fit each device's memory, and put each axis's traffic on a fabric tier that can carry it.*

**Eq 6.2 · The training-state contract**

$$
M_{state} = 16 \times P \;\Rightarrow\; 175\mathrm{B} \times 16 = 2{,}800\ \mathrm{GB}
$$

*Mixed-precision Adam prices 16 bytes per parameter: 2-byte BF16 weights, 2-byte gradients, and a 12-byte optimizer (FP32 master plus two moments). On the 175B reference that is 2.8 TB of state against 80 GB of HBM, at least 35 accelerators of capacity before a single FLOP.*

**Eq 6.3 · Scaling efficiency**

$$
\eta = \frac{1}{1 + \frac{N\,(T_{comm} + T_{sync} - T_{overlap})}{T_{compute}}}
$$

*Amdahl's law with communication: every worker's exposed communication, synchronization, and straggler time is scaled by N against one device's compute. A 1 percent residual per worker is ~84 percent of the step at 512. The reference job lands eta = 83 percent; measured series sit at 71-84 percent at the largest sizes.*

**Eq 6.4 · The pipeline bubble**

$$
f_{bubble} = \frac{p-1}{m + p - 1}
$$

*Of the m + p - 1 slots in a pipeline schedule, p - 1 are idle while the pipe fills and drains. PP-16 at 32 microbatches idles ~32 percent of compute; the same microbatch count at PP-4 wastes ~9 percent. Depth buys memory relief at the price of idle compute, and filling the pipe needs more microbatches, which pushes on the critical batch size.*

**Eq 6.5 · Critical batch size**

$$
B^{*} \approx \frac{\mathrm{tr}(\Sigma)}{\|\nabla \mathcal{L}(\theta)\|^{2}}
$$

*The gradient-noise estimate of where batch scaling stops paying: the trace of the gradient covariance over the squared gradient norm. Below B*, larger batches cut optimization steps nearly proportionally; above it, extra samples buy diminishing reductions. It is a statistical ceiling on data parallelism, separate from the memory-limited batch.*

**Eq 6.6 · Activation memory scaling**

$$
M_{act} = \mathcal{O}(B \cdot S \cdot H \cdot L) \quad\text{linear layers};\qquad \mathcal{O}(B \cdot A \cdot S^{2} \cdot L) \quad\text{un-tiled attention}
$$

*At long contexts the activations, not the weights, are the footprint: linear in sequence length for ordinary layers, quadratic for un-tiled attention. FlashAttention drops the stored score matrix but not the linear growth. GPT-3's unoptimized activations exceed 1 TB at batch 4, sequence 2048; full checkpointing fits them under 25 GB, trading recompute for memory.*

## From the book

- [The 3D Parallelism Cube](https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html) — undefined
- [Data Parallelism Implementation Pipeline](https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html) — undefined
- [FSDP Parameter Lifetime](https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html) — undefined
- [Pipeline 1F1B Schedule](https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html) — undefined
- [MoE AllToAll Routing](https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html) — undefined
- [RLHF PPO Coordination](https://mlsysbook.ai/vol2/06_distributed_training/06_distributed_training.html) — undefined

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A synchronous job spans 1,024 GPUs whose mean time between failures is 50,000 hours each. Roughly how often should the run expect a worker failure?
   - A. About once every 49 hours: fleet MTBF divides the per-device MTBF by the worker count, so the training loop must absorb failures as a routine event.
   - B. About once every 49 days: per-device MTBF scales with calendar time rather than fleet size, because each GPU in the fleet fails independently of all the others.
   - C. About once every 4.9 hours: the per-device MTBF is already a fleet-adjusted figure, and synchronous stepping divides it once more by the global batch size.
   - D. About once every 49 minutes: the failure rate compounds superlinearly with fleet size, since stragglers and degraded links also count as failures for the step.

2. A 175B-parameter model trains in mixed precision with Adam: 2-byte weights, 2-byte gradients, a 4-byte master copy, and two 4-byte moments. How many gigabytes of resumable training state does the full state consume (1 GB = 10^9 bytes)?

3. A 16,384-GPU cluster runs a layout of TP=8, PP=16, DP=128. How many GPUs hold one complete logical replica of the model?

4. Under the chapter's decision framework, which condition indicates that plain DDP alone is sufficient, with no tensor or pipeline parallelism needed?
   - A. The interconnect provides enough bisection bandwidth that the per-step gradient AllReduce finishes in under 5 percent of step time at the target worker count and fabric tier.
   - B. The full training state (weights, gradients, optimizer, activations, and buffers) fits in one GPU's memory with enough headroom for the framework's working allocations.
   - C. The global batch divides evenly by the worker count, because an indivisible remainder would force at least one idle replica, at which point pipeline staging becomes necessary.
   - D. The model's layers are numerically independent enough that an eight-way tensor split produces bit-identical gradients to replicated training on the same hardware and seed.

5. A 7B model trains under DDP across a 64-GPU group, replicating 112 GB of static state per GPU (14 GB weights, 14 GB gradients, 84 GB optimizer). How many GB remain on each GPU after ZeRO-1 shards only the optimizer state across the 64 GPUs?

6. A synchronous 1F1B pipeline runs p=8 stages with m=32 microbatches per update. What percentage of the schedule's slots are bubble (idle), to the nearest percent?

7. A feasibility check for one GPT-3 layer split eight ways finds ~1.9 ms of local compute against the required collective traffic. What does the check actually establish about tensor parallelism's placement?
   - A. TP requires optical interconnects specifically: copper and DAC links introduce serialization latency that breaks the 1.9 ms budget, so TP is restricted to racks wired with all-optical fabrics.
   - B. TP can span the cluster freely: the 1.9 ms compute window is large enough that even inter-node links hide it, so the TP degree is bounded only by divisibility of the weight matrices.
   - C. TP should never be used: the 2(t−1)/t ring factor means every wider split strictly increases bytes moved, so any TP degree above 2 wastes bandwidth that DP would not.
   - D. TP must stay inside the node: the per-layer collective only fits under compute at NVLink-class bandwidth, and crossing to InfiniBand would expose the exchange as step time.

8. A team measures 45 percent MFU on a single node, scales to 1,024 GPUs at 83 percent scaling efficiency, and reports fleet MFU of 45 × 0.83 = 37 percent. A reviewer says the report understates or double-counts a term. What is the catch?
   - A. Nothing. The arithmetic is right: per-device MFU times scaling efficiency is exactly the fleet's MFU, and the lower figure the reviewer implies is a units error on their side of the review.
   - B. The 45 percent already contains communication exposed inside the node, and eta charges fleet communication again, so part of the comm bill is paid twice unless the single-node MFU was measured comm-free.
   - C. MFU cannot be multiplied by eta at all: MFU is a ratio of achieved to peak FLOP/s and eta is a ratio of step times, and mixing a time-ratio with a work-ratio is dimensionally invalid regardless of fleet size.
   - D. The reviewer is wrong only in magnitude: the correct combination is 45 + 83 = 128 percent capped at 100, since efficiency terms add over the parallel dimensions rather than multiply together.

9. B* ≈ tr(Σ)/‖∇L‖² is called the critical batch size. What does it bound?
   - A. The largest batch the memory system can feed: beyond B*, stored activations exceed HBM capacity and the layout is forced to add pipeline stages just to hold the larger microbatch stream.
   - B. The batch at which the AllReduce becomes latency-bound: beyond B*, per-worker gradients shrink enough that startup rounds dominate transfer time and further scale-out stalls hard against the alpha term.
   - C. The largest global batch that still buys proportional optimization progress: beyond it, extra samples yield diminishing reductions in steps-to-target, so data parallelism stops paying statistically.
   - D. The smallest batch that keeps every pipeline stage busy: below B*, fewer microbatches than stages exist in the schedule and the bubble fraction exceeds the useful-work fraction of every step.

10. In capacity-limited MoE with top-1 routing, what happens to a token whose assigned expert's buffer is already full?
    - A. It waits in the AllToAll send buffer for the next step's dispatch round, delaying its gradient contribution by one microbatch without changing the output it eventually produces.
    - B. It is rerouted to its second-choice expert automatically, at the cost of one extra routing decision and a slightly different learned function than top-1 gating implies.
    - C. It is dropped: it skips expert computation this step and passes through with only the residual connection: a silent quality tax that scales with routing skew.
    - D. It forces a rebalance: the router recomputes gating scores for every token in the batch so the overflow is redistributed evenly across all experts on that rank.

11. Why does PPO-style RLHF create an infrastructure asymmetry that ordinary fine-tuning does not?
    - A. The reward model must run on different silicon than the policy: reward inference requires inference-optimized accelerators while the policy needs training-optimized ones, forcing a two-pool cluster split.
    - B. PPO's KL penalty must be evaluated on the CPU host, because the divergence term is computed in FP64 and no accelerator in the fleet keeps enough native FP64 throughput to keep pace with the continuous rollout stream between updates.
    - C. The actor and critic must never share memory: PPO correctness requires physically separate device pools so on-policy samples cannot contaminate the value function's replay buffer during updates.
    - D. One training step is four jobs with different memory and traffic patterns: the policy generates autoregressively while the reference, reward, and value models score, so a single layout must serve generation and training at once.

## Answer key

1. A. 1,024 GPUs × (1 failure / 50,000 GPU-hours) ≈ one failure per 49 hours of wall-clock time. At fleet scale, fault tolerance is not a rare contingency: it is a property the schedule must have every other day, which is why checkpointing cadence and elastic restart exist in the stack.

2. 2,800 GB. Each parameter prices 16 bytes: 175e9 × 16 = 2.8e12 bytes = 2,800 GB. That is ~35 H100s of HBM before counting activations: the capacity number that forces partitioning in the first place.

   The 16-bytes-per-parameter contract (2+2+4+4+4) is what makes the memory wall concrete: 2.8 TB of state against 80 GB per device. Everything else in the chapter (ZeRO, tensor slicing, pipeline staging) is a strategy for dividing this number.

3. 128 GPUs. A replica spans the model-parallel partition TP × PP = 8 × 16 = 128 devices; the DP=128 dimension counts how many such replicas exist. Check: 128 × 128 = 16,384.

   The cube reads DP × PP × TP = N in either direction: given the total and two axes, the third is determined, and the TP×PP product is the 'size' of one replica. Confusing the replica's device count (128) with the replica count (128) is the classic misread of 3D layouts.

4. B. The framework is capacity-first: if the whole footprint fits one device, replicate and shard the batch. DDP has the cheapest communication of any strategy. Tensor, pipeline, and sharded strategies exist to solve a memory problem (or an activation-traffic problem), not to buy FLOPs.

5. ≈29.3 GB: weights 14 + gradients 14 stay replicated; the optimizer's 84 GB divides by 64 to ~1.31 GB. ZeRO-2 then shards the gradients (~15.5 GB/GPU); ZeRO-3 shards the weights too (~1.75 GB/GPU).

   The optimizer is 12 of the 16 bytes per parameter: the fat target. Sharding it alone drops the footprint from 112 GB to under 30 GB while keeping DDP's communication volume, which is why ZeRO-1 is nearly free throughput-wise.

6. ≈18%. The bubble fraction is (p−1)/(m+p−1) = 7/39 ≈ 0.179. The same 32 microbatches under PP-16 would idle 15/47 ≈ 32%; under PP-4 only 3/35 ≈ 9%.

   Every stage sits idle for p−1 of the m+p−1 slots while the pipe fills and drains. Microbatches are the fill, but they grow the global batch, which runs into the critical batch size on the statistical side.

7. D. Tensor parallelism is the chatty axis: GPT-3 at TP-8 moves ~68 GB of forward collectives per step. The bandwidth feasibility check is precisely the intra-node/inter-node boundary: NVLink hides the exchange under the layer's compute; a node-crossing link cannot. That is why TP degree typically equals the NVLink domain size (8).

8. B. MFU measured on a live step already has intra-node collectives in its denominator. If eta's numerator charges T_comm for the whole fleet, the TP collectives that live inside the node get billed twice. The fix is to measure local MFU with communication removed (or keep the terms in disjoint budgets): the chapter's worked example lands ~37% vs a naive figure that misleads by several points.

9. C. B* is a statistical ceiling, not a hardware one: it is the point where gradient noise stops being the limiter and bigger batches buy less per FLOP. It bounds how far the DP axis (and the microbatch count feeding a pipeline) can grow usefully: a separate budget from the memory-limited batch entirely.

10. C. Capacity-limited routing hard-caps each expert's allocation; overflow tokens are dropped rather than queued or rerouted, so the model loses their expert contribution for the step. Skewed gates (chapter 5's AllToAll skew) turn into a silent quality loss: one reason auxiliary load-balancing losses exist.

11. D. For the 70B example: policy ~1,120 GB, total four-model footprint ~1,494 GB, plus a growing KV cache (~86 GB GQA vs ~687 GB dense). Generation and training are different workload shapes (memory-bound decode vs FLOP-bound updates), and the fleet alternates between them, which is exactly the kind of heterogeneity DPO removes.

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol2/06-distributed-training.m4a) — a generated podcast walking this packet's argument.
