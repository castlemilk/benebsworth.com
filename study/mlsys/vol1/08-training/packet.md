# Model Training: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 8 of Volume I: the training-time law, the four-term memory budget, MFU versus busy time, and why optimization is a sequential diagnostic discipline -- fit first, profile, attack the limiting term, scale last.*

## Thesis

A training run is the iron law run backwards. The model and corpus fix the work -- $O = 6PD$ operations, six FLOPs per parameter per token -- and every engineering decision buys back time inside ==the eta factor=={Eta sits in the denominator next to the peak rate: T = O/(R_peak x eta). Every idle cycle, stall, bubble, recompute, and synchronization wait lowers eta; prefetching, fusion, and overlap raise it. Nothing else about the run is negotiable -- the operation count is the workload's, the peak is the silicon's, and eta is the engineer's.}: T = O/(R_peak x eta). The levers are only three -- shrink the work, raise the peak, raise eta -- and every technique in the chapter moves exactly one. ==Memory sits outside the law entirely=={The training-time law has no memory term: capacity is a feasibility constraint, not a speed factor. A step whose four-term state does not fit does not run slowly -- it does not run. So feasibility comes before speed in every plan.}: the ==four-term budget=={Weights plus gradients plus optimizer state plus saved activations. In the standard mixed-precision Adam recipe the static terms alone cost 16 bytes per parameter -- eight times the FP16 inference weights -- before a single activation is stored, and only the activation term grows with batch and sequence.} decides whether a step can exist at all. That makes optimization a ==sequential diagnostic discipline=={Fit the step into memory first, because a configuration that cannot run produces no profile. Then profile to find which D.A.M axis saturates -- compute, memory, or data -- fix that one, and re-profile. Scaling adds accelerators only when one node's memory or schedule is truly exhausted, because every replica buys arithmetic with synchronization.}, not a bag of tricks: fit the step, read the profile, attack the limiting term, and only then reach for more hardware.

> [!note]
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### The hook: scaling one step by fifteen million

- The two-layer MNIST MLP from the frameworks chapter trains on ~100K
  parameters, a few GFLOPs per example. The GPT-2 XL step is ~15 million
  times that arithmetic and carries ~10,000 times the resident state --
  the same chapter, different physics.
- The whole run needs ~1.5 x 10^21 FLOPs: at an assumed 50% efficiency
  that is ~5.1 million steps of ~0.6 s each -- about ==35 days on one
  H100=={The chapter's lighthouse: batch 32 x 1,024 tokens on one 80 GB H100 at 700 W draws ~590 kWh at the accelerator, 417 J per step. Energy is power times the law's output, so every wasted second is wasted joules in the same proportion.}.
- A lab that trains in three days explores over a hundred designs a year;
  one that takes a month gets about a dozen. Iteration rate, not step
  speed, is what training systems engineering actually buys.

### The training-time law

- The iron law specialized to training: the run processes D tokens
  (Data), each costs ~6P forward-plus-backward FLOPs (Algorithm), and the
  machine realizes 1/(R_peak x eta) seconds per FLOP (Machine).

::eq[training-time-law]
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

- ==MFU=={Model-FLOPs efficiency (MFU): useful model FLOPs per step over peak rate times measured step time. The numerator credits only forward-plus-backward model arithmetic -- padding, rematerialization, and stall time all lower the score even while the device reports busy.} is the per-step estimator of eta: observed model arithmetic
  against what the peak could have done in the same wall-clock time.

::eq[mfu]
$$
\eta_{\mathrm{MFU}} = \frac{O_{\mathrm{model}}}{R_{\mathrm{peak}} \cdot T_{\mathrm{step}}}
$$

- Three different numbers all get called by the same name: the law's
  end-to-end eta, MFU measured per step, and `nvidia-smi`'s busy
  fraction. Busy time is only an ==upper bound=={A memory-stalled job shows ~100% busy with low MFU; a data-starved one shows low busy. nvidia-smi cannot tell a stall cycle from a matrix multiply -- it is evidence of activity, not of progress.} -- a kernel spinning on
  HBM counts as busy.
- The GPT-2 XL example: 1.5B params x 6 FLOP/token x 32,768 tokens per
  step, against 989 TFLOP/s for 0.60 s -- MFU lands at ~50%, recovering
  the law's assumption.

::chart[mfu-share]

### The four-term memory budget

- Training state = weights + gradients + optimizer state + saved
  activations. Under ==mixed-precision Adam=={The standard recipe: FP16 weights and gradients for speed, FP32 master weights and FP32 first/second moments for stability -- 2+2+4+8 = 16 bytes per parameter, 8x the FP16 inference footprint, before any activation.} the static
  terms alone are 16 B/param: FP16 weights + FP16 grads + FP32 master +
  two FP32 moments.

::eq[memory-budget]
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
- ==Scope decides which terms exist=={Full fine-tuning an 8B model needs ~128 GB of static state and fits no single accelerator. LoRA adapters shrink gradients and optimizer state to ~0.1% of parameters -- the same model fine-tunes in ~53 GB total -- but activations still follow the backward path through every frozen layer, so adapters buy static state, not activation memory.}:
  frozen layers shed gradients and optimizer state but keep activations.

### The pipeline: three stage times, one interval

- A training step is a staged pipeline: host preprocessing, host-to-device
  transfer, device compute. Serial, the step costs the sum; overlapped,
  it costs ==the maximum=={Prefetching and double buffering let batch n+1's preparation hide under batch n's compute. The interval floor becomes max(t_prep, t_xfer, t_comp) -- overlap removes exposed waits, it cannot speed the slowest stage.}.

::eq[overlapped-step]
$$
T_{\mathrm{step}} \ge \max\!\left(t_{\mathrm{prep}},\, t_{\mathrm{xfer}},\, t_{\mathrm{comp}}\right)
$$

- The book's worked example: 30 + 10 + 50 = 90 ms serial collapses to a
  50 ms interval overlapped -- a 1.8x throughput gain bought entirely
  with staging buffers.

::fig[overlap-timeline]

- ResNet-50's feed demand (~40,000 img/s at the H100's compute rate)
  outruns the host cores assigned to it: the accelerator is busy ~50% of
  the time, idle half the step. A faster GPU would be starved harder.
- Data-bound stalls are the most misdiagnosed: they appear on the device
  as idle gaps, not saturated units -- the ==D.A.M triage table=={Compute-bound is an Algorithm fix (less or cheaper arithmetic), memory-bound is a Machine fix (fusion, IO-aware kernels, lower precision), data-bound is a Data fix (prefetch, workers, faster storage). The axis tells you where to look first.} maps symptom
  to axis before any fix is chosen.

### The optimization stack, one term at a time

- ==Mixed precision=={FP16/BF16 matrix products raise the attainable peak -- ~15x the FP32 scalar path on H100, ~2x TF32 via BF16 -- and halve activation bytes, while the 16 B/param static state stays fixed. FP16 needs dynamic loss scaling to keep gradients above its tiny normal floor; BF16 usually does not.}: raises R_peak and halves
  activations; the gain is bounded by the work that stays off the matrix
  units.
- ==FlashAttention=={IO-aware attention: exact attention tiled through on-chip SRAM with online-softmax statistics, recomputing tiles in backward instead of storing them. Stored attention state drops from quadratic to linear in sequence -- in the book's accounting, 67.1 MB to 3.1 MB per head, a ~21x cut -- without changing model FLOPs.}: removes the
  quadratic score matrices from HBM entirely -- in GPT-2 XL's step, the
  ~201 GB of scores inside the 287 GB of activations shrinks the stored
  set to ~85.6 GB.
- ==Gradient accumulation=={Build the effective batch from micro-batches that fit: sum normalized gradients over K micro-steps, then step once. Effective batch = micro x K x devices. Arithmetic per update is unchanged -- it is the memory shape of the batch, not the math, that changed.}: splits the resident batch, keeping the same
  arithmetic -- 2 x 16 micro-batches reproduce the batch-32 gradient.
- ==Activation checkpointing=={Store only k segment boundaries and recompute the interiors during backward: memory falls from O(L) to kA + (L/k)A, minimized at k = sqrt(L). For 48 layers that is ~7 checkpoints, ~14 layers of stored activations, ~71% saved -- for about +33% step compute. Compute for memory, priced honestly.}: keeps
  sqrt(L) boundary tensors and re-runs segments in backward.

::eq[checkpoint-schedule]
$$
M_{\mathrm{act}} = kA + \frac{L}{k}A,\qquad k^{*} = \sqrt{L}
$$

- Each maps to a term: peak (precision), memory (Flash, checkpointing),
  efficiency (accumulation as a fit-enabler, prefetching for the feed).
  None is free -- checkpointing pays ~one extra forward pass,
  accumulation can strand efficiency if the micro-batch starves kernels.

::fig[checkpoint-sqrt]

### The walkthrough: 598 GB down to 66.8

- GPT-2 XL at batch 32, one H100: ==FP32 baseline is 598 GB=={Static 24 GB + FP32 activations 574 GB -- about 7x the 80 GB capacity. The run fails the machine constraint before throughput matters.}. The
  six-step sequence fixes whatever blocks the next, memory first:
- Mixed precision halves activations to ~287 GB -- total ~311 GB, still
  ~3.6x over. Feasibility first, but not yet feasible.
- FlashAttention drops the ~201 GB of score matrices: activations ~85.6
  GB, total ~109.6 GB -- still ~24 GB over, max resident batch ~23.
- Two micro-batches of 16 accumulate to the same gradient in ==66.8 GB=={Activations 42.8 GB + static 24 GB -- 9x below the FP32 baseline, now inside 80 GB. The alternative, segment checkpointing, fits all 32 sequences in ~35.5 GB but pays ~33% more arithmetic; the walkthrough takes accumulation because the batch it needs fits without recompute.};
  checkpointing would fit in ~35.5 GB at +33% compute.
- Then the feed: 8 workers + pinned memory + prefetch push preparation
  inside the step's shadow -- device busy the whole step in the ideal
  overlapped model.
- Result at 50% efficiency: 0.60 s/step, ~55,000 tokens/s, ~35 days,
  ~590 kWh accelerator (~661 kWh facility at PUE 1.12, ~\$79, ~0.28 t
  CO2). Checkpointing the same run: ~47 days.

::chart[memory-staircase]

::fig[memory-staircase-svg]

### Scaling: buy arithmetic with synchronization

- Data parallelism replicates the model and splits the data; each replica
  computes local gradients and ==ring AllReduce=={Two phases over a ring -- scatter-reduce then all-gather. Per-GPU sent volume is 2(N-1)/N x P x B_bytes, tending to a fixed 2PB as N grows: the per-device synchronization cost depends on parameter count, not batch or cluster size.} averages
  them: 2 x 7/8 = 1.75x the gradient volume per device at N=8 (~12 ms
  on the book's numbers).

::eq[ring-allreduce]
$$
V_{\mathrm{sent}} = 2\,\frac{N-1}{N} \cdot P \cdot B_{\mathrm{bytes}}
$$

- The trap: replicate batch 32 fully and sync is ~2% of step time; split
  the same batch 8 ways to 4 per replica and each device's compute
  shrinks while gradient bytes stay fixed -- unhidden sync share grows to
  ~14%. ==Speedup is less than N, always=={Communication-overhead speedup N/(1 + (N-1)r) bounds the gain before imbalance and stragglers. The chapter's own batch-split makes the mechanism concrete: arithmetic divides, the AllReduce bill does not.}.

::chart[sync-share]

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

- A 10^24-FLOP run at a sustained 10^15 FLOP/s on one device is ==~32
  years=={The arithmetic ceiling in its purest form: no memory or pipeline fix moves it -- only more realized FLOP/s. The 1,024-GPU reference run compresses it to ~23 hours at ~17,105 kWh -- about 19 months of average household electricity.} -- only scale moves it.
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
