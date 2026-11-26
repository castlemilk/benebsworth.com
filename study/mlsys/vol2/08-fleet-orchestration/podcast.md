# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two, chapter eight: fleet orchestration, the chapter about why jobs wait while expensive accelerators sit idle.

B: Start with the paradox. Two teams share a thousand-GPU cluster. Team A submits one five-hundred-twelve-GPU job that runs for a month. Team B submits hundreds of eight-GPU experiments that each run an hour. If the scheduler admits whatever fits, the small jobs fragment the fleet forever and the big job never starts.

A: And that mix is the normal one. In the Kalos production trace, eighty-six percent of jobs use a single GPU and consume almost no GPU time, while jobs of two hundred fifty-six or more GPUs are four percent of submissions yet hold ninety-six percent of GPU time. Fair by job count starves the jobs that hold the fleet; fair by GPU time starves the experiments.

B: The stake is priced at fleet scale. Ten thousand GPUs at about two dollars per GPU-hour burn four hundred eighty thousand dollars a day whether or not they produce anything. At thirty percent scheduling-idle that is fifty-two point six million dollars a year of waste. Raising fleet usage from fifty to eighty percent recovers three thousand productive GPUs, the output of six thousand raw GPUs at the old usage.

A: Queueing theory explains half the paradox by itself. Mean wait carries a load factor rho over one-minus-rho, times a variability factor, times mean service. As load approaches capacity the wait bends sharply upward.
::eq[queueing-wait]

B: Same fleet load, very different waits. A uniform workload waits with ratio about four, while a mixed machine-learning workload with coefficient of variation three waits with ratio about twenty, five times longer, because the variability term multiplies everything. High wait at high load is arithmetic. Idle devices beside a full queue is a different problem entirely.

A: So what is fair? Not equal GPU counts: one tenant's jobs saturate host CPU and memory while another's saturate the network fabric, and free GPUs strand behind exhausted auxiliary resources. Dominant-resource fairness reduces each tenant to its largest resource share and equalizes that.
::eq[dominant-share]

B: The worked example is worth doing once. Eight GPUs, thirty-two cores, two hundred fifty-six gigabytes, four hundred gigabits per second. Tenant A's replica needs one GPU; tenant B's worker needs two. Progressive filling hands a bundle to whoever has the smaller dominant share, alternating two A replicas per B worker, until both land at zero point five: A with four single-GPU replicas, B with two two-GPU workers.

A: But that equal share is a policy target, not a placement. If B's two workers form one gang, four GPUs must become free atomically. If the job needs one NVLink domain, four scattered GPUs do not count. Feasibility comes before fairness: filter the placements a job can actually run, then be fair among them. Reverse the order and you hand tenants a fair share of nothing.

B: Why atomic? Because rigid synchronous training has step-function utility. A job configured for a thousand twenty-four GPUs but holding half completes zero steps, not half as many: every collective waits for every rank. Two such jobs can each grab half the pool and block each other indefinitely at full price.
::fig[hold-and-wait]

A: That is hold-and-wait deadlock, and the price is the whole allocation for as long as the cycle persists. On the ten-thousand-GPU cluster, roughly seven hours of whole-cluster deadlock erases an entire day of the usage gain. Gang scheduling removes it by construction: all GPUs atomically, or the job waits holding nothing.

B: Naive atomicity wastes in the other direction. A large gang never assembles if every freed GPU keeps going to small jobs, so the scheduler places a reservation and drains capacity toward it. Backfill recovers the idle hole: a one-hundred-twenty-eight-GPU job with a two-hour estimate can run inside the window if its enforced release finishes before the gang starts.
::fig[backfill-window]

A: The estimate finds the window; the release contract makes it safe. Users mis-estimate in both directions, so the bound has to cover the exit path, checkpoint and cleanup included. And preemption needs the same care: a victim starved of bandwidth cannot checkpoint and exit, which is how a high-priority job ends up waiting on the lowest-priority job in the cluster. Holistic preemption reserves the victim's escape bandwidth.

B: Even without deadlock, placement strands capacity. Six-GPU jobs on eight-GPU nodes strand two per node, a quarter of the fleet, before any policy gets a vote. And equal-size allocations are not equal: the same job's all-reduce measures one hundred twenty milliseconds scattered, forty rail-optimized, twenty-five optimally placed. A four-point-eight-fold difference from placement alone, owned by the scheduler, not the runtime.

A: The control planes disagree about the contract. Slurm decides once, imperatively; Kubernetes reconciles continuously toward declared state. Neither is a refinement of the other. And Kubernetes' default one-pod-at-a-time scheduling can recreate the partial-gang deadlock one layer up, which is why the ecosystem rebuilt gang admission as pod groups.

B: Rigid allocation wastes in both directions: off-peak, a job cannot absorb idle GPUs; at peak, it cannot release them without dying. Elastic scheduling replaces keep-or-kill with a range, a transition cost, and a scaling-efficiency curve.
::eq[scaling-efficiency]

A: The curve passes through three regimes. Near-linear while per-worker computation dominates, sublinear as pipeline fill-and-drain becomes visible, saturated when fixed per-step costs rival the shrinking computation. For the reference job the pipeline bubble drives the fall, because fixing the global batch shrinks microbatches per replica while stage count stays constant.
::fig[elastic-efficiency]

B: Whether a resize pays is arithmetic. The throughput gain over the time the job keeps the new allocation must exceed the measured transition cost. The chapter's reference resize breaks even at about nine hours. Resize more often and the mechanism eats the gain.

A: Interruptions are the same economics from the other side. Every preemption charges discarded work since the last durable checkpoint plus relaunch, reload and warmup: about twenty minutes and forty-four dollars per event on the sixty-four-GPU fine-tune, two hundred sixty-one GPU-hours a day at one preemption daily. And one eviction can cascade: fanout two per level reaches six jobs in two levels.

B: Spot instances invert it. The provider preempts you, at sixty to seventy percent off, with notice measured in minutes on AWS and as little as thirty seconds on GCP. Whether the discount survives is the effective-cost relation.
::eq[effective-spot-cost]

A: Spot price times billed time over retained time. Interruptions bill checkpoint, restart and replay hours that produce no progress, so the nominal discount evaporates as they multiply. The scenario prices it: three hundred forty-four thousand on-demand versus one hundred sixty-one thousand on spot for the same run, sixty-five percent nominal settling to about fifty-two real.

B: Which job gets the next free GPUs? Four research schedulers answer with four different signals. Tiresias uses attained service, GPU-time already consumed, because low-service jobs are probably short when durations are heavy-tailed. Gandiva time-slices at iteration boundaries, when temporary activations are already released. Themis bids in auctions on finish-time fairness ratios. And Pollux co-adapts allocation and batch size because past the critical batch, more GPUs can raise throughput while lowering goodput.
::eq[statistical-goodput]

A: Statistical goodput is throughput times progress per example. Grow the batch to use more devices and every example is discounted, so the product is the objective, not the rate. Pollux reports thirty-seven to fifty percent lower completion times on its testbed, but the durable lesson is the coupling.
::eq[finish-time-fairness]

B: Themis's ratio is worth pausing on too: completion time in the shared cluster over completion time on a fair-share isolated slice. A ratio of one means you finished no later than your entitlement allowed. It is a direct measurement of unfair delay, not a proxy.

A: Serving shares the same devices. Exclusive allocation needs one hundred eighty GPUs where measured sharing needs one hundred thirty for the same service, worth about eight hundred seventy-six thousand dollars a year. Time-slicing and MPS both leave about a third of capacity dark under interference, so co-location has to be measured, not assumed.

B: And the chapter lands where it started: usage is not one number. Allocated counts complete allocations only. Active counts hardware activity, including work later replayed. Productive counts retained progress at the fault-free rate. Five hundred narrows to three hundred fifty narrows to two hundred eighty, and each gap is a different investigation with a different owner.
::fig[usage-tiers]

A: The debugging discipline follows the tiers. Low allocated: check demand, quotas, placement feasibility. Low active: trace input supply and runtime. Low productive despite busy kernels: compare retained progress against replay and synchronization. One fleet raised productive use twenty-four points, about four hundred ten GPUs of useful work on a thousand, just by separating the tiers.

B: What do you carry out of this one? Feasibility before fairness. Atomic gangs, because seven hours of deadlock erases a day of gain. Placement is a four-point-eight-fold performance variable. Elasticity is a contract with a break-even. Spot's discount is nominal until effective cost says otherwise. Match the scheduling signal to the objective. And never trust a single usage number.

A: Next chapter: performance engineering, where the fleet law stops being about who holds the GPUs and starts being about what the GPUs actually do.
