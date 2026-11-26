---
title: "Conclusion — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/17_conclusion/17_conclusion.html"
canonical_url: "https://benebsworth.com/study/vol2/17-conclusion/"
---

# Conclusion: Study Packet

A team doubles its training cluster from 1,024 to 2,048 accelerators to chase the next point on a scaling curve. Ideal arithmetic time per step halves. Yet the job's mean time between failures drops from 48.8 hours to 24.4, checkpoint overhead climbs from 1.7 to 2.4 percent, and even at perfect step speedup the run consumes slightly more accelerator-hours than before. Did the fleet grow?

## Thesis

This volume opened with the scale moment: the transition where the binding constraint leaves the node and moves into the fabric, the recovery machinery, the service contract, and the obligations that decide whether the service may run at all. Sixteen chapters later the claim can be stated precisely. **Scale creates qualitative change because every layer of the fleet can bind the whole system, and the binding constraint never disappears; it moves.** A faster accelerator finishes local work sooner and leaves the job waiting on the same congested collective. The six principles of this chapter are not practices or advice. They are statements of what the fleet's physical and institutional structure makes true, whatever anyone prefers.

## Six Principles, Six Questions

Each principle pairs a governing question with the metric that tests it and the practice it makes necessary:

1. **Infrastructure determines capability.** What is possible? Memory capacity, bisection bandwidth, and the power envelope limit feasible configurations before any algorithmic choice matters. Accelerators the data pipeline cannot feed sit idle regardless of peak rate.
2. **Communication can dominate.** What is the bottleneck? Exposed communication and scaling efficiency, measured on the synchronous step's critical path, never inferred from byte volume alone.
3. **Failure is routine.** How do we recover? MTBF divided by component count, checkpoint overhead, rollback time. Meta's Llama 3 training documented 419 unexpected interruptions across 54 days on 16,384 GPUs, one failure roughly every three hours.
4. **Serving is bounded by its contract.** What reaches the user in time? Goodput, tail latency within the SLO, cost per request.
5. **Responsibility constrains design.** Who is affected? Privacy budget, subgroup error rates, audit trails.
6. **Sustainability is a first-order cost.** What is the cost? Energy per training run, energy per query, carbon.

![Six principles, six questions](https://benebsworth.com/study/vol2/17-conclusion/diagrams/six-principles.svg)

*Each principle pairs a governing question with the metric that tests it. Infrastructure, communication, failure, serving contract, responsibility, sustainability — the fleet can bind at any layer.*
The principles explain why their paired practices are necessary rather than prudent. Because failure at scale is routine, recovery must be budgeted as normal operation. Because the bottleneck migrates whenever one term shrinks, an optimization judged only by the term it shrinks can leave the step no faster.

## The Fleet Law Prices Growth

**Eq 1 · The Fleet Law**
$$
T_{\mathrm{step}}=\frac{T_{\mathrm{compute}}}{N}+T_{\mathrm{comm}}(N)+T_{\mathrm{sync}}(N)+T_{\mathrm{interruption}}(N)
$$

The Fleet Law is the distributed counterpart of the single-machine iron law. Scaling laws set the demand for fleet growth; the Fleet Law sets its price. Increasing device count reduces the ideal compute term for fixed work, while communication, synchronization, and interruption exposure carry no such guarantee. Within a fixed facility, the power and cooling envelope does not grow with the job, and a successful model pays its serving cost for as long as it runs.

Growth can break on either side. On the model side, extrapolating a fitted quality curve becomes unreliable when capacity outgrows available tokens or added data stops supplying new information. On the systems side, the scaling wall marks where added communication and coordination consume the compute time that added accelerators save.

**Eq 5 · The scaling wall**
$$
\mathrm{speedup}(N)=\frac{T_{\mathrm{step}}(1)}{T_{\mathrm{step}}(N)}<N\quad\text{whenever}\quad T_{\mathrm{comm}}+T_{\mathrm{sync}}+T_{\mathrm{interruption}}>0
$$
 **The scaling curve estimates what growth buys; it does not oblige anyone to buy it.**

**Eq 2 · Job MTBF under expansion**
$$
\mathrm{MTBF}_{\mathrm{job}}=\frac{\mathrm{MTTF}_{\mathrm{gpu}}}{N}\quad\Rightarrow\quad 48.8\,\mathrm{h}\xrightarrow{N\times 2}24.4\,\mathrm{h}
$$

The doubling example makes the arithmetic concrete. Doubling the reference cluster from 1,024 to 2,048 GPUs halves ideal step time and halves the job's mean time between failures in the same motion, because failure exposure scales with component count. Checkpoint overhead grows from 1.7 to 2.4 percent under the Young-Daly approximation, since optimal checkpoint frequency rises with the square root of the failure rate.

**Eq 3 · Checkpoint overhead growth**
$$
\mathrm{overhead}\approx\sqrt{\frac{2\,T_{\mathrm{write}}}{\mathrm{MTBF}_{\mathrm{job}}}}\quad\Rightarrow\quad 1.7\%\xrightarrow{N\times 2}2.4\%
$$
 The break-even condition is harsh: the doubling pays only if realized step speedup exceeds roughly 1.01x after overheads, and even at the ideal 2x step speedup, total accelerator-hours slightly increase.

The fleet grew in capability while shrinking in efficiency, and **whether that trade is worth making is a decision the arithmetic informs but cannot make.**

![The doubling arithmetic](https://benebsworth.com/study/vol2/17-conclusion/diagrams/expansion-arithmetic.svg)

*Doubling the cluster halves ideal step time and halves job MTBF in the same motion. Checkpoint overhead climbs; accelerator-hours rise even at perfect speedup. Capability and efficiency move in opposite directions.*

**Doubling the cluster: what halves and what grows**

| quantity | 2,048 vs 1,024 GPUs |
|---|---|
| ideal step time | 50 |
| job MTBF | 50 |
| checkpoint overhead | 141 |
| accelerator-hours | 100.7 |

*Ideal step time halves while failure exposure doubles and checkpoint overhead climbs with the square root of fleet size. Normalized to the 1,024-GPU baseline.*

## Stragglers and Tails Are Structural

Two probability facts close the systems side. In a barrier-synchronized step, a single worker running at reduced speed degrades the whole step: the illustrative 8,000-worker case loses twenty percent of throughput to one slow worker, because speeding the workers already waiting at the barrier does nothing.

**Eq 6 · Barrier step time**
$$
T_{\mathrm{step}}=\max_{i\in 1..N}\,T_{\mathrm{worker}}^{(i)}
$$
 In serving, fan-out multiplies tail exposure.

**Eq 4 · Fan-out tail exposure**
$$
\Pr(\text{tail hit})=1-(0.99)^{100}\approx 0.63
$$


**Fan-out tail exposure by leaf count**

| leaves in fan-out | tail-hit probability |
|---|---|
| 1 leaf | 1 |
| 10 leaves | 9.6 |
| 50 leaves | 39.5 |
| 100 leaves | 63.4 |

*Probability of hitting at least one slow leaf when every leaf is fast at its own ninety-ninth percentile. Exposure is structural and grows with the fan-out.*

A request fanning out to a hundred leaf servers, each fast at its ninety-ninth percentile, still hits a slow leaf roughly sixty-three percent of the time. Neither fact is a defect anyone introduced. They are what the structure costs, and they are why headroom, hedging, and the straggler-tolerant schedule are line items rather than luxuries.

## No Corner of the Taxonomy Dominates

The volume's three lighthouse archetypes stress different corners of the compute-communication-coordination taxonomy. Archetype A, the frontier transformer, binds on communication through gradient synchronization and activation transfer. Archetype B, the recommendation model at scale, binds on coordination through multi-terabyte embedding sharding and AllToAll routing. Archetype C, federated mobile training, binds on coordination of a different kind, across millions of intermittently available devices that keep data local.

![The constraint migrates](https://benebsworth.com/study/vol2/17-conclusion/diagrams/constraint-migration.svg)

*Each optimization shrinks one term and exposes the next. Compute gives way to fabric, fabric to recovery, recovery to serving tail, serving tail to governance. The binding constraint never disappears; it moves.*
Followed up the fleet stack, each archetype needed every band: the physical substrate supplies rates the distribution band inherits, serving converts coordinated execution into a contract, governance decides whether the service may run.

Training throughput therefore does not establish that a model will meet live latency, recovery, security, subgroup, and carbon requirements. **A fleet expansion raises two linked but separate decisions: whether to accept the larger training job, and whether to release the model it produces. Each needs its own evidence.**

## The Constraint Moves Next

![The fleet stack](https://benebsworth.com/study/vol2/17-conclusion/diagrams/fleet-stack.svg)

*Physical substrate, distribution band, serving band, governance band. Each layer supplies the rates and obligations the next inherits.*
Test-time compute already moves part of the scaling curve from the training cluster into the serving path, where it is priced as a per-request compute budget. New interconnect and packaging substrates change the rates every Fleet Law term inherits. Tensor parallelism issues frequent collectives across partitioned tensors; mixture-of-experts routing issues an AllToAll dispatch at each expert layer. Each shift relocates cost without exempting it from the law.

The durable relationships outlive today's hardware names. Data must reach compute at the required rate. Workers must communicate before synchronization stalls the job. Failures must be expected at large component counts. Serving must meet tail budgets. Governance must be engineered into the operating path. The technology names are examples; the rate, failure, and accountability relationships are the lesson.

## Fallacies and Pitfalls

*A faster model is automatically a better system.* Kernel speed is one term in the Fleet Law. A faster kernel on every worker but the straggler leaves the step unchanged, and a design that reduces kernel time while raising checkpoint pressure, network contention, serving variance, or governance risk makes the total system worse. The question is useful throughput under actual constraints.

*Optimizing one layer is safe if the measurement improves.* A local improvement becomes dangerous when it moves cost to a layer nobody measures. Larger batches raise occupancy while worsening tail latency; compression reduces communication while raising accuracy risk; carbon-aware scheduling lowers emissions while consuming slack in the service budget. The displacement of overhead must stay visible.

*Fleet-scale lessons are tied to today's stack.* Processors, frameworks, and serving engines will change. The relationships among rates, failure counts, tail probabilities, and accountability obligations will not.

*Governance and sustainability are external reviews.* Retrofitting audit trails, deletion workflows, or carbon-aware placement after deployment means reconstructing evidence or redesigning components. Identifying obligations during design is architectural work, and postponing it is architectural debt.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Llama 3 interruptions | 419 in 54 days | One failure every ~3.1 hours on 16,384 GPUs |
| Cluster doubling | 1,024 → 2,048 GPUs | Job MTBF 48.8 h → 24.4 h |
| Checkpoint overhead growth | 1.7% → 2.4% | Young-Daly frequency grows with sqrt of failure rate |
| 175B checkpoint size | 2.45 TB at 14 B/param | Write takes ~24.5 s |
| Expansion accelerator-hours | +0.7% at ideal speedup | Efficiency falls even when speedup is perfect |
| Fan-out tail exposure | 63% at 100 leaves | Each leaf fast at its own p99 |
| Straggler throughput loss | 20% at 8,000 workers | One slow worker, barrier-synchronized step |
| Llama 3 vs reference cluster | 16x | 16,384 vs 1,024 GPUs |

## Glossary

- **binding constraint**: the layer whose rate currently limits the whole system; it migrates whenever any term shrinks.
- **C³ taxonomy**: the compute-communication-coordination framing that classifies what a workload stresses.
- **exposed communication**: collective transfer time that overlap cannot hide, measured on the step's critical path.
- **fan-out tail exposure**: the multiplication of tail latency probability across parallel leaf servers in a request fan-out.
- **fleet law**: the distributed step-time identity: ideal compute over device count plus communication, synchronization, and interruption exposure.
- **fleet stack**: the layered organization of distributed ML systems into physical substrate, distribution band, serving band, and governance band.
- **lighthouse archetype**: one of the volume's three running workloads, each stressing a different corner of the taxonomy.
- **scale moment**: the transition where the binding constraint leaves the single node and enters shared infrastructure.
- **scaling wall**: the point where added communication and coordination consume the compute time added accelerators save.
- **test-time compute**: per-request inference computation that moves part of the scaling curve into the serving path.
- **Young-Daly interval**: the checkpoint cadence approximation optimal under independent failures, scaling with the square root of write cost over failure rate.

## Open questions

1. Which of the six principles is currently binding in your fleet, and what measurement would prove it?
2. If your cluster doubled tomorrow, which term of the Fleet Law would consume the gain first?
3. Which governance obligation in your systems is currently an external review rather than an engineered path?


---

## Key equations

**Eq 1 · The Fleet Law**

$$
T_{\mathrm{step}}=\frac{T_{\mathrm{compute}}}{N}+T_{\mathrm{comm}}(N)+T_{\mathrm{sync}}(N)+T_{\mathrm{interruption}}(N)
$$

*The distributed counterpart of the single-machine iron law. Only the first term falls with device count by construction; the other three depend on partition, schedule, and component count and carry no such guarantee.*

**Eq 2 · Job MTBF under expansion**

$$
\mathrm{MTBF}_{\mathrm{job}}=\frac{\mathrm{MTTF}_{\mathrm{gpu}}}{N}\quad\Rightarrow\quad 48.8\,\mathrm{h}\xrightarrow{N\times 2}24.4\,\mathrm{h}
$$

*Job-level failure cadence is component reliability divided by component count. Doubling the reference cluster halves ideal step time and halves the mean time between interruptions in the same motion.*

**Eq 3 · Checkpoint overhead growth**

$$
\mathrm{overhead}\approx\sqrt{\frac{2\,T_{\mathrm{write}}}{\mathrm{MTBF}_{\mathrm{job}}}}\quad\Rightarrow\quad 1.7\%\xrightarrow{N\times 2}2.4\%
$$

*Optimal checkpoint frequency rises with the square root of the failure rate, so overhead grows with the square root of fleet size. The 175B checkpoint is 2.45 terabytes at 14 bytes per parameter and takes about 24.5 seconds to write.*

**Eq 4 · Fan-out tail exposure**

$$
\Pr(\text{tail hit})=1-(0.99)^{100}\approx 0.63
$$

*A request fanning out to a hundred leaf servers, each fast at its own ninety-ninth percentile, still hits a slow leaf almost two-thirds of the time. Tail exposure is structural, not a defect.*

**Eq 5 · The scaling wall**

$$
\mathrm{speedup}(N)=\frac{T_{\mathrm{step}}(1)}{T_{\mathrm{step}}(N)}<N\quad\text{whenever}\quad T_{\mathrm{comm}}+T_{\mathrm{sync}}+T_{\mathrm{interruption}}>0
$$

*Scaling efficiency falls below linear whenever any non-compute term is positive, and the wall arrives where added coordination consumes the compute time added accelerators save. Growth can also break on the model side, when capacity outgrows tokens or data stops adding information.*

**Eq 6 · Barrier step time**

$$
T_{\mathrm{step}}=\max_{i\in 1..N}\,T_{\mathrm{worker}}^{(i)}
$$

*A barrier-synchronized step finishes when its slowest worker finishes. One worker at reduced speed degrades the whole step, and speeding the workers already waiting at the barrier does nothing: the illustrative 8,000-worker case loses twenty percent of throughput to a single straggler.*

## From the book

- [undefined](https://mlsysbook.ai/vol2/17_conclusion/17_conclusion.html) — undefined

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

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

## Audio overview

[Listen to the Marcus & Iris read-along (~11 min)](https://benebsworth.com/study-audio/vol2/17-conclusion.m4a) — a generated podcast walking this packet's argument.
