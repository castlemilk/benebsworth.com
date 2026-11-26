# Fleet Orchestration: Study Packet

## Thesis

A fleet scheduler is asked one question in a thousand forms: which jobs may hold which accelerators, when. The paradox that opens the chapter is real arithmetic, not a metaphor. Jobs queue for days while hundreds of GPUs sit idle, because the free devices cannot assemble into the shapes the queued jobs need, because small jobs keep winning the race for the fragments a large gang requires, and because the usage percentage on the dashboard counts devices held, not progress made. Every mechanism in this chapter exists to close one of those gaps, and each one pays for it somewhere else: atomic gangs trade packing flexibility for deadlock freedom, backfill trades reservation waste for usage, elasticity trades transition cost for adaptation, and spot capacity trades interruption risk for price.

==Fairness among jobs can only be judged after feasibility, because a fair share of accelerators the job cannot run delivers nothing.=={A dominant-resource-fair allocation of four scattered GPUs is worthless to a job that needs one NVLink domain. Capability, gang atomicity, memory and topology filter the feasible set first; only then does any fairness rule choose among placements that can actually execute.} That ordering, feasibility before fairness, is the chapter's skeleton key: it explains the paradox, disciplines every policy, and redefines what the usage number was supposed to mean all along.

## The Paradox of the Idle Fleet

Two teams share a 1,000-GPU cluster. Team A submits one 512-GPU job that runs for a month; Team B submits hundreds of 8-GPU experiments that each run an hour. If the scheduler admits whatever fits, Team B's stream fragments the fleet and Team A waits forever: no policy failure anywhere, just first-fit arithmetic. The mix is not a pathology. In the Kalos language-model cluster trace, ==86% of 19,907 jobs use a single GPU and consume well under 1% of GPU time, while jobs of 256 or more GPUs are about 4% of submissions yet hold roughly 96% of GPU time=={Job count and GPU-time share describe two different populations. The scheduler's fairness problem is precisely that they diverge: a policy fair by job count starves the jobs that hold the fleet, and a policy fair by GPU-time starves the experiments that produce the next large job.}. Scheduling is the conflict between those two populations, plus the serving workloads that need capacity before their deadlines pass.

::chart[job-mix]

The stake is priced at fleet scale. A 10,000-GPU cluster at roughly \$2 per GPU-hour burns ==\$480,000 a day whether or not it produces anything=={Ten thousand GPUs times two dollars times twenty-four hours. At thirty percent scheduling-idle the waste compounds to about 52.6 million dollars a year, which is the budget every policy in this chapter is really competing for.}. Raising fleet usage from 50% to 80% recovers 3,000 productive GPUs, the output of 6,000 raw GPUs at the old usage. That gain, not better hardware, is what the chapter's mechanisms are for.

And yet a full queue beside idle devices is usually not an algorithm defect. Queueing theory explains half the paradox on its own: mean wait carries a load factor $\rho/(1-\rho)$, so as offered load approaches capacity the wait bends sharply upward, and a workload whose job durations vary widely pays a variability multiplier on top.

::eq[queueing-wait]


$$
W = \frac{\rho}{1-\rho}\cdot\frac{1+C_s^{2}}{2}\cdot\bar{S}
$$

At the same offered load, a uniform workload waits with ratio about 4 while ==a mixed ML workload with coefficient of variation 3 waits with ratio about 20=={The variability term (1 + Cs²)/2 multiplies the load factor. Uniform service times contribute almost nothing; a mix of one-hour debugging jobs and week-long training runs at Cs² ≈ 9 contributes a factor of five. Same rho, five times the queue.}, five times the wait for the same fleet load. High wait at high load is arithmetic, not mismanagement; idle devices beside a full queue is the different problem, and finding it means tracing feasibility, not tweaking priorities.

## Feasibility Before Fairness

Equalizing GPU counts is the fairness everyone reaches for first, and it fails immediately: one tenant's jobs saturate host CPU and memory while another's saturate the network fabric, leaving free GPUs stranded behind exhausted auxiliary resources. ==Dominant-resource fairness makes the entitlements comparable=={Each tenant's allocation is normalized by fleet capacity per resource, and its largest share, the dominant share, becomes its comparable entitlement. Equalize that one number and every tenant is equally constrained relative to its own bottleneck, no matter which resource that is.} by reducing each tenant to its largest resource share:

::eq[dominant-share]


$$
s_i = \max_{r}\,\frac{a_{ir}}{c_r}
$$

The worked allocation is worth doing once by hand. The deliberately small cluster holds 8 GPUs plus CPU, memory and network capacity. Tenant A's replica bundles a single GPU with its host share; tenant B's worker bundles two. Progressive filling hands one bundle at a time to whichever tenant has the smaller dominant share: one A replica raises A by 1/8, one B worker raises B by 2/8, so the fill alternates toward two A replicas per B worker until both dominant shares land at ==0.50, A with four single-GPU replicas and B with two two-GPU workers=={The end state shows what DRF equalizes and what it does not. Tenant A sits at 0.50 on every resource; tenant B reaches 0.50 on GPUs and network but only 0.125 on CPU and memory. Both are equally constrained relative to their own bottleneck, while the non-dominant resources still have room neither tenant can use without exceeding a saturated one.}.

> [!note] Reading the marks
> Amber dotted phrases in this packet carry why-it-matters cards. Hover, tap, or tab to them for the mechanism, the number, or the caveat behind the claim.

That equal share is a policy target, not a placement. If B's two workers form one gang, four GPUs must become free atomically; if the job's tensor parallelism needs one NVLink domain, four scattered GPUs do not count; if it needs 80 GB HBM, incompatible GPUs do not count at all. The production order is therefore ==filter first, then be fair=={Capability, gang atomicity, memory and topology constraints prune the feasible set, then DRF chooses fairly among what can run. Reversing the order presents an infeasible entitlement as service delivered: the tenant holds a fair share of nothing it can use.}: feasibility before fairness, and when no feasible equal-share placement exists, the scheduler should say which constraint deviated rather than silently deliver a useless allocation.

## The Gang and the Deadlock

Rigid synchronous training has step-function utility: the full minimum gang or nothing. A job configured for 1,024 GPUs but holding 512 completes zero training steps, not half as many, because every collective waits for every rank. Two such jobs can each grab half the pool and block each other indefinitely while every allocated GPU idles at full price. This is ==hold-and-wait deadlock, and its price is the whole allocation for as long as the cycle persists=={At the reference scale, two 1,024-GPU gangs each holding most of their allocation burn thousands of dollars per hour apiece at zero progress. On the 10,000-GPU cluster, roughly seven hours of whole-cluster deadlock erases an entire day of the fifty-to-eighty percent usage gain, which is why atomicity is non-negotiable.}.

::fig[hold-and-wait]

## Reservations, Backfill, and the Release Path

Gang scheduling removes the deadlock by construction: grant all $N$ GPUs atomically or leave the job queued holding nothing. But naive atomicity is wasteful in a predictable direction. A large gang at the head of the queue will never assemble if every freed GPU keeps going to small jobs, so the scheduler places a reservation and drains capacity toward it, which can strand hundreds of idle GPUs while the gang waits. Backfill is the repair: jobs deeper in the queue that fit the idle hole *and* finish before the reservation needs them may run in it. A 128-GPU job with a two-hour runtime estimate is a backfill candidate when the gang's missing GPUs will stay unavailable for at least two hours, and ==the estimate only becomes safe when paired with an enforced release contract=={If users overestimate runtimes fewer jobs fit the windows; underestimate and the reservation is violated. A kill-at-declared-limit policy encourages honesty, and the release must include checkpoint and cleanup delay, not just the compute.} The reservation arithmetic and the backfill window are the entire mechanism.

::fig[backfill-window]

Preemption adds a subtler failure. Priority inversion in this fleet is not a mutex problem: the 64-GPU high-priority fine-tune reserves 60 GPUs and waits for 4 held by a low-priority job, which cannot checkpoint and exit because medium-priority work saturates the CPU and network bandwidth its exit path needs. Raising the waiting job's priority does nothing; ==the preemption policy must protect the victim's release path=={Holistic preemption reserves the CPU, network and storage bandwidth a preempted job needs to checkpoint and exit cleanly. Without it the victim is too starved to release the accelerators, the sixty-GPU reservation idles, and the wait-for chain ends at the lowest-priority job in the cluster.}. Detection is cheap in theory: a cycle in the wait-for graph is linear-time once the graph exists. But a distributed control plane never holds a complete current graph, so production systems supplement detection with leases, progress monitoring through completed-step counters, and timeouts that bound rather than prevent.

## Packing Jobs onto Machines

Even without deadlock, placement strands capacity. If previous allocations scatter free GPUs in one- and two-GPU remnants across partially occupied nodes, a pending 8-GPU job waits with dozens of GPUs free. Bin packing is NP-hard, first-fit decreasing carries its classical 11/9 one-dimensional guarantee and no more, and ==the multi-dimensional ML version is worse because the bin has width in every resource at once=={A node holds GPUs, CPU, memory, NVLink fabric and network ports simultaneously. Jobs that fit the GPU count can still overflow host memory or the NVMe checkpoint path, so the classical packing guarantees transfer only as upper bounds on what any heuristic can promise.}. The fragmentation example is concrete: 6-GPU jobs on 8-GPU nodes strand 2 GPUs per node, 25% of the fleet, before any scheduling policy gets a vote.

Topology makes it worse and better at once. Worse, because equal-size allocations are not equal: bandwidth steps down from NVLink within the node to leaf to spine, so a gang scattered across racks pays oversubscribed fabric for the collectives that dominate its step. Better, because placement can exploit it: mapping tensor-parallel groups into NVLink domains, pipeline stages across nodes within a rail, and data-parallel replicas across rails, the same job's all-reduce time falls from 120 ms scattered to 40 ms rail-optimized to 25 ms optimally placed, ==a 4.8-fold step-time difference from placement alone, on identical hardware=={No kernel changed, no hardware changed. The only variable is which physical accelerators hold the ranks. This is why placement is a scheduling input rather than a runtime concern: the scheduler owns the map, and the runtime inherits whatever map it was given.}. The scheduler that ignores topology is not neutral; it is choosing the slow placement at random.

## Two Control Philosophies

Slurm and Kubernetes answer the same question with opposite contracts. Slurm is imperative batch allocation: the job asks, the scheduler decides once, the allocation is a fact until the job ends. Kubernetes is declarative reconciliation: the desired state is written down and level-triggered controllers continuously pull reality toward it, including after failures, preemptions and node loss. Neither is a refinement of the other; they manage different lifecycles. The friction appears in the gap between them. Kubernetes' default scheduler places pods one at a time, so a 64-pod training job can bind 60 pods and deadlock exactly like a partial gang; the ecosystem repairs this with pod-group admission, which is gang scheduling rebuilt one layer up. ==Hybrid fleets work only when exactly one layer owns each placement decision=={If Slurm thinks it owns node allocation while a Kubernetes controller reschedules the pods underneath it, both layers are reconciling against the other's moves. Every production hybrid draws a boundary: one layer owns which jobs run where, the other owns keeping them alive inside that allocation.}.

## Elasticity Is a Contract

Rigid allocation wastes in both directions: off-peak, a job cannot absorb idle GPUs; at peak, it cannot release them without dying. Elastic scheduling replaces the binary keep-or-kill with a range, but ==the contract has three parameters and a scheduler that treats any of them as free pays for it=={The elastic range bounds valid worker counts and their increments; the transition cost prices checkpoint, restart, redistribution and rendezvous for every resize; the scaling-efficiency curve says what an added worker actually adds. TorchElastic's nnodes four-to-sixteen declaration is the range made concrete: thirty-two to a hundred twenty-eight workers, rendezvous-managed.}. Scaling efficiency itself passes through three regimes as workers grow: near-linear while per-worker computation dominates, sublinear as pipeline fill-and-drain and unhidden synchronization become visible, and saturated when fixed per-step costs rival the shrinking computation. For the 175B reference job the decline comes mostly from the pipeline bubble, because fixing the global batch shrinks the microbatch count per replica while the stage count stays constant.

::eq[scaling-efficiency]


$$
E(n) = \frac{T(1)}{n\,T(n)}
$$

::fig[elastic-efficiency]

Whether a resize pays is arithmetic, not vibes: the throughput gain over the time the job will keep the new allocation must exceed the measured transition cost. The chapter's reference resize breaks even at ==about nine hours=={The rescale must be retained for roughly 8.9 hours before its accumulated throughput gain repays the rendezvous, restart and redistribution cost. Any policy that resizes more often than the workload can hold an allocation is donating throughput back to the mechanism.}; resize more often than that and the mechanism eats the gain.

## Interruption Economics

Preemption and spot capacity are the same economics viewed from opposite sides. Every interruption charges ==discarded work since the last durable checkpoint, plus relaunch, reload and warmup, roughly twenty minutes and \$44 per event on the 64-GPU fine-tune=={At a preemption a day, that is about 261 GPU-hours of wasted work daily for one job. The discarded work since the last checkpoint is the larger term, which is why interruption cost is really a checkpoint-interval cost in disguise.}. And one preemption rarely travels alone: the evicted job reschedules by displacing others, so a fanout of two per level reaches six jobs after two levels, $k + k^2$ for fanout $k$. Two controls cap the cascade: evicted jobs requeue without preempting further, and preemption budgets bound how often any job or capacity fraction may be displaced in a window.

Spot instances invert the direction: the provider preempts you, at a 60 to 70 percent discount, with notice measured in minutes on AWS and as little as thirty seconds on GCP. Whether the discount survives is the effective-cost relation:

::eq[effective-spot-cost]


$$
C_{\mathrm{eff}} = p_{\mathrm{spot}}\times\frac{T_{\mathrm{billed}}}{T_{\mathrm{retained}}}
$$

When checkpoint, restart and replay are a small share of billed time, effective cost hugs the spot price; as interruptions multiply, billed time inflates while retained progress does not, and the discount evaporates. The chapter's scenario prices it both ways: ==\$344,064 on-demand versus \$161,567 on spot for the same run, a nominal 65% discount that settles to about 52% after interruption overhead=={The thirteen-point leak is the cost of interruptions: checkpoint writes, restart time and replayed work all bill at the spot rate but produce no retained progress. Fault-tolerance infrastructure is what closes the leak, so the same checkpointing that protects against hardware failure earns a second return making interruptible capacity usable.}. Two-tier checkpointing, periodic saves for unpredicted loss plus a best-effort save on the notice itself, squeezes the leak further, and pool diversification across zones and instance types keeps one reclamation from removing the whole job at once.

::chart[interruption-tax]

## Signals that Schedule

Which job gets the next free GPUs is a policy question, and the research literature answers it four ways, each exploiting a different observable. ==Tiresias drops runtime estimates entirely=={User estimates are unreliable in both directions, so Tiresias prioritizes by attained service, GPU-time already consumed, in two dimensions: elapsed time and resource intensity. With heavy-tailed durations a low-service job is probably short, which approximates shortest-remaining-time ordering without asking anyone anything, plus an explicit age-based promotion so long jobs cannot starve.}. Gandiva exploits iteration boundaries: suspend at the end of a minibatch when temporary activations are already released, copy persistent state to host memory, time-slice the GPU, and the same mechanism enables migration and packing. Themis measures fairness directly as finish-time ratio, completion time in the shared cluster over completion time on a fair-share isolated slice, and runs auctions where jobs bid placement-sensitive estimates. Pollux goes furthest: because past the critical batch size extra examples contribute less optimization progress, ==more GPUs can raise throughput while lowering goodput=={Statistical goodput multiplies system throughput by statistical efficiency, progress per example relative to a reference batch. Growing the batch to use more GPUs discounts every example, so the product, not the throughput, is the objective. Pollux co-adapts allocation, batch size and learning rate, reporting 37 to 50 percent lower average completion times on its testbed.}.

::eq[statistical-goodput]


$$
G = \underbrace{\Theta}_{\text{examples/s}}\times\underbrace{\eta}_{\text{progress/example}}
$$

::eq[finish-time-fairness]


$$
F_{\mathrm{finish}} = \frac{T_{\mathrm{shared}}}{T_{\mathrm{fair\,share}}}
$$

The comparison is a matching problem, not a ranking: attained service needs only accounting records, iteration exploitation needs runtime profiling, finish-time fairness needs completion estimates, goodput needs the training loop to accept allocation and batch-size changes. Pick the signal your platform can actually observe.

## Serving Shares the Fleet

Training and serving make incompatible demands on the same devices: training batches for throughput, serving races deadlines. The orchestrator's serving unit is the ready replica sized by measured capacity at a latency target, and sharing a GPU among replicas runs along an isolation spectrum from time-slicing through MPS to MIG to exclusivity, each step trading density for interference protection. The economics are large enough to govern design: ==exclusive allocation needs 180 GPUs where measured sharing needs 130 for the same service, worth about \$876,000 a year=={The fifty-GPU difference is the price of isolation. Time-slicing and MPS both leave roughly a third of device capacity dark under interference, so the sharing gain is real only when replicas are co-located by measured compatibility, not packed by device count.}. The boundary between training and serving capacity moves only on forecast: serving's reservation minus its safety buffer is lendable to training as reclaimable capacity, but a guarantee you cannot reclaim in time is a guarantee you do not have.

## Quotas and the Three Tiers

Hierarchical quotas separate a team's guarantee from its burst limit, and letting others borrow idle guarantees is what keeps usage high without breaking promises, provided the guarantees concurrently honored fit within what the platform can reclaim in time. Quota hoarding, holding reservations against future need, is the predictable user response when unused allocations are simply lost, and 64 GPUs once sat idle for a weekend because someone forgot to cancel a reservation.

Which brings the chapter home: ==usage is not one number=={Allocated counts complete allocations only, so a partial gang's held devices are a scheduling loss below even that tier. Active counts hardware activity under some counter definition, including communication and work later replayed. Productive counts retained progress toward the workload objective, normalized to the fault-free step rate. Each gap points at a different owner: demand or placement below allocated, input supply or runtime below active, replay and synchronization below productive.}. The reference profile narrows 500 allocated GPUs to 350 active-equivalents to 280 productive-equivalents, and each step down is a different investigation with a different owner.

::fig[usage-tiers]

The debugging discipline follows the tiers. Low allocated usage: check demand, quotas, device health, placement feasibility. Low active usage on allocated devices: trace input supply, communication waits, runtime execution. Low productive usage despite busy kernels: compare retained progress against replay and synchronization overhead. A dashboard that reports one number hides which investigation to start; the 1,000-GPU fleet that raised productive usage 24 points, recovering about 410 GPUs of useful work, did it by separating the tiers, not by buying hardware or tuning the scheduler algorithm.

## What the Chapter Says to Carry

- Feasibility before fairness: filter placements a job can actually run, then apply DRF among them; report the binding constraint when equality is impossible.
- Atomic gangs kill hold-and-wait; reservations plus backfill with enforced release contracts recover the usage atomicity strands idle.
- Seven hours of whole-cluster deadlock erases a day of usage gain; deadlock freedom is worth packing flexibility.
- Placement is a 4.8x performance variable the scheduler, not the runtime, owns.
- Elasticity is a range, a transition cost, and an efficiency curve; resize only when the gain amortizes the cost over the allocation's lifetime.
- Spot's discount is nominal; effective cost decides, and fault-tolerance infrastructure is what collects the difference.
- Match the scheduling signal to the objective: service consumed, iteration boundaries, finish-time ratios, or measured goodput.
- Usage has three tiers; conflating them is how a fleet looks busy while producing nothing.

## Fallacies and Pitfalls

- *More sophisticated scheduling algorithms always improve usage.* Most usage loss is policy-infrastructure mismatch: fragmented inventory, quotas that forbid borrowing, priorities without release paths. Audit the mismatch before replacing the algorithm.
- *Treating all GPU-hours as equal when measuring usage.* An unlabeled percentage conflates allocation, activity and useful work; only the productive tier is money.
- *Gang scheduling is always necessary.* Malleable jobs and single-GPU work do not need atomicity; forcing it on them strands capacity for no deadlock that exists.
- *Static quotas sized to peak demand.* Peak-sized guarantees strand capacity the rest of the day; guarantee less, lend the rest, reclaim on time.
- *Spot instances are always cheaper.* The effective-cost ratio decides, and interruption-heavy workloads or slow checkpoints can push effective cost past on-demand.

## The physics

| Quantity | Value | Use |
|---|---|---|
| 10K-GPU daily burn | ~\$480,000/day at ~\$2/GPU-h | The denominator for every waste claim |
| Idle waste at 30% | ~\$52.6M/yr | The budget scheduling policies compete for |
| Usage gain 50→80% | 3,000 productive GPUs ≈ 6,000 raw GPUs at 50% | What orchestration recovers without new hardware |
| Deadlock erasure time | ~7.2 h of whole-cluster deadlock per day of gain | Why atomicity is non-negotiable |
| Job mix (Kalos) | 1-GPU jobs 86% of count, <1% of GPU-time; 256+ GPU jobs ~4% of count, ~96% of time | The two populations scheduling must serve |
| Queue wait ratio | uniform ≈ 4 vs mixed ML (Cs² = 9 → factor 5) ≈ 20 | Same load, five times the wait |
| DRF worked fill | A: 4×1-GPU, B: 2×2-GPU, both dominant shares 0.50 | Progressive filling equalizes dominant share |
| Cluster allocation space | >$10^{15}$ candidates for 10K GPUs / 500 jobs | Why detection beats exhaustive search |
| Gang deadlock burn | whole allocation at zero progress | Step-function utility of rigid sync jobs |
| Backfill example | 128-GPU job, 2 h estimate, 2 h window | Estimate + release contract = safe backfill |
| Placement speedup | 120 ms scattered → 40 ms rail → 25 ms optimal (4.8x) | Topology as a scheduling input |
| Fragmentation example | 6-GPU jobs on 8-GPU nodes strand 25% | Multi-dimensional bin packing loss |
| First-fit decreasing | 11/9 asymptotic ratio, 1-D only | No guarantee transfers to ML placement |
| Elastic break-even | ~8.9 h to amortize the reference resize | Resize frequency limit |
| Preemption tax | ~20 min, ~\$44/event, ~261 GPU-h/day at 1/day | Discarded work dominates reload |
| Preemption cascade | fanout k reaches k+k² jobs in 2 levels | Requeue caps and preemption budgets |
| Spot economics | \$344,064 on-demand → \$161,567 spot; 65% nominal → ~52% real | Effective cost after interruption overhead |
| Notice windows | AWS minutes, GCP as little as 30 s | Two-tier checkpointing design input |
| Sharing economics | exclusive 180 GPUs vs shared 130, 50→65% util, ~\$876K/yr | The price of isolation |
| Isolation spectrum | time-slicing/MPS leave ~35% dark | Co-location must be measured |
| Usage tiers | 500 allocated → 350 active → 280 productive | Each gap has a different owner |
| Debug win | +24 points productive ≈ 410 GPUs on 1K fleet | What tier separation recovers |

## Glossary

- **Dominant share**: a tenant's largest per-resource share of fleet capacity; DRF equalizes it.
- **Progressive filling**: repeatedly granting one bundle to the tenant with the smallest dominant share until a resource saturates.
- **Gang scheduling**: atomic all-or-nothing allocation of a rigid job's minimum viable group.
- **Hold-and-wait**: the Coffman condition gang scheduling removes; partial allocation plus circular waiting.
- **Backfill**: running smaller queued jobs in a reservation's idle hole when they finish before the reservation needs them.
- **Priority inversion**: a high-priority job transitively waiting on the lowest-priority job in the chain.
- **Holistic preemption**: reserving the auxiliary bandwidth a victim needs to checkpoint and exit cleanly.
- **Fragmentation index**: free GPUs that cannot form feasible placements, as a measured fleet quantity.
- **Attained service**: GPU-time already consumed, Tiresias's priority signal in place of runtime estimates.
- **Finish-time fairness**: completion time relative to a fair-share isolated slice; Themis's objective.
- **Statistical goodput**: throughput in examples per second times progress per example at the current batch size.
- **Effective cost**: spot price times billed over retained time; the real price of interruptible capacity.
- **Preemption cascade**: eviction-triggered eviction, multiplying geometrically with fanout per level.
- **Elastic range**: the scheduler-framework contract's minimum and maximum worker counts plus valid increments.
- **Isolation spectrum**: time-slicing → MPS → MIG → exclusive, trading density for interference protection.
- **Usage tiers**: allocated, active, productive; three measurements with three different owners.

## → Ben's world

- The benchmark harness is a tiny orchestration problem: `task bench` runs queue behind one local GPU, and model parallelism there is zero, so the fleet questions collapse to admission ordering. Even there the two-population conflict shows up: quick smoke tasks versus full harness runs are Team B and Team A on one device, and a first-fit shell loop starves the long runs exactly like the opening scenario.
- The shared droplet is gang scheduling in miniature: four co-located products behind Caddy share one box, and a deploy of any one is a partial preemption of the others' memory. The harness's hard block on destructive ops is the lease-and-fence discipline of the chapter, enforced socially instead of in a control plane.
- Usage tiers map directly onto the LLM benchmark's `results.json`: allocated is a completed runner invocation, active is tokens actually generated, productive is behavioral checks passed. The 100-EMPTY structural-fallback saga was a productive-tier failure with a perfect active tier, exactly the conflation this chapter warns about.
- Cloudflare Pages plus a static export is the extreme of the isolation spectrum: every visitor gets an exclusive replica of nothing, because the workload has no shared mutable state. The serving-side lesson generalizes in reverse: the cheapest isolation is a workload that needs none.

## Open questions

- The chapter prices deadlock against the usage gain at \$2/GPU-h, but says little about how operators actually detect a hold-and-wait cycle in production before the timeouts fire. What does the wait-for graph telemetry look like in a real control plane?
- Pollux's goodput depends on statistical-efficiency estimation per job. How stable is that estimate across a real workload mix, and what does it cost when wrong?
- The feasibility-before-fairness ordering assumes constraints are knowable at admission time. How do schedulers handle constraints discovered only at runtime, like emergent thermal coupling between specific node pairs?
