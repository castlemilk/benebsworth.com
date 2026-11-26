---
openingQuestion: "The 175B model needs 2.8 TB of training state; one accelerator holds 80 GB. Four layouts all run the same step: pure DP, TP, TP+pipeline, the full 3D grid: but three of them cannot exist. Which constraint picks the winner?"
---

# Distributed Training: Study Packet

*Working through [Distributed Training](https://mlsysbook.ai/books/vol2/06_distributed_training/06_distributed_training.html), chapter 6 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**Adding accelerators can make training slower, and the reason is arithmetic, not magic.** Every way of splitting a job buys parallel compute by selling something else: replicas buy batch throughput at the price of a synchronization; tensor splits buy memory relief at the price of constant intra-layer collectives; pipeline stages buy memory relief at the price of idle bubbles. The chapter's reference job makes the trade concrete: 175B parameters, 16 bytes each of training state, ==2.8 TB that no single 80 GB accelerator can hold=={BF16 weights alone are 350 GB, more than four H100s. The mixed-precision Adam contract adds a 2-byte gradient buffer and a 12-byte optimizer — FP32 master, momentum, variance, per parameter. Distribution here is not a performance choice; it is a capacity requirement.}. Speed is what the split costs afterward, and whether it was worth paying is a question the step-time model answers, not the accelerator count.

> [!note] How to read this packet
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Wall That Forced the Split

The memory wall is a ratio, not a slogan. Single-accelerator memory grew ~15× from K80 to B200 (12 GB to 180 GB), while the state needed to train frontier models grew ~4 orders of magnitude. ==The first plotted model to exceed one accelerator was GPT-3 in 2020, at ~35× the largest GPU of its year=={80 GB per device at 16 bytes per parameter puts the crossover near 5B parameters: anything larger must be distributed just to fit; the speed case is downstream of capacity. Below that line, distribution is a throughput choice; above it, a necessity.}. Since then the gap has only widened: the chapter's working model needs at least 35 H100s of state before a single FLOP moves.

::eq[training-state]

$$
M_{state} = 16 \times P \;\Rightarrow\; 175\mathrm{B} \times 16 = 2{,}800\ \mathrm{GB}
$$

Reliability is the second forcing function, and it is also arithmetic: a 1,024-GPU cluster at 50,000-hour per-GPU MTBF sees a failure roughly every ==49 hours=={At fleet scale the question is not whether workers die but how the schedule absorbs them; it is why the orchestration and fault-tolerance chapters exist at all.}.

## The Design Space Is Three Axes

Splitting the training loop is a compiler problem: the same program, repartitioned across iterators. The chapter's analogy maps each axis to a loop transformation: ==data parallelism is a parallel-for over the batch, tensor parallelism is vectorization inside each layer's matmuls, pipeline parallelism is instruction pipelining across layer groups=={The analogy is structural, not literal: devices still exchange shards over an interconnect, so each 'loop split' introduces a communication pattern the original program did not have.}. Device count is their product:

::eq[grid-decomposition]

$$
N = \mathrm{DP} \times \mathrm{PP} \times \mathrm{TP}
$$

Every point in that cube is a legal answer only if it satisfies three constraints at once: the model divides evenly, each device's memory holds its slice, and the fabric tier can carry that axis's traffic. ==The hierarchy decides the parallelism=={Tensor exchanges are the most frequent and stay inside the node's fast NVLink domain; pipeline activations cross neighboring nodes; data-parallel gradients are the largest but rarest transfer and can ride the slow tier. Matching each axis to the cheapest domain that carries it is the whole placement problem.}.

::fig[config-abcd]

## Data Parallelism and the Sharding Ladder

Data parallelism is the baseline: replicate the model, partition the batch, synchronize gradients once per step. Its five-stage workflow: partition, assign, local forward/backward, AllReduce, identical update: preserves single-device SGD semantics exactly. Its cost is the replicated state and the exposed synchronization.

ZeRO turns replication into progressive sharding, and each stage buys memory with a different collective schedule:

| Stage | What is sharded | 7B model per GPU | Communication |
|---|---|---|---|
| DDP | nothing | 112 GB | AllReduce (1×) |
| ZeRO-1 | optimizer state | ~29.3 GB | Reduce-to-owner + AllGather (1×) |
| ZeRO-2 | + gradients | ~15.5 GB | ReduceScatter + AllGather (1×) |
| ZeRO-3 / FSDP | + parameters | ~1.75 GB | AllGather before each layer (1.5×) |

::chart[zero-memory]

==Optimizer state is the fat target: three-quarters of the replicated footprint=={The 12-of-16 bytes are Adam's FP32 master, momentum, and variance, so ZeRO-1 alone brings a modestly-oversized model back under the accelerator ceiling while keeping DDP's byte volume. ZeRO-3 reaches near-linear memory scaling by gathering each layer's parameters just in time: the trade is a third more traffic and a collective before every layer, so the fabric must keep pace with the compute stream, not just the step boundary.}.

::fig[zero-ladder]

## What Scale-Out Actually Buys

The scaling-efficiency equation prices the whole step:

::eq[scaling-efficiency]

$$
\eta = \frac{1}{1 + N\,(T_{comm}(N) + T_{sync}(N) - T_{overlap}) / T_{compute}}
$$

The numerator hides nothing: every accelerator's exposed communication, synchronization, and straggler wait is charged against one device's compute. Measured results keep it honest: the chapter's series lands ==71–84 percent efficiency at the largest sizes, and no series reaches ideal=={The reference scaling numbers: 8 workers at batch 256 get 6.8× speedup; 64 workers at batch 2,048 get 40.1×; a stale-synchronous schedule buys 38.1× by relaxing the barrier. Eos's published figure: 21× accelerators for a 14.9× time cut.}.

::chart[scaleout-gap]

Two silent multipliers sit inside those numbers: ==a straggler-free step is rarer than one in ten thousand=={Every synchronous step waits on the slowest worker, and at fleet scale there is almost always a slow one.}, and ==a 1 percent residual at 512 workers is ~84 percent of the step=={Tiny per-worker overheads multiply by N in the efficiency equation's numerator; what looks negligible on one device dominates the bill at scale.}.

The statistical side has its own ceiling. The ==critical batch size=={Estimated by the gradient noise scale B* ≈ tr(Σ)/‖∇L‖²: below it, bigger batches cut optimization steps nearly proportionally; above it, extra samples buy progressively less. It is a statistical crossover, not a hard wall: a reminder that hardware efficiency and sample efficiency are different budgets.} bounds how much parallelism the optimizer can use, and learning-rate schedules must be revalidated when the synchronization model changes: stale-synchronous workers read parameters that are already behind.

::eq[critical-batch]

$$
B^{*} \approx \frac{\mathrm{tr}(\Sigma)}{\|\nabla \mathcal{L}(\theta)\|^{2}}
$$

## Model Parallelism's Menu

When one device cannot hold the model, the axes inside the cube become the options, and each charges a different toll:

- **Layer-wise (naive)**: stack layers per device, serialize the batch between them. Simple, but adjacent devices idle while they wait: the pipeline is the fix, not the layer split itself.
- **Pipeline**: split layers into stages and stream microbatches through. The toll is the bubble: ==(p−1)/(m+p−1) of the slot grid is idle=={PP-16 at 32 microbatches idles nearly a third of compute (~32%); PP-4 at the same count wastes ~9%; the reference PP-8 at 96 microbatches pays ~6.8%. Deeper pipelines need more microbatches to stay full, which pushes against the critical batch size.}.
- **Tensor**: split each matmul's weight matrix across devices. The toll is activation traffic: GPT-3 at TP-8 moves ==~68 GB of forward collectives per step, ~4.2 GB per stage boundary=={The per-boundary handoff is about 200 MB per microbatch, tens of MB per activation. Tensor parallelism lives inside the node because at NVLink rates the exchange fits under compute; on InfiniBand it cannot. The 2(t−1)/t ring factor is 1.75 at t=8.}.
- **Sequence/context**: shard the token axis where activation memory dwarfs weights: O(B·S·H·L) for linear layers, ==O(B·A·S²·L) for un-tiled attention=={FlashAttention removes the stored score matrix but activations still scale with context length; at 32K–1M+ token contexts the sequence dimension is the footprint that breaks memory first.}.
- **Expert (MoE)**: conditional compute decouples parameter count from per-token FLOPs. The toll is routing: ==two AllToAll collectives per MoE layer, dispatch and return=={Top-1 or top-2 gating sends each token to whichever rank hosts its expert. Capacity-limited routing drops tokens that overflow the expert's allocation; the skew problem from chapter 5 returns as a tail-latency multiplier.}.
- **Embedding sharding**: sparse tables live on parameter servers, a different traffic pattern the collective primitives do not describe.

::fig[tp-traffic]

::eq[activation-memory]

$$
M_{act} = \mathcal{O}(B \cdot S \cdot H \cdot L) \;\text{linear};\qquad \mathcal{O}(B \cdot A \cdot S^{2} \cdot L) \;\text{un-tiled attn}
$$

::eq[pipeline-bubble]

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

The lesson is the ordering. ==Communication barely separates the layouts: B, C, D land within three efficiency points: but memory disqualifies three of the four=={A is a counterfactual: replication is impossible, though its counterfactual communication (~3.1 s raw, ~0.47 s exposed at 85% overlap) is not the blocker. B's tensor shard still overflows HBM; C crosses under 80 GB only after ZeRO-1 shards the optimizer across its DP group; D fits unsharded by paying a deeper bubble: the shallowest pipeline where the 16-byte state fits, ~0.04 s/step worse than C with ZeRO-1.}. And the 16,384-GPU layout (TP-8 × PP-16 × DP-128, 16× the reference cluster) pushes persistent state to ~21.9 GB per device: but at 32 microbatches its pipeline idles ~32%, versus ~9% for C's depth.

::fig[bubble-grid]

## Many Models at Once

Alignment training breaks the single-model assumption. PPO coordinates four: ==the active policy generates autoregressively, a reward model scores, a frozen reference constrains drift, and a value model estimates returns=={On the chapter's Llama-2 70B scenario the policy's training state alone is ~1,120 GB; the full PPO working set is ~1,494 GB spread across 32 GPUs (~35-39 GB static each). The phases are asymmetric: generation is memory-bandwidth-bound on the KV cache (~86 GB with GQA vs ~687 GB dense attention), the update is compute-bound, and >50% of a generation batch can be padding.}. DPO simplifies to two models and no online generation: less exploration, far less coordination. The headroom accounting is the engineering: releasing the rollout KV restores ~2.7 GB per GPU of update-phase budget, and that margin is the difference between fitting and not.

## Choosing a Layout

The decision framework is the memory-first ordering: DDP where it fits, ZeRO stages as the footprint overflows, model parallelism where weights alone exceed the device, hybrid where both bind. And ==the measured headline is not the forecast=={45% local MFU times 83% scaling efficiency is 37% fleet MFU: applying efficiency twice forecasts 31%, which is the error. MFU and scaling efficiency are different measurements that must never be multiplied twice.}. Frameworks (DDP, FSDP, Megatron-style 3D, DeepSpeed) make the switch a config line, but the physics governs the step: one GPT-2 moved from a single NVLink node to four Ethernet nodes quadrupled GPUs and cut parallel efficiency: the same model, a different tier, a worse deal.

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
- **MFU vs fleet MFU**: per-device occupancy before vs after the scaling factor; never multiply η twice.
- **Staleness (BSP/SSP/ASP)**: how fresh the parameters each worker reads are; relaxing the barrier buys speed at revalidation cost.

## → Ben's world

The ordering is the transferable skill: **capacity first, bandwidth second, elegance last**. Any sharding/splitting decision: a document-analysis corpus across services, a benchmark harness across machines: fails the same way the four configs fail: the layout that fits is the only one that runs, and the residual overhead of the split (the 1%-per-worker tax) is the part that multiplies. And the η-twice error is the general forecasting bug: two different efficiency measurements multiplied as if they were one. It is the distributed-training version of compounding a margin.

## Open questions

- Where does the next axis land? Expert and sequence/context parallelism already add degrees beyond the cube; does routing parallelism become a fourth named axis as MoE dominates?
- Does the bubble formula survive heterogeneous fleets? The slot-grid model assumes symmetric stages; mixed-accelerator pods break the symmetry assumption.
- How far can staleness relax before convergence pays more than the barrier costs? SSP bought 38.1× here: the answer is workload-dependent and unmeasured for most.
