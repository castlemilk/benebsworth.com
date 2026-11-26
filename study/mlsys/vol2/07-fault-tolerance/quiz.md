# Fault Tolerance

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
