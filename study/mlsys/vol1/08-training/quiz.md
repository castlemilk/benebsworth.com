# Model Training -- self-test

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
