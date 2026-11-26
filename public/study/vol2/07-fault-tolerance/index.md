---
title: "Fault Tolerance — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html"
canonical_url: "https://benebsworth.com/study/vol2/07-fault-tolerance/"
---
# Fault Tolerance: Study Packet

## Thesis

Distributed training is a synchronized system: every collective waits for every rank, so one failed GPU does not lose one GPU of capacity, it idles the whole group. At 10,000 GPUs the arithmetic of scale turns a rare physical event into a routine one: a GPU-class failure arrives every few hours, and every minute the job spends noticing and recovering costs about \$340 in idle compute. Fault tolerance is therefore not a feature bolted onto the reliable path. It is the recurring cost of executing at fleet scale, and every defense in this chapter is the same trade written in different units: standing overhead purchased against expected lost work.

**The Young-Daly checkpoint interval is the archetype: a square root that picks the save cadence where writing cost and replay cost are equal.** *(why it matters: Save too often and writes eat the fleet; save too rarely and replays do. Write cost grows as T/τ while expected replay grows as τ/2 per failure, so the total-waste curve bottoms where τ* = √(2·T·MTBF), a square root, not a fraction.)* Everything else, replica counts, detection thresholds, spare pools, degradation ladders, is the same marginal argument applied to a different failure mode.

## The Price of Standing Still

A 10,000-GPU cluster three months into a foundation-model run sits on roughly **\$0.5M of accelerator time per day** *(why it matters: At roughly $2 per H100-hour on cloud price sheets, ten thousand accelerators burn about $480,000 a day. That is the denominator every failure cost in this chapter is measured against.)*. When a single GPU hangs at an AllReduce barrier, the other 9,999 wait at full price: about \$340 per minute the failure goes unnoticed. The whole synchronous-job structure built in the last two chapters is what makes a component failure a fleet failure; all collectives assume all ranks arrive.

Checkpoint size prices the redo. The 175B running example keeps **14 bytes per parameter** *(why it matters: bf16 weights plus an fp32 master copy plus two fp32 Adam moments: fourteen bytes per parameter once the gradient buffer is released, 2.45 TB for the 175B job every time the run saves its place.)*, FP16 weights, FP32 master weights, two FP32 Adam moments, so one resumable snapshot is about 2.45 TB. Losing an uncheckpointed day of that run is a six-figure write-off; losing an hour on a small vision job is a rounding error. **What a failure destroys decides what defending against it is worth.** *(why it matters: Lose only compute and recovery is a restart. Lose optimizer state and the run replays from the last save. Lose the shard map and even the file layout must be reconstructed. The defense price follows the state destroyed.)*

## Failure Becomes a Rate

One GPU with a 50,000-hour MTTF contributes **20,000 FITs** *(why it matters: Failures in time: one failure per billion device-hours. Twenty thousand FIT is a fifty-thousand-hour mean time to failure; the unit exists because rates, not probabilities, add cleanly across a fleet.)* of failure rate: vanishingly rare per device, dominant in aggregate. Components in series add their rates, so the per-GPU budget sums the GPU itself, its PCIe link, and its prorated share of node power and network; redundant supplies leave the sum only when one failure alone can kill the node.

**Eq 7.1 · Series composition**
$$
\lambda_{\mathrm{GPU\,total}} = \lambda_{\mathrm{gpu}} + \lambda_{\mathrm{pcie}} + \lambda_{\mathrm{power}} + \lambda_{\mathrm{net}}
$$
Multiplying the per-GPU rate by the fleet gives the system rate, and the reciprocal is the cluster MTBF:

**Eq 7.2 · System MTBF**
$$
\mathrm{MTBF}_{\mathrm{system}} = \frac{1}{\lambda_{\mathrm{system}}} = \frac{1}{N \cdot \lambda_{\mathrm{GPU\,total}}}
$$
The 10,000-GPU cascade lands near **3.9 hours** *(why it matters: Series systems add failure rates. The GPU alone promises five hours between failures at this scale; adding PCIe, NIC and a per-GPU share of node power pushes the fleet's expectation down near four.)* and about 6 failures per day; the GPU-only simplification gives 5 hours and 4.8. **A week-long job should plan for dozens of interruptions, a month-long one for hundreds.** *(why it matters: Interruption cadence is set by the fleet, not the part. At ~4 hours between failures a week holds ~42 of them and a month ~180, reliability at this scale is scheduling, not hardening.)* Production confirms the slope: Meta's Llama 3 405B run logged 419 unexpected interruptions in 54 days on 16,384 H100s, an observed MTTF near 3.1 hours.

![The MTBF ladder](https://benebsworth.com/study/vol2/07-fault-tolerance/diagrams/mtbf-ladder.svg)

*Expected hours between GPU failures collapse as the fleet grows: one device at 50,000 h, 1,000 at 50 h, 10,000 at 5 h, with the full-system cascade and the Llama 3 measurement marked below the GPU-only line.*

**GPU-only MTBF vs fleet size**

| accelerators in the job | hours between GPU failures (50,000 h MTTF / N) |
|---|---|
| 1,000 | 50 |
| 2,000 | 25 |
| 4,000 | 12.5 |
| 8,000 | 6.25 |
| 10,000 | 5 |

*The 50,000 h per-GPU MTTF divided by fleet size: a job's expected GPU-failure cadence halves with every doubling. The full-system cascade (PCIe, NIC, power shares) lands lower still — about 3.9 h at 10,000 — and measured production cadences sit near 3.1 h on 16,384 GPUs.*

Where the interruptions come from matters as much as the rate. In the Llama 3 log, GPU components (faulty dies, HBM, SRAM, system processors) account for about two thirds of the 419; software bugs and dependencies, network, host maintenance, and unexplained NCCL watchdog timeouts share the rest. Only 6 were attributed to silent data corruption, and only because they were caught.


**Llama 3: 419 interruptions by cause**

| cause group (54-day snapshot, 16,384 H100s) | largest single cause in group | remaining causes in group |
|---|---|---|
| GPU components | 148 | 120 |
| Software | 54 | 24 |
| Network | 35 | 0 |
| Host/infra | 32 | 30 |
| Unattributed | 7 | 0 |

*Meta's Llama 3 405B pretraining log, grouped from Table 5 of the run report. GPU components dominate (~64%); software bugs and failed dependencies, network, and host work share most of the rest. Silent data corruption appears only where detected (6).*

## Four Ways to Fail, One Invisible

The taxonomy sorts by what the surviving system can observe. A **transient fault** *(why it matters: A transient fault clears on retry: a bit flip, a dropped packet, an ECC event. Nothing to repair, which is why bounded retries precede any diagnosis in the recovery pipeline.)* leaves nothing to repair: a single-event upset corrupts a tensor, and the question is only whether the effect escaped. A fail-stop fault announces itself; the process dies and a timeout fires. A Byzantine component keeps answering while sending arbitrary wrong data, the hardest case because liveness lies. Correlated failures break the independence assumption that makes the arithmetic work: one ToR switch removes 64 GPUs at once.

The dangerous class is the **gray failure** *(why it matters: Alive to its own probes, degraded to its peers: a fan failure throttling clocks, an optical link quietly retrying CRCs. Each observer sees a different system, which is exactly why single-view liveness misses it.)*: a component that stays alive, answers heartbeats, and computes wrong or slowly. Silent data corruption is the extreme case. At an illustrative per-GPU SDC rate, the 10,000-GPU cluster expects one event roughly **every 100 hours** *(why it matters: At ~10⁻⁶ events per GPU-hour, a ten-thousand-GPU fleet expects one roughly every hundred hours – about twenty over a three-month run, and each can poison every checkpoint written after it lands.)*, about 20 over a three-month run, and each one can contaminate weights, gradients, and every checkpoint written after it. **SDC cannot be scheduled against; it can only be checked.** *(why it matters: There is no failure event to catch; the corrupt tensor keeps flowing through collectives. Defense is periodic verification, checksums, canary batches, redundant comparison, priced as a sampling problem.)* Checksums and redundant computation catch a corrupt contribution; they cannot prove a clean one was never poisoned upstream.

## The Checkpoint Contract

Checkpointing converts a catastrophic restart-from-scratch into a bounded replay, but every save spends accelerator time on storage and every skipped save risks replaying completed work. The Young-Daly rule balances the two:

**Eq 7.3 · Young-Daly interval**
$$
\tau^{*} = \sqrt{2 \cdot T_{\mathrm{write}} \cdot \mathrm{MTBF}}
$$
On the chapter's cluster (24.5-second write at ~100 GB/s, 3.9-hour full-system MTBF) the optimum sits near **14 minutes** *(why it matters: τ* = √(2 × 24.5 s × 3.9 h) ≈ 13.8 minutes on this cluster: about 5.9% of wall time, half of it writes, half expected replay.)* and costs about 5.9% of wall time, half writes, half expected replay. The floor is shallow: being somewhat off the optimum is cheap, being far off is not. **The same formula reverses verdicts across contexts** *(why it matters: The formula's verdict is portable, the interval is not. Every hour is nearly 4× too frequent at a five-minute write and fifty-hour MTBF (τ* ≈ 173 min) and 4× too infrequent on this cluster (τ* ≈ 14 min).)*: "every hour" is nearly 4x too frequent at a 5-minute write and 50-hour MTBF (optimum ~173 minutes) and too infrequent on the 10K cluster (optimum ~14 minutes). Intuition fails both ways; only the marginal balance is portable.

The two service objectives bound the expected-value optimum. RPO caps lost progress: a 20-minute interval cannot promise better than 20 minutes without a durable log between saves. RTO caps resume delay: **a five-minute RTO is impossible if checkpoint reload alone takes eight.** *(why it matters: RTO caps the resume delay you may promise. Reload alone is load time plus rendezvous and warmup, an eight-minute cold path cannot contract to five no matter how fast detection fires.)* The valid-restart contract also fixes what a snapshot must contain: weights, optimizer state, dataloader cursor, RNG state, and for sharded layouts, a manifest that names each shard's digest. A generation is only committed once its manifest publishes; staged shards without it are garbage.

![The Young-Daly floor](https://benebsworth.com/study/vol2/07-fault-tolerance/diagrams/young-daly-floor.svg)

*Save overhead falls hyperbolically while expected rework climbs linearly with the interval; their sum has a shallow minimum near 14 minutes, where the two terms are equal. Being off the optimum is cheap; being far off is not.*
Interval is model-relative. At fixed overhead the optimal cadence runs from ~22 seconds for BERT-Large (FP32 weights only) to ~20 minutes for the embedding-heavy recommender; the 175B archetype lands at ~15.7 minutes.

## What Recovery Actually Buys

Checkpoints preserve state, but a failure's real cost is the wall-clock spent getting back to useful work, paid four times over:

**Eq 7.4 · Recovery time decomposition**
$$
T_{\mathrm{recovery}} = T_{\mathrm{detect}} + T_{\mathrm{restart}} + T_{\mathrm{load}} + T_{\mathrm{warmup}}
$$
For the reference job the cold-restart budget comes to **about 6.6 minutes** *(why it matters: Roughly 30 s to detect, 4 min for scheduler allocation and rendezvous, 24.5 s to load the checkpoint, 2 min of warmup: six and a half minutes from failure to useful work.)*: ~30 s detection, ~4 min restart and rendezvous, ~24.5 s aggregate checkpoint load, ~2 min warmup. Averaged over failure cadence that is ~3 min of lost fleet time per day at 1,000 GPUs and ~31 min at 10,000. **Recovery cost is dominated by restart and warmup, not the I/O.** *(why it matters: The checkpoint read is the term fast I/O already solved. Membership, allocation and re-stabilization, the slow majority, are what a failure actually costs.)* The ~24.5 s load is the one term sharded I/O already solved; per-node local reads restore a ~4 s share in parallel.

![The 6.6-minute recovery budget](https://benebsworth.com/study/vol2/07-fault-tolerance/diagrams/recovery-budget.svg)

*One cold restart decomposed: detect ~30 s, restart ~4 min, load ~24.5 s, warmup ~2 min. Restart and warmup dominate the budget — the checkpoint read everyone worries about is the small term.*
Warm restart shortens the path by keeping survivors resident: the failed rank's slot is replaced, not the group. It pays only when surviving state can be trusted and remapped, otherwise the group rolls back to a common cut anyway. Whatever the restart flavor, the recovered job must fence the old incarnation: a monotonically increasing epoch token, checked at every protected resource, **rejects writes from a paused or partitioned worker that wakes up believing it still owns the job.** *(why it matters: A revived worker carrying stale state can overwrite newer checkpoints. The generation fence rejects writes that present an old epoch, which is what makes restarting safe to retry.)*

Not every slow rank is a dead rank. One **half-speed straggler** *(why it matters: Synchronous steps take the max over ranks, so one half-speed device doubles the step for 1,023 healthy peers, about $1,024 an hour of idle compute while every heartbeat still passes.)* on a 1,024-GPU job halves the whole cluster's throughput, ~\$1,024/hour of idle compute, while still passing every liveness check.

**Eq 7.6 · Straggler step time**
$$
T_{\mathrm{step}}(N) = \max_{i} T_{\mathrm{compute},i} + T_{\mathrm{comm}}(N)
$$
Progress-median detection separates the degrading device from a dead one; the replace-vs-tolerate call weighs expected slowdown persistence against the restart-plus-replay cost on the right side of the budget above.

## Elastic and Stateless Recovery

Fixed-size recovery waits for spare capacity to restore the original worker count. Elastic recovery relaxes that: a 1,024-GPU job that loses an 8-GPU node keeps **1,016 GPUs, 99.2% of its allocation** *(why it matters: Drop the dead 8-GPU node, keep 1,016: the job resumes at 99.2% of its allocation without waiting for a spare. Capacity traded for interruption time.)*, and resumes on a feasible smaller partition at reduced throughput instead of waiting. The cost is coordinated adaptation: framework, dataloader, and orchestrator must agree on new membership so no sample is lost or double-counted.

Serving plays the same game on a different contract. Training loses time; serving loses requests inside a latency budget. The availability ladder prices replica count directly:

**Eq 7.5 · Replica availability**
$$
A_{\mathrm{service}} = 1 - (1 - A_{\mathrm{replica}})^{R}
$$
At 99% single-replica availability the ladder runs 3.65 days down per year at one replica, 52.6 minutes at two, **31.5 seconds at three** *(why it matters: Availability composes by the exponent. At 99% per replica, annual downtime falls 3.65 days to 52.6 minutes to 31.5 seconds across one, two and three replicas.)*, provided the replicas sit in independent failure domains and each survivor can absorb the dead replica's share. Active-active spends headroom continuously; active-passive spends a whole warm replica. The health-check loop decides removal speed: a 5-second probe, 3-miss threshold pulls a crashed replica from rotation in **12–17 s** *(why it matters: Five-second liveness probes with three consecutive misses declare failure in 12–17 s, the first term of the recovery budget and the cheapest to shrink.)*, and every request routed to it in that window fails or retries inside its own deadline.

![Detection layers](https://benebsworth.com/study/vol2/07-fault-tolerance/diagrams/detection-layers.svg)

*Escalating detection depth: liveness probes catch dead processes, heartbeat timeouts catch hangs, inference checks catch wrong answers, and progress-median comparison catches the straggler that passes every liveness check while halving the job.*
When the failure cannot be masked, degrade on purpose. A model cascade steps down through prepared rungs, ViT-Large at 88% to EfficientNet-B4 to MobileNet, **trading accuracy for survival instead of failing entirely** *(why it matters: Prepared degradation rungs, ViT-Large to EfficientNet to MobileNet trade accuracy for service continuity. The rungs must be designed and drilled, or the degraded path is just a slower outage.)*; feature tiers shed the optional before touching the critical. Both directions share the discipline: the degraded path is designed, monitored, and drilled, or it is just a slower way to be down.

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


---

## Key equations

**Eq 7.1 · Series composition**

$$
\lambda_{\mathrm{GPU\,total}} = \lambda_{\mathrm{gpu}} + \lambda_{\mathrm{pcie}} + \lambda_{\mathrm{power}} + \lambda_{\mathrm{net}}
$$

*Components in series add their failure rates. The prorated per-GPU share of node-level hardware divides a node-wide rate by the GPUs per node, and redundant supplies contribute zero until one failure alone can kill the node.*

**Eq 7.2 · System MTBF**

$$
\mathrm{MTBF}_{\mathrm{system}} = \frac{1}{\lambda_{\mathrm{system}}} = \frac{1}{N \cdot \lambda_{\mathrm{GPU\,total}}}
$$

*Fleet failure rate is the per-GPU total times the device count; the reciprocal is the mean time between failures. 10,000 GPUs at ~3.9e-5 per hour each give a failure every ~3.9 hours; the GPU-only simplification (50,000/10,000) gives 5 hours.*

**Eq 7.3 · Young-Daly interval**

$$
\tau^{*} = \sqrt{2 \cdot T_{\mathrm{write}} \cdot \mathrm{MTBF}}
$$

*The checkpoint interval minimizing expected waste: save too often and write time dominates, too rarely and expected replay dominates. At the optimum the two terms are equal — 24.5 s write at 3.9 h MTBF gives ~14 minutes.*

**Eq 7.4 · Recovery time decomposition**

$$
T_{\mathrm{recovery}} = T_{\mathrm{detect}} + T_{\mathrm{restart}} + T_{\mathrm{load}} + T_{\mathrm{warmup}}
$$

*A failure's cost is the sum of noticing it, replacing the resource, reloading state, and refilling pipelines. The reference budget: ~30 s + ~4 min + ~24.5 s + ~2 min = ~6.6 min per incident.*

**Eq 7.5 · Replica availability**

$$
A_{\mathrm{service}} = 1 - (1 - A_{\mathrm{replica}})^{R}
$$

*Parallel composition for serving: independent replicas compound availability exponentially. At 99% per replica the annual downtime falls 3.65 days -> 52.6 minutes -> 31.5 seconds for 1, 2, 3 replicas, but only if failures are independent and survivors can absorb the load.*

**Eq 7.6 · Straggler step time**

$$
T_{\mathrm{step}}(N) = \max_{i} T_{\mathrm{compute},i} + T_{\mathrm{comm}}(N)
$$

*In synchronous training the slowest rank sets the step for everyone. One half-speed GPU on a 1,024-GPU job halves total throughput (~\$1,024/hour idle), while passing every liveness check — the straggler is invisible to heartbeat detection.*

## From the book

- [Fleet MTBF collapse](https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html) — undefined
- [Failure taxonomy](https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html) — undefined
- [Centralized vs distributed checkpoint writes](https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html) — undefined
- [Epoch fencing during recovery](https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html) — undefined
- [Elastic training recovery](https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html) — undefined
- [Active-active vs active-passive](https://mlsysbook.ai/vol2/07_fault_tolerance/07_fault_tolerance.html) — undefined

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A cluster runs 10,000 GPUs with independent 50,000-hour MTTF each. What is the GPU-only cluster MTBF, and what is the probability that all GPUs are simultaneously operational at a random instant if per-GPU availability is 99.99%?
   - A. 50 hours MTBF; roughly 90.5% simultaneous availability across the fleet.
   - B. 500 hours MTBF; roughly 99.0% simultaneous availability across the fleet.
   - C. 5 hours MTBF; roughly 36.8% simultaneous availability across the fleet.
   - D. 0.5 hours MTBF; roughly 1.0% simultaneous availability across the fleet.

2. Rank these failure classes by how hard they are to detect, easiest first: a process that crashes, a component that answers heartbeats while computing wrong values, a slow rank that passes liveness checks.
   - A. Crash, then slow rank, then wrong-answering component: explicit death signals are easiest, progress anomalies need peer comparison, and Byzantine wrongness defeats every liveness check.
   - B. Wrong-answering component, then crash, then slow rank: corrupted output is caught by checksums before process death can be observed by the timeout mechanism.
   - C. Slow rank, then crash, then wrong-answering component: a straggler trips the same timeout a dead rank does, so it is noticed first.
   - D. Crash, then wrong-answering component, then slow rank: a process exit is caught first, an inference check with a known input catches corrupted results next, and a degraded rank needs step-time medians before anyone calls it a straggler.

3. On a 100,000-GPU cluster, an illustrative SDC rate of 10^-6 events per GPU-hour produces one expected silent-corruption event roughly how often (in hours)?

4. A training cluster quadruples from 1,000 to 4,000 GPUs, cutting system MTBF by 4x while checkpoint write time stays fixed. What does the Young-Daly interval do?
   - A. It quarters: the interval must shrink in direct proportion to MTBF so that expected replay per failure stays constant on a per-device basis.
   - B. It halves: τ* scales as sqrt(MTBF), so a 4x smaller MTBF gives sqrt(1/4) = half the interval, spending proportionally more of the budget on saves.
   - C. It doubles: more frequent failures mean each save amortizes over more incidents, so the formula pushes the interval longer to offset restart costs.
   - D. It stays fixed: checkpoint cadence is set by write time alone, and MTBF only affects how many failures the run actually experiences.

5. A team checkpoints every 30 minutes with asynchronous flushing and promises an RPO of 15 minutes plus a five-minute RTO. Checkpoint reload takes eight minutes. Which contract is broken?
   - A. Neither: service objectives bound the average case, and the average checkpoint age of 15 minutes plus a reload under detection budget keeps both within contract.
   - B. Only the RPO: reload runs inside the same budget window as the rendezvous, so the effective resume delay is the maximum of the load and restart terms rather than their sum, which keeps the five-minute RTO satisfiable under the stated budget.
   - C. Only the RTO: async flushing keeps the durable generation fresh enough to satisfy the 15-minute RPO under any failure pattern.
   - D. Both: the 30-minute interval cannot bound lost progress under 30 minutes (async flushing can leave the newest durable generation older still), and an 8-minute reload alone already exceeds the 5-minute RTO.

6. A distributed sharded checkpoint follows the coordination protocol: request broadcast, barrier at consistent state, shard writes with digests, confirmations, manifest publication, completion broadcast. What does the manifest publication step actually guarantee?
   - A. It atomically marks the generation committed: staged shards without a published manifest are unreachable garbage, and restore accepts only the manifest's recorded step, topology, and digests.
   - B. It confirms every worker wrote the same checkpoint step, so no rank's shard carries updates a peer never applied, and that consistency guarantee is what makes the generation safe to restore across the group.
   - C. It deduplicates the shards so identical tensor slices across workers are stored once, which is where most of the storage saving comes from.
   - D. It compresses the manifest so the coordinator can keep every generation in memory, which is what makes rollback to arbitrary checkpoints cheap.

7. For the chapter's cold-restart budget (~30 s detect, ~4 min restart, ~24.5 s load, ~2 min warmup), which statement about investing in faster checkpoint I/O is correct?
   - A. It only helps cold restart: warm restart keeps weights resident, so faster storage becomes irrelevant once survivor-preserving recovery is deployed.
   - B. It is the highest-value fix in the path: the checkpoint read is the largest single term because 2.45 TB cannot cross the wire faster than aggregate storage bandwidth permits, so halving it removes the dominant share of the 6.6 minutes.
   - C. It attacks the smallest terms: load is ~24.5 s of a ~6.6-minute budget, so halving it saves ~12 s while restart and warmup still dominate: membership and pipeline refill are the real targets.
   - D. It scales with fleet size: at 10,000 GPUs the load term dominates because the aggregate read bandwidth cannot grow with the number of nodes.

8. On a 1,024-GPU synchronous job where a normal step takes 1 second, one GPU thermally throttles to half speed and now takes 2 seconds. AllReduce waits for every rank. By what percentage does cluster throughput drop?

9. A 1,024-GPU job loses an 8-GPU node and no spare capacity exists. A fixed-size policy waits for replacement. What does elastic recovery do instead?
   - A. Migrates the job to a smaller cluster partition: elastic recovery releases the current allocation and requeues at reduced size, because ranks cannot be renumbered inside a live communicator without a full coordinated restart.
   - B. Resumes on the 1,016 survivors at reduced throughput: the job reloads the last consistent checkpoint, re-forms the communicator over the survivors, and redistributes the lost node's work rather than waiting.
   - C. Keeps 1,024 workers by running the failed node's shards in simulation: CPU fallback executes the lost shard at a throughput penalty while hardware is repaired.
   - D. Suspends all ranks until a spare arrives, then resumes mid-step: elasticity is only about the rendezvous and cannot continue with a different worker count.

10. A serving replica has 99% availability (3.65 days down/year). What does adding a second independent replica achieve, and why does the arithmetic understate real deployments?
    - A. 99.999% availability (5.3 min/year): the third nine comes free once the second replica is placed in the same rack for fast failover.
    - B. 99.9% availability (8.8 h/year): each replica adds roughly one nine of availability on top of the previous, so two replicas move the annual downtime budget from days to a few hours rather than minutes.
    - C. 99.5% availability (1.8 days/year): replicas halve downtime linearly, so the second copy cuts the 3.65 days in half.
    - D. 99.99% availability (52.6 min/year): but only if failures are independent: shared power, networking, and software bugs correlate replicas and pull real availability below the ideal.

11. Heartbeat detection uses a timeout of H + k·σ_d. Tightening the safety multiplier k makes detection faster. What does an aggressive threshold actually risk?
    - A. False positives: transient stragglers get classified as fail-stop, triggering unnecessary checkpoint restarts that can waste more compute than the slowdown itself would have cost.
    - B. Detection collapse: below a minimum k the heartbeat channel loses synchronization, so dead workers are never flagged at all.
    - C. SDC amplification: faster timeouts give corrupt workers more chances to flush tainted state to the checkpoint before being fenced.
    - D. Thundering restarts: every worker misses the same tightened window at once, so the recovery pipeline serializes thousands of nearly simultaneous restarts through a single scheduler queue while the checkpoint store saturates.

12. After a crash, the recovery system finds a checkpoint directory whose shard files all look complete but whose manifest was never published. What should it do?
    - A. Publish a manifest retroactively: since the shards are intact, writing the missing manifest recovers the generation at zero cost.
    - B. Accept it when the shard digests verify locally: a generation's validity is a property of its files and their contents, and the manifest exists only as an index that makes lookup and garbage collection cheaper.
    - C. Merge it with the previous generation: combine whatever shards are newest per-file to reconstruct the most recent consistent state.
    - D. Reject it and roll back to the last published generation: the manifest is the commit record, and staged shards without it may be a partial or mixed-step state.

13. An image service degrades through a cascade: ViT-Large (88% acc) → EfficientNet-B4 (19M params) → MobileNet. Under severe load what does the cascade actually buy?
    - A. Higher effective accuracy under load: the smaller rungs ensemble with the primary, and the cascade votes across all three models when the primary saturates, which is where the accuracy gain under pressure comes from.
    - B. Service survival at bounded quality: each rung is a precomputed fallback that trades accuracy for capacity, so requests get an answer instead of an error.
    - C. Faster failover between regions: the cascade is a routing policy that shifts traffic to healthier zones when one region degrades.
    - D. Automatic recovery: the degraded rung keeps serving while the primary restarts, and the cascade is what makes restarts invisible to users.

## Answer key

1. C. MTBF divides by device count: 50,000 / 10,000 = 5 h. Simultaneous availability multiplies: 0.9999^10,000 ≈ 0.368. Both directions of the same multiplication are why a fleet fails routinely even while each part is rare.

2. A. Fail-stop is trivially detectable. Stragglers and gray failures answer every probe while taxing throughput. Byzantine wrongness is hardest because the component is alive and lying: only correctness checks, not liveness, can see it.

3. About every 10 hours. 100,000 GPUs × 10^-6 per GPU-hour = 0.1 expected events per hour → one every ~10 h. On the chapter's 10,000-GPU cluster the same rate gives ~one per 100 h, about 20 events across a three-month run.

   SDC scales with fleet size like any failure rate, but unlike fail-stop it leaves no signal to catch. At ~20 events per run, silent corruption is a standing risk that only check-and-verify defenses can address.

4. B. τ* = √(2·T_write·MTBF): the square-root rule halves the interval on a 4x MTBF cut. The same scaling explains why doubling fleet size raises optimized overhead even after the interval adapts.

5. D. RPO is bounded by the interval (plus flush lag), not the average; RTO is bounded by the slowest single term. The two objectives are hard constraints on the expected-value optimum, not preferences.

6. A. The manifest is two-phase commit applied to checkpointing: shards are prepared, then the manifest's publication is the commit. Consistent-cut correctness comes from the barrier at step boundaries; publication makes the committed set atomic.

7. C. The load term (~24.5 s) is dwarfed by restart (~4 min) and warmup (~2 min). The chapter's point: everyone optimizes the storage path, but the budget is mostly membership, containers, and JIT refill.

8. 50%. The slowest rank sets the step: steps/sec falls from 1/1 s to 1/2 s, so one device (0.1% of the fleet) halves the job's throughput and wastes ~\$1,024/hour of idle compute.

   A synchronous step is a max over ranks, not a sum: one degraded device taxes every healthy peer. This is why progress-median detection matters: the straggler passes every liveness check.

9. B. Elasticity converts a capacity loss into a temporary interruption + reduced throughput (99.2% of devices retained). The catch is coordinated adaptation: framework, dataloader, and orchestrator must agree so no sample is lost or double-counted.

10. D. A_service = 1−(1−A)^R: two 99% replicas give 1−0.01² = 99.99%. The catch is the independence assumption: correlated failures (same rack, same deploy, same bug) make the real gain smaller, which is why placement across failure domains is part of the design.

11. A. The threshold is a classifier, not a free parameter: tightening catches real failures sooner but converts transient jitter into expensive restarts. The right k weighs restart+replay cost against expected slowdown persistence.

12. D. The manifest defines a committed generation; plausible-looking files without it are uncommitted garbage and can be collected. Treating them as valid risks restoring a cut the job never executed.

13. B. Graceful degradation is preplanned quality loss: each rung is smaller and weaker but cheaper, so the service shrinks instead of dropping. It is designed, monitored, and drilled, not emergent from microservices.

## Audio overview

[Listen to the Marcus & Iris read-along (~5 min)](https://benebsworth.com/study-audio/vol2/07-fault-tolerance.m4a) — a generated podcast walking this packet's argument.
