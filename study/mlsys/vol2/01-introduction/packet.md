---
openingQuestion: "Your 1,024-GPU training job runs 8.71-second steps: 7.25 s of compute, 0.53 s of pipeline bubble, 0.93 s of gradient exchange. Leadership asks whether doubling to 2,048 GPUs halves your time-to-train. What do you tell them?"
---

# Introduction: Study Packet

*Working through [Introduction](https://www.mlsysbook.ai/vol2/01_introduction/01_introduction.html), chapter 1 of Machine Learning Systems volume II, Scaling Machine Learning Systems, by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The machine is the fleet.** Volume I optimized one machine at a time: a laptop, an accelerator, a serving replica. This volume opens the moment a run outgrows one box, and the rules change. A synchronous training step makes thousands of accelerators behave as a single computer whose pace is set by ==the slowest worker and the shared fabric=={In a synchronous step every worker must exchange gradients before the next step starts, so one straggler delays the whole fleet and one failure interrupts it. The 8.71-second step above spends 17% of its time on work that is not compute at all.}, not by any single device's speed. Scale buys capacity and simultaneously divides your reliability by N while pushing the binding wall from memory to the network. Answer: doubling the fleet cannot halve the run, because the step's non-compute fraction shrinks local work per replica while communication intensity climbs. Details at [the step anatomy](#fig-step-anatomy) and the [communication balance](#eq-ci-ratio).

> [!note] How to read this packet
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Scale Moment

Training compute grew roughly seven orders of magnitude from AlexNet to GPT-4-class runs: ~$10^{18}$ FLOPs for AlexNet in 2012, ~$10^{20}$ for BERT-Large, ~$10^{24}$ for PaLM, ~$10^{25}$ for a GPT-4-class scenario. The growth rate broke sharply around 2010: about ==1.5× per year before, roughly 4× per year after=={A fit to Epoch AI's notable-model records gives ~1.5×/yr for the early era, close to a Moore's-law doubling cadence, versus ~4×/yr for the deep-learning era. Deep learning did not ride the hardware curve; it outran it.}.

Where the growth came from matters as much as the total. Decomposing each run into accelerators × duration × achieved rate shows roughly ==half the compute growth is fleet scale=={Count of accelerators and days trained supply about half the trend; the other half is per-accelerator achieved rate. Scaling out is not a detail layered on faster chips, it is half the story.}, not faster silicon. Accelerator counts climbed ~4 orders: two GTX 580s for AlexNet, ~10,000 V100s for GPT-3, 16,384 H100s for Llama 3 405B. GPT-3 burned an estimated ~$3\times10^{23}$ FLOPs; run on a single A100 at peak, that is ~30 years of ideal compute.

::fig[scale-climb]

::chart[compute-orders]

The scale moment is the ==discontinuity=={The book's word. On one machine the binding constraint is usually the memory wall inside the device; across a fleet, the binding constraint moves to the network between devices and to coordination overhead. The same optimization instincts now apply to a different wall.} where the fleet, not the chip, becomes the unit of engineering. Three walls define it: memory (the model and activations exceed one device), network (workers must exchange data every step), energy (a 100 MW campus powers what a rack once did).

> [!observation] Scale is a regime change, not a quantity change
> A 25,000-GPU job is not "a big server." It fails 25,000 times as often per unit time as one GPU, it can lose a network partition mid-step, and its slowest member sets everyone's clock. Engineering judgment from single-node work transfers only after you re-derive which term binds.

## From Single Node to Fleet

The step that makes a fleet one computer: each worker computes its share of the gradient, exchanges partial results, and ==waits at a barrier=={The synchronization barrier is the defining difference from traditional scale-out. A MapReduce job retries a slow task on spare capacity; a synchronous training step has no spare capacity, every worker is on the critical path of every step.} until every worker reports. This is why the step's wall-clock decomposes into three kinds of time, and only one of them does arithmetic:

::eq[fleet-law]

$$
T_{step} = T_{compute} + T_{comm} + T_{coord}
$$

The instrumented reference step: 8.71 s on 1,024 GPUs, split 7.25 s local computation + 0.53 s pipeline bubble + 0.93 s gradient exchange. The 1.46 s non-compute share is what doubling the fleet taxes first, more workers means more exchange participants and ==less local work per replica to amortize it=={Same global batch, more workers: each replica's sequences drop from 96 to 12 going 1,024 to 8,192 GPUs, so the local FLOPs per step fall ~8× while the bytes it must exchange do not. Communication intensity rises even as per-step compute falls.}.

::fig[step-anatomy]

::chart[step-overhead]

The comparison that decides whether you are compute- or communication-bound is communication intensity, bytes moved per local FLOP, against the fabric's balance point:

::eq[ci-ratio]

$$
CI = \frac{B_{exch}}{F_{local}} \;\; \text{vs.} \;\; \frac{BW_{fabric}}{r_{peak}}
$$

On the same fabric, the 1,024-GPU configuration sits below 10% of balance; the 8,192-GPU configuration sits near half. Same fabric, same model, ==8× the GPUs moved the job 8× closer to the network wall=={Growing the fleet shrinks per-replica compute (F_local falls 8×) but not the exchange payload, so CI climbs ~8×. Fleet size is a network-pressure decision, not just a capacity one.}, this is the mechanism behind the answer to the opening question.

> [!method] Sizing a step-up
> Before adding GPUs, decompose the step: compute shrinks ~linearly with workers, coordination and exchange do not. If $T_{comm}+T_{coord}$ is already ~17% of the step, expect the marginal gain per added GPU to be well under linear, and check CI against fabric balance before signing the purchase.

## AI Scaling Laws

Loss falls as a ==power law in each resource=={Fitted, not derived: L(C) = a·C^{−α} with α fit from measured runs. The exponent is small: each order of magnitude of compute buys a fixed, modest loss improvement, but the law held across orders of magnitude, which is what made frontier training a plannable investment.}: params, data, and compute each predictably reduce loss when scaled, which turns "how big a run" from guesswork into a budget line. The compute-optimal allocation splits budget between parameters and tokens (the Chinchilla regime, ~20 tokens per parameter at the optimum), so under-trained large models waste parameters and over-trained small ones waste compute.

::eq[scaling-law]

$$
L(C) = a\,C^{-\alpha}
$$

The laws are a planning instrument, not a promise. They break when the regime changes: ==data exhaustion=={Once the corpus is exhausted, added parameters have nothing new to fit, the data term, not the compute term, binds. Repeated epochs give diminishing returns, which is why frontier labs hunt new data sources rather than only bigger clusters.}, distribution shift, or a regime where the fitted exponent no longer holds. Efficiency work (better architectures, precision, sparsity) shifts the constant $a$, it lowers loss at fixed compute but does not repeal the power-law shape.

## Constraints of Scale

The reliability gap is the volume's first hard wall. With per-device MTTF ~50,000 hours, a 25,000-GPU job sees a failure every ==~2 hours=={MTBF_fleet ≈ MTTF_device / N under independent failures: 50,000 / 25,000 ≈ 2 h. Meta's Llama 3 405B production record shows the same cadence: 419 unexpected interruptions in a 54-day snapshot on 16,384 H100s, about one every 3.1 hours.}, not every 5.7 years. Fault tolerance is not an operational nicety at this scale; it is the difference between a job that finishes and one that spends its life recovering.

::eq[fleet-mtbf]

$$
MTBF_{fleet} \approx \frac{MTTF_{device}}{N}
$$

Availability multiplies the same way. An all-up requirement across N nodes at per-node availability $A$ gives $A^N$: at 10,000 nodes, ==four-nines leaves you ~37%=={0.9999^10,000 ≈ e^{−1} ≈ 37%; three-nines gives ~e^{−10} ≈ 0.005%. Raising per-node availability helps exponentially less than removing the all-up requirement, checkpointing and replication attack N, not A.} chance all are up at once, and three-nines is hopeless. This is why fleet designs assume interruption and checkpoint rather than chase uptime.

::eq[availability]

$$
A_{fleet} = A_{node}^{N}
$$

::fig[mtbf-ladder]

Two further walls bound what scale can buy. Distributed state has physical limits: coordination requires communication, which costs latency, so consistency at fleet scale is bought with time (the CAP-shaped tradeoff reappears inside the training loop). And governance scales with capability: a fleet that can train a frontier model in weeks is a concentration of ==compute worth governing=={100 MW campuses, tens of thousands of accelerators, months of wall-clock, the physical inputs of frontier training are visible, countable and regulable, which is why export controls and compute governance enter the systems discussion here.}, which is why the book closes the constraint list with systemic risk, not just engineering risk.

## The C³ Taxonomy

Volume I's D·A·M: Data, Algorithm, Machine, named the workload. Volume II needs verbs: what the fleet spends its step doing. ==C³ = Compute, Communication, Coordination=={The fleet law's three terms are the taxonomy. Compute is the arithmetic; communication is bytes moved to keep workers coherent; coordination is the orchestration, scheduling, checkpointing and barrier work that keeps N workers acting as one machine.} are those verbs, and every mechanism in the book attacks exactly one of the three.

::fig[c3-map]

The projection matters because ==optimizations are diagnosed by which C they relieve=={A faster accelerator relieves Compute and does nothing for Communication. A better collective algorithm relieves Communication. Checkpointing, elastic scheduling and straggler mitigation relieve Coordination. Misdiagnosing the term means buying hardware for a problem that is not compute.}. The fleet law is the operational form: $T_{step} = T_{compute} + T_{comm} + T_{coord}$, and the energy accounting draws the same boundary, energy spent outside the compute term is the tax scale charges.

## The Fleet Stack and Lighthouse Archetypes

The book organizes the fleet as four bands, Infrastructure (silicon, power, buildings), Distribution (networks, collectives, parallel strategies), Serving (inference at scale), Governance (operations, reliability, responsibility), with the warning that ==the bands cannot be optimized independently=={Bandwidth provisioned without knowing the parallel strategy, or a reliability policy set without knowing checkpoint cost, wastes the budget where the bands meet. The stack is a coupled system in the same sense volume I's device stack was.}.

Three archetypes carry the volume's concrete numbers the way the five lighthouses carried volume I: the frontier training fleet (synchronous, failure-dominated), the inference fleet (arrival-driven, tail-dominated), and the edge fleet (intermittent, energy-dominated). Each stresses a different C: training pays coordination, serving pays communication latency, edge pays the energy accounting.

## Fallacies and Pitfalls

- **The faster-accelerator fallacy**: a better chip relieves only the Compute term. On a step already at 50% of fabric balance, doubling peak FLOPs buys far less than doubling, because communication was never the accelerator's problem.
- **"Just more servers"**: scale-out instincts from embarrassingly parallel work fail on synchronous steps: there is no work stealing at a barrier, only waiting.
- **Treating MTBF as a device property**, fleet MTBF is device MTTF divided by N. Procurement math that prices uptime per box misprices the job by four orders of magnitude.
- **Efficiency as a substitute for scale**, efficiency shifts the power-law constant; it does not change the exponent. The teams that win do both.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Training compute, 2012→GPT-4-class | ~$10^{18}$ → ~$10^{25}$ FLOPs (~7 orders) | The scale discontinuity in one row |
| Compute growth rate | ~1.5×/yr pre-2010; ~4×/yr post | Deep learning outran the hardware curve |
| Growth decomposition | ~half from count × duration | Scale-out is half the trend, not a detail |
| Accelerator counts | 2 GTX 580 → 10k V100 → 16,384 H100 | ~4 orders of fleet growth |
| Reference step (1,024 GPU) | 8.71 s = 7.25 + 0.53 + 0.93 | Fleet law, measured: ~17% non-compute |
| Per-replica sequences | 96 (1,024 GPUs) → 12 (8,192) | Local work falls 8×, CI climbs ~8× |
| Fabric balance reached | <10% (1,024) → ~50% (8,192) | Fleet size is a network-pressure decision |
| GPT-3 training | 175B params, ~3×10^23 FLOPs, 10k V100s, ~24.6 TF/s each | ~20% achieved of V100 peak; ~30 ideal-years on one A100 |
| TPU v4 pod | 4,096 chips ≈ 1.1 EFLOP/s | One pod's aggregate peak |
| Fleet MTBF | 50,000 h MTTF ÷ 25,000 GPUs ≈ 2 h | Reliability divides by N |
| Llama 3 405B record | 419 interruptions / 54 days ≈ 1 per 3.1 h | Production confirmation of the arithmetic |
| All-up availability | 0.9999^10,000 ≈ 37%; 0.999^10,000 ≈ 0.005% | Remove N from the exponent, not A |
| Facility envelope | ~100 MW campus | Energy is the third wall |

## Glossary

- **Scale moment**: the discontinuity where a workload outgrows one machine and the fleet becomes the unit of engineering.
- **Synchronous training step**: every worker computes, exchanges, and waits at a barrier; the slowest worker sets the step.
- **Straggler**: a worker slower than its peers, hardware, thermal, or scheduling, that taxes the whole barrier.
- **Communication intensity (CI)**: bytes exchanged per local FLOP; compared against fabric balance to tell compute-bound from network-bound.
- **Fleet law**: $T_{step} = T_{compute} + T_{comm} + T_{coord}$, the step's wall-clock decomposed into the three C³ terms.
- **C³ taxonomy**: Compute, Communication, Coordination, the verbs the fleet spends its step on; the diagnosis axis for every optimization.
- **D·A·M**: Data, Algorithm, Machine, the nouns of the workload from volume I; C³ is what they do at fleet scale.
- **Scaling law**: fitted power law relating loss to parameters, data or compute; a planning instrument with breakdown regimes.
- **Compute-optimal**: the parameter/token split minimizing loss at fixed compute (~20 tokens per parameter, Chinchilla).
- **Warehouse-scale computer**: the data center treated as one machine, shared fabric, power and failure domains.
- **Lighthouse archetype**: canonical fleet workload (frontier training, inference fleet, edge fleet) used to keep scale arguments concrete.
- **Fleet stack**: the four coupled bands, Infrastructure, Distribution, Serving, Governance.
- **MTBF_fleet**: mean time between job-level interruptions ≈ device MTTF / N under independent failures.

## → Ben's world

- **The barrier is your queue.** Cuttlefish and the uptime pollers are async task fleets: a slow probe delays nothing else. The moment you make a step synchronous: say, a fleet-wide checkpoint of flag states or a coordinated schema roll, you inherit the straggler math: the slowest poller becomes everyone's latency. Design question worth asking before any "wait for all" join: what's the 8.71-second decomposition?
- **MTBF ÷ N is the co-located-droplet argument, inverted.** The shared droplet concentrates failure domains on purpose (one box, four products, cheap). The fleet law argues the opposite direction for compute: N boxes with per-job MTBF divided by N is exactly why frontier training needs checkpointing, and why your one-box consolidation only works because its failure domain is a restart, not a lost epoch.
- **CI at the small end.** The same intensity-vs-balance reasoning you use to decide whether a job is API-latency-bound or CPU-bound (Telesis probe scheduling, crawler fan-out) is the CI check: bytes moved per unit of local work, against the link's balance point. The crawl that became a Cloud Run blowout was a CI problem, distinct-URL fan-out moved more bytes than local work amortized.
- **Scaling laws as capacity planning.** "Loss falls ~power-law" is the same shape as "throughput falls ~1/utilization" from ch13: a fitted curve that converts capacity questions into arithmetic. Both break at regime boundaries: the law is a planning instrument, not a floor.

## Open questions

- The step anatomy says 0.53 s bubble and 0.93 s exchange, under which parallel strategy were those measured, and how does the split move with pipeline vs tensor vs data parallelism weights? (Ch6 territory.)
- Llama 3's 419 interruptions: how much wall-clock did each cost (detection + restart + recompute), and does the ~2 h arithmetic or the measured ~3.1 h cadence better predict time-to-finish including recovery tax?
- Where does the CI/balance curve for a real pod interconnect actually cross, i.e., at what fleet size does the reference job's exchange time exceed compute?
