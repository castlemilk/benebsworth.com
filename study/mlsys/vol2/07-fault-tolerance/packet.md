# Fault Tolerance: Study Packet

## Thesis

Distributed training is a synchronized system: every collective waits for every rank, so one failed GPU does not lose one GPU of capacity, it idles the whole group. At 10,000 GPUs the arithmetic of scale turns a rare physical event into a routine one: a GPU-class failure arrives every few hours, and every minute the job spends noticing and recovering costs about \$340 in idle compute. Fault tolerance is therefore not a feature bolted onto the reliable path. It is the recurring cost of executing at fleet scale, and every defense in this chapter is the same trade written in different units: standing overhead purchased against expected lost work.

==The Young-Daly checkpoint interval is the archetype: a square root that picks the save cadence where writing cost and replay cost are equal.=={Save too often and writes eat the fleet; save too rarely and replays do. Write cost grows as T/τ while expected replay grows as τ/2 per failure, so the total-waste curve bottoms where τ* = √(2·T·MTBF), a square root, not a fraction.} Everything else, replica counts, detection thresholds, spare pools, degradation ladders, is the same marginal argument applied to a different failure mode.

## The Price of Standing Still

A 10,000-GPU cluster three months into a foundation-model run sits on roughly ==\$0.5M of accelerator time per day=={At roughly $2 per H100-hour on cloud price sheets, ten thousand accelerators burn about $480,000 a day. That is the denominator every failure cost in this chapter is measured against.}. When a single GPU hangs at an AllReduce barrier, the other 9,999 wait at full price: about \$340 per minute the failure goes unnoticed. The whole synchronous-job structure built in the last two chapters is what makes a component failure a fleet failure; all collectives assume all ranks arrive.

Checkpoint size prices the redo. The 175B running example keeps ==14 bytes per parameter=={bf16 weights plus an fp32 master copy plus two fp32 Adam moments: fourteen bytes per parameter once the gradient buffer is released, 2.45 TB for the 175B job every time the run saves its place.}, FP16 weights, FP32 master weights, two FP32 Adam moments, so one resumable snapshot is about 2.45 TB. Losing an uncheckpointed day of that run is a six-figure write-off; losing an hour on a small vision job is a rounding error. ==What a failure destroys decides what defending against it is worth.=={Lose only compute and recovery is a restart. Lose optimizer state and the run replays from the last save. Lose the shard map and even the file layout must be reconstructed. The defense price follows the state destroyed.}

## Failure Becomes a Rate

One GPU with a 50,000-hour MTTF contributes ==20,000 FITs=={Failures in time: one failure per billion device-hours. Twenty thousand FIT is a fifty-thousand-hour mean time to failure; the unit exists because rates, not probabilities, add cleanly across a fleet.} of failure rate: vanishingly rare per device, dominant in aggregate. Components in series add their rates, so the per-GPU budget sums the GPU itself, its PCIe link, and its prorated share of node power and network; redundant supplies leave the sum only when one failure alone can kill the node.

::eq[series-composition]


$$
\lambda_{\mathrm{GPU\,total}} = \lambda_{\mathrm{gpu}} + \lambda_{\mathrm{pcie}} + \lambda_{\mathrm{power}} + \lambda_{\mathrm{net}}
$$
Multiplying the per-GPU rate by the fleet gives the system rate, and the reciprocal is the cluster MTBF:

::eq[system-mtbf]


$$
\mathrm{MTBF}_{\mathrm{system}} = \frac{1}{\lambda_{\mathrm{system}}} = \frac{1}{N \cdot \lambda_{\mathrm{GPU\,total}}}
$$
The 10,000-GPU cascade lands near ==3.9 hours=={Series systems add failure rates. The GPU alone promises five hours between failures at this scale; adding PCIe, NIC and a per-GPU share of node power pushes the fleet's expectation down near four.} and about 6 failures per day; the GPU-only simplification gives 5 hours and 4.8. ==A week-long job should plan for dozens of interruptions, a month-long one for hundreds.=={Interruption cadence is set by the fleet, not the part. At ~4 hours between failures a week holds ~42 of them and a month ~180, reliability at this scale is scheduling, not hardening.} Production confirms the slope: Meta's Llama 3 405B run logged 419 unexpected interruptions in 54 days on 16,384 H100s, an observed MTTF near 3.1 hours.

::fig[mtbf-ladder]

::chart[mtbf-collapse]

Where the interruptions come from matters as much as the rate. In the Llama 3 log, GPU components (faulty dies, HBM, SRAM, system processors) account for about two thirds of the 419; software bugs and dependencies, network, host maintenance, and unexplained NCCL watchdog timeouts share the rest. Only 6 were attributed to silent data corruption, and only because they were caught.

::chart[interruption-causes]

## Four Ways to Fail, One Invisible

The taxonomy sorts by what the surviving system can observe. A ==transient fault=={A transient fault clears on retry: a bit flip, a dropped packet, an ECC event. Nothing to repair, which is why bounded retries precede any diagnosis in the recovery pipeline.} leaves nothing to repair: a single-event upset corrupts a tensor, and the question is only whether the effect escaped. A fail-stop fault announces itself; the process dies and a timeout fires. A Byzantine component keeps answering while sending arbitrary wrong data, the hardest case because liveness lies. Correlated failures break the independence assumption that makes the arithmetic work: one ToR switch removes 64 GPUs at once.

The dangerous class is the ==gray failure=={Alive to its own probes, degraded to its peers: a fan failure throttling clocks, an optical link quietly retrying CRCs. Each observer sees a different system, which is exactly why single-view liveness misses it.}: a component that stays alive, answers heartbeats, and computes wrong or slowly. Silent data corruption is the extreme case. At an illustrative per-GPU SDC rate, the 10,000-GPU cluster expects one event roughly ==every 100 hours=={At ~10⁻⁶ events per GPU-hour, a ten-thousand-GPU fleet expects one roughly every hundred hours – about twenty over a three-month run, and each can poison every checkpoint written after it lands.}, about 20 over a three-month run, and each one can contaminate weights, gradients, and every checkpoint written after it. ==SDC cannot be scheduled against; it can only be checked.=={There is no failure event to catch; the corrupt tensor keeps flowing through collectives. Defense is periodic verification, checksums, canary batches, redundant comparison, priced as a sampling problem.} Checksums and redundant computation catch a corrupt contribution; they cannot prove a clean one was never poisoned upstream.

## The Checkpoint Contract

Checkpointing converts a catastrophic restart-from-scratch into a bounded replay, but every save spends accelerator time on storage and every skipped save risks replaying completed work. The Young-Daly rule balances the two:

::eq[young-daly]


$$
\tau^{*} = \sqrt{2 \cdot T_{\mathrm{write}} \cdot \mathrm{MTBF}}
$$
On the chapter's cluster (24.5-second write at ~100 GB/s, 3.9-hour full-system MTBF) the optimum sits near ==14 minutes=={τ* = √(2 × 24.5 s × 3.9 h) ≈ 13.8 minutes on this cluster: about 5.9% of wall time, half of it writes, half expected replay.} and costs about 5.9% of wall time, half writes, half expected replay. The floor is shallow: being somewhat off the optimum is cheap, being far off is not. ==The same formula reverses verdicts across contexts=={The formula's verdict is portable, the interval is not. Every hour is nearly 4× too frequent at a five-minute write and fifty-hour MTBF (τ* ≈ 173 min) and 4× too infrequent on this cluster (τ* ≈ 14 min).}: "every hour" is nearly 4x too frequent at a 5-minute write and 50-hour MTBF (optimum ~173 minutes) and too infrequent on the 10K cluster (optimum ~14 minutes). Intuition fails both ways; only the marginal balance is portable.

The two service objectives bound the expected-value optimum. RPO caps lost progress: a 20-minute interval cannot promise better than 20 minutes without a durable log between saves. RTO caps resume delay: ==a five-minute RTO is impossible if checkpoint reload alone takes eight.=={RTO caps the resume delay you may promise. Reload alone is load time plus rendezvous and warmup, an eight-minute cold path cannot contract to five no matter how fast detection fires.} The valid-restart contract also fixes what a snapshot must contain: weights, optimizer state, dataloader cursor, RNG state, and for sharded layouts, a manifest that names each shard's digest. A generation is only committed once its manifest publishes; staged shards without it are garbage.

::fig[young-daly-floor]

Interval is model-relative. At fixed overhead the optimal cadence runs from ~22 seconds for BERT-Large (FP32 weights only) to ~20 minutes for the embedding-heavy recommender; the 175B archetype lands at ~15.7 minutes.

## What Recovery Actually Buys

Checkpoints preserve state, but a failure's real cost is the wall-clock spent getting back to useful work, paid four times over:

::eq[recovery-time]


$$
T_{\mathrm{recovery}} = T_{\mathrm{detect}} + T_{\mathrm{restart}} + T_{\mathrm{load}} + T_{\mathrm{warmup}}
$$
For the reference job the cold-restart budget comes to ==about 6.6 minutes=={Roughly 30 s to detect, 4 min for scheduler allocation and rendezvous, 24.5 s to load the checkpoint, 2 min of warmup: six and a half minutes from failure to useful work.}: ~30 s detection, ~4 min restart and rendezvous, ~24.5 s aggregate checkpoint load, ~2 min warmup. Averaged over failure cadence that is ~3 min of lost fleet time per day at 1,000 GPUs and ~31 min at 10,000. ==Recovery cost is dominated by restart and warmup, not the I/O.=={The checkpoint read is the term fast I/O already solved. Membership, allocation and re-stabilization, the slow majority, are what a failure actually costs.} The ~24.5 s load is the one term sharded I/O already solved; per-node local reads restore a ~4 s share in parallel.

::fig[recovery-budget]

Warm restart shortens the path by keeping survivors resident: the failed rank's slot is replaced, not the group. It pays only when surviving state can be trusted and remapped, otherwise the group rolls back to a common cut anyway. Whatever the restart flavor, the recovered job must fence the old incarnation: a monotonically increasing epoch token, checked at every protected resource, ==rejects writes from a paused or partitioned worker that wakes up believing it still owns the job.=={A revived worker carrying stale state can overwrite newer checkpoints. The generation fence rejects writes that present an old epoch, which is what makes restarting safe to retry.}

Not every slow rank is a dead rank. One ==half-speed straggler=={Synchronous steps take the max over ranks, so one half-speed device doubles the step for 1,023 healthy peers, about $1,024 an hour of idle compute while every heartbeat still passes.} on a 1,024-GPU job halves the whole cluster's throughput, ~\$1,024/hour of idle compute, while still passing every liveness check.

::eq[straggler-step]


$$
T_{\mathrm{step}}(N) = \max_{i} T_{\mathrm{compute},i} + T_{\mathrm{comm}}(N)
$$
Progress-median detection separates the degrading device from a dead one; the replace-vs-tolerate call weighs expected slowdown persistence against the restart-plus-replay cost on the right side of the budget above.

## Elastic and Stateless Recovery

Fixed-size recovery waits for spare capacity to restore the original worker count. Elastic recovery relaxes that: a 1,024-GPU job that loses an 8-GPU node keeps ==1,016 GPUs, 99.2% of its allocation=={Drop the dead 8-GPU node, keep 1,016: the job resumes at 99.2% of its allocation without waiting for a spare. Capacity traded for interruption time.}, and resumes on a feasible smaller partition at reduced throughput instead of waiting. The cost is coordinated adaptation: framework, dataloader, and orchestrator must agree on new membership so no sample is lost or double-counted.

Serving plays the same game on a different contract. Training loses time; serving loses requests inside a latency budget. The availability ladder prices replica count directly:

::eq[replica-availability]


$$
A_{\mathrm{service}} = 1 - (1 - A_{\mathrm{replica}})^{R}
$$
At 99% single-replica availability the ladder runs 3.65 days down per year at one replica, 52.6 minutes at two, ==31.5 seconds at three=={Availability composes by the exponent. At 99% per replica, annual downtime falls 3.65 days to 52.6 minutes to 31.5 seconds across one, two and three replicas.}, provided the replicas sit in independent failure domains and each survivor can absorb the dead replica's share. Active-active spends headroom continuously; active-passive spends a whole warm replica. The health-check loop decides removal speed: a 5-second probe, 3-miss threshold pulls a crashed replica from rotation in ==12–17 s=={Five-second liveness probes with three consecutive misses declare failure in 12–17 s, the first term of the recovery budget and the cheapest to shrink.}, and every request routed to it in that window fails or retries inside its own deadline.

::fig[detection-layers]

When the failure cannot be masked, degrade on purpose. A model cascade steps down through prepared rungs, ViT-Large at 88% to EfficientNet-B4 to MobileNet, ==trading accuracy for survival instead of failing entirely=={Prepared degradation rungs, ViT-Large to EfficientNet to MobileNet trade accuracy for service continuity. The rungs must be designed and drilled, or the degraded path is just a slower outage.}; feature tiers shed the optional before touching the critical. Both directions share the discipline: the degraded path is designed, monitored, and drilled, or it is just a slower way to be down.

## What the Chapter Says to Carry

Failure rate, not failure event: a 50,000-hour part in a 10,000-device system fails every ~4 hours, so recovery belongs in the execution budget, not the exception path. Synchronized jobs convert component failures into fleet idleness at ~\$340/min on the chapter's cluster. The checkpoint interval is a marginal balance, Young-Daly's square root, and its shallow floor forgives rough estimates. Recovery time decomposes into detect + restart + load + warmup, and restart/warmup dominate at ~6.6 minutes. Redundancy buys availability by the exponent, 3.65 days to 31.5 seconds per year across three replicas. The silent cases, gray failures, SDC, stragglers, defeat liveness checks and demand progress and correctness probes instead.

## Fallacies and Pitfalls

- *Hardware redundancy is enough.* Hardware caused most of Llama 3's 419 interruptions, but a malformed checkpoint path, a mismatched collective library, or a silent preprocessing bug destroys the same multi-week job and no amount of N+1 power supply covers it.
- *Set the checkpoint interval by intuition.* "Every hour" is ~4x too frequent at 5-min write/50-h MTBF and too infrequent at 24.5-s write/3.9-h MTBF. The same policy is wrong in both directions.
- *Component MTTF predicts timing.* MTTF is a rate for planning averages, not a schedule; a shorter job can finish clean inside an expected failure count above one.
- *A surviving checkpoint means a valid checkpoint.* Only a published manifest with matching digests is a generation; a plausible-looking `latest` directory can be a partially overwritten lie.
- *Timeouts catch everything.* Gray failures and stragglers pass liveness checks while taxing throughput 50%; progress and correctness probes are a separate layer.

## The physics

| Quantity | Value |
|---|---|
| GPU MTTF | 50,000 h (20,000 FIT) |
| 10K cluster MTBF | ~5 h GPU-only; ~3.9 h full-system; ~6.2 failures/day |
| Llama 3 interruptions | 419 / 54 days / 16,384 H100s → ~3.1 h MTTF |
| SDC cadence | ~1 event / ~100 h on 10K; ~20 per 3-month run |
| Checkpoint | 14 B/param → ~2.45 TB @175B; ~24.5 s write @100 GB/s |
| Young-Daly optimum | ~14 min, ~5.9% overhead; shallow floor |
| Archetype intervals | BERT ~22 s, ResNet ~6 s, ViT ~21 s, 175B ~15.7 min, recsys ~20 min |
| Recovery budget | ~6.6 min: detect ~30 s, restart ~4 min, load ~24.5 s, warmup ~2 min |
| Daily recovery loss | ~3 min/day @1K vs ~31 min/day @10K |
| Straggler tax | half-speed rank on 1,024 GPUs → 50% throughput, ~\$1,024/h |
| Idle burn | ~\$340/min, ~\$0.5M/day at 10K GPUs |
| Replica downtime/yr | 3.65 d → 52.6 min → 31.5 s at 1/2/3 replicas @99% |
| Failover window | 12–17 s at 5 s probe / 3-miss threshold |
| Elastic retention | 1,016/1,024 = 99.2% after losing one 8-GPU node |

## Glossary

- **FIT**: failures in time; one failure per billion device-hours. 50,000 h MTTF ↔ 20,000 FIT.
- **MTBF / MTTF**: system time between failures vs. one component's time to first failure; numerically equal under the exponential model, different in kind.
- **Gray failure**: a live-but-wrong-or-slow component; passes liveness checks.
- **SDC**: silent data corruption; wrong results with no fault raised.
- **RPO / RTO**: max acceptable lost progress vs. max acceptable resume delay.
- **Young-Daly**: τ* = √(2·T_write·MTBF); the checkpoint interval where save and replay costs are equal.
- **Consistent cut**: a set of per-worker states that could have coexisted at one moment; the only legal recovery line.
- **Fencing token**: monotonic epoch stamped on writes so a stale incarnation cannot publish.
- **Rendezvous**: the membership protocol by which surviving and restarted workers agree on the new group.
- **Two-phase commit**: prepare-then-publish protocol that makes a checkpoint generation atomic.
- **Warm vs cold restart**: preserve surviving state in place vs. reload the group from a checkpoint.
- **Elastic training**: resume on a resized worker group instead of waiting for spare capacity.
- **Active-active / active-passive**: split live traffic across replicas vs. primary + idle warm standby.
- **Graceful degradation**: preplanned quality rungs, model cascades, feature tiers, that shrink the service instead of dropping it.
- **Goodput**: share of held allocation spent on work a checkpoint retains; program goodput loses to stragglers, runtime goodput to restarts.

## → Ben's world

- The whole chapter is **queueing at the fleet layer**: the same failure-rate vs. recovery-time balance shows up in cuttlefish's retry budgets and brandbrain's pollers; a component that never fails alone still fails a synchronous group.
- **Progress-median straggler detection** maps directly onto the uptime platform's anomaly detection: liveness is cheap, but the expensive signal is a replica that answers correctly and slowly.
- **Manifest-published checkpoints** are the same atomicity pattern as the flow orchestrator's run records: staged-but-uncommitted state must be unreachable, and a stale writer needs fencing, not just a lease.

## Open questions

- Bounded-asynchronous checkpointing trades coordination cost for reconstruction complexity at recovery; where does the break-even sit for a real FSDP run at 10K?
- SDC detection at ~20 events per run: what does a fleet-level gradient-checksum actually cost in fabric and compute, and does it catch enough to pay?
- Elastic resize preserves throughput share only when the partition still fits; for TP×PP-coupled layouts, how much resize slack does a real scheduler keep?
