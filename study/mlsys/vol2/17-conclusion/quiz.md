# Conclusion — self-test

1. A team transitions an ML model from single-node workstation experimentation to a multi-data-center production service handling 50,000 queries per second with high-availability and regulatory compliance requirements. Which transition best captures the shift to distributed ML engineering?
   - A. Shifting from PyTorch tensor definitions toward hand-tuned CUDA kernel compilation and register-level arithmetic precision tuning across every accelerator in the serving fleet.
   - B. Extending single-node reasoning about models, data pipelines, execution, and deployment to coupled fleet infrastructure, data center fabrics, distributed protocols, and governance across organizational boundaries.
   - C. Shifting from empirical hyperparameter tuning toward symbolic loss optimization executed across isolated server instances without shared state.
   - D. Shifting from self-supervised pre-training objectives toward supervised fine-tuning loops with curriculum learning, executed on isolated server instances to eliminate inter-node network synchronization requirements entirely.

2. A synchronous distributed training job achieves 94% linear scaling efficiency on 8 GPUs. When scaled to 8,000 GPUs on the same network fabric without changing hyperparameters, scaling efficiency plummets. Which principle explains the drop?
   - A. Communication can dominate, because collective synchronization, fabric contention, and straggler waiting grow with worker count while each device's share of the compute shrinks.
   - B. Failure is routine, because the cluster experiences silent hardware data corruption that forces the optimizer to recalculate gradients on every step.
   - C. Infrastructure determines capability, because 8,000-GPU clusters automatically downclock GPU core frequencies by 60 percent to comply with datacenter power delivery regulations.
   - D. Sustainability is a first-order cost, because thermal throttling occurs only when aggregate cluster power draw exceeds one megawatt at the facility boundary.

3. An inference team profiles an autoregressive LLM decode engine on an H100 and finds realized throughput is only 12% of theoretical FP16 tensor core peak, even though nvidia-smi reports high occupancy. What is the correct diagnosis?
   - A. The GPU arithmetic units are genuinely saturated at peak, and the only remedy is upgrading to an accelerator generation with higher FP16 peak TFLOP/s to unblock the matrix multiplication pipeline end to end.
   - B. The low realized throughput indicates severe GPU thermal throttling under sustained load; the team should increase datacenter cooling capacity and lower clock targets across all the serving hosts in the rack.
   - C. Decode is memory-bandwidth bound because loading the full parameter matrix for a single token yields an arithmetic intensity well below the hardware roofline ridge; occupancy meters reflect activity, not productive arithmetic occupancy.
   - D. High nvidia-smi occupancy proves the compute units are saturated, so the team should convert all model weights to FP32 precision and enlarge the matrix dimensions so arithmetic units process denser numerical work per cycle and the interconnect between devices.

4. Meta documented that training Llama 3 on 16,384 GPUs over 54 days experienced 419 unexpected interruptions, a mean time between failures of approximately 3.1 hours. What is the correct systems response?
   - A. Frontier clusters are poorly engineered, and the correct response is investing in hardware reliability programs until a 16,384-GPU cluster operates continuously for months without a single interruption across every generation of the fleet in production service.
   - B. In synchronous distributed training across thousands of devices, cluster-wide failure is routine and continuous; checkpointing cadence, multi-tier storage offload, and automated recovery are designed as steady-state operation rather than exceptional handling.
   - C. Failures at this scale are primarily caused by syntax and logic bugs inside user-level Python training scripts, so rewriting the distributed training stack in C++ eliminates the bulk of the interruption budget at once.
   - D. Checkpoint overhead can safely be ignored at this cadence, because a 3.1-hour mean time between failures still leaves sufficient windows for manual cluster inspection, diagnosis, and restart between interruptions.

5. A team upgrades training storage to 200 GB/s of sustained read bandwidth per node while the inter-node fabric remains at 25 GB/s per accelerator. Despite the upgrade, step time does not improve, and matched traces show accelerators still stalling. Why?
   - A. The matched traces identify exposed gradient transfer as the critical-path constraint; increasing already sufficient storage bandwidth does not shorten that transfer, because the binding constraint sat in the fabric all along.
   - B. Storage read bandwidth is only consumed during checkpointing, so data loader throughput has zero impact on training iteration rate in any architecture.
   - C. Upgrading storage bandwidth beyond 100 GB/s triggers automatic PCI Express bus arbitration throttles inside the host controllers that disable GPU tensor core pipelines whenever collective communication operations are in flight.
   - D. Vision transformers cannot ingest training samples at rates exceeding 10 GB/s due to algorithmic limits inside the self-attention mechanism itself.

6. The chapter maps the volume's three running archetypes to representative constraints within the C3 taxonomy (compute, communication, coordination). Which mapping is correct?
   - A. Archetype A binds on compute inside the matrix arithmetic of its attention layers; Archetype B binds on communication across inter-data-center WAN bandwidth between replicas; Archetype C binds on compute inside edge tensor units that lack the throughput for local training in each participating round of training end to end.
   - B. Archetype A binds on coordination in scheduler dispatch latency across its pipeline stages; Archetype B binds on compute in the dense embedding multiplication kernels; Archetype C binds on communication in the datacenter fabric collectives that aggregate client updates.
   - C. Archetype A binds on compute inside its floating-point tensor cores during prefill; Archetype B binds on compute inside the embedding lookup arithmetic itself; Archetype C binds on communication in wide-area transfer of full model weights each round.
   - D. Archetype A (GPT-4/Llama-3 class) binds on communication through gradient synchronization and activation transfer; Archetype B (DLRM at scale) binds on coordination through multi-terabyte embedding sharding and AllToAll routing; Archetype C (federated mobile) binds on coordination across intermittently available devices.

7. An engineer tunes a 2,048-accelerator Ring AllReduce collective around its bandwidth transfer model, chooses how to partition the model across devices, and designs checkpoint recovery for routine failure. Which band of the fleet stack does this work belong to?
   - A. Model architecture research, because partitioning decisions and collective tuning modify the effective loss landscape, attention head dimensions, and gradient statistics the model experiences during the design process.
   - B. Data curation engineering, because it filters low-quality web crawl text and deduplicates document tokens before training starts.
   - C. The Distribution band, because it makes a workload larger than any single machine behave as one coordinated system while designing for routine hardware failure.
   - D. Compliance legal auditing, because it verifies intellectual property licensing terms for the training datasets used across the fleet.

8. A production recommender maintains a green operational dashboard, meeting its p99 latency SLO and availability target continuously for six months, yet business metrics show click-through rate declined 18 percent over the same period. What does this illustrate?
   - A. Any 18 percent drop in click-through rate indicates that the underlying network switches are silently dropping TCP packets during feature retrieval calls.
   - B. A 45 ms latency is too fast for human perception, which causes users to distrust the recommendations and reject the items presented to them.
   - C. The serving system is operating correctly, and click-through rate is an unmeasurable business-side vanity metric that has no engineering relation to machine learning systems discipline or operational responsibility.
   - D. Production operations requires continuous monitoring of data and concept drift alongside performance health; a service that serves stale or degraded predictions at low latency meets its contract while failing its purpose.

9. A team doubles its training cluster and finds that realized speedup falls far short of the ideal halving of step time. Under the Fleet Law, which terms can account for the gap without any hardware malfunction?
   - A. Exposed communication, synchronization waiting, and interruption exposure all grow with device count or depend on configuration, while only the ideal compute term shrinks by construction.
   - B. Only the compute term varies with device count under the Fleet Law, so any realized shortfall below ideal speedup must indicate defective accelerators, degraded HBM, or misconfigured clock speeds in the newly provisioned hardware.
   - C. The memory bandwidth of each individual accelerator degrades automatically when more than one thousand devices share the same job scheduler.
   - D. Scaling laws guarantee linear speedup for any workload below ten thousand accelerators, so the measurement itself must be erroneous.

10. Doubling a reference cluster from 1,024 to 2,048 GPUs halves ideal step time, yet checkpoint overhead rises from 1.7 to 2.4 percent and accelerator-hours slightly increase even at perfect speedup. What does the chapter conclude from this arithmetic?
    - A. Cluster expansion is always a mistake because efficiency falls, so fleets should remain at whatever size the last training run used.
    - B. A fleet expansion raises two linked decisions — whether to accept the larger training job and whether to release the model it produces — and each needs its own evidence; the arithmetic informs the decision but cannot make it.
    - C. The rise in checkpoint overhead proves the Young-Daly square-root approximation breaks down above one thousand accelerators, so checkpointing should be abandoned entirely in favor of full replication of every training job.
    - D. The efficiency loss is offset automatically because larger clusters attract volume discounts on accelerator procurement and facility power contracts.

11. Why does the chapter warn that optimizing one layer can be dangerous even when its own measurement improves?
    - A. Because measurement instruments themselves consume accelerator cycles and memory bandwidth, any instrumentation added to observe one layer necessarily slows every other layer of the system in exact proportion to what it measures at every step of the pipeline.
    - B. Because local improvements move cost to layers nobody is measuring: larger batches raise occupancy while worsening tail latency, compression cuts communication while raising accuracy risk, and carbon-aware scheduling lowers emissions while consuming service slack.
    - C. Because optimization techniques documented in systems research papers almost never transfer to production infrastructure with real traffic patterns, making every local improvement effectively illusory by the time it ships.
    - D. Because improving the performance of any single layer violates the end-to-end encryption and attestation requirements that fleet compliance frameworks impose on all inter-service communication paths by default.

12. What does the chapter claim survives the replacement of today's specific processors, frameworks, and serving engines?
    - A. Nothing survives, because every fleet-scale lesson is tied to the specific hardware generation and software stack in which it was learned and must be relearned from scratch with each successive generation.
    - B. Only the programming language bindings survive, since the dominance of Python in machine learning effectively guarantees API-level stability for training and serving code across all future hardware generations.
    - C. The durable relationships: data must reach compute at the required rate, workers must communicate before synchronization stalls the job, failures must be expected at large component counts, serving must meet tail budgets, and governance must be engineered into the operating path.
    - D. Only the vendor-specific tuning parameters survive, because accelerator architectures never change their fundamental memory hierarchies, interconnect topologies, or collective semantics across successive product generations or power delivery envelopes or thermal management approaches.

13. A serving request fans out to 50 leaf servers. Each leaf independently responds within its fast envelope 99 percent of the time. What is the probability that at least one leaf responds slowly, forcing the request to wait?

14. A colleague proposes solving their fleet's problems once and for all by buying faster accelerators, arguing that compute is the root constraint and everything else is detail. Using the Fleet Law and the six principles, explain in plain language why this reasoning fails, and walk through what would actually happen as each layer got faster.

## Answer key

1. B. Distributed ML engineering extends the single-node foundation to shared infrastructure, distributed protocols, and governance across a fleet. Coupling that crosses machines, teams, and operating boundaries is what separates the two disciplines.

2. A. The Fleet Law's compute term shrinks with device count while communication, synchronization, and straggler exposure carry no such guarantee. At 8,000 devices the non-compute terms dominate the step.

3. C. At batch size one, each parameter costs bytes of memory traffic for minimal arithmetic, far below the energy and roofline crossovers. Infrastructure determines capability: the memory system, not the tensor cores, sets the rate.

4. B. Failure is routine: job MTBF is component reliability divided by component count, and no realistic hardware improvement changes the order of magnitude at 16,384 devices. Recovery machinery is part of normal operation, priced into the Fleet Law's interruption term.

5. A. Expect bottlenecks to migrate: an optimization judged only by the term it shrinks leaves the step no faster when the constraint actually lives in another layer. Rates must be matched to workload demand, not maximized in isolation.

6. D. No corner of the taxonomy dominates. Each archetype was characterized by its binding term, and following each up the fleet stack shows what every band adds to that first characterization.

7. C. The Distribution band partitions, synchronizes, and recovers work across the fleet. Collective tuning, parallelism strategy, and failure design are its core concerns, inheriting rates from the physical substrate below.

8. D. Serving is bounded by its contract, but the contract includes prediction quality on live distributions, not only latency and availability. Dashboards green while quality decays is the silent-failure pattern of the robustness chapter.

9. A. The Fleet Law decomposes step time into ideal compute over N plus communication, synchronization, and interruption terms. The first shrinks by construction; the others depend on partition, schedule, and component count.

10. B. Capability and efficiency move in opposite directions. The scaling curve estimates what growth buys and the Fleet Law prices it; accepting the job and releasing the model are separate decisions with separate evidence.

11. B. The displacement of overhead must stay visible. A transferred constraint that nobody measures becomes a hidden bottleneck the system inherits rather than chooses.

12. C. The technology names are examples. The rate, failure, and accountability relationships are the lesson, and they govern workloads and substrates that are only now emerging.

13. The probability that every leaf is fast is 0.99^50 ≈ 0.605. So the probability of hitting at least one slow leaf is 1 − 0.605 ≈ 0.395, about 40 percent. At 100 leaves the same arithmetic gives 63 percent. Tail exposure is structural: it grows with the fan-out even when every individual component behaves well, which is why headroom and hedging are line items rather than luxuries.

    The probability that every leaf is fast is 0.99^50 ≈ 0.605. So the probability of hitting at least one slow leaf is 1 − 0.605 ≈ 0.395, about 40 percent. At 100 leaves the same arithmetic gives 63 percent. Tail exposure is structural: it grows with the fan-out even when every individual component behaves well, which is why headroom and hedging are line items rather than luxuries.

14. The proposal assumes the binding constraint is fixed, but the Fleet Law says step time is a sum: ideal compute over device count plus communication, synchronization, and interruption exposure. Faster accelerators shrink only the first term. The step then finishes its arithmetic sooner and waits on the same congested collective, so the fabric becomes binding. Upgrade the fabric and the checkpoint machinery becomes the long pole, because failure cadence scales with component count and recovery time does not shrink with compute. Fix recovery and the serving contract binds: tail latency across a fan-out is structural probability, not hardware speed. Fix serving and the governance obligations bind, because evidence paths and accountability decide whether the service may run at all. This is the migration of bottlenecks: the constraint never disappears, it moves to whichever layer was not optimized. The correct method is to measure which layer binds now, price the improvement across every term it touches, and expect the constraint to move, because the scaling laws keep growing demand back into whatever slack the engineering creates.

    The proposal assumes the binding constraint is fixed, but the Fleet Law says step time is a sum: ideal compute over device count plus communication, synchronization, and interruption exposure. Faster accelerators shrink only the first term. The step then finishes its arithmetic sooner and waits on the same congested collective, so the fabric becomes binding. Upgrade the fabric and the checkpoint machinery becomes the long pole, because failure cadence scales with component count and recovery time does not shrink with compute. Fix recovery and the serving contract binds: tail latency across a fan-out is structural probability, not hardware speed. Fix serving and the governance obligations bind, because evidence paths and accountability decide whether the service may run at all. This is the migration of bottlenecks: the constraint never disappears, it moves to whichever layer was not optimized. The correct method is to measure which layer binds now, price the improvement across every term it touches, and expect the constraint to move, because the scaling laws keep growing demand back into whatever slack the engineering creates.
