---
title: "Introduction — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/01_introduction/01_introduction.html"
canonical_url: "https://benebsworth.com/study/vol2/01-introduction/"
---

# Introduction: Study Packet

Your 1,024-GPU training job runs 8.71-second steps: 7.25 s of compute, 0.53 s of pipeline bubble, 0.93 s of gradient exchange. Leadership asks whether doubling to 2,048 GPUs halves your time-to-train. What do you tell them?

*Working through [Introduction](https://www.mlsysbook.ai/vol2/01_introduction/01_introduction.html), chapter 1 of Machine Learning Systems volume II, Scaling Machine Learning Systems, by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The machine is the fleet.** Volume I optimized one machine at a time: a laptop, an accelerator, a serving replica. This volume opens the moment a run outgrows one box, and the rules change. A synchronous training step makes thousands of accelerators behave as a single computer whose pace is set by **the slowest worker and the shared fabric** *(why it matters: In a synchronous step every worker must exchange gradients before the next step starts, so one straggler delays the whole fleet and one failure interrupts it. The 8.71-second step above spends 17% of its time on work that is not compute at all.)*, not by any single device's speed. Scale buys capacity and simultaneously divides your reliability by N while pushing the binding wall from memory to the network. Answer: doubling the fleet cannot halve the run, because the step's non-compute fraction shrinks local work per replica while communication intensity climbs. Details at [the step anatomy](#fig-step-anatomy) and the [communication balance](#eq-ci-ratio).

> **note: How to read this packet**
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Scale Moment

Training compute grew roughly seven orders of magnitude from AlexNet to GPT-4-class runs: ~$10^{18}$ FLOPs for AlexNet in 2012, ~$10^{20}$ for BERT-Large, ~$10^{24}$ for PaLM, ~$10^{25}$ for a GPT-4-class scenario. The growth rate broke sharply around 2010: about **1.5× per year before, roughly 4× per year after** *(why it matters: A fit to Epoch AI's notable-model records gives ~1.5×/yr for the early era, close to a Moore's-law doubling cadence, versus ~4×/yr for the deep-learning era. Deep learning did not ride the hardware curve; it outran it.)*.

Where the growth came from matters as much as the total. Decomposing each run into accelerators × duration × achieved rate shows roughly **half the compute growth is fleet scale** *(why it matters: Count of accelerators and days trained supply about half the trend; the other half is per-accelerator achieved rate. Scaling out is not a detail layered on faster chips, it is half the story.)*, not faster silicon. Accelerator counts climbed ~4 orders: two GTX 580s for AlexNet, ~10,000 V100s for GPT-3, 16,384 H100s for Llama 3 405B. GPT-3 burned an estimated ~$3\times10^{23}$ FLOPs; run on a single A100 at peak, that is ~30 years of ideal compute.

![Two ladders: compute climbs faster than fleets](https://benebsworth.com/study/vol2/01-introduction/diagrams/scale-climb.svg)

*Accelerator counts rose ~4 orders (2 GTX 580s to 16,384 H100s) while training compute rose ~7 (10^18 to 10^25 FLOPs). The vertical gap between the ladders is achieved per-device rate — the other half of the growth.*

**Seven orders of compute in eleven years**

| Year | log10 training FLOPs |
|---|---|
| 2012-01-01 | 18 |
| 2018-01-01 | 20 |
| 2020-01-01 | 23.5 |
| 2022-01-01 | 24 |
| 2023-01-01 | 25 |

*log10 FLOPs of landmark training runs: AlexNet ~10^18, BERT-Large ~10^20, GPT-3 ~3×10^23, PaLM ~10^24, GPT-4-class ~10^25. Roughly half the growth is fleet size and duration rather than per-device speed.*

The scale moment is the **discontinuity** *(why it matters: The book's word. On one machine the binding constraint is usually the memory wall inside the device; across a fleet, the binding constraint moves to the network between devices and to coordination overhead. The same optimization instincts now apply to a different wall.)* where the fleet, not the chip, becomes the unit of engineering. Three walls define it: memory (the model and activations exceed one device), network (workers must exchange data every step), energy (a 100 MW campus powers what a rack once did).

> **observation: Scale is a regime change, not a quantity change**
> A 25,000-GPU job is not "a big server." It fails 25,000 times as often per unit time as one GPU, it can lose a network partition mid-step, and its slowest member sets everyone's clock. Engineering judgment from single-node work transfers only after you re-derive which term binds.

## From Single Node to Fleet

The step that makes a fleet one computer: each worker computes its share of the gradient, exchanges partial results, and **waits at a barrier** *(why it matters: The synchronization barrier is the defining difference from traditional scale-out. A MapReduce job retries a slow task on spare capacity; a synchronous training step has no spare capacity, every worker is on the critical path of every step.)* until every worker reports. This is why the step's wall-clock decomposes into three kinds of time, and only one of them does arithmetic:

**Eq 1 · Fleet law**
$$
T_{step} = T_{compute} + T_{comm} + T_{coord}
$$

The instrumented reference step: 8.71 s on 1,024 GPUs, split 7.25 s local computation + 0.53 s pipeline bubble + 0.93 s gradient exchange. The 1.46 s non-compute share is what doubling the fleet taxes first, more workers means more exchange participants and **less local work per replica to amortize it** *(why it matters: Same global batch, more workers: each replica's sequences drop from 96 to 12 going 1,024 to 8,192 GPUs, so the local FLOPs per step fall ~8× while the bytes it must exchange do not. Communication intensity rises even as per-step compute falls.)*.

![The 8.71-second step, anatomized](https://benebsworth.com/study/vol2/01-introduction/diagrams/step-anatomy.svg)

*The instrumented 1,024-GPU step: 7.25 s local compute, 0.53 s pipeline bubble, 0.93 s gradient exchange. Doubling the fleet shrinks the amber span but grows the other two — the answer to the opening question.*

**Inside the 8.71-second step — 1,024-GPU reference job**

| Step term | Local compute (7.25 s) | Pipeline bubble (0.53 s) | Gradient exchange (0.93 s) |
|---|---|---|---|
| 1,024-GPU synchronous step | 7.25 | 0.53 | 0.93 |

*Only 7.25 s of the measured step does arithmetic. The 0.53 s pipeline bubble and 0.93 s gradient exchange (~17% combined) are the terms fleet growth taxes first — and they do not shrink linearly when you add GPUs.*

The comparison that decides whether you are compute- or communication-bound is communication intensity, bytes moved per local FLOP, against the fabric's balance point:

**Eq 2 · Communication intensity**
$$
CI = \frac{B_{exch}}{F_{local}} \;\; \text{vs.} \;\; \frac{BW_{fabric}}{r_{peak}}
$$

On the same fabric, the 1,024-GPU configuration sits below 10% of balance; the 8,192-GPU configuration sits near half. Same fabric, same model, **8× the GPUs moved the job 8× closer to the network wall** *(why it matters: Growing the fleet shrinks per-replica compute (F_local falls 8×) but not the exchange payload, so CI climbs ~8×. Fleet size is a network-pressure decision, not just a capacity one.)*, this is the mechanism behind the answer to the opening question.

> **method: Sizing a step-up**
> Before adding GPUs, decompose the step: compute shrinks ~linearly with workers, coordination and exchange do not. If $T_{comm}+T_{coord}$ is already ~17% of the step, expect the marginal gain per added GPU to be well under linear, and check CI against fabric balance before signing the purchase.

## AI Scaling Laws

Loss falls as a **power law in each resource** *(why it matters: Fitted, not derived: L(C) = a·C^{−α)* with α fit from measured runs. The exponent is small: each order of magnitude of compute buys a fixed, modest loss improvement, but the law held across orders of magnitude, which is what made frontier training a plannable investment.}: params, data, and compute each predictably reduce loss when scaled, which turns "how big a run" from guesswork into a budget line. The compute-optimal allocation splits budget between parameters and tokens (the Chinchilla regime, ~20 tokens per parameter at the optimum), so under-trained large models waste parameters and over-trained small ones waste compute.

**Eq 3 · Scaling law (power-law loss)**
$$
L(C) = a\,C^{-\alpha}
$$

The laws are a planning instrument, not a promise. They break when the regime changes: **data exhaustion** *(why it matters: Once the corpus is exhausted, added parameters have nothing new to fit, the data term, not the compute term, binds. Repeated epochs give diminishing returns, which is why frontier labs hunt new data sources rather than only bigger clusters.)*, distribution shift, or a regime where the fitted exponent no longer holds. Efficiency work (better architectures, precision, sparsity) shifts the constant $a$, it lowers loss at fixed compute but does not repeal the power-law shape.

## Constraints of Scale

The reliability gap is the volume's first hard wall. With per-device MTTF ~50,000 hours, a 25,000-GPU job sees a failure every **~2 hours** *(why it matters: MTBF_fleet ≈ MTTF_device / N under independent failures: 50,000 / 25,000 ≈ 2 h. Meta's Llama 3 405B production record shows the same cadence: 419 unexpected interruptions in a 54-day snapshot on 16,384 H100s, about one every 3.1 hours.)*, not every 5.7 years. Fault tolerance is not an operational nicety at this scale; it is the difference between a job that finishes and one that spends its life recovering.

**Eq 4 · Fleet mean time between failures**
$$
MTBF_{fleet} \approx \frac{MTTF_{device}}{N}
$$

Availability multiplies the same way. An all-up requirement across N nodes at per-node availability $A$ gives $A^N$: at 10,000 nodes, **four-nines leaves you ~37%** *(why it matters: 0.9999^10,000 ≈ e^{−1)* ≈ 37%; three-nines gives ~e^{−10} ≈ 0.005%. Raising per-node availability helps exponentially less than removing the all-up requirement, checkpointing and replication attack N, not A.} chance all are up at once, and three-nines is hopeless. This is why fleet designs assume interruption and checkpoint rather than chase uptime.

**Eq 5 · All-up fleet availability**
$$
A_{fleet} = A_{node}^{N}
$$

![Reliability divides by N](https://benebsworth.com/study/vol2/01-introduction/diagrams/mtbf-ladder.svg)

*One GPU fails on average every 50,000 hours (~5.7 years); a 25,000-GPU synchronous job sees an interruption every ~2 hours. Meta's measured Llama 3 record — 419 interruptions in 54 days on 16,384 H100s — lands on the same line.*
Two further walls bound what scale can buy. Distributed state has physical limits: coordination requires communication, which costs latency, so consistency at fleet scale is bought with time (the CAP-shaped tradeoff reappears inside the training loop). And governance scales with capability: a fleet that can train a frontier model in weeks is a concentration of **compute worth governing** *(why it matters: 100 MW campuses, tens of thousands of accelerators, months of wall-clock, the physical inputs of frontier training are visible, countable and regulable, which is why export controls and compute governance enter the systems discussion here.)*, which is why the book closes the constraint list with systemic risk, not just engineering risk.

## The C³ Taxonomy

Volume I's D·A·M: Data, Algorithm, Machine, named the workload. Volume II needs verbs: what the fleet spends its step doing. **C³ = Compute, Communication, Coordination** *(why it matters: The fleet law's three terms are the taxonomy. Compute is the arithmetic; communication is bytes moved to keep workers coherent; coordination is the orchestration, scheduling, checkpointing and barrier work that keeps N workers acting as one machine.)* are those verbs, and every mechanism in the book attacks exactly one of the three.

![D·A·M names it, C³ spends it](https://benebsworth.com/study/vol2/01-introduction/diagrams/c3-map.svg)

*The nouns of the workload (Data, Algorithm, Machine) project onto the fleet's verbs (Compute, Communication, Coordination). Every optimization relieves exactly one C — diagnosis picks the target before the purchase.*
The projection matters because **optimizations are diagnosed by which C they relieve** *(why it matters: A faster accelerator relieves Compute and does nothing for Communication. A better collective algorithm relieves Communication. Checkpointing, elastic scheduling and straggler mitigation relieve Coordination. Misdiagnosing the term means buying hardware for a problem that is not compute.)*. The fleet law is the operational form: $T_{step} = T_{compute} + T_{comm} + T_{coord}$, and the energy accounting draws the same boundary, energy spent outside the compute term is the tax scale charges.

## The Fleet Stack and Lighthouse Archetypes

The book organizes the fleet as four bands, Infrastructure (silicon, power, buildings), Distribution (networks, collectives, parallel strategies), Serving (inference at scale), Governance (operations, reliability, responsibility), with the warning that **the bands cannot be optimized independently** *(why it matters: Bandwidth provisioned without knowing the parallel strategy, or a reliability policy set without knowing checkpoint cost, wastes the budget where the bands meet. The stack is a coupled system in the same sense volume I's device stack was.)*.

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


---

## Key equations

**Eq 1 · Fleet law**

$$
T_{step} = T_{compute} + T_{comm} + T_{coord}
$$

*A synchronous step's wall-clock splits into local arithmetic, bytes exchanged to keep workers coherent, and the orchestration work that holds the fleet together (barriers, bubbles, scheduling). Only the first term does FLOPs; doubling the fleet taxes the other two first.*

**Eq 2 · Communication intensity**

$$
CI = \frac{B_{exch}}{F_{local}} \quad \text{vs.} \quad \frac{BW_{fabric}}{r_{peak}}
$$

*Bytes a replica must exchange per FLOP of local work, compared against the fabric's balance ratio (link bandwidth divided by peak compute rate). CI above balance means the network, not the accelerator, is the wall. Growing the fleet shrinks F_local ~linearly while B_exch does not — CI climbs with N.*

**Eq 3 · Scaling law (power-law loss)**

$$
L(C) = a\,C^{-\alpha}
$$

*Empirical fit: loss falls as a power law in compute (and separately in parameters and data). The small exponent α means each order of magnitude buys a fixed, modest loss gain — but the law held across orders, turning frontier training into a plannable investment. Breaks at regime changes like data exhaustion.*

**Eq 4 · Fleet mean time between failures**

$$
MTBF_{fleet} \approx \frac{MTTF_{device}}{N}
$$

*With N independent devices each failing at rate 1/MTTF, job-level interruptions arrive at rate N/MTTF. A 50,000-hour GPU MTTF gives a 25,000-GPU job a ~2-hour interruption cadence — confirmed in production by Llama 3's ~1-per-3.1-hours record on 16,384 H100s.*

**Eq 5 · All-up fleet availability**

$$
A_{fleet} = A_{node}^{N}
$$

*If a step needs every node up simultaneously, availability multiplies: 10,000 four-nines nodes give ~e^−1 ≈ 37% chance all are up at once. Raising A helps far less than removing N from the exponent — checkpointing, replication and restartable steps attack the exponent, not the nines.*

**Eq 6 · Training compute decomposition**

$$
C = N \times T \times r
$$

*A run's total compute factors into accelerator count, training duration, and achieved per-device rate. Fitting this over ~100 documented runs shows count×duration supplies about half the decade-scale growth — scale-out is half the trend, not a footnote on faster silicon.*

## From the book

- [MTBF ladder (book)](https://mlsysbook.ai/vol2/01_introduction/01_introduction.html) — The book's two-bar log-scale comparison of one GPU's 50,000-hour MTTF against a 25,000-GPU job's ~2-hour MTBF. Ours adds the measured Llama 3 point so the arithmetic meets the production record on the same line.
- [CI knee (book)](https://mlsysbook.ai/vol2/01_introduction/01_introduction.html) — Communication intensity against fleet size showing where a job crosses fabric balance. Ours derives the same mechanism as arithmetic inside the step anatomy (96→12 sequences per replica) rather than a knee plot.
- [Fleet-law step decomposition (book)](https://mlsysbook.ai/vol2/01_introduction/01_introduction.html) — The book's breakdown of a synchronous step into its compute, communication and coordination spans. Ours uses the measured 1,024-GPU numbers as a single anatomy bar keyed to the fleet-law equation.
- [C³ taxonomy (book)](https://mlsysbook.ai/vol2/01_introduction/01_introduction.html) — The book's three-dimension C³ landscape figure. Ours keeps the narrower projection map — D·A·M nouns to C³ verbs — which is what the reader uses to triage an optimization.
- [Fleet stack bands (book)](https://mlsysbook.ai/vol2/01_introduction/01_introduction.html) — The four coupled bands — Infrastructure, Distribution, Serving, Governance — as the book draws them. Left to the book's figure; our packet keeps the coupling warning in prose.
- [The scale discontinuity (book)](https://mlsysbook.ai/vol2/01_introduction/01_introduction.html) — Single-machine memory wall versus the fleet's network-plus-coordination wall. Our scale-climb figure makes the same point quantitatively — the ~4-order fleet ladder against the ~7-order compute ladder.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

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

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol2/01-introduction.m4a) — a generated podcast walking this packet's argument.
