# Vol II · Ch1: Introduction: self-test

1. A team scales a well-tuned training run from 8 accelerators to 25,000. Per-device arithmetic throughput stays constant, yet end-to-end wall-clock time per step worsens. What best explains it?
   - A. The aggregate activation footprint exceeded HBM on some devices, forcing recomputation that added per-step time.
   - B. Stragglers, synchronization barriers, communication overhead and failures scale with device count.
   - C. The optimizer's convergence rate degraded because the effective batch size grew past the point of stable updates.
   - D. Interconnect bisection bandwidth physically saturates once cluster size grows past a few hundred nodes.

2. One worker runs 10% slower than its peers. Contrast the cost of that straggler in a 1,000-worker MapReduce job versus a 1,000-accelerator synchronous training step.
   - A. MapReduce loses ten percent of one task's output; the training step loses ten percent of every worker's cycle time.
   - B. Both lose about ten percent of total wall-clock, the straggler effect is identical across parallel systems.
   - C. MapReduce can reassign or retry the slow task on spare capacity; the synchronous step has no spare capacity, so every worker waits.
   - D. The synchronous step actually absorbs the straggler inside the gradient-exchange window, so only MapReduce is measurably delayed by a ten percent slowdown.

3. A synchronous job runs on 16,000 accelerators, each with an MTTF of 50,000 hours, failures independent. About how many hours between job-level interruptions should the scheduler plan for? (Give a number, one decimal allowed.)

4. An instrumented step takes 1.9 s: 1.1 s local compute, 0.45 s gradient exchange, 0.35 s coordination (bubble + barrier). What fraction of the step is non-compute time, as a percentage?

5. An organization has a 512-GPU cluster for two weeks and a domain corpus of 5 billion tokens. What evidence is needed to choose between a larger model and more training tokens?
   - A. The cluster's interconnect topology and bisection bandwidth, since at this scale the collective communication term always dominates the step time regardless of model choice.
   - B. Whether the corpus is at least the compute-optimal size for the candidate parameter count, roughly twenty tokens per parameter, otherwise the larger model is under-trained.
   - C. The peak FLOP/s rating of the GPUs on the cluster, because achievable compute over the fixed two-week window fixes the viable model size directly and settles the tradeoff.
   - D. The tokenizer's vocabulary size and the resulting embedding-table parameter share, which set the floor of parameters that dominate the achievable loss on this corpus.

6. An operator claims upgrading per-node availability from 99.9% to 99.99% makes an unreplicated 10,000-node all-up requirement acceptable. What does the arithmetic say?
   - A. Wrong: availability adds rather than multiplies, 10,000 nodes times 0.01 percent expected downtime is the quantity that matters either way, so the upgrade changes little about the all-up picture.
   - B. Correct: 0.9999^10,000 is about ninety percent availability, so going from three nines to four roughly fixes the all-up availability problem for any practical deployment horizon.
   - C. Correct under independence, correlated failures across racks and rows are what actually make four nines insufficient here, not the quoted per-node availability figure.
   - D. Wrong but directionally right: 0.9999^10,000 ≈ 37% versus ~0.005% at three nines, better, still unusable; the fix must remove N from the exponent via checkpointing or replication.

7. The chapter describes D·A·M (Data, Algorithm, Machine) as the nouns of the workload and C³ (Compute, Communication, Coordination) as the verbs. What does the projection buy you in practice?
   - A. A diagnosis axis: every optimization relieves exactly one C, so you identify which term binds before choosing the lever, a faster chip relieves only Compute.
   - B. A taxonomy for procurement: it sorts accelerator SKUs, fabric options and orchestration tooling into the three budget categories a fleet needs, which simplifies quarterly capacity reviews.
   - C. A proof that coordination dominates at scale, so orchestration tooling, scheduling research and elastic-training infrastructure should get the largest share of the budget.
   - D. A mapping that replaces the iron law from volume one entirely, since the three C terms decompose execution time along the same axis the iron law already covered.

8. A job's global batch is fixed. Moving from 1,024 to 8,192 GPUs drops per-replica sequences from 96 to 12 while the per-replica exchange payload stays similar. What happens to the job's position relative to fabric balance?
   - A. Nothing changes, fabric balance is a property of the interconnect hardware and topology, not of how the global batch happens to divide across replicas at runtime.
   - B. It moves toward compute-bound, because each replica now has fewer sequences of work per step and can finish its local forward-backward pass sooner.
   - C. It moves ~8× closer to the network wall: local FLOPs per step fall 8× while exchange bytes do not, so communication intensity climbs with fleet size.
   - D. It stays fixed as long as the collective algorithm, the ring or tree shape, and the interconnect line rate all remain unchanged between the two configurations.

9. An infrastructure team argues the fleet stack's four bands, Infrastructure, Distribution, Serving, Governance, can be optimized in complete isolation. What is the strongest counterargument?
   - A. The four bands share a single power delivery envelope at campus scale, so the facility's hundred-megawatt energy ceiling forces joint planning across all of them regardless of org charts.
   - B. Distribution's parallel strategy determines the traffic Infrastructure's fabric must carry, and Governance's checkpoint policy determines the reliability Serving can promise, decisions cross band boundaries.
   - C. Only the Serving band faces users directly and owns the latency budget, so isolated optimization of the other three bands is actually correct and avoids cross-team coordination tax.
   - D. The bands cannot be optimized in isolation because they share the same physical building, the same cooling loop, the same power feeds, and ultimately the same on-call rotation.

10. A colleague reads 'loss falls as a power law in compute' and concludes any fixed budget doubling halves some fixed amount of loss, forever. Explain to them what a fitted power law actually promises, and where it stops.

11. Explain, using the straggler, the barrier and the failure-rate arithmetic, why 'a 25,000-GPU job is just 25,000 servers' fails as a mental model.

## Answer key

1. B. A synchronous step makes every device part of everyone's critical path: the slowest worker sets the step, the barrier serializes exchange, and job-level interruptions arrive at rate N/MTTF. Per-device throughput staying flat says nothing about the three fleet terms that grew.

2. C. Work stealing needs slack, a slow task must have somewhere else to go. The barrier at the end of a synchronous step removes that slack: there is no task to reassign, every worker waits for the slowest, and the whole fleet pays one device's slowdown.

3. MTBF_fleet ≈ 50,000 / 16,000 ≈ 3.1 hours, accept ~3.1 (3–3.5 reasonable). This matches Meta's Llama 3 record almost exactly: 419 interruptions in a 54-day snapshot on 16,384 H100s, about one every 3.1 hours.

4. (0.45 + 0.35) / 1.9 = 0.80 / 1.9 ≈ 42%. That non-compute share is the part fleet growth taxes first, it is why scaling out buys less than a proportional speedup.

5. B. Compute-optimal allocation (Chinchilla) pairs parameters with tokens, ~20 tokens per parameter at the optimum. 5B tokens supports roughly a 250M-parameter optimum, far below typical frontier sizes; a larger model would be under-trained at the same compute. The check is tokens vs parameters, not hardware.

6. D. A^N is brutal: four nines buys e^−1 ≈ 37%, three nines buys e^−10 ≈ 0.005%. Improving A helps exponentially less than shrinking the exponent, checkpointing, replication and restartable steps remove the all-up requirement rather than chase nines.

7. A. C³ mirrors the fleet law's three terms: Compute = local arithmetic, Communication = bytes exchanged, Coordination = barriers/bubbles/scheduling. Naming which C binds tells you which lever can help; buying Compute for a Communication problem wastes the budget.

8. C. CI = bytes exchanged / local FLOPs. At fixed global batch, F_local falls ~1/N but B_exch does not, so CI rises ~linearly with N. The same job at 8× the fleet is a different network-pressure regime, fleet size is a communication decision.

9. B. The bands trade constraints, not just share a building: the chosen parallel strategy sets bisection-bandwidth demand, the checkpoint policy sets recovery time the serving tier can promise, and power allocation links silicon choice to cluster size. Optimizing a band without its neighbors' constraints wastes budget at the interfaces.

10. The law is empirical, not derived: L = a·C^(−α) with a small fitted α, so each order of magnitude buys a fixed, modest loss improvement, not a halving. It held across orders of magnitude, which makes it a planning instrument, but it breaks at regime changes: data exhaustion means extra parameters have nothing new to fit, distribution shift changes the problem, and the fitted exponent need not hold outside the measured range. Efficiency work shifts the constant, not the exponent.

11. Independent servers share nothing; a synchronous training fleet shares everything every step. The barrier makes the slowest worker everyone's latency, a straggler taxes all 25,000. Job-level failures arrive at rate N/MTTF, so a device that fails every ~5.7 years produces an interruption every ~2 hours. And the network is a shared, contended resource, not a per-server detail. The fleet is one computer with 25,000 ways to be slow or broken, not 25,000 computers.
