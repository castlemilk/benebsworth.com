---
title: "Fleet Orchestration — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html"
canonical_url: "https://benebsworth.com/study/vol2/08-fleet-orchestration/"
---
# Fleet Orchestration: Study Packet

## Thesis

A fleet scheduler is asked one question in a thousand forms: which jobs may hold which accelerators, when. The paradox that opens the chapter is real arithmetic, not a metaphor. Jobs queue for days while hundreds of GPUs sit idle, because the free devices cannot assemble into the shapes the queued jobs need, because small jobs keep winning the race for the fragments a large gang requires, and because the usage percentage on the dashboard counts devices held, not progress made. Every mechanism in this chapter exists to close one of those gaps, and each one pays for it somewhere else: atomic gangs trade packing flexibility for deadlock freedom, backfill trades reservation waste for usage, elasticity trades transition cost for adaptation, and spot capacity trades interruption risk for price.

**Fairness among jobs can only be judged after feasibility, because a fair share of accelerators the job cannot run delivers nothing.** *(why it matters: A dominant-resource-fair allocation of four scattered GPUs is worthless to a job that needs one NVLink domain. Capability, gang atomicity, memory and topology filter the feasible set first; only then does any fairness rule choose among placements that can actually execute.)* That ordering, feasibility before fairness, is the chapter's skeleton key: it explains the paradox, disciplines every policy, and redefines what the usage number was supposed to mean all along.

## The Paradox of the Idle Fleet

Two teams share a 1,000-GPU cluster. Team A submits one 512-GPU job that runs for a month; Team B submits hundreds of 8-GPU experiments that each run an hour. If the scheduler admits whatever fits, Team B's stream fragments the fleet and Team A waits forever: no policy failure anywhere, just first-fit arithmetic. The mix is not a pathology. In the Kalos language-model cluster trace, **86% of 19,907 jobs use a single GPU and consume well under 1% of GPU time, while jobs of 256 or more GPUs are about 4% of submissions yet hold roughly 96% of GPU time** *(why it matters: Job count and GPU-time share describe two different populations. The scheduler's fairness problem is precisely that they diverge: a policy fair by job count starves the jobs that hold the fleet, and a policy fair by GPU-time starves the experiments that produce the next large job.)*. Scheduling is the conflict between those two populations, plus the serving workloads that need capacity before their deadlines pass.


**Two populations share one fleet**

| Population share | 1-GPU jobs | 2-255-GPU jobs | 256+-GPU jobs |
|---|---|---|---|
| Share of job count | 86 | 10 | 4 |
| Share of GPU time | 0.1 | 3.9 | 96 |

*Kalos language-model cluster trace, 19,907 jobs: single-GPU jobs are 86% of submissions but about 0.1% of GPU-time, while 256+-GPU jobs are ~4% of submissions and ~96% of GPU-time. The scheduler's fairness problem is that the two bars describe the same fleet.*

The stake is priced at fleet scale. A 10,000-GPU cluster at roughly \$2 per GPU-hour burns **\$480,000 a day whether or not it produces anything** *(why it matters: Ten thousand GPUs times two dollars times twenty-four hours. At thirty percent scheduling-idle the waste compounds to about 52.6 million dollars a year, which is the budget every policy in this chapter is really competing for.)*. Raising fleet usage from 50% to 80% recovers 3,000 productive GPUs, the output of 6,000 raw GPUs at the old usage. That gain, not better hardware, is what the chapter's mechanisms are for.

And yet a full queue beside idle devices is usually not an algorithm defect. Queueing theory explains half the paradox on its own: mean wait carries a load factor $\rho/(1-\rho)$, so as offered load approaches capacity the wait bends sharply upward, and a workload whose job durations vary widely pays a variability multiplier on top.

**Eq 8.1 · Mean queue wait**
$$
W = \frac{\rho}{1-\rho}\cdot\frac{1+C_s^{2}}{2}\cdot\bar{S}
$$

At the same offered load, a uniform workload waits with ratio about 4 while **a mixed ML workload with coefficient of variation 3 waits with ratio about 20** *(why it matters: The variability term (1 + Cs²)/2 multiplies the load factor. Uniform service times contribute almost nothing; a mix of one-hour debugging jobs and week-long training runs at Cs² ≈ 9 contributes a factor of five. Same rho, five times the queue.)*, five times the wait for the same fleet load. High wait at high load is arithmetic, not mismanagement; idle devices beside a full queue is the different problem, and finding it means tracing feasibility, not tweaking priorities.

## Feasibility Before Fairness

Equalizing GPU counts is the fairness everyone reaches for first, and it fails immediately: one tenant's jobs saturate host CPU and memory while another's saturate the network fabric, leaving free GPUs stranded behind exhausted auxiliary resources. **Dominant-resource fairness makes the entitlements comparable** *(why it matters: Each tenant's allocation is normalized by fleet capacity per resource, and its largest share, the dominant share, becomes its comparable entitlement. Equalize that one number and every tenant is equally constrained relative to its own bottleneck, no matter which resource that is.)* by reducing each tenant to its largest resource share:

**Eq 8.2 · Dominant share**
$$
s_i = \max_{r}\,\frac{a_{ir}}{c_r}
$$

The worked allocation is worth doing once by hand. The deliberately small cluster holds 8 GPUs plus CPU, memory and network capacity. Tenant A's replica bundles a single GPU with its host share; tenant B's worker bundles two. Progressive filling hands one bundle at a time to whichever tenant has the smaller dominant share: one A replica raises A by 1/8, one B worker raises B by 2/8, so the fill alternates toward two A replicas per B worker until both dominant shares land at **0.50, A with four single-GPU replicas and B with two two-GPU workers** *(why it matters: The end state shows what DRF equalizes and what it does not. Tenant A sits at 0.50 on every resource; tenant B reaches 0.50 on GPUs and network but only 0.125 on CPU and memory. Both are equally constrained relative to their own bottleneck, while the non-dominant resources still have room neither tenant can use without exceeding a saturated one.)*.

> **note: Reading the marks**
> Amber dotted phrases in this packet carry why-it-matters cards. Hover, tap, or tab to them for the mechanism, the number, or the caveat behind the claim.

That equal share is a policy target, not a placement. If B's two workers form one gang, four GPUs must become free atomically; if the job's tensor parallelism needs one NVLink domain, four scattered GPUs do not count; if it needs 80 GB HBM, incompatible GPUs do not count at all. The production order is therefore **filter first, then be fair** *(why it matters: Capability, gang atomicity, memory and topology constraints prune the feasible set, then DRF chooses fairly among what can run. Reversing the order presents an infeasible entitlement as service delivered: the tenant holds a fair share of nothing it can use.)*: feasibility before fairness, and when no feasible equal-share placement exists, the scheduler should say which constraint deviated rather than silently deliver a useless allocation.

## The Gang and the Deadlock

Rigid synchronous training has step-function utility: the full minimum gang or nothing. A job configured for 1,024 GPUs but holding 512 completes zero training steps, not half as many, because every collective waits for every rank. Two such jobs can each grab half the pool and block each other indefinitely while every allocated GPU idles at full price. This is **hold-and-wait deadlock, and its price is the whole allocation for as long as the cycle persists** *(why it matters: At the reference scale, two 1,024-GPU gangs each holding most of their allocation burn thousands of dollars per hour apiece at zero progress. On the 10,000-GPU cluster, roughly seven hours of whole-cluster deadlock erases an entire day of the fifty-to-eighty percent usage gain, which is why atomicity is non-negotiable.)*.

![Hold-and-wait and the atomic repair](https://benebsworth.com/study/vol2/08-fleet-orchestration/diagrams/hold-and-wait.svg)

*Left: two rigid jobs each holding half their gang, wait arrows closing a cycle, every held GPU idle at full price. Right: atomic gang allocation grants one job everything and queues the other holding nothing, breaking the cycle by construction.*
## Reservations, Backfill, and the Release Path

Gang scheduling removes the deadlock by construction: grant all $N$ GPUs atomically or leave the job queued holding nothing. But naive atomicity is wasteful in a predictable direction. A large gang at the head of the queue will never assemble if every freed GPU keeps going to small jobs, so the scheduler places a reservation and drains capacity toward it, which can strand hundreds of idle GPUs while the gang waits. Backfill is the repair: jobs deeper in the queue that fit the idle hole *and* finish before the reservation needs them may run in it. A 128-GPU job with a two-hour runtime estimate is a backfill candidate when the gang's missing GPUs will stay unavailable for at least two hours, and **the estimate only becomes safe when paired with an enforced release contract** *(why it matters: If users overestimate runtimes fewer jobs fit the windows; underestimate and the reservation is violated. A kill-at-declared-limit policy encourages honesty, and the release must include checkpoint and cleanup delay, not just the compute.)* The reservation arithmetic and the backfill window are the entire mechanism.

![The backfill window](https://benebsworth.com/study/vol2/08-fleet-orchestration/diagrams/backfill-window.svg)

*A large gang's reservation drains capacity toward its start time. A 128-GPU job with a two-hour estimate fits the idle hole only because its enforced release completes before the reservation needs the GPUs.*
Preemption adds a subtler failure. Priority inversion in this fleet is not a mutex problem: the 64-GPU high-priority fine-tune reserves 60 GPUs and waits for 4 held by a low-priority job, which cannot checkpoint and exit because medium-priority work saturates the CPU and network bandwidth its exit path needs. Raising the waiting job's priority does nothing; **the preemption policy must protect the victim's release path** *(why it matters: Holistic preemption reserves the CPU, network and storage bandwidth a preempted job needs to checkpoint and exit cleanly. Without it the victim is too starved to release the accelerators, the sixty-GPU reservation idles, and the wait-for chain ends at the lowest-priority job in the cluster.)*. Detection is cheap in theory: a cycle in the wait-for graph is linear-time once the graph exists. But a distributed control plane never holds a complete current graph, so production systems supplement detection with leases, progress monitoring through completed-step counters, and timeouts that bound rather than prevent.

## Packing Jobs onto Machines

Even without deadlock, placement strands capacity. If previous allocations scatter free GPUs in one- and two-GPU remnants across partially occupied nodes, a pending 8-GPU job waits with dozens of GPUs free. Bin packing is NP-hard, first-fit decreasing carries its classical 11/9 one-dimensional guarantee and no more, and **the multi-dimensional ML version is worse because the bin has width in every resource at once** *(why it matters: A node holds GPUs, CPU, memory, NVLink fabric and network ports simultaneously. Jobs that fit the GPU count can still overflow host memory or the NVMe checkpoint path, so the classical packing guarantees transfer only as upper bounds on what any heuristic can promise.)*. The fragmentation example is concrete: 6-GPU jobs on 8-GPU nodes strand 2 GPUs per node, 25% of the fleet, before any scheduling policy gets a vote.

Topology makes it worse and better at once. Worse, because equal-size allocations are not equal: bandwidth steps down from NVLink within the node to leaf to spine, so a gang scattered across racks pays oversubscribed fabric for the collectives that dominate its step. Better, because placement can exploit it: mapping tensor-parallel groups into NVLink domains, pipeline stages across nodes within a rail, and data-parallel replicas across rails, the same job's all-reduce time falls from 120 ms scattered to 40 ms rail-optimized to 25 ms optimally placed, **a 4.8-fold step-time difference from placement alone, on identical hardware** *(why it matters: No kernel changed, no hardware changed. The only variable is which physical accelerators hold the ranks. This is why placement is a scheduling input rather than a runtime concern: the scheduler owns the map, and the runtime inherits whatever map it was given.)*. The scheduler that ignores topology is not neutral; it is choosing the slow placement at random.

## Two Control Philosophies

Slurm and Kubernetes answer the same question with opposite contracts. Slurm is imperative batch allocation: the job asks, the scheduler decides once, the allocation is a fact until the job ends. Kubernetes is declarative reconciliation: the desired state is written down and level-triggered controllers continuously pull reality toward it, including after failures, preemptions and node loss. Neither is a refinement of the other; they manage different lifecycles. The friction appears in the gap between them. Kubernetes' default scheduler places pods one at a time, so a 64-pod training job can bind 60 pods and deadlock exactly like a partial gang; the ecosystem repairs this with pod-group admission, which is gang scheduling rebuilt one layer up. **Hybrid fleets work only when exactly one layer owns each placement decision** *(why it matters: If Slurm thinks it owns node allocation while a Kubernetes controller reschedules the pods underneath it, both layers are reconciling against the other's moves. Every production hybrid draws a boundary: one layer owns which jobs run where, the other owns keeping them alive inside that allocation.)*.

## Elasticity Is a Contract

Rigid allocation wastes in both directions: off-peak, a job cannot absorb idle GPUs; at peak, it cannot release them without dying. Elastic scheduling replaces the binary keep-or-kill with a range, but **the contract has three parameters and a scheduler that treats any of them as free pays for it** *(why it matters: The elastic range bounds valid worker counts and their increments; the transition cost prices checkpoint, restart, redistribution and rendezvous for every resize; the scaling-efficiency curve says what an added worker actually adds. TorchElastic's nnodes four-to-sixteen declaration is the range made concrete: thirty-two to a hundred twenty-eight workers, rendezvous-managed.)*. Scaling efficiency itself passes through three regimes as workers grow: near-linear while per-worker computation dominates, sublinear as pipeline fill-and-drain and unhidden synchronization become visible, and saturated when fixed per-step costs rival the shrinking computation. For the 175B reference job the decline comes mostly from the pipeline bubble, because fixing the global batch shrinks the microbatch count per replica while the stage count stays constant.

**Eq 8.3 · Scaling efficiency**
$$
E(n) = \frac{T(1)}{n\,T(n)}
$$

![Scaling efficiency regimes](https://benebsworth.com/study/vol2/08-fleet-orchestration/diagrams/elastic-efficiency.svg)

*Efficiency against worker count for the 175B reference job: near-linear while per-worker computation dominates, sublinear as fixed per-step costs surface, saturated when they rival the shrinking computation. Throughput still rises while efficiency falls; the policy window is a choice, not a derivation.*
Whether a resize pays is arithmetic, not vibes: the throughput gain over the time the job will keep the new allocation must exceed the measured transition cost. The chapter's reference resize breaks even at **about nine hours** *(why it matters: The rescale must be retained for roughly 8.9 hours before its accumulated throughput gain repays the rendezvous, restart and redistribution cost. Any policy that resizes more often than the workload can hold an allocation is donating throughput back to the mechanism.)*; resize more often than that and the mechanism eats the gain.

## Interruption Economics

Preemption and spot capacity are the same economics viewed from opposite sides. Every interruption charges **discarded work since the last durable checkpoint, plus relaunch, reload and warmup, roughly twenty minutes and \$44 per event on the 64-GPU fine-tune** *(why it matters: At a preemption a day, that is about 261 GPU-hours of wasted work daily for one job. The discarded work since the last checkpoint is the larger term, which is why interruption cost is really a checkpoint-interval cost in disguise.)*. And one preemption rarely travels alone: the evicted job reschedules by displacing others, so a fanout of two per level reaches six jobs after two levels, $k + k^2$ for fanout $k$. Two controls cap the cascade: evicted jobs requeue without preempting further, and preemption budgets bound how often any job or capacity fraction may be displaced in a window.

Spot instances invert the direction: the provider preempts you, at a 60 to 70 percent discount, with notice measured in minutes on AWS and as little as thirty seconds on GCP. Whether the discount survives is the effective-cost relation:

**Eq 8.4 · Effective spot cost**
$$
C_{\mathrm{eff}} = p_{\mathrm{spot}}\times\frac{T_{\mathrm{billed}}}{T_{\mathrm{retained}}}
$$

When checkpoint, restart and replay are a small share of billed time, effective cost hugs the spot price; as interruptions multiply, billed time inflates while retained progress does not, and the discount evaporates. The chapter's scenario prices it both ways: **\$344,064 on-demand versus \$161,567 on spot for the same run, a nominal 65% discount that settles to about 52% after interruption overhead** *(why it matters: The thirteen-point leak is the cost of interruptions: checkpoint writes, restart time and replayed work all bill at the spot rate but produce no retained progress. Fault-tolerance infrastructure is what closes the leak, so the same checkpointing that protects against hardware failure earns a second return making interruptible capacity usable.)*. Two-tier checkpointing, periodic saves for unpredicted loss plus a best-effort save on the notice itself, squeezes the leak further, and pool diversification across zones and instance types keeps one reclamation from removing the whole job at once.


**The interruption tax on spot savings**

| Interruption frequency | Retained training work | Checkpoint + restart + replay |
|---|---|---|
| Rare (weekly) | 1 | 0.05 |
| Chapter scenario | 1 | 0.37 |
| Frequent (4x/day) | 1 | 0.8 |

*Illustrative billed-hour split per retained training hour, middle bar anchored to the chapter scenario: \$344,064 on-demand vs \$161,567 spot for the same run — a nominal 65% discount settling to ~52%, an overhead ratio near 0.37. Rare interruptions keep the discount nearly whole; frequent ones can erase it.*

## Signals that Schedule

Which job gets the next free GPUs is a policy question, and the research literature answers it four ways, each exploiting a different observable. **Tiresias drops runtime estimates entirely** *(why it matters: User estimates are unreliable in both directions, so Tiresias prioritizes by attained service, GPU-time already consumed, in two dimensions: elapsed time and resource intensity. With heavy-tailed durations a low-service job is probably short, which approximates shortest-remaining-time ordering without asking anyone anything, plus an explicit age-based promotion so long jobs cannot starve.)*. Gandiva exploits iteration boundaries: suspend at the end of a minibatch when temporary activations are already released, copy persistent state to host memory, time-slice the GPU, and the same mechanism enables migration and packing. Themis measures fairness directly as finish-time ratio, completion time in the shared cluster over completion time on a fair-share isolated slice, and runs auctions where jobs bid placement-sensitive estimates. Pollux goes furthest: because past the critical batch size extra examples contribute less optimization progress, **more GPUs can raise throughput while lowering goodput** *(why it matters: Statistical goodput multiplies system throughput by statistical efficiency, progress per example relative to a reference batch. Growing the batch to use more GPUs discounts every example, so the product, not the throughput, is the objective. Pollux co-adapts allocation, batch size and learning rate, reporting 37 to 50 percent lower average completion times on its testbed.)*.

**Eq 8.5 · Statistical goodput**
$$
G = \underbrace{\Theta}_{\text{examples/s}}\times\underbrace{\eta}_{\text{progress/example}}
$$

**Eq 8.6 · Finish-time fairness**
$$
F_{\mathrm{finish}} = \frac{T_{\mathrm{shared}}}{T_{\mathrm{fair\,share}}}
$$

The comparison is a matching problem, not a ranking: attained service needs only accounting records, iteration exploitation needs runtime profiling, finish-time fairness needs completion estimates, goodput needs the training loop to accept allocation and batch-size changes. Pick the signal your platform can actually observe.

## Serving Shares the Fleet

Training and serving make incompatible demands on the same devices: training batches for throughput, serving races deadlines. The orchestrator's serving unit is the ready replica sized by measured capacity at a latency target, and sharing a GPU among replicas runs along an isolation spectrum from time-slicing through MPS to MIG to exclusivity, each step trading density for interference protection. The economics are large enough to govern design: **exclusive allocation needs 180 GPUs where measured sharing needs 130 for the same service, worth about \$876,000 a year** *(why it matters: The fifty-GPU difference is the price of isolation. Time-slicing and MPS both leave roughly a third of device capacity dark under interference, so the sharing gain is real only when replicas are co-located by measured compatibility, not packed by device count.)*. The boundary between training and serving capacity moves only on forecast: serving's reservation minus its safety buffer is lendable to training as reclaimable capacity, but a guarantee you cannot reclaim in time is a guarantee you do not have.

## Quotas and the Three Tiers

Hierarchical quotas separate a team's guarantee from its burst limit, and letting others borrow idle guarantees is what keeps usage high without breaking promises, provided the guarantees concurrently honored fit within what the platform can reclaim in time. Quota hoarding, holding reservations against future need, is the predictable user response when unused allocations are simply lost, and 64 GPUs once sat idle for a weekend because someone forgot to cancel a reservation.

Which brings the chapter home: **usage is not one number** *(why it matters: Allocated counts complete allocations only, so a partial gang's held devices are a scheduling loss below even that tier. Active counts hardware activity under some counter definition, including communication and work later replayed. Productive counts retained progress toward the workload objective, normalized to the fault-free step rate. Each gap points at a different owner: demand or placement below allocated, input supply or runtime below active, replay and synchronization below productive.)*. The reference profile narrows 500 allocated GPUs to 350 active-equivalents to 280 productive-equivalents, and each step down is a different investigation with a different owner.

![Three tiers of use](https://benebsworth.com/study/vol2/08-fleet-orchestration/diagrams/usage-tiers.svg)

*500 allocated GPUs narrow to 350 active-equivalents to 280 productive-equivalents. Each gap has a different owner: scheduling losses below allocated, input and runtime losses below active, replay and synchronization below productive.*
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


---

## Key equations

**Eq 8.1 · Mean queue wait**

$$
W = \frac{\rho}{1-\rho}\cdot\frac{1+C_s^{2}}{2}\cdot\bar{S}
$$

*Mean queue wait under offered load $\rho$ with service-time variability $C_s$ and mean service $\bar{S}$. The load factor bends sharply upward near capacity; the variability factor multiplies it, so a mixed ML queue waits several times longer than a uniform one at the same offered load.*

**Eq 8.2 · Dominant share**

$$
s_i = \max_{r}\, a_{ir}\, /\, c_r
$$

*Tenant $i$'s dominant share is its largest allocation-to-capacity ratio across all resources. Dominant-resource fairness equalizes this one number, so every tenant is equally constrained relative to its own bottleneck resource.*

**Eq 8.3 · Scaling efficiency**

$$
E(n) = T(1)\, /\, n\, T(n)
$$

*Efficiency at $n$ workers as ideal-over-actual step time. It falls through near-linear, sublinear and saturated regimes as fixed per-step costs (pipeline fill-and-drain, unhidden synchronization) rival the shrinking per-worker computation.*

**Eq 8.4 · Effective spot cost**

$$
C_{\mathrm{eff}} = p_{\mathrm{spot}} \times T_{\mathrm{billed}}\, /\, T_{\mathrm{retained}}
$$

*The real price of interruptible training: spot rate times billed allocation time over retained productive time. Interruptions bill checkpoint, restart and replay hours that produce no progress, so the effective cost rises above the spot price as interruption frequency grows.*

**Eq 8.5 · Statistical goodput**

$$
G = \Theta \times \eta
$$

*Pollux's objective: system throughput in examples per second times statistical efficiency, the optimization progress each example contributes at the current batch size. Past the critical batch size throughput can rise while goodput falls, so the product, not throughput, decides the allocation.*

**Eq 8.6 · Finish-time fairness**

$$
F_{\mathrm{finish}} = T_{\mathrm{shared}}\, /\, T_{\mathrm{fair\,share}}
$$

*Themis's fairness measure: completion time in the shared cluster over completion time on an isolated $1/N$ fair share. A ratio of one means the application finished no later than its fair share allowed; the scheduler minimizes the worst ratio across applications.*

## From the book

- [Gang scheduling deadlock](https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html) — The book's two-panel original: partial allocation deadlock beside atomic allocation. Our sketch redraws the same mechanism as an explicit wait-for cycle to connect it with the detection argument.
- [Backfill reservation](https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html) — The book's reservation figure with backfill candidates. Our version emphasizes the release-contract deadline rather than the capacity hole.
- [Preemption cascade tree](https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html) — The k plus k-squared eviction fanout with the requeue cap drawn as a cut across the tree. Worth reading beside the Interruption Economics section.
- [Priority inversion wait-for chain](https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html) — The high-priority job waiting on the low-priority holder that medium-priority work starves. The reason holistic preemption exists.
- [Elastic training state machine](https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html) — Worker-membership lifecycle centered on active training: scale-up, scale-down, and replacement paths all returning through rendezvous. The contract made mechanical.
- [Topology hierarchy](https://mlsysbook.ai/vol2/08_fleet_orchestration/08_fleet_orchestration.html) — NVLink domain to leaf to spine bandwidth steps. The map placement exploits; pairs with the 120/40/25 ms speedup numbers in the packet.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. In the Kalos cluster trace, single-GPU jobs are 86% of submissions but under 1% of GPU-time, while jobs of 256+ GPUs are about 4% of submissions and roughly 96% of GPU-time. What scheduling problem does this split create?
   - A. A policy fair by job count starves the large jobs that hold most GPU-time, while a policy fair by GPU-time starves the small experiments that dominate submissions; the two populations need different treatment.
   - B. Small jobs finish too quickly to schedule efficiently one at a time, so the scheduler should batch them into synthetic gangs of fixed width to amortize per-job admission overhead across the control plane's reconciliation loop.
   - C. Large jobs fragment the fleet because their checkpoints are too big to migrate, so the scheduler should cap job size at 255 GPUs and force larger runs to use elastic scaling instead.
   - D. The trace shows usage is already optimal because large jobs absorb the idle capacity small jobs leave behind, so no policy change can improve the fleet's productive output.

2. A 10,000-GPU cluster at about \$2 per GPU-hour raises usage from 50% to 80% with no new hardware, holding useful work per active GPU-hour constant. What is the gain worth?
   - A. 1,500 additional productive GPUs, because a thirty-point usage gain adds half a GPU of productive capacity per ten devices when the percentages are compounded across the fleet.
   - B. 3,000 additional productive GPUs, equivalent to the output of 6,000 raw GPUs at the old usage.
   - C. 8,000 additional productive GPUs, because the usage ratio compounds across the fleet.
   - D. 300 additional productive GPUs, since only one tenth of the usage gain is retained work.

3. Under dominant-resource fairness, tenant A's bundle is GPU-heavy and tenant B's is network-heavy. What does progressive filling equalize?
   - A. Each tenant's share of every resource individually, so both end with identical GPU, CPU, memory and network percentages and neither can claim the allocation favored one resource type over another.
   - B. Each tenant's total resource consumption summed across all four resource types, normalized by fleet capacity.
   - C. Each tenant's largest resource share, its dominant share, so both are equally constrained relative to their own bottleneck resource.
   - D. Each tenant's queue wait time, since fairness over a month is measured in delay rather than in allocation.

4. Two rigid 8-GPU jobs each end up holding 4 GPUs from the same pool. Why is this worse than each running at half speed?
   - A. Partial gangs run at reduced efficiency because collective communication scales poorly with missing ranks, so each job delivers less than half of its useful throughput per GPU-hour while it waits.
   - B. Neither job can complete a single step: every collective waits for every rank, so the held GPUs produce zero progress while both jobs wait for resources the other holds.
   - C. Half allocations corrupt the checkpoint format because the shard map assumes the full parallel layout, so both jobs must restart from scratch when the gang completes.
   - D. The jobs oscillate: each releases and reacquires GPUs in turn, so scheduler thrashing consumes the control plane's reconciliation budget and starves other tenants.

5. A 512-GPU gang reservation will need its GPUs in 5 hours. A queued 128-GPU job with a 2-hour runtime estimate could use the idle hole. What makes backfilling it safe?
   - A. Nothing: backfill is always safe because the scheduler can preempt the small job instantly when the reservation matures, since preemption is free.
   - B. The estimate alone: a 2-hour runtime guarantee from the user is a hard contract, so the job will certainly finish 3 hours before the reservation needs the capacity.
   - C. Statistical multiplexing: if enough small jobs backfill the hole at once, their completion times concentrate around the mean, so most of the hole clears in time even though no single job is bound by anything.
   - D. An enforced release contract: the runtime bound or preemption agreement must cover the exit path, including checkpoint and cleanup delay, so the capacity is verifiably free before the gang starts.

6. A high-priority 64-GPU job waits for 4 GPUs held by a low-priority job, but the low-priority job cannot checkpoint and exit because medium-priority work saturates the CPU and network it needs. Raising the high-priority job's priority further changes nothing. Why?
   - A. Priority only affects admission order, not running jobs, so the scheduler must wait for the natural completion of every job in the chain regardless of priority levels.
   - B. The high-priority job's reservation is the problem: sixty held-but-idle GPUs absorb the fleet's slack that the exit path needs, so releasing part of the reservation is what unblocks the chain of waiting jobs.
   - C. The waiting job is transitively dependent on the lowest-priority job's exit path; what is missing is bandwidth for the victim to checkpoint and release, not more priority for the waiter.
   - D. Kubernetes reconciliation is level-triggered, so priorities only take effect at the next sync period; the wait is a control-plane latency artifact rather than a resource conflict.

7. The same training job's all-reduce time measures 120 ms with ranks scattered across racks, 40 ms rail-optimized, and 25 ms optimally placed. What is the lesson?
   - A. Network hardware is the bottleneck, so the cluster should upgrade its spine before scheduling larger jobs on the existing fabric.
   - B. The runtime should overlap communication with computation more aggressively, because a 4.8-fold gap between placements means the collectives library is leaving most of the fabric's performance unclaimed.
   - C. Bandwidth marketing numbers are unreliable: measured fabric bandwidth must be validated per-rack before placement decisions can use it safely.
   - D. Placement is a performance variable worth 4.8-fold on identical hardware, owned by the scheduler: the map of ranks to devices decides which bandwidth tier the collectives pay.

8. An elastic job runs at 100 steps per minute on 64 GPUs. Scaling to 128 GPUs raises throughput to 180 steps per minute, but the resize costs a 9-minute rendezvous with zero progress. After the resize completes, how many minutes must the job keep the new allocation for the extra throughput to repay the interruption?

9. Spot capacity costs 65% less per GPU-hour than on-demand. Under what condition does the effective cost of training on spot approach the on-demand price?
   - A. When checkpoint, restart and replay consume a large share of billed time: billed hours inflate with each interruption while retained progress does not, so the effective rate climbs toward and past the on-demand rate.
   - B. When the job's checkpoint interval is shorter than the provider's notice window, because then every notice-triggered save duplicates a periodic one and the write bandwidth spent on redundant checkpoints inflates billed time without adding retained progress.
   - C. When spot capacity comes from a single availability zone, because correlated reclamation removes the whole job at once and forces recovery into on-demand fallback pricing during the capacity search.
   - D. When the fleet's usage is already high, because then spot interruptions displace other tenants' work whose cost must be added to the effective price.

10. How does Tiresias schedule well without asking users for runtime estimates?
    - A. It prioritizes by attained service, GPU-time already consumed: with heavy-tailed job durations a low-service job is probably short, approximating shortest-remaining-time ordering without any prediction.
    - B. It profiles each job's first iterations and extrapolates total runtime from the measured step time multiplied by the user's requested epoch count, correcting the estimate as more iterations complete.
    - C. It auctions GPUs to the jobs willing to preempt the most other work, using willingness to accept interruption as a proxy for short remaining duration.
    - D. It requires jobs to declare a completion deadline at submission and schedules by earliest-deadline-first ordering, which replaces duration estimates with deadline constraints the user has a reason to state honestly.

11. A dashboard reports 85% GPU occupancy, yet a team's training progress is slow. The allocation narrows 500 allocated GPUs to 350 active-equivalents to 280 productive-equivalents. What does the 70-GPU gap between active and productive contain?
    - A. Fragmented free capacity: devices no pending gang can assemble into a feasible placement, counted as active because they draw power and report readiness even though no allocation can claim them.
    - B. Input pipeline stalls: time the devices spend waiting for data, since feeding GPUs is the largest single loss in most training fleets.
    - C. Partially allocated gangs: devices held by jobs still waiting for their remaining members, which count as active under the kernel-counter definition even though they cannot execute a step.
    - D. Work that busy kernels perform but that does not become retained progress: replay after failures, synchronization overhead, and redone computation, normalized against the fault-free step rate.

12. Explain to a colleague why a cluster scheduler must apply feasibility constraints before fairness constraints, using the example of a tensor-parallel job and four free GPUs scattered across four nodes.

## Answer key

1. A. Job count and GPU-time share describe two divergent populations of the same fleet. Fairness measured one way starves the other population, which is the opening conflict every policy in the chapter has to resolve.

2. B. The gain is 10,000 × (0.80 − 0.50) = 3,000 productive GPUs. Because each was 50% productive before, matching that output at the old usage would have required 6,000 raw GPUs. This is the stake the chapter's mechanisms defend.

3. C. DRF reduces each tenant to its maximum allocation-to-capacity ratio across resources and equalizes that. In the worked example both tenants reach 0.50 even though their CPU and memory shares differ, because saturation of their own dominant resource is what bounds them.

4. B. Rigid synchronous training has step-function utility: the full minimum gang or nothing. Two partial holders form a hold-and-wait deadlock at full cost and zero output, which is why gang scheduling allocates atomically.

5. D. The estimate identifies the window; the enforced release makes it safe. Users mis-estimate in both directions, and preemption is never free: without a protected exit path the backfilled job can itself delay the gang it was meant to shadow.

6. C. This is priority inversion through the release path. Holistic preemption reserves the CPU, network and storage bandwidth a victim needs to checkpoint and exit; without it the victim is too starved to release the accelerators anyone is waiting for.

7. D. Nothing about the job or hardware changed except which physical GPUs hold which ranks. Bandwidth steps down from NVLink to leaf to spine, so the scheduler's placement decision, not the runtime, determines what the step costs.

8. Gain after resizing is 80 extra steps per minute (180 minus 100). The interruption cost is the progress the job would have made during the rendezvous at its then-current rate: 9 minutes times 100 steps per minute is 900 steps. Break-even time at the new scale is 900 / 80 = 11.25 minutes. The chapter's reference resize breaks even at about nine hours because real transition costs include restart, state redistribution and sublinear efficiency at the larger scale, not just rendezvous.

9. A. Effective cost is spot price times billed over retained time. Interruptions bill checkpointing, restart and replay hours that produce no durable progress; as they multiply the ratio inflates and the nominal discount evaporates. The scenario's 65% nominal discount settles to about 52% for exactly this reason.

10. A. Consumed service is observable and needs no user honesty. Two dimensions, elapsed time and resource intensity, capture both duration and size; an explicit age-based promotion protects long jobs from starvation. The other options describe Gandiva-style profiling, auction mechanisms, and deadline scheduling.

11. D. Active means hardware activity under some counter, including communication and work later thrown away. Productive counts only retained progress at the fault-free rate. The gap between them is overhead that looks busy, and each tier gap points at a different investigation.

12. Fairness rules like dominant-resource fairness choose among allocations, but they say nothing about whether an allocation can execute. A tensor-parallel job needs its GPUs inside one NVLink domain; four free GPUs scattered across four nodes fail that constraint, so an allocation of them produces zero training steps no matter how fair it is on paper. If the scheduler equalized shares before filtering feasibility, it would hand tenants entitlements they cannot use and count the fleet as fairly divided while nothing runs. The production order is therefore: filter capability, gang atomicity, memory and topology constraints first, then apply fairness among the placements that can actually run, and report the binding constraint when no equal-share feasible placement exists.

## Audio overview

[Listen to the Marcus & Iris read-along (~11 min)](https://benebsworth.com/study-audio/vol2/08-fleet-orchestration.m4a) — a generated podcast walking this packet's argument.
