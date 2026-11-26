---
title: "Model Training — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/08_training/08_training.html"
canonical_url: "https://benebsworth.com/study/vol1/08-training/"
---
# Model Training: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 8 of Volume I: the training-time law, the four-term memory budget, MFU versus busy time, and why optimization is a sequential diagnostic discipline -- fit first, profile, attack the limiting term, scale last.*

## Thesis

A training run is the iron law run backwards. The model and corpus fix the work -- $O = 6PD$ operations, six FLOPs per parameter per token -- and every engineering decision buys back time inside **the eta factor** *(why it matters: Eta sits in the denominator next to the peak rate: T = O/(R_peak x eta). Every idle cycle, stall, bubble, recompute, and synchronization wait lowers eta; prefetching, fusion, and overlap raise it. Nothing else about the run is negotiable -- the operation count is the workload's, the peak is the silicon's, and eta is the engineer's.)*: T = O/(R_peak x eta). The levers are only three -- shrink the work, raise the peak, raise eta -- and every technique in the chapter moves exactly one. **Memory sits outside the law entirely** *(why it matters: The training-time law has no memory term: capacity is a feasibility constraint, not a speed factor. A step whose four-term state does not fit does not run slowly -- it does not run. So feasibility comes before speed in every plan.)*: the **four-term budget** *(why it matters: Weights plus gradients plus optimizer state plus saved activations. In the standard mixed-precision Adam recipe the static terms alone cost 16 bytes per parameter -- eight times the FP16 inference weights -- before a single activation is stored, and only the activation term grows with batch and sequence.)* decides whether a step can exist at all. That makes optimization a **sequential diagnostic discipline** *(why it matters: Fit the step into memory first, because a configuration that cannot run produces no profile. Then profile to find which D.A.M axis saturates -- compute, memory, or data -- fix that one, and re-profile. Scaling adds accelerators only when one node's memory or schedule is truly exhausted, because every replica buys arithmetic with synchronization.)*, not a bag of tricks: fit the step, read the profile, attack the limiting term, and only then reach for more hardware.

> **note**
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### The hook: scaling one step by fifteen million

- The two-layer MNIST MLP from the frameworks chapter trains on ~100K
  parameters, a few GFLOPs per example. The GPT-2 XL step is ~15 million
  times that arithmetic and carries ~10,000 times the resident state --
  the same chapter, different physics.
- The whole run needs ~1.5 x 10^21 FLOPs: at an assumed 50% efficiency
  that is ~5.1 million steps of ~0.6 s each -- about **35 days on one
  H100** *(why it matters: The chapter's lighthouse: batch 32 x 1,024 tokens on one 80 GB H100 at 700 W draws ~590 kWh at the accelerator, 417 J per step. Energy is power times the law's output, so every wasted second is wasted joules in the same proportion.)*.
- A lab that trains in three days explores over a hundred designs a year;
  one that takes a month gets about a dozen. Iteration rate, not step
  speed, is what training systems engineering actually buys.

### The training-time law

- The iron law specialized to training: the run processes D tokens
  (Data), each costs ~6P forward-plus-backward FLOPs (Algorithm), and the
  machine realizes 1/(R_peak x eta) seconds per FLOP (Machine).

**Eq 1 · The training-time law**
$$
T_{\mathrm{train}} = \frac{O}{R_{\mathrm{peak}} \times \eta_{\mathrm{hw}}}
$$

- $O = 6PD$ counts only useful model arithmetic -- rematerialization
  deliberately lands in eta instead, which is why a checkpointed run has
  the same O and a worse eta.
- Memory never appears. It is a feasibility constraint: a step that does
  not fit runs at no speed, so it cannot be priced by the law at all.
- Measured efficiency is sobering: MT-NLG trained at ~30% MFU, PaLM at
  ~46%. The higher Megatron-LM figure counts recomputation in the
  numerator -- which convention you adopt changes the number.

### MFU: the honest efficiency measure

- **MFU** *(why it matters: Model-FLOPs efficiency (MFU): useful model FLOPs per step over peak rate times measured step time. The numerator credits only forward-plus-backward model arithmetic -- padding, rematerialization, and stall time all lower the score even while the device reports busy.)* is the per-step estimator of eta: observed model arithmetic
  against what the peak could have done in the same wall-clock time.

**Eq 3 · Model FLOPs utilization**
$$
\eta_{\mathrm{MFU}} = \frac{O_{\mathrm{model}}}{R_{\mathrm{peak}} \cdot T_{\mathrm{step}}}
$$

- Three different numbers all get called by the same name: the law's
  end-to-end eta, MFU measured per step, and `nvidia-smi`'s busy
  fraction. Busy time is only an **upper bound** *(why it matters: A memory-stalled job shows ~100% busy with low MFU; a data-starved one shows low busy. nvidia-smi cannot tell a stall cycle from a matrix multiply -- it is evidence of activity, not of progress.)* -- a kernel spinning on
  HBM counts as busy.
- The GPT-2 XL example: 1.5B params x 6 FLOP/token x 32,768 tokens per
  step, against 989 TFLOP/s for 0.60 s -- MFU lands at ~50%, recovering
  the law's assumption.


**Where the peak actually goes**

| published training run | useful model FLOPs (MFU) | lost: stalls, bubbles, recompute, sync |
|---|---|---|
| MT-NLG | 30.2 | 69.8 |
| PaLM | 46.2 | 53.8 |
| GPT-2 XL (model) | 50 | 50 |

*Each bar is the hardware's peak budget; only the left segment is credited model arithmetic. MT-NLG ran at 30.2% MFU and PaLM at 46.2% (PaLM paper, useful-FLOP convention); the chapter's GPT-2 XL model assumes 50%. The uncolored share is everything eta_hw absorbs -- memory stalls, pipeline bubbles, rematerialization, synchronization. Busy-time monitors would report the same runs near 100%.*

### The four-term memory budget

- Training state = weights + gradients + optimizer state + saved
  activations. Under **mixed-precision Adam** *(why it matters: The standard recipe: FP16 weights and gradients for speed, FP32 master weights and FP32 first/second moments for stability -- 2+2+4+8 = 16 bytes per parameter, 8x the FP16 inference footprint, before any activation.)* the static
  terms alone are 16 B/param: FP16 weights + FP16 grads + FP32 master +
  two FP32 moments.

**Eq 4 · The four-term memory budget**
$$
M_{\mathrm{train}} = W + G + S_{\mathrm{opt}} + A_{\mathrm{saved}}
$$

- At 1.5B params that is 24 GB before a single activation; at 7B it is
  ~112 GB (14 + 14 + 28 + 56) -- already over one 80 GB H100 with zero
  activations stored.
- Only the activation term scales with batch and sequence, which is what
  pushes a large model past one device. GPT-2 XL at batch 32 x 1,024
  stores ~287 GB of FP16 activations -- and ~70% of that (~201 GB) is
  the quadratic attention-score matrices.
- **Scope decides which terms exist** *(why it matters: Full fine-tuning an 8B model needs ~128 GB of static state and fits no single accelerator. LoRA adapters shrink gradients and optimizer state to ~0.1% of parameters -- the same model fine-tunes in ~53 GB total -- but activations still follow the backward path through every frozen layer, so adapters buy static state, not activation memory.)*:
  frozen layers shed gradients and optimizer state but keep activations.

### The pipeline: three stage times, one interval

- A training step is a staged pipeline: host preprocessing, host-to-device
  transfer, device compute. Serial, the step costs the sum; overlapped,
  it costs **the maximum** *(why it matters: Prefetching and double buffering let batch n+1's preparation hide under batch n's compute. The interval floor becomes max(t_prep, t_xfer, t_comp) -- overlap removes exposed waits, it cannot speed the slowest stage.)*.

**Eq 5 · The overlapped step floor**
$$
T_{\mathrm{step}} \ge \max\!\left(t_{\mathrm{prep}},\, t_{\mathrm{xfer}},\, t_{\mathrm{comp}}\right)
$$

- The book's worked example: 30 + 10 + 50 = 90 ms serial collapses to a
  50 ms interval overlapped -- a 1.8x throughput gain bought entirely
  with staging buffers.

![Serial cost is the sum; overlapped cost is the max](https://benebsworth.com/study/vol1/08-training/diagrams/overlap-timeline.svg)

*Three dependent stages -- 30 ms prepare, 10 ms transfer, 50 ms compute -- cost 90 ms serially. With prefetch buffers and pinned memory, batch n+1's preparation hides under batch n's compute and the steady-state interval falls to the slowest stage: 50 ms, a 1.8x throughput gain bought entirely with staging buffers. The residual bubbles show what overlap cannot remove: the slowest stage itself.*
- ResNet-50's feed demand (~40,000 img/s at the H100's compute rate)
  outruns the host cores assigned to it: the accelerator is busy ~50% of
  the time, idle half the step. A faster GPU would be starved harder.
- Data-bound stalls are the most misdiagnosed: they appear on the device
  as idle gaps, not saturated units -- the **D.A.M triage table** *(why it matters: Compute-bound is an Algorithm fix (less or cheaper arithmetic), memory-bound is a Machine fix (fusion, IO-aware kernels, lower precision), data-bound is a Data fix (prefetch, workers, faster storage). The axis tells you where to look first.)* maps symptom
  to axis before any fix is chosen.

### The optimization stack, one term at a time

- **Mixed precision** *(why it matters: FP16/BF16 matrix products raise the attainable peak -- ~15x the FP32 scalar path on H100, ~2x TF32 via BF16 -- and halve activation bytes, while the 16 B/param static state stays fixed. FP16 needs dynamic loss scaling to keep gradients above its tiny normal floor; BF16 usually does not.)*: raises R_peak and halves
  activations; the gain is bounded by the work that stays off the matrix
  units.
- **FlashAttention** *(why it matters: IO-aware attention: exact attention tiled through on-chip SRAM with online-softmax statistics, recomputing tiles in backward instead of storing them. Stored attention state drops from quadratic to linear in sequence -- in the book's accounting, 67.1 MB to 3.1 MB per head, a ~21x cut -- without changing model FLOPs.)*: removes the
  quadratic score matrices from HBM entirely -- in GPT-2 XL's step, the
  ~201 GB of scores inside the 287 GB of activations shrinks the stored
  set to ~85.6 GB.
- **Gradient accumulation** *(why it matters: Build the effective batch from micro-batches that fit: sum normalized gradients over K micro-steps, then step once. Effective batch = micro x K x devices. Arithmetic per update is unchanged -- it is the memory shape of the batch, not the math, that changed.)*: splits the resident batch, keeping the same
  arithmetic -- 2 x 16 micro-batches reproduce the batch-32 gradient.
- **Activation checkpointing** *(why it matters: Store only k segment boundaries and recompute the interiors during backward: memory falls from O(L) to kA + (L/k)A, minimized at k = sqrt(L). For 48 layers that is ~7 checkpoints, ~14 layers of stored activations, ~71% saved -- for about +33% step compute. Compute for memory, priced honestly.)*: keeps
  sqrt(L) boundary tensors and re-runs segments in backward.

**Eq 6 · Optimal checkpoint schedule**
$$
M_{\mathrm{act}} = kA + \frac{L}{k}A,\qquad k^{*} = \sqrt{L}
$$

- Each maps to a term: peak (precision), memory (Flash, checkpointing),
  efficiency (accumulation as a fit-enabler, prefetching for the feed).
  None is free -- checkpointing pays ~one extra forward pass,
  accumulation can strand efficiency if the micro-batch starves kernels.

![sqrt(L) anchors, recompute the rest](https://benebsworth.com/study/vol1/08-training/diagrams/checkpoint-sqrt.svg)

*Activation checkpointing on a 48-layer network: seven segment-boundary tensors are retained through forward, and each ~7-layer segment interior is re-run during backward to regenerate the tensors its backward rules need. Stored activations fall from O(L) to kA + (L/k)A, minimized at k = sqrt(L) -- about 14 layers' worth instead of 48, ~71% saved, paid for with roughly one extra forward pass per step.*
### The walkthrough: 598 GB down to 66.8

- GPT-2 XL at batch 32, one H100: **FP32 baseline is 598 GB** *(why it matters: Static 24 GB + FP32 activations 574 GB -- about 7x the 80 GB capacity. The run fails the machine constraint before throughput matters.)*. The
  six-step sequence fixes whatever blocks the next, memory first:
- Mixed precision halves activations to ~287 GB -- total ~311 GB, still
  ~3.6x over. Feasibility first, but not yet feasible.
- FlashAttention drops the ~201 GB of score matrices: activations ~85.6
  GB, total ~109.6 GB -- still ~24 GB over, max resident batch ~23.
- Two micro-batches of 16 accumulate to the same gradient in **66.8 GB** *(why it matters: Activations 42.8 GB + static 24 GB -- 9x below the FP32 baseline, now inside 80 GB. The alternative, segment checkpointing, fits all 32 sequences in ~35.5 GB but pays ~33% more arithmetic; the walkthrough takes accumulation because the batch it needs fits without recompute.)*;
  checkpointing would fit in ~35.5 GB at +33% compute.
- Then the feed: 8 workers + pinned memory + prefetch push preparation
  inside the step's shadow -- device busy the whole step in the ideal
  overlapped model.
- Result at 50% efficiency: 0.60 s/step, ~55,000 tokens/s, ~35 days,
  ~590 kWh accelerator (~661 kWh facility at PUE 1.12, ~\$79, ~0.28 t
  CO2). Checkpointing the same run: ~47 days.


**Fitting GPT-2 XL batch 32 onto one 80 GB H100**

| intervention applied | static state (24 GB) | activations |
|---|---|---|
| FP32 baseline | 24 | 574 |
| + mixed precision | 24 | 287 |
| + FlashAttention | 24 | 85.6 |
| + accumulate 2 x 16 | 24 | 42.8 |

*Each bar is one step's resident training state after applying the technique above the last. Static state never moves -- 24 GB under both FP32 Adam and mixed-precision Adam (16 B/param either way). Only activations shrink: halved by FP16, then the ~201 GB of quadratic score matrices removed by FlashAttention, then halved again by the 16-sequence micro-batch. The H100's capacity is 80 GB -- only the last bar fits. Segment checkpointing reaches ~35.5 GB instead, at +33% arithmetic.*

![The staircase into one H100](https://benebsworth.com/study/vol1/08-training/diagrams/memory-staircase.svg)

*The walkthrough as a descent into the capacity box: each intervention removes a labelled slice of activation memory while the 24 GB static floor never moves. FP32's 574 GB of activations halves to 287 GB under mixed precision, loses ~201 GB of score matrices to FlashAttention, and halves again under the 16-sequence micro-batch -- 598 GB to 66.8 GB, nine times smaller, now inside 80 GB. The dashed checkpoint path shows the alternative: all 32 sequences in ~35.5 GB, paid for with ~33% more step arithmetic.*
### Scaling: buy arithmetic with synchronization

- Data parallelism replicates the model and splits the data; each replica
  computes local gradients and **ring AllReduce** *(why it matters: Two phases over a ring -- scatter-reduce then all-gather. Per-GPU sent volume is 2(N-1)/N x P x B_bytes, tending to a fixed 2PB as N grows: the per-device synchronization cost depends on parameter count, not batch or cluster size.)* averages
  them: 2 x 7/8 = 1.75x the gradient volume per device at N=8 (~12 ms
  on the book's numbers).

**Eq 7 · Ring AllReduce per-device volume**
$$
V_{\mathrm{sent}} = 2\,\frac{N-1}{N} \cdot P \cdot B_{\mathrm{bytes}}
$$

- The trap: replicate batch 32 fully and sync is ~2% of step time; split
  the same batch 8 ways to 4 per replica and each device's compute
  shrinks while gradient bytes stay fixed -- unhidden sync share grows to
  ~14%. **Speedup is less than N, always** *(why it matters: Communication-overhead speedup N/(1 + (N-1)r) bounds the gain before imbalance and stragglers. The chapter's own batch-split makes the mechanism concrete: arithmetic divides, the AllReduce bill does not.)*.


**Splitting a fixed batch grows the sync share**

| batch placement on 8 replicas | compute share of step | unhidden AllReduce share |
|---|---|---|
| batch 32 on every replica | 98 | 2 |
| batch 32 split to 4/replica | 86 | 14 |

*GPT-2 XL's ~12 ms AllReduce is ~2% of a step when each replica computes the full batch-32 gradient, but ~14% when the same batch is split eight ways: per-replica arithmetic falls with the local batch while the ~1.75x gradient volume stays fixed. The mechanism behind 'speedup < N' -- arithmetic divides, the synchronization bill does not. Illustrative shares at the chapter's constants, not a measured profile.*

- ZeRO shards the state itself: stage 1 optimizer state, stage 2 adds
  gradients, stage 3 adds parameters -- Llama 3 8B under ZeRO-3 across 8
  drops to ~16 GB of static state per accelerator.
- The node boundary is where physics changes: NVLink ~900 GB/s inside,
  inter-node links one to two orders below. Keep tensor parallelism's
  intra-layer chatter inside the node; let data parallelism's once-per-
  step gradient exchange cross the slow link.
- Fail-stop becomes routine at scale: a checkpoint saves weights + master
  + moments + scheduler + RNG + data position + scaler -- ~23 GB beyond
  the weights for GPT-2 XL, ~3 s to write. Cadence trades save stalls
  against replayed work: fault tolerance is a throughput decision.

### The physical ceiling

- A 10^24-FLOP run at a sustained 10^15 FLOP/s on one device is **~32
  years** *(why it matters: The arithmetic ceiling in its purest form: no memory or pipeline fix moves it -- only more realized FLOP/s. The 1,024-GPU reference run compresses it to ~23 hours at ~17,105 kWh -- about 19 months of average household electricity.)* -- only scale moves it.
- The same run on 1,024 GPUs: ~23 hours, and the eta factor --
  not the peak -- decides whether the calendar actually says one day.
- Choose the least distributed configuration that satisfies measured
  memory, throughput, and schedule: single GPU when it fits and finishes,
  one node when fast interconnects suffice, multi-node only when both
  are exhausted.

### Fallacies worth keeping

- *Larger models always perform better* -- a 20B model needs ~320 GB of
  non-activation state under the same recipe; whether it outperforms the
  7B depends on data and optimization, not parameter count.
- *Distributed training automatically accelerates* -- communication,
  smaller local batches, and imbalance eat the gain; measure end-to-end.
- *Memory budgeting is the weights* -- static state alone is 16 B/param
  before activations, and activations have no universal weight multiple.
- *The accelerator is always the bottleneck* -- ResNet-50's feed starves
  an H100 to ~50% busy; a faster GPU starves faster.
- *Hyperparameters transfer across scale* -- linear LR scaling is a
  recipe to validate, not a law; effective batch and schedule move
  together.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Training work | $O = 6PD$ FLOPs | the workload's fixed term |
| GPT-2 XL run total | ~$1.5{\times}10^{21}$ FLOPs, ~5.1M steps | the lighthouse workload |
| Step at 50% eta | ~0.60 s, ~55,000 tokens/s | $\sim$35 days on one H100 |
| Run energy | ~590 kWh accelerator, ~661 kWh facility (PUE 1.12) | ~417 J/step; ~\$79; ~0.28 t |
| Measured MFU | MT-NLG ~30.2%, PaLM ~46.2% | how far below peak real runs sit |
| Static state | 16 B/param (FP16 W+G, FP32 master + 2 moments) | 8x inference weights, before activations |
| GPT-2 XL static | 24 GB | the floor any step pays |
| 7B Adam static | ~112 GB (14+14+28+56) | over one H100 with zero activations |
| 8B full FT static | ~128 GB; LoRA total ~53 GB | scope decides which terms exist |
| GPT-2 XL activations | ~287 GB FP16 at B32 x S1024 | the term that grows with batch |
| Score-matrix share | ~201 GB of 287 GB (~70%) | what FlashAttention never stores |
| FlashAttention storage | 67.1 MB to 3.1 MB per head (~21x) | quadratic to linear in sequence |
| FP32 baseline step | ~598 GB (~7x H100) | where the walkthrough starts |
| Optimized resident | 66.8 GB (2 x 16 accum); 35.5 GB (checkpoint) | 9x cut; +33% compute alternative |
| Checkpoint schedule | $k^{*}=\sqrt{L}$; 48 to ~7 ckpts, ~71% saved | activation O(L) to O(sqrt L) |
| Pipeline interval | serial 90 ms to overlapped 50 ms | floor = slowest stage |
| ResNet-50 feed demand | ~40,000 img/s vs host decode rate | H100 ~50% busy, starved |
| Ring AllReduce | $2(N{-}1)/N = 1.75$ at N=8, ~12 ms | per-device volume set by P, not B |
| Sync share, split batch | ~2% (replicated 32) to ~14% (4/replica) | why split batches lose scaling |
| ZeRO-3 sharded state | ~16 GB/accel for Llama 3 8B on 8 | parameters sharded too |
| Node fabric | NVLink ~900 GB/s; inter-node 10-100x lower | what crossing the boundary costs |
| Physical ceiling | $10^{24}$ FLOP at $10^{15}$ FLOP/s to ~32 years; 1,024 GPUs to ~23 h | only realized FLOP/s moves it |

## Glossary

- **Training-time law** -- $T = O/(R_{\mathrm{peak}}\eta)$: the iron law specialized to a training run; memory is outside it.
- **MFU** -- useful model FLOPs per step over peak rate x step time; the honest eta estimator.
- **Busy-time fraction** -- the `nvidia-smi` activity fraction; an upper bound on MFU, not a proxy for it.
- **Static training state** -- weights + gradients + optimizer state; ~16 B/param under mixed-precision Adam.
- **FP32 master weights** -- the high-precision copy the optimizer updates while FP16 copies run the kernels.
- **Loss scaling** -- multiplying the loss to lift FP16 gradients above the format's tiny normal floor.
- **Gradient accumulation** -- summing normalized micro-batch gradients before one update; effective batch = micro x K x devices.
- **Activation checkpointing** -- storing sqrt(L) segment boundaries and recomputing interiors in backward.
- **FlashAttention** -- IO-aware exact attention: tiled online softmax in SRAM, tiles recomputed in backward.
- **Ring AllReduce** -- scatter-reduce + all-gather over a ring; per-device volume $2(N{-}1)/N \cdot P \cdot B$.
- **ZeRO** -- zero-redundancy optimizer: shards optimizer state, then gradients, then parameters across devices.
- **Pipeline bubble** -- stage idle time in model parallelism; amortized by pipelining micro-batches.
- **Micro-batch** -- the per-accumulation-step resident batch; the unit activation memory scales with.
- **Wave quantization** -- tail effect when a grid's last wave of thread blocks underfills the device.

## → Ben's world

- The LLM benchmark harness (`lib/lab/llm-benchmark/`) prices every run
  in tokens and wall time the way this chapter prices FLOPs and eta --
  the same "a score is not a decision" discipline, one layer down: a
  reported MFU is not a shipping decision until the memory feasibility
  check and the quality floor pass.
- Ollama bench results (~23.5 tok/s for qwen3.8 without think, 132 for
  gemma3:4b) are the serving-side mirror of the efficiency story: the
  number that matters is realized throughput against the device's roof,
  not the model card's peak.
- The shared droplet's cost model (\$24/mo fixed over per-request
  serverless) is the chapter's own economics in miniature: a training
  run's dollar cost is power x time x rate, so every recovered point of
  efficiency at fixed power is recovered budget -- the same inequality
  the rent-vs-buy breakeven computes.
- doc-analyser's pipeline is the data-feed problem this chapter prices:
  the accelerator's step floor is the slowest of prep/xfer/compute, and
  overlap hides waits but cannot raise the slowest stage -- true for a
  tokenizer ahead of a GPU and for OCR ahead of an LLM call.

## Open questions

- The chapter pins ~50% eta for GPT-2 XL; what actually separates a 30%
  MFU run from a 46% one at scale -- is it the collective-overlap
  engineering, the kernel mix, or the counting convention?
- Checkpointing's +33% arithmetic buys memory that might buy a larger
  batch and better kernels instead -- where is the breakeven between
  recompute and bigger micro-batches?
- Loss scaling is required for FP16 but not BF16; FP8 halves again. Does
  the 2x FP8 peak survive contact with a real optimizer step, or does
  per-tensor scaling noise eat the margin?
- The walkthrough fits one H100 by construction; at what model size does
  the same six-step sequence become ZeRO-3-by-default rather than an
  escape hatch?


---

## Key equations

**Eq 1 · The training-time law**

$$
T_{\mathrm{train}} = \frac{O}{R_{\mathrm{peak}} \times \eta_{\mathrm{hw}}}
$$

*The iron law's macroscopic product specialized to a training run. O counts only useful model FLOPs; every stall, bubble, and recompute lives in eta. Memory is absent -- it is a feasibility constraint, not a factor.*

**Eq 2 · Training work per token**

$$
O = 6 \cdot P \cdot D
$$

*Each token costs ~2P FLOPs forward and ~4P backward -- six per parameter in all, times the corpus token count. The factor the optimizer cannot change; only data curation or a different algorithm shrinks it.*

**Eq 3 · Model FLOPs utilization**

$$
\eta_{\mathrm{MFU}} = \frac{O_{\mathrm{model}}}{R_{\mathrm{peak}} \cdot T_{\mathrm{step}}}
$$

*The per-step estimator of eta_hw: useful model arithmetic over what the peak could have executed in the measured step time. The numerator excludes rematerialization, so a checkpointed run scores lower even at equal speed.*

**Eq 4 · The four-term memory budget**

$$
M_{\mathrm{train}} = W + G + S_{\mathrm{opt}} + A_{\mathrm{saved}}
$$

*Weights, gradients, optimizer state, and saved activations. Under mixed-precision Adam the first three are a fixed 16 B/param; only A grows with batch and sequence, which is the term that pushes a model off one device.*

**Eq 5 · The overlapped step floor**

$$
T_{\mathrm{step}} \ge \max\!\left(t_{\mathrm{prep}},\, t_{\mathrm{xfer}},\, t_{\mathrm{comp}}\right)
$$

*Serial stages cost their sum; correctly overlapped stages cost their maximum. The book's 30+10+50 ms example falls to a 50 ms interval -- overlap removes exposed waits, never the slowest stage itself.*

**Eq 6 · Optimal checkpoint schedule**

$$
M_{\mathrm{act}} = kA + \frac{L}{k}A,\qquad k^{*} = \sqrt{L}
$$

*Store k segment boundaries and recompute the L/k layers inside each. The minimum lands at k = sqrt(L): 48 layers become ~7 retained checkpoints, ~71% of activations saved for about one extra forward pass.*

**Eq 7 · Ring AllReduce per-device volume**

$$
V_{\mathrm{sent}} = 2\,\frac{N-1}{N} \cdot P \cdot B_{\mathrm{bytes}}
$$

*Scatter-reduce plus all-gather around a ring. Per-GPU traffic tends to a fixed 2PB as N grows -- set by parameter count, not batch size, which is why splitting a batch raises the unhidden sync share.*

**Eq 8 · Effective batch under accumulation**

$$
B_{\mathrm{eff}} = b_{\mathrm{micro}} \cdot K \cdot N
$$

*The batch the optimizer actually sees: micro-batch per accumulation step, times accumulation steps, times data-parallel replicas. Arithmetic per update is unchanged -- accumulation changes the memory shape of the batch, not the math.*

## From the book

- [Training versus inference cost asymmetry](https://mlsysbook.ai/vol1/08_training/08_training.html) — The book's opening comparison of one inference against a full training run -- the orders-of-magnitude gap that motivates the whole chapter. Our physics table carries the same point as a row of numbers; theirs shows it as a shape.
- [The iron law applied to training](https://mlsysbook.ai/vol1/08_training/08_training.html) — The D.A.M product split for a training run -- Data supplies D, Algorithm supplies the 6P coefficient, Machine supplies R_peak and eta. Ours decomposes the same law through the utilization factor; theirs labels the taxonomy axes.
- [Optimizer state across optimizers](https://mlsysbook.ai/vol1/08_training/08_training.html) — The book's comparison of bytes-per-parameter under SGD, momentum, and Adam. Our four-term budget equation fixes the mixed-precision Adam recipe at 16 B/param; theirs shows how the recipe choice moves the static floor.
- [Margin figure: pipeline staging](https://mlsysbook.ai/vol1/08_training/08_training.html) — One of the book's margin sketches on the staged input pipeline. Our overlap-timeline diagram carries the serial-to-max argument as a worked numeric example; theirs sketches the same staging abstractly.
- [Margin figure: memory components](https://mlsysbook.ai/vol1/08_training/08_training.html) — The book's margin view of training-state components. Our memory-staircase chart plots the walkthrough's actual GB values descending into capacity; theirs shows the component taxonomy.
- [Margin figure: scaling behavior](https://mlsysbook.ai/vol1/08_training/08_training.html) — The book's margin sketch of scaling efficiency. Our sync-share chart makes the mechanism quantitative -- the fixed ~1.75x gradient volume against shrinking per-replica compute; theirs shows the scaling curve.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

Book MCQs are drawn from the chapter's own quiz bank
(`training_quizzes.json`). The Feynman prompts and numeric problems are
original. Answer before checking the key at the bottom.

## Book questions

**Q1.** A 7-billion-parameter model uses 14 GB of FP16 weights for
inference and fits comfortably on a single 40 GB accelerator. Switching
the same model to standard mixed-precision Adam training causes immediate
out-of-memory failures even before activations are accounted for. Which
factor is most directly responsible?

- a. Adam internally re-runs the forward and backward passes, so the same
  weights must be stored several extra times during each step.
- b. Adam adds 14 GB of FP16 gradients, 28 GB of FP32 master weights, and
  56 GB of FP32 first- and second-moment state, pushing the static
  training state to about 112 GB before activations.
- c. Adam requires the full training corpus to be cached in accelerator
  memory so batches can be reused across optimizer steps.
- d. Adam forces all model tensors into FP64 during backpropagation,
  which multiplies the weight footprint beyond device capacity.

**Q2.** Why is MFU (model-FLOPs efficiency) a more reliable metric than
raw GPU busy percentage (from tools like `nvidia-smi`) when evaluating
training efficiency?

- a. MFU measures CPU-side input pipeline throughput rather than device
  activity, so it captures data starvation.
- b. MFU is fixed at 100% for a well-configured run, making it a stable
  target.
- c. A device can show ~95% busy while stalling on memory bandwidth or
  recomputing activations; MFU's numerator credits only useful
  forward+backward model FLOPs, penalizing recomputation, padding,
  stalls, and bubbles.
- d. MFU measures loss convergence per dollar, which busy percentage
  ignores.

**Q3.** A training step has three dependent stages in a serial baseline:
preprocessing 30 ms, host-to-device transfer 10 ms, GPU compute 50 ms.
Different batches can occupy independent resources. With steady-state
overlap (prefetching + double buffering), what iteration interval is
theoretically possible?

- a. 10 ms -- the interval is set by the fastest stage.
- b. 50 ms -- the interval is set by the slowest stage.
- c. 90 ms -- dependent stages can never overlap.
- d. 30 ms -- the interval is set by the average stage time.

**Q4.** A team enables mixed precision on a transformer and sees compute
time drop 45%, but total step time drops only 10% because the GPU now
shows large idle gaps. What likely happened and what should they do
next?

- a. Mixed precision failed; revert to FP32 and report the regression.
- b. The compute optimization removed part of the old critical path and
  exposed a different stage -- input waits, dispatch, or synchronization.
  Re-profile and correlate the gaps with pipeline stages before the next
  fix.
- c. The GPU is thermally throttling; add accelerators to absorb the
  idle time.
- d. The gaps prove a data-loader fault; rewrite the DataLoader
  immediately.

**Q5.** In distributed data-parallel training with $N$ GPUs and $P$
parameters whose gradients use $B_{\mathrm{bytes}}$ bytes each, how many
bytes does each GPU send during a ring AllReduce?

- a. $2 \times \frac{N-1}{N} \times P \times B_{\mathrm{bytes}}$ --
  tending to a fixed $2 P B_{\mathrm{bytes}}$ as $N$ grows.
- b. $N \times P \times B_{\mathrm{bytes}}$ -- each GPU broadcasts its
  full gradient to every peer.
- c. $P \times B_{\mathrm{bytes}} / N$ -- the volume divides evenly
  across the ring.
- d. $(N-1) \times P \times B_{\mathrm{bytes}}$ -- one exchange per peer.

**Q6.** A team scales a dense model from 7B to 20B parameters while
keeping the same training-token budget, precision recipe, and optimizer.
Under the chapter's fallacies discussion, what is the most defensible
conclusion?

- a. Validation quality must improve, since parameters scale capacity.
- b. Validation quality must collapse, because 20B models overfit a
  fixed token budget.
- c. The run moves to CPU training because no GPU supports 20B
  parameters.
- d. Memory and FLOP requirements rise predictably (~320 GB of
  non-activation state under the recipe), but the quality outcome is not
  guaranteed by parameter count alone -- it depends on data and
  optimization.

## Feynman prompts

**F1.** Explain to a colleague why "the GPU is at 100% busy" can
be a meaningless statement about training progress, and what you would
measure instead.

**F2.** The chapter insists memory is "outside the law" yet memory
techniques dominate its optimization stack. Reconcile that in your own
words.

## Numeric problems

**N1.** A 3-billion-parameter model trains under the standard
mixed-precision Adam recipe (FP16 weights + FP16 gradients + FP32 master
+ two FP32 moments). (a) How many bytes of static state per parameter?
(b) How many GB of static state before activations? (c) If activations
at the chosen batch need 40 GB, does the step fit one 80 GB accelerator?

**N2.** A pipeline's stages take 20 ms (prep), 15 ms (transfer), and
45 ms (compute). (a) Serial step cost? (b) Best possible overlapped
interval? (c) Throughput gain? (d) The compute stage drops to 30 ms --
new interval, and which stage now sets it?

**N3.** Eight H100s train a 1.5B-parameter model data-parallel with FP16
gradients ($B = 2$ bytes). (a) Bytes each GPU sends per ring AllReduce?
(b) The ring factor? (c) Why does that volume not shrink when the global
batch is split eight ways? (d) At ~12 ms per AllReduce and a 0.6 s step,
what share of step time is unhidden sync?

## Answer key

- **Q1. b** -- 14 + 14 + 28 + 56 = ~112 GB before activations. Adam
  re-running passes confuses optimizer state with computation; dataset
  caching lives in the input pipeline.
- **Q2. c** -- busy time counts activity, not progress: stalls and
  recompute look fully busy. MFU credits only model arithmetic.
- **Q3. b** -- overlap changes the interval from the sum (90 ms) to the
  max (50 ms), a 1.8x throughput gain.
- **Q4. b** -- optimizing one stage exposes the next limiter; the gaps
  are a bottleneck migration, not a specific diagnosis. Re-profile.
- **Q5. a** -- scatter-reduce + all-gather each move ~(N-1)/N x P x B
  per device; volume is set by parameters, not batch.
- **Q6. d** -- the systems cost is deterministic (~16 B/param static);
  the quality outcome is not.
- **F1.** Busy counts active cycles; a memory-stalled or rematerializing
  kernel is fully busy while doing no useful model work. Measure MFU
  (model FLOPs over peak x step time), then profile to decompose the
  lost fraction.
- **F2.** The law prices speed; memory is a feasibility gate. A step
  that does not fit has no T to optimize -- fit first (precision, Flash,
  accumulation, checkpointing), then attack eta. Memory techniques
  dominate because feasibility is the gate.
- **N1.** (a) 2+2+4+8 = 16 B/param. (b) 48 GB. (c) 48 + 40 = 88 GB >
  80 -- does not fit.
- **N2.** (a) 80 ms. (b) 45 ms. (c) ~1.78x. (d) 30 ms, still compute;
  below 20 ms prep would take over.
- **N3.** (a) 5.25 GB. (b) 1.75. (c) AllReduce moves parameters, not
  samples -- compute divides, the sync bill does not. (d) ~2% here,
  rising toward ~14% at 4 sequences per replica.

## Audio overview

[Listen to the Marcus & Iris read-along (~11 min)](https://benebsworth.com/study-audio/vol1/08-training.m4a) — a generated podcast walking this packet's argument.
