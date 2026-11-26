# Fleet Orchestration: self-test

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
