# hosts: Marcus | Iris

A: Welcome back to the study sessions for Machine Learning Systems. I'm Marcus.
![Model training](/study/vol1/08-training/cover.webp)

B: And I'm Iris. Today is chapter eight - Model Training. This is the big one: everything from the last seven chapters converges here.

A: And it opens with scale. Remember the little two-layer MNIST network from the frameworks chapter? A hundred thousand parameters, a few gigaflops per example.

B: And now we're training GPT-2 XL?

A: The GPT-2 XL training step is about fifteen million times that arithmetic and carries ten thousand times the resident state. The full run needs about one point five times ten to the twenty-one FLOPs.

B: Twenty-one zeros. What does that buy you on real hardware?

A: At an assumed fifty percent efficiency - a round number at the high end of what big runs sustain - about five point one million steps of zero point six seconds each. Thirty-five days on one H100.

B: And the chapter turns that into a law.
::eq[training-time-law]

A: The training-time law: T equals O over R-peak times eta. The run's operation count O is six-P-D - six FLOPs per parameter per token, forward plus backward. Divide by the peak rate and the efficiency factor, and you get the calendar.

B: Three levers, and only three: shrink the work, raise the peak, or raise the efficiency.

A: Right. And here's the subtle part - memory doesn't appear in the law at all.

B: How can the biggest constraint not be a term?

A: Because memory isn't a speed factor - it's a feasibility constraint. A step that doesn't fit doesn't run slowly. It doesn't run. So every plan starts by fitting the state, and only then does the efficiency factor become the engineering target.

B: Which brings us to the four-term budget.
::eq[memory-budget]

A: Weights, gradients, optimizer state, saved activations. Under the standard mixed-precision Adam recipe, the static terms alone cost sixteen bytes per parameter - eight times the inference weights.

B: Sixteen bytes. Walk me through it.

A: Two for the FP16 kernel weights, two for FP16 gradients, four for the FP32 master copy, and eight for Adam's two FP32 moments. At GPT-2 XL's one point five billion parameters that's twenty-four gigabytes before a single activation is stored.

B: And a seven-billion model?

A: A hundred twelve gigabytes of static state. Over one eighty-gigabyte H100 with zero activations. The model never made it to the interesting part.

B: So only the activation term scales with batch and sequence. And GPT-2 XL at batch thirty-two stores...

A: Two hundred eighty-seven gigabytes of FP16 activations. And here's the kicker - about seventy percent of that is the quadratic attention-score matrices. Two hundred gigabytes of scores.
::fig[memory-staircase-svg]

B: That's what FlashAttention exists for.

A: Exactly. IO-aware attention: tiles the computation through on-chip SRAM with online-softmax statistics and recomputes tiles during backward instead of storing them. Stored attention state drops from quadratic to linear in sequence.

B: The book's number is striking - sixty-seven megabytes down to three per head.

A: A twenty-one-times cut, and it changes zero model FLOPs. Same math, different memory traffic.

B: Okay, so we've got the memory story. But before the techniques - how do you know which problem you have?

A: That's the MFU section, and it's the chapter's most useful calibration. Three different numbers all get called by the same name, and only one is honest.

B: nvidia-smi's busy percentage is the trap.
::eq[mfu]

A: A kernel stalled on HBM, padding a tile, or recomputing a discarded activation all report busy. Busy time is an upper bound, never evidence. MFU is the honest estimator - useful model FLOPs per step over the peak rate times measured step time.

B: And the published numbers are sobering. MT-NLG trained at thirty percent MFU. PaLM at forty-six.

A: World-class engineering, half the peak. The Megatron-LM figure looks higher because it counts recomputation in the numerator - the convention moves the number too.

B: Meanwhile the pipeline sits underneath all of this.
::fig[overlap-timeline]

A: Three stages per step: host preparation, host-to-device transfer, device compute. Serial, they cost the sum - thirty plus ten plus fifty is ninety milliseconds. Overlapped correctly, the interval becomes the maximum - fifty milliseconds.

B: A one-point-eight-times gain bought entirely with staging buffers. And ResNet-50 makes the point viscerally.

A: The H100 could chew forty thousand images a second, but the host cores can't decode fast enough. The accelerator sits busy about half the time, idle the other half. A faster GPU would be starved harder.

B: Data-bound stalls are the most misdiagnosed because they show up as idle gaps, not saturated units.

A: Which is why the chapter gives you the D-A-M triage table: compute-bound is an algorithm fix, memory-bound is a machine fix, data-bound is a data fix. Profile first.

B: Now the walkthrough - this is where it all lands. GPT-2 XL, batch thirty-two, one H100.
::fig[memory-staircase-svg]

A: FP32 baseline: twenty-four gigabytes of static state plus five hundred seventy-four gigabytes of activations. Five hundred ninety-eight total - seven times the H100's capacity. The run fails before throughput matters.

B: Step one, mixed precision.

A: Halves the activations to two hundred eighty-seven gigabytes. Total three hundred eleven - still three point six times over. Feasibility work, not yet feasible.

B: Step two, FlashAttention.

A: Removes the two hundred gigabytes of score matrices. Activations drop to eighty-five point six, total one hundred nine point six - still twenty-four gigabytes over the line. Largest resident batch is about twenty-three sequences.

B: Step three, fit the batch. Two options.

A: Accumulate two micro-batches of sixteen - same arithmetic per update, sixty-six point eight gigabytes resident. Or segment checkpointing - all thirty-two sequences in thirty-five point five gigabytes, but you pay about thirty-three percent more step arithmetic.

B: The walkthrough takes accumulation because the batch it needs fits without recompute. Nine times smaller than baseline, inside eighty gigabytes.

A: Then fix the feed: eight workers, pinned memory, prefetch queue - and the host preparation disappears into the compute's shadow. Device busy the whole step, in the ideal model.
::fig[overlap-timeline]

B: Result: zero point six seconds a step, fifty-five thousand tokens a second, thirty-five days, and the energy bill.

A: Five hundred ninety kilowatt-hours at the accelerator - seven hundred watts times the run. Six hundred sixty-one at the facility after the power overhead. Seventy-nine dollars of electricity, a quarter ton of carbon.

B: Checkpointing the same run costs forty-seven days - that's what the memory actually costs in calendar time.
::fig[checkpoint-sqrt]

A: And then you hit the wall anyway: one accelerator, thirty-five days. Scaling beyond it buys arithmetic with synchronization.

B: Data parallelism - replicate the model, split the data, average the gradients with ring AllReduce.
::eq[ring-allreduce]

A: Two phases on the ring - scatter-reduce, then all-gather. Each device sends two times N-minus-one over N of the gradient volume - one point seven-five times at eight accelerators, about twelve milliseconds on the book's numbers.

B: And here's the trap the fallacy section warns about.

A: Replicate the full batch and sync is two percent of the step. Split the same batch eight ways - four sequences per replica - and each device's compute shrinks while the gradient bytes stay fixed. The unhidden sync share grows to fourteen percent.

B: Arithmetic divides. The AllReduce bill doesn't.

A: And when even the state doesn't fit per-replica - ZeRO shards it. Optimizer state first, then gradients, then parameters. Llama three eight-B under ZeRO-three across eight accelerators drops to sixteen gigabytes of static state each.

B: The node boundary is where physics changes again. NVLink inside - nine hundred gigabytes a second. Between nodes, ten to a hundred times lower.

A: Keep tensor parallelism's chatter inside the node; let data parallelism's once-per-step gradient exchange cross the slow link. And at scale, failure becomes routine - checkpoint cadence is a throughput decision, not an ops nicety.

B: End with the ceiling.

A: A ten-to-the-twenty-four-FLOP run at a sustained petaflop per second on one device is about thirty-two years. No memory fix moves that - only more realized FLOP-per-second. The thousand-twenty-four-GPU reference run compresses it to about twenty-three hours.
::eq[training-time-law]

B: And seventeen thousand kilowatt-hours - nineteen months of household electricity for a day of compute.

A: So the chapter's discipline, compressed: fit the step into memory first, because infeasible has no profile. Then profile, find the limiting term on the D-A-M axes, fix that one, and re-profile.

B: Scale only when one node is truly exhausted - the least distributed configuration that meets memory, throughput, and schedule.

A: Training is the iron law run backwards. The workload fixed the work; everything else is buying back eta.

B: See you for chapter nine - data selection, where O itself starts shrinking.
