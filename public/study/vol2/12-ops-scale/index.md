---
title: "Operations at Scale — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html"
canonical_url: "https://benebsworth.com/study/vol2/12-ops-scale/"
---

# Operations at Scale: Study Packet

One model is a project. What changes when a hundred models share features, capacity and release calendars — and why does the fix look like a control plane rather than more runbooks?
*Machine Learning Systems, vol. 2, chapter 12, Operations at Scale (mlsysbook.ai)*

## Thesis

**One model is a project; a hundred models form a system of systems** *(why it matters: Per-model MLOps habits fail because shared features, pipelines and capacity create coupling that grows faster than headcount. The operational object stops being the model and becomes the dependency graph.)*. The fix is a fleet control plane: registries that record consumers, release gates bound to one versioned evaluation contract, feature definitions with freshness contracts, staged rollouts priced by exposure, hierarchical budgets, and economics that treat occupancy as the invariant under every capacity decision. **Every claim in this chapter is about coupling, not count** *(why it matters: A 500-model org with clean boundaries can be easier to run than a 40-model org with undocumented shared features. The curves are illustrative; the mechanism is real.)*.

> **note: How to read the marks**
> Amber dotted phrases carry "why it matters" cards. Hover, tap or tab to each one for the reasoning that did not fit the sentence.

## Guided notes

### One Model Is a Project; a Hundred Is a System

- The book's framing vignette moves from five engineers running one recommendation model to hundreds of models across dozens of product surfaces. The chapter's complexity table tracks what changes between 1, 10 and 100 models: deployment coordination goes from team-local to ad hoc to critical path, shared data dependencies go from within-pipeline to some overlap to a dense graph, and on-call goes from one team to org-wide.
- **Operational load follows coupling, not model count** *(why it matters: Monitoring alerts grow roughly linearly with models. Deployment coordination grows near N log N. Dependency conflicts grow near N squared over two, because N models have N squared over two possible pairs and recorded edges decide which pairs actually conflict. These curve shapes are the book's illustrative sketch, not measured bounds.)*.
- The crossing point matters more than the curves. In the book's sketch, repeated coordination work outgrows a team around 50 models. That number is a scenario, not a threshold; the transferable rule is that **the platform decision is an economic one** *(why it matters: Build the control plane when the recovered capacity exceeds its full cost, which the benefit-cost ratio makes computable instead of vibes.)*.


**Sharing one fleet beats partitioning it**

| Capacity model | GPUs required |
|---|---|
| Dedicated quotas | 100 |
| Shared platform | 43 |

*The chapter's multi-tenant notebook: a fixed 30 GPU-equivalents of active workload needs 100 dedicated GPUs at 0.30 occupancy or about 43 shared GPUs at 0.70 occupancy. That is a 57 percent capacity saving and 2.33 times the active GPU-equivalents for the same 1.75 million dollar annual budget. Statistical multiplexing needs headroom for coincident peaks and isolation.*

- The multi-tenant notebook shows the same coupling as an efficiency problem. With dedicated quotas at 0.30 occupancy, a fixed 30 GPU-equivalents of active work needs 100 GPUs. A shared platform at 0.70 occupancy needs about 43. On a 1.75 million dollar annual budget that is a 57 percent capacity saving, and the same money buys 70 GPU-equivalents of active work instead of 30, a 2.33x gain.
- Statistical multiplexing is not free. **Sharing converts idle capacity into useful work only with headroom** *(why it matters: Coincident peaks and noisy neighbors still need isolation. The saving assumes workloads do not all spike together, which is exactly what quota policy and scheduling exist to guarantee.)*.

### The Platform Has to Earn Its Keep

- Platform ROI is arithmetic, not advocacy. The chapter's benefit-cost ratio multiplies model count by hours saved per model-month by loaded engineer cost, then divides by total platform cost.

**Eq 12.1 · Platform benefit-cost ratio**
$$
BCR=\frac{N_{\mathrm{models}}\,T_{\mathrm{saved}}\,C_{\mathrm{eng}}}{C_{\mathrm{platform}}}
$$

- BCR of 1 is break-even; above 1 is net return. In the chapter's LEGO scenario, 50 models times 40 saved hours per month times 12 months times roughly 150 dollars per hour against platform cost gives a ratio of 1.25, a 25 percent return. The 20-model variant gives 0.5, a 50 percent loss. **The ratio is linear in model count** *(why it matters: Every additional model adds the same recovered capacity, so the platform case strengthens predictably rather than magically.)*.
- Recovered engineering time is capacity value, not cash. **A positive BCR still requires productive redeployment** *(why it matters: If the saved hours evaporate into more meetings, the benefit is theoretical. The ledger must name where recovered capacity actually goes.)*.
- Technical debt is the other side of the ledger. The book names four categories: data debt from unversioned inputs, configuration debt from duplicated unvalidated settings, model debt from undeclared consumers and glue code, and infrastructure debt from brittle pipelines and manual deploys.
- Debt gets a score: impact times frequency divided by resolution cost, each on a 1 to 3 scale. In the chapter's audit of 40 production models, configuration debt scores 4.5, monitoring debt 3.0 and pipeline glue 1.33, so configuration gets fixed first. The worked remediation spends 336 engineer-hours, about 50,400 dollars at 150 dollars per hour, to eliminate 35 percent of a 960-hour annual config cost: payback near 8.6 months.
- A second worked case automates deployment: manual deploys cost 10 hours, automated ones 0.5, saving 9.5 hours per deploy. At 3 deploys per week and 150 dollars per hour, weekly savings are 4,275 dollars against an 18,000 dollar setup cost: payback near 4.2 weeks. **Debt paydown is a portfolio optimization** *(why it matters: Rank by impact times frequency times benefit over resolution cost, review quarterly, and give debt an explicit budget share of engineering time.)*.
- Deployment cadence is a risk decision, not a uniform policy. The book contrasts adversarial fraud detection, which wants hours-scale releases and seconds-scale rollback, with a vision classifier on a monthly cycle. **Match observation window, exposure and containment to the change** *(why it matters: A family of models is not a universal release cadence.)*.


**Platform returns are linear in model count**

| Production models | Benefit minus platform cost |
|---|---|
| 20 models | 0 |
| 50 models | 3 |
| 100 models | 8 |

*Net annual benefit above a 2 million dollar platform cost, assuming 100 thousand dollars of recovered value per model per year. Break-even sits at 20 models; at 100 models the benefit-cost ratio is 5, a 400 percent net return. Recovered engineering time is capacity value, not automatic cash.*

### The Registry Is the Dependency Graph

- A model registry is not a phone book. **It is the system's memory of who depends on whom** *(why it matters: Version management pins the exact artifact plus lineage: data, hyperparameters, commits and metrics. Metadata records config, evaluations, hardware, serving configuration and ownership. Artifact storage must hold models that can exceed 100 GB. Access control enforces team and dependency boundaries.)*.
- The load-bearing feature is dependency tracking. When an upstream embedding bumps from v3.1 to v3.2, the registry traverses recorded edges into an impact set: the retrieval model, three rankers and the ensemble must all re-evaluate before the upstream release proceeds.

![Registry impact-set traversal](https://benebsworth.com/study/vol2/12-ops-scale/diagrams/impact-set.svg)

*An upstream model version bump traverses recorded dependency edges into an impact set, re-evaluates every consumer, blocks promotion until all pass, and rolls out in compatible stages. An unrecorded consumer edge, like the fraud model, is silently unflagged.*
- The protocol has four steps: traverse the graph, re-evaluate every consumer, block promotion until all pass, and roll out compatible intermediate states with a validated rollback. **Topological order alone is not enough** *(why it matters: Deploying upstream first can break consumers that still expect the old schema; the traversal must order or version the transition, not just sort it.)*.
- The failure mode is the unrecorded edge. In the book's example, a fraud model consumes the same embeddings but was never registered as a consumer, so the traversal never flags it. **A registry is only as complete as its dependency declarations** *(why it matters: Undeclared consumers are silent until they break.)*.
- Ensembles have their own trap: components interact. A ranker retrained while an upstream bug was live learns to discount the semantic score; fixing the upstream bug then degrades end-to-end quality. **Component metrics can improve while the ensemble regresses** *(why it matters: The evaluation contract must measure the composed system, not just each part.)*.
- Lifecycle states run Development, Staging, Canary, Production, Deprecation, Archive. Zombie models keep draining GPUs and enlarging the dependency graph, so deprecation is an operational act with a drain plan, not a label.
- Deployment patterns scale with fleet size: one model on a monthly cycle, three to five on weekly, ten to fifty daily, hundreds continuously with automated policy, cross-model impact analysis and global rate limiting.

### Feature Meaning Is a Versioned Contract

- The training-serving gap is a correctness problem disguised as a plumbing problem. Batch pipelines compute features hours late; serving needs them in milliseconds. **The invariant is that training and serving transforms agree** *(why it matters: TrainingTransform applied to raw input must equal ServingTransform applied to raw input, as a testable property, or the model serves a different distribution than it learned.)*.
- Freshness is per-feature, not per-store. The book's SLO table assigns days for static demographics, hours for slowly changing preferences, minutes for session-level signals and seconds for real-time last-action features, each with its own materialization path.

**Eq 12.2 · Feature freshness latency**
$$
L_{\mathrm{fresh}}=T_{\mathrm{available}}-T_{\mathrm{event}}
$$

- The dual-store architecture exists because the two access patterns fight each other: training scans terabytes of history for point-in-time joins, serving does sub-10-millisecond point lookups. One materialization engine feeds an offline store and an online store so the definition stays single-sourced.
- Point-in-time correctness prevents time-travel leakage. In the book's noon example, a point-in-time join sees 4 clicks while a naive join against a midnight batch sees 10, inflating today's click count 2.5x. The join must use availability time, not event time, or late arrivals and backfills leak the future into training.
- **Storage is the quiet constraint** *(why it matters: The worked example, 100 million users, 1,000 features, hourly snapshots for a year, 32-byte rows, produces 876 trillion feature values and about 28 petabytes, three quarters of it metadata. Feature stores survive by storing deltas, compressing and tiering, not by snapshotting everything.)*.
- At fleet scale the arithmetic gets concrete: about 1 billion recommendations per day means roughly 1.16 million feature lookups per second on average, with peaks five to ten times higher. Each lookup must fit inside a per-request latency budget where the store gets only a few milliseconds.
- The payoff is measurable. The book's constructed engagement table, explicitly not causal, values moving from hourly to real-time freshness at 2.1 percentage points, about 10 million dollars per year in its scenario. The checkpoint is the honest one: **value the freshness upgrade against its incremental streaming cost** *(why it matters: A 5 million dollar per year cost sits inside a 10 million dollar value only if the measured lift is real.)*.
- Data quality gates are contracts too: completeness, consistency, timeliness and accuracy, with quarantine thresholds and last-known-good fallbacks. The worked incident shows a freshness breach detected in 5 days costing about 857,000 dollars; alerting at 4 hours cuts exposure roughly 30x.

### A Release Is a Contract, Not a Deploy

- The ML pipeline has six stages: data validation, feature engineering, training with full provenance, evaluation against pinned metrics, artifact packaging and registry registration. DAG orchestrators like Kubeflow or Airflow run them, but the contract is what matters.
- Validation gates check more than accuracy. Performance gates combine absolute thresholds, relative improvement and regression bounds on secondary metrics. The book's warning example: a 1 percent NDCG gain can still double p99 latency. **Latency, fairness and safety are gates, not dashboards** *(why it matters: A candidate that wins offline and breaks the latency SLO never reaches traffic.)*.
- The failure mode is silent regression. A 25,000 QPS ranking model passes every gate, then a schema change imputes a missing feature as 0.0 for 8 percent of queries and conversion drops 3.2 percent for 48 hours. The gate suite checked the model; nothing checked the feature contract end to end.
- Production experimentation has a ladder: shadow, interleaving, then A/B. Shadow modes mirror live traffic at roughly 2x inference load or replay logged requests; interleaving blends two rankers' outputs for the same user and, in Netflix's reported experiments, needs over 100x fewer users than between-subject tests because it removes user-level variance.
- **Statistical discipline is part of the release contract** *(why it matters: McNemar's test handles paired shadow comparisons with a 3.84 critical value at alpha 0.05. Multiple testing inflates false discoveries: 20 simultaneous tests at alpha 0.05 give a 64 percent familywise error rate, so platforms adopt Bonferroni or Benjamini-Hochberg corrections and prespecify sequential boundaries like O'Brien-Fleming.)*.
- Sample size sets the calendar. The two-proportion formula sizes each variant from baseline rate, detectable difference, confidence and power.

**Eq 12.3 · A/B sample size per variant**
$$
n=\frac{(z_{\alpha}+z_{\beta})^{2}\,2p(1-p)}{\delta^{2}}
$$

- The chapter's worked cases: detecting a 10 percent relative lift on a 5 percent CTR needs about 30,000 samples per variant, under 2 hours at 1 million requests per day. Detecting 5 percent relative on a 1 percent CTR needs about 621,000 per variant, about 30 hours. **Small effects on rare events are calendar problems** *(why it matters: The experiment design, not the deploy, sets the release schedule.)*.
- SUTVA, the assumption that one unit's outcome is unaffected by others' assignments, breaks in social products. In the book's worked example, treatment users' engagement bleeds into control users through shared content; the naive read shows +1.4 minutes while the true effect is +2.9, halved by spillover. Detection looks for treated-neighbor fractions; mitigations include graph cluster randomization, ego-exclusion, switchbacks and geo experiments.

![One evaluation contract, five evidence planes](https://benebsworth.com/study/vol2/12-ops-scale/diagrams/evaluation-contract.svg)

*Offline behavior, system performance, responsibility and safety, online experiment and recovery and audit all bind to a single versioned contract. Promotion needs every required sign-off on the same artifact; an invalidated plane sends the candidate back to its owning gate.*
- The evaluation contract binds five evidence planes to one artifact: offline behavior, system performance, responsibility and safety, online experiment, and recovery and audit. Each plane has pinned fields, an acceptance rule, an invalidation rule and an accountable owner. **Promotion requires every required sign-off on the same versioned candidate** *(why it matters: Evidence gathered on a different artifact does not count, and an invalidated plane returns the candidate to its owning gate rather than to a generic retry.)*.

### Exposure Is Priced Before Traffic Moves

- Rollout risk is a product, not a vibe: regression probability times impact per exposed unit times exposed units.

**Eq 12.4 · Rollout exposure risk**
$$
R=P_{\mathrm{reg}}\,I_{\mathrm{reg}}\,E_{\mathrm{exp}}
$$

- The staged pattern bounds each factor. Shadow logs without serving, canary exposes 1 percent, staged rollout ramps 5 to 25 to 50 to 100 percent, and soak watches delayed effects for 7 to 14 days. **A 5 percent canary cuts blast radius twentyfold** *(why it matters: Against a 100 percent cutover, the same regression hurts twenty times fewer units while the evidence accumulates.)*.
- Stage duration comes from the experiment, not the clock. At 1 million requests per hour with 10,000 guardrail samples per variant, a 1 percent stage needs about an hour and a 5 percent stage about 12 minutes; the chapter's configured schedule of 2 hours, 30 minutes, 30 minutes and 1 hour totals roughly 4 hours.

**Eq 12.8 · Canary stage duration**
$$
t_{\mathrm{stage}}=\frac{n_{\mathrm{required}}}{r_{\mathrm{traffic}}\,f_{\mathrm{stage}}}
$$

- Risk tiers set the ceremony: low-risk changes take a fast canary, medium-risk retrained models a standard one, high-risk new architectures extended shadow plus slow canary, and critical core models shadow, human review and staged rollout. Rollback triggers are prespecified with thresholds, windows and minimum samples.
- Multi-region rollout repeats the evidence per region: a canary region for 24 to 48 hours, two early-adopter regions at 20 percent of traffic, two majority regions at 70 percent, then cross-region validation, about 3.5 to 7 days total. Consistency models trade global ordering against bounded staleness; rollback is a two-phase halt, drain and ack protocol with fencing for stragglers.
- The cost of skipping this is concrete. A silent 0.5 percentage point CTR drop at 5,000 QPS, undetected for 24 hours, is about 432 million requests and 2.16 million lost clicks, roughly 1.08 million dollars in the chapter's scenario.

### Monitoring Is a Hierarchy of Budgets

- Fleet telemetry has a scale problem before it has an insight problem. A 10,000-GPU cluster with per-GPU MTBF around 50,000 hours fails roughly every 5 hours; one metric per second per GPU is 864 million observations per day. Telemetry must correlate across GPU, node, rack and facility scopes, and preflight checks catch gray failures: a GEMM at under 90 percent of fleet median or NVLink under 85 percent flags a degraded part that availability checks miss.
- **Independent alerts do not survive multiplication** *(why it matters: One hundred models, ten metrics each, checked every 5 minutes at a 0.003 false-positive rate produce about 864 raw false crossings per day. Loosen to two sigma and the daily count passes 14,000; even 99 percent dedup leaves about 144 pages. Urgent local failures still page directly; everything else needs hierarchy, persistence and calibrated thresholds.)*.

**Eq 12.6 · Fleet false-alert probability**
$$
P(\ge 1)=1-(1-\alpha)^{N}
$$

- The monitoring pyramid assigns each level to an owner: business metrics to the incident lead with few pages, portfolio metrics to domain teams, model metrics to model owners, and infrastructure metrics to the platform team. Dashboards mirror the ladder: executive, portfolio, model, investigation.
- Fleet health is a vector of budgets, not a scalar. Each dimension, availability, latency, freshness, quality, consumes a fraction of its error budget.

![Fleet health is a vector, not an average](https://benebsworth.com/study/vol2/12-ops-scale/diagrams/slo-vector.svg)

*The chapter's example consumes 40 percent of the availability budget, 60 percent of latency, 130 percent of freshness and 50 percent of quality. The mean of 0.70 looks healthy, but freshness over one stops promotion: fleet health requires every dimension at or below its budget.*
**Eq 12.5 · SLO vector consumption**
$$
\mathrm{healthy}\iff\max_{d}\frac{O_{d}}{B_{d}}\le 1
$$

- **The mean hides the breach** *(why it matters: The chapter's example sits at 0.40 availability, 0.60 latency, 1.30 freshness and 0.50 quality: a 0.70 average that looks healthy while freshness is over budget and stops promotion. Burn rate compares the short-window violation rate against the allowed pace; fast burn pages and freezes nonessential releases.)*.
- Anomaly detection layers statistical process control (three-sigma limits, seven-consecutive-point rules), drift detection (covariate shift versus concept drift, which needs late labels), and heuristic bands like PSI. Escalation triggers when over 60 percent of models flag simultaneously, which signals a shared cause rather than 60 independent failures.
- Observability is four channels, not one: metrics say which property moved, traces say where the request spent time, logs say which component emitted, and prediction logs say whether health preserved behavior. Cardinality discipline matters: unsampled logs from 10,000 nodes are a thundering herd.

### Incidents Are Attribution Problems

- The book opens with Meta's October 4, 2021 outage: a maintenance command bug disconnected the backbone, BGP withdrawals cascaded, and DNS plus internal recovery tools were lost with it. **The control plane's own dependencies are part of the blast radius** *(why it matters: Recovery tooling that depends on the thing that failed is not recovery tooling.)*.
- Incidents classify by layer: data (pipeline failure, schema break, staleness), model (accuracy, latency, memory), infrastructure (GPU, partition, load balancer) and business metric, which is hardest because seasonality and competition confound it.
- The worked attribution chain is the chapter's best debugging example: engagement drops 5 percent in an hour with no deploys in four. The trail runs user features 3 hours stale against a 1-hour SLO, to 10 million queued Kafka events against a normal 10 thousand, to a broker disk at 95 percent on partition 7. **Cross-model failure patterns narrow the search** *(why it matters: All recommendation models failing while vision and infrastructure stay green points at the shared feature pipeline, not at fifty independent model bugs.)*.
- A related vignette shows the cost of undeclared consumers: an unversioned feature silently changed normalization from z-score over 30 days to min-max over 7 days, breaking 14 downstream models across 5 teams, cutting ranking accuracy 12 percent, and taking 18 hours to debug.
- The runbook is five steps: detect user impact, localize the dependency, bound the blast radius, escalate by evidence, learn from the gap. Anti-patterns are single historical fixes, vague instructions and dead dashboards.
- Post-incident review treats the incident as a missing control, not a missing person. Fields cover duration, user impact, timeline latencies for detect, attribute, mitigate and recover, root cause as the absent control, and corrective actions with owners and deadlines. The frame is blameless and aims to prevent the failure class.
- On-call is an operations design too: tiered primary and secondary, a 15 to 30 minute routing target, one-week rotations with 30-minute handoffs, follow-the-sun 8-hour shifts, and a toil target under 25 percent of on-call time.

### The Platform Is a Product With an SLO

- Platform engineering has four abstraction levels. Level 1 is raw infrastructure where teams own everything. Level 2 standardizes containers, ML-aware orchestration, volumes and service mesh. Level 3 adds ML control loops: topology-aware scheduling, tuning, distributed training and serving. Level 4 is the full lifecycle product: IDE, feature store, experiment tracking, registry, CI/CD, monitoring, cost and governance.
- **The platform is a versioned product** *(why it matters: It carries compatibility guarantees, a migration path, dual-path telemetry during transitions, deprecation dates and its own SLOs. Adoption metrics include share of models on supported paths, artifact-to-traffic time, exception rate and migration completion. Exceptions are time-bounded contracts with named owners, not permanent forks.)*.
- Self-service invariants make the paved road safe: pinned artifacts and versions, resource envelopes within quota, traffic policies with canary and rollback, quality gates, telemetry routing and an approval boundary for sensitive data, budget and high-risk windows.
- Occupancy needs care before it means anything. Capacity-weighted averaging requires a common unit; heterogeneous accelerators need a declared normalization before their occupancy figures can be added. A 95 percent packing target can starve co-located inference, and preempting a 72-hour training job without a checkpoint loses real work.
- ML productivity goodput splits losses into scheduling, runtime and program factors, each lost hour charged to exactly one factor. **The product tells the owner which layer to fix** *(why it matters: A portfolio dashboard that routes each team's losses to orchestration, runtime or program turns occupancy from a vanity metric into an assignment.)*.

### Occupancy Is the Economic Invariant

- Fleet economics has three levels: does the control plane repay its fixed cost (platform economics), does shared hardware produce useful work (fleet economics), and does one run or endpoint earn its marginal cost (workload economics). **Occupancy is the invariant under all three** *(why it matters: Every capacity decision, owned or rented, reduces to sustained useful demand against fully loaded cost.)*.
- The scale numbers are sobering. A 10,000-GPU cluster is 1,250 eight-GPU nodes; the chapter's CapEx example puts node hardware near 437.5 million dollars before network, facility and staffing. Electricity is 60 to 70 percent of OpEx in the illustrative stack, about 4.7 million dollars per year for a 1,024-GPU cluster.
- Build versus buy is a crossover, not a verdict.

![Owned fleet cost crosses cloud cost near month 26](https://benebsworth.com/study/vol2/12-ops-scale/diagrams/build-vs-buy.svg)

*For a 1,024-GPU cluster under the chapter's plotted assumptions, ownership pays a capital step then a shallow operating slope while cloud rental grows linearly. The cumulative lines cross near month 26; below the break-even occupancy, renting wins.*
- Under the chapter's plotted assumptions for a 1,024-GPU cluster at high occupancy, owned cumulative cost crosses cloud rental near month 26 of a 30-month horizon. Break-even occupancy is the real boundary: about 42.5 percent for a single 8-GPU node and about 54 percent for the 10,000-GPU figure, while dedicated fleets typically run 15 to 20 percent and portfolios 70 to 90 percent. Cloud burst capacity runs 5 to 10 times baseline allocation.
- Depreciation is the hidden term. A next-generation GPU at 3 to 4 times performance per watt can strand a three-year-old fleet: the chapter's worked case depreciates a 44.8 million dollar fleet to 7 to 10 million resale, about 35 to 38 million net over three years, or 17 to 18 million per training run if only two runs happen. **Idle time between runs is depreciation, not savings** *(why it matters: Refresh screening must check memory, topology and latency, not just peak FLOPs: replacing V100s with H100s triples ceiling throughput at the same power but cuts ports 7.9x and aggregate HBM from 35.2 to 11.2 TB.)*.
- Cloud has its own constraints: spot discounts around 70 percent carry interruption risk that can erase the saving, large deployments of 1,000 or more GPUs carry 6 to 12 month lead times, and facility buildout runs 12 to 30 months, the real critical path.
- Capacity planning is causal: model size times tokens times FLOPs gives total work; sustained per-GPU throughput gives ideal time; the chapter's GPT-3-class example computes 3.15 times ten to the 23 FLOPs, about 8 days ideal on 1,024 GPUs at high MFU, which becomes 2 to 4 weeks of calendar time plus a 5 to 10 percent spares pool.
- TCO sums four planes over one horizon with no double counting.

**Eq 12.7 · ML total cost of ownership**
$$
TCO=C_{\mathrm{train}}+C_{\mathrm{infer}}+C_{\mathrm{data}}+C_{\mathrm{iter}}
$$

- The chapter's constructed budgets make the lifecycle point: a startup with one model and two engineers spends about 47,500 dollars per month where iteration is 84 percent of cost; a 50-model production fleet spends about 980,000 dollars per month where inference is 41 percent. **The dominant cost term moves as the system matures** *(why it matters: Optimization pays where the current dominant term lives, which is why the sensitivity table matters more than any single number.)*.
- Iteration cost hides a multiplier: if 90 percent of experiments improve nothing, the cost per improving experiment is ten times the per-experiment cost. The optimization-breakeven rule divides implementation cost by monthly savings; the chapter's worked cases pay back in half a month for inference savings and 1.8 months for training savings.
- FinOps makes compute cost a first-class real-time constraint. Attribution tags team, service, environment, model type and cost center; anomalies use a Z-score with a 3-sigma alert (about one false alert per year at daily checks) or a 50 percent day-over-day change threshold; root causes fall into five categories from traffic growth to configuration error. The worked spike, mean 100 dollars per day with sigma 15 observing 250, is a Z of 10 traced to a 2 AM model release that needed 2.5x capacity.
- RAG versus fine-tuning is a cost-allocation decision: RAG charges knowledge to inference and data (retrieval, prefill, index refresh), fine-tuning charges training and iteration (curation, retraining, adapter fleet management). Decide on knowledge volatility, attribution needs, latency and adapter complexity.

### Case Studies: What the Platforms Actually Built

- Uber's Michelangelo (2017) standardized the data, training, evaluation, deploy and prediction-monitoring workflow, and reused shared feature definitions across platform pipelines; its delivery-time model combined historical features with near-real-time restaurant-prep signals.
- Meta's FBLearner Flow (2016) typed operators into a compiled DAG with declared CPU, GPU and memory needs, and used shadow and dark-launch canaries to verify latency, memory and errors on live traffic before outputs served; the platform trained over a million models for more than a quarter of the engineering team.
- Netflix separates candidate generation, offline training, online ranking and caching across its homepage stack, uses bandits with exploration budgets for cold start, and reports interleaving experiments needing over 100x fewer users.
- Google Vertex AI pairs managed AutoML with custom training and makes the managed feature service respect information-availability time; the lesson is that a container boundary does not isolate memory bandwidth, networks or backing services.
- Spotify separates candidate generators (collaborative filtering, editorial) from rankers, runs a paved road on TFX and Kubeflow Pipelines with metadata lineage for regression tracing, and mixes weekly batch playlist features with online home-screen ranking over precomputed candidates.
- **The synthesis is an interface contract** *(why it matters: Shared state, release evidence, resource policy and ownership are platform interfaces; domain teams keep workload intent and acceptance criteria. Too little platform means bespoke infrastructure; too much means a central ticket queue.)*.

### Fallacies and Pitfalls

- Complexity grows linearly with model count: coupling makes several terms superlinear; the floor is still linear, and the crossed terms dominate.
- Independent alerts on every model and metric: near-certain false crossings; hierarchy, persistence and calibrated thresholds are the fix while urgent failures still page directly.
- Platform investment can wait for 100 models: break-even under the chapter's assumptions lands at 20 to 50, and the real threshold is recovered capacity versus full platform cost.
- Uniform deployment procedures for every model: match observation window, exposure and containment to the risk tier of the change.
- Per-model metrics are sufficient: system-level signals catch shared-feature drift that per-model dashboards miss.
- Batch pipelines for all features: freshness is a per-feature contract with its own SLO.
- Technical debt is inevitable and only fixed when blocking: leading indicators like deploy lead time, incident frequency, alert noise, rollback delay and toil share show the boundary failing while repair is still cheap.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Multi-tenant notebook | 30 GPU-equiv at 0.30 vs 0.70 util | 100 vs ~43 GPUs; ~57% saving; 2.33x active work |
| Platform BCR scenario | 1.25 at 50 models, 0.5 at 20 | linear in model count; break-even is economic, not a count |
| Platform labor LEGO | 40 h/model-month saved, ~150 USD/h | recovered-capacity valuation inputs |
| Debt audit | config 4.5, monitoring 3.0, glue 1.33 | Impact × Frequency / ResolutionCost ranking |
| Config remediation | 336 h, ~50,400 USD, ~8.6 mo payback | worked debt paydown case |
| Deploy automation | 10 h → 0.5 h, ~4.2 wk payback | 3 deploys/week at ~150 USD/h |
| Registry schema example | v3.2.1, 4 GiB artifact, 48 h on 8×A100 | lineage, evals, deps, serving envelope |
| Ensemble rollout | shadow 24-48 h, canary 1%, staged 5-100%, soak 7-14 d | example contract, not universal cadence |
| Feature freshness SLOs | days / hours / minutes / seconds | per-feature materialization classes |
| Point-in-time join | 4 vs 10 clicks, 2.5x inflation | availability-time vs event-time leakage |
| Feature storage worked case | 876 T values, ~28 PB, 75% metadata | deltas + compression + tiering required |
| Feature lookups | ~1.16M/s average, 5-10x peak | billion recommendations/day scenario |
| Freshness value scenario | 2.1 pp ≈ 10 M USD/yr | hourly → real-time, constructed not causal |
| Freshness incident | ~857 K USD over 5 days; ~97% cut at 4 h alert | detection latency dominates cost |
| Silent regression example | 3.2% conversion drop, 48 h, 8% queries | schema-imputation failure past the gates |
| A/B sizing worked cases | ~30K vs ~621K per variant | 5%→10% rel vs 1%→5% rel detectable lifts |
| Familywise error | 20 tests → 64%; 30 tests/qtr → ~1.5 FP/qtr | Bonferroni/FDR corrections needed |
| SUTVA worked case | +1.4 vs +2.9 min true; DEFF 1.06 | spillover halves naive effect estimate |
| Canary duration | 10K samples → 1 h at 1%, 12 min at 5% | t = n/(rate × fraction); ~4 h schedule |
| Canary blast radius | 5% exposure = 20x smaller | staged rollout risk pricing |
| Silent-failure scenario | ~1.08 M USD/day at 5K QPS, 24 h detect | exposure × detection latency |
| Fleet telemetry | ~5 h MTBF at 10K GPUs; 864M obs/day | hierarchy + correlation scopes required |
| False alerts | ~864/day at 3σ; ~14,400/day at 2σ; ~144 after 99% dedup | P(≥1) = 1-(1-α)^N |
| Drift detection lag | ~2,207 samples ≈ 2.2 h | 95%→93% accuracy, α=0.05, power 80% |
| Incident chain | 5% drop → 3 h stale → 10M lag → 95% disk | shared-pipeline attribution pattern |
| Unversioned-feature incident | 14 models, 5 teams, -12%, 18 h | z-score→min-max normalization break |
| On-call design | 15-30 min route, 1 wk rotation, <25% toil | tiered, follow-the-sun operations |
| 10K-GPU CapEx | ~437.5 M USD nodes, 1,250 × 8-GPU | before network, facility, staffing |
| Cost stack | elec 60-70% OpEx; ~4.7 M USD/yr at 1K GPUs | illustrative planning ranges |
| Break-even occupancy | ~42.5% node, ~54% at 10K GPUs | dedicated 15-20% vs portfolio 70-90% |
| Depreciation worked case | ~35-38 M USD net / 3 yr; ~17-19 M USD/run | 2 training runs on 1,024 GPUs |
| V100→H100 screen | 3.4x ceiling, ports -7.9x, HBM 35.2→11.2 TB | refresh needs memory/topology checks |
| Cloud lead times | 6-12 mo GPUs, 12-30 mo facilities | phased deployment mitigates |
| Frontier training example | 3.15e23 FLOPs, ~8 days ideal @1,024 GPUs | 2-4 wk calendar + 5-10% spares |
| TCO budgets | 47.5 K USD/mo startup vs 980 K USD/mo prod | iteration 84% vs inference 41% dominant |
| Optimization breakeven | impl cost / monthly savings; 0.5-1.8 mo cases | payback-bar decision table |
| FinOps anomaly | Z = (cost-μ)/σ; worked Z = 10 | ~1 false alert/yr at 3σ daily checks |

## Glossary

- **Control plane**: the shared layer that observes, schedules, governs and recovers the whole model fleet.
- **Dependency graph**: the recorded consumer edges between models, features and pipelines that a registry traverses on version bumps.
- **Impact set**: the set of downstream consumers an upstream change must re-evaluate before promotion.
- **Evaluation contract**: the versioned bundle of offline, system, responsibility, online and recovery evidence bound to one candidate artifact.
- **Freshness SLO**: the per-feature contract for how stale a served value may be, with its own materialization path.
- **Point-in-time join**: a training-time join that reconstructs each feature as of the event's availability time, preventing future leakage.
- **SLO vector**: the per-dimension reliability budgets whose maximum, not mean, decides fleet health.
- **Exposure budget**: the rollout-risk product of regression probability, per-unit impact and exposed units.
- **Gray failure**: degraded hardware that stays alive, like a GEMM at reduced throughput, and silently slows collectives.
- **MPG (ML productivity goodput)**: useful output after charging each lost hour to scheduling, runtime or program.
- **Break-even occupancy**: the sustained useful-demand level where owned fleet cost equals rented cost.
- **Iteration cost**: engineering time plus compute per experiment, inflated by the share that improves nothing.
- **Paved road**: the platform's supported path with invariants, telemetry and exceptions as time-bounded contracts.
- **Blameless post-incident review**: an incident write-up that names the missing control and assigns corrective actions, not blame.
- **FinOps**: treating compute cost as a first-class, real-time, attributable constraint on ML work.

## → Ben's world

- The shared droplet already runs this chapter's multi-tenancy problem at small scale: four products co-locate for cost, so each tenant needs memory, latency and noisy-neighbor isolation to keep the others' SLOs. The 57 percent sharing saving and its headroom caveat apply directly.
- BrandBrain's generation pipeline is a feature-store problem in disguise: brand assets, reference images and generation parameters are versioned features with freshness and lineage contracts, and a silent schema change there would hit every downstream consumer the way the unversioned z-score feature hit 14 models.
- The LLM benchmark harness is an evaluation-contract instance: each run binds a model version, task suite, scorer and hardware envelope to one artifact. A bench result computed under different conditions is evidence about a different candidate.
- Greenveil's crawl and indexing costs look like the TCO iceberg: the visible compute line hides pipeline maintenance, retries and incident toil that the iteration-cost plane captures.
- The droplet's manual deploys are the chapter's 10-hours-per-deploy baseline; the 4.2-week automation payback case is a concrete argument for IaC-ing the remaining manual steps.
- Coverage-biased telemetry is the fleet-monitoring fallacy in miniature: fast, modern clients report more often, so dashboards describe the healthiest population unless reporting coverage is instrumented per cohort.

## Open questions

- Where does the 50-model crossing actually sit for a given org? The book's curves are illustrative; a real crossing needs the org's own toil ledger and BCR inputs.
- How should a small team sequence platform investment: which of the four abstraction levels earns its keep first when the fleet is under 20 models?
- The chapter's engagement-lift and cost figures are constructed scenarios. Which freshness and occupancy claims would survive contact with measured production data?
- Does the evaluation contract's five-plane structure fit a two-person team, or does it collapse into one owner signing everything, and does that change its value?
- For the benchmark harness, what is the analogue of SUTVA: when do concurrent model evaluations contaminate each other's latency measurements enough to need isolation or randomization?


---

## Key equations

**Eq 12.1 · Platform benefit-cost ratio**

$$
BCR=\frac{N_{\mathrm{models}}\,T_{\mathrm{saved}}\,C_{\mathrm{eng}}}{C_{\mathrm{platform}}}
$$

*A platform repays when recovered engineering time, valued at loaded hourly cost, exceeds the platform's total cost. The ratio is linear in model count: the 50-model scenario in the chapter reaches 1.25 and the 20-model scenario 0.5.*

**Eq 12.2 · Feature freshness latency**

$$
L_{\mathrm{fresh}}=T_{\mathrm{available}}-T_{\mathrm{event}}
$$

*Freshness is measured on availability time, the moment the feature store can serve the value, not the event time the underlying fact happened. Backfills and late arrivals make the two clocks diverge, so watermarks bound the gap.*

**Eq 12.3 · A/B sample size per variant**

$$
n=\frac{(z_{\alpha}+z_{\beta})^{2}\,2p(1-p)}{\delta^{2}}
$$

*Two-proportion sizing for one variant: baseline rate p, detectable absolute difference delta, z_alpha for confidence and z_beta for power. Detecting a 10 percent relative lift on a 5 percent click-through rate needs about 30,000 samples per variant; a 1 percent baseline at 5 percent relative needs about 621,000.*

**Eq 12.4 · Rollout exposure risk**

$$
R=P_{\mathrm{reg}}\,I_{\mathrm{reg}}\,E_{\mathrm{exp}}
$$

*Release risk prices the probability of regression times the impact per exposed unit times the number of units exposed. A 5 percent canary cuts blast radius twentyfold against a 100 percent cutover, and stage duration is set by required samples over traffic rate times traffic fraction.*

**Eq 12.5 · SLO vector consumption**

$$
\mathrm{healthy}\iff\max_{d}\frac{O_{d}}{B_{d}}\le 1
$$

*Each reliability dimension consumes a fraction of its error budget. The fleet is healthy only when the worst dimension stays at or below one; the chapter's example has freshness at 1.30 while the mean of 0.70 hides it.*

**Eq 12.6 · Fleet false-alert probability**

$$
P(\ge 1)=1-(1-\alpha)^{N}
$$

*Independent monitors multiply false crossings. One hundred models with ten metrics each, checked every five minutes at a 0.003 false-positive rate, produce about 864 raw false crossings per day; loosening to two sigma pushes the daily count past 14,000.*

**Eq 12.8 · Canary stage duration**

$$
t_{\mathrm{stage}}=\frac{n_{\mathrm{required}}}{r_{\mathrm{traffic}}\,f_{\mathrm{stage}}}
$$

*Stage length is set by the experiment's sample requirement divided by request rate times traffic fraction. At 1 million requests per hour and 10,000 required samples, a 1 percent stage needs about an hour and a 5 percent stage about 12 minutes; delayed labels and guardrail windows can extend it.*

**Eq 12.7 · ML total cost of ownership**

$$
TCO=C_{\mathrm{train}}+C_{\mathrm{infer}}+C_{\mathrm{data}}+C_{\mathrm{iter}}
$$

*The four cost planes over one horizon with no double counting. The chapter's constructed budgets show iteration dominating a startup at 84 percent of monthly cost while inference dominates a 50-model production fleet at 41 percent; the dominant term changes over the lifecycle.*

## From the book

- [Operational load versus model count](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's log-log sketch of monitoring load growing linearly, deployment coordination near N log N and dependency conflicts near N squared over two, crossing a team-capacity line around 50 models. The crossing is illustrative, not a measured threshold.
- [Platform ROI threshold](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's benefit-cost ratio versus model count for 2 million and 5 million dollar annual platforms. Break-even lands at 20 and 50 models; at 100 models the smaller platform shows a ratio of 5. Our platform-breakeven chart plots the net dollars instead.
- [Model dependency graph](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's registry example where an embedding update fans out to retrieval, ranking and ensemble consumers. Our impact-set sketch adds the re-evaluation gate and the unrecorded-edge failure mode.
- [Dual-store feature architecture](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's versioned feature definitions feeding one materialization engine, then an offline store for point-in-time historical scans and an online store for sub-10-millisecond lookups. Our packet compresses this into the freshness-latency contract.
- [Point-in-time join versus naive join](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's noon example: a point-in-time join sees 4 clicks while a midnight-batch join sees 10, inflating total clicks today 2.5 times. Our freshness-latency equation names the availability-time rule that prevents it.
- [Hierarchical monitoring pyramid](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's four levels, business, portfolio, model and infrastructure, each owned by a different role with different alert volume. Our slo-vector figure drills into the model-level budget rule instead.
- [Build versus buy cumulative cost](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's matplotlib crossover for a 1,024-GPU cluster near month 26 to 27 of a 30-month horizon. Our build-vs-buy sketch keeps the stepped-versus-linear geometry and the occupancy boundary below the crossover.
- [TCO iceberg](https://mlsysbook.ai/vol2/12_ops_scale/12_ops_scale.html) — The book's ten-by-ten waffle where GPU cloud and object storage are the visible 50 percent and engineering labor, pipeline maintenance, retraining, incidents and compliance hide the other 50 percent. Our ml-tco equation names the four cost planes.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. Why can manual, per-model operational maintenance become difficult to sustain as an organization expands to hundreds of models that share features, resources, and release dependencies?
   - A. Each model requires its own dedicated datacenter zone, so facility costs scale with model count regardless of how well the hardware is utilized
   - B. Shared dependencies reduce coordination work because one upstream pipeline update automatically propagates correct behavior to every downstream consumer
   - C. Shared data dependencies, contested resources, and independent alert streams add coordination work that can exceed the capacity of manual per-model processes
   - D. Model count increases only inference latency, which lengthens request queues but never changes the coordination structure between the teams that own the models

2. An organization operates 50 models. A platform team costs 120,000 dollars per month and recovers 20 engineering hours per model monthly, valued at 150 dollars per hour. What are the benefit-cost ratio and net ROI based on this recovered-capacity value?
   - A. Benefit-cost ratio 1.25 and net ROI of 25%, with 30,000 dollars in net monthly capacity value above platform cost
   - B. Benefit-cost ratio 0.80 and net ROI of -20%
   - C. Benefit-cost ratio 2.50 and net ROI of 150%, with 180,000 dollars in net monthly capacity value above platform cost
   - D. Benefit-cost ratio 0.50 and net ROI of -50%

3. A fleet has 100 models with 10 metrics each, checked every 5 minutes at a threshold with false-positive rate alpha = 0.003. Calculate the expected raw false threshold crossings per day, and explain why this number is not the page count.

4. When an upstream User Embedding Model is updated in an enterprise model registry, which automated sequence must the registry execute to prevent silent production failures?
   - A. Deploy the new embedding immediately, then file follow-up tickets for each downstream team to validate compatibility on their own schedules
   - B. Rebuild the entire feature store from raw sources so every consumer implicitly receives compatible embeddings without any explicit re-evaluation step
   - C. Roll back every downstream model to its last known-good artifact version and redeploy the entire consumer set against the new embedding schema before any serving traffic shifts
   - D. Identify dependent downstream models, trigger compatibility re-evaluations, block promotion until all dependents pass, and coordinate staged deployment order

5. What failure mode occurs when a training pipeline constructs examples using current feature values rather than historical values as of each event timestamp?
   - A. Schema drift: current values carry different units, ranges and missing-value conventions than the historical values they replace, so gradients optimize a shifted objective function
   - B. Time-travel data leakage: future information contaminates training data, producing deceptively high offline metrics but degraded production performance
   - C. Survivorship bias: only entities with complete current features enter training, systematically dropping long-tail users from the dataset
   - D. Label delay: future feature values leak into the training labels themselves, inflating offline AUC without affecting the features the model is served

6. Calculate the raw uncompressed historical storage for a feature store with 100 million users, 1,000 features per user, 1 year retention (8,760 hourly snapshots), and 32-byte rows (8-byte value, 8-byte entity key, two 8-byte timestamps).

7. A model serves 1 million requests per hour and its canary plan needs about 10,000 samples per variant. How long must the 1 percent stage run to collect that evidence, and what assumption does the calculation ignore?

8. Why are gray failures, such as an accelerator whose GEMM throughput drops 20 percent or an NVLink link with intermittent retries, exceptionally damaging in large synchronous distributed training runs?
   - A. Gray failures corrupt gradient checksums, forcing the runtime to discard the entire step's accumulated gradients and restart from the last checkpoint
   - B. A degraded rank triggers automatic cluster-wide preemption, so one slow GPU evacuates every rank from its node and requeues the whole job
   - C. Intermittent link retries inflate only logging volume and retry counters, because the collective runtime's double-buffered gradient communication buckets fully absorb the added latency without delaying any step boundary
   - D. A degraded rank or link on the communication critical path can delay collective completion and the next training step while ordinary availability checks remain healthy

9. When an ML platform evaluates 20 simultaneous A/B experiments, why might the team adopt Benjamini-Hochberg FDR control instead of the Bonferroni correction?
   - A. FDR control removes the need for prespecified sample sizes because sequential peeking at results is permitted under its assumptions
   - B. Bonferroni divides alpha by the number of tests, creating an overly conservative threshold that inflates false negatives and discards real model gains
   - C. Bonferroni correction is only defined for two-arm experiments, so portfolio platforms running multi-arm bandits must use FDR procedures
   - D. Benjamini-Hochberg provides uniform statistical power across experiments of different sample sizes, while the Bonferroni threshold varies with traffic

10. On-call alerts report that all recommendation models across multiple teams dropped 15 percent in conversion over two hours, while vision models, NLP services, and raw server health remain green. What is the most probable root cause among these choices?
    - A. An upstream feature store pipeline delay leaving user interaction features stale across all recommender models
    - B. A synchronized bad data batch that reached every recommendation training pipeline, while vision models simply were not retrained in the window
    - C. A load balancer began routing recommender traffic to a degraded serving tier that lacks the newest model versions
    - D. An upstream ranking model release introduced a subtle composition bias that only surfaces when downstream ensembles combine its scores

11. In a build-versus-buy TCO evaluation for a 1,024-GPU cluster against a cloud rate of 4 dollars per GPU-hour, what operational invariant determines whether ownership achieves lower cumulative cost over a 30-month horizon?
    - A. Whether the cluster can sustain a 99.99 percent availability SLA under the cloud provider's service-credit terms, since ownership is only economically justified when rental penalties are certain
    - B. The ratio of GPU count to datacenter power density, since ownership is only economically viable above a fixed rack-density threshold
    - C. Sustained useful demand relative to full ownership cost; under the plotted assumptions an 80 percent cloud allocation crosses the owned-capacity cost near month 26
    - D. Whether reserved cloud commitments can be canceled mid-term, since ownership wins whenever future demand is uncertain

12. Which organizational structure best balances platform standardization with domain-specific velocity for an enterprise running 80 production models across recommendation, fraud, search and ads?
    - A. A pure centralized ticket queue where every training run, hyperparameter sweep and deployment request routes through the platform team
    - B. A hybrid model: a centralized core platform team owns shared infrastructure while domain platform engineers stay embedded in product teams
    - C. A pure decentralized model where each product team operates its own clusters, pipelines and monitoring with no shared contracts
    - D. An outsourced operations model where a third-party vendor runs all infrastructure, on-call rotation and release engineering while product teams retain modeling decisions and acceptance criteria

13. A recommendation ensemble's conversion drops 5 percent within one hour and no model deployed recently. Walk through how you would attribute the cause using the chapter's runbook, and what evidence would distinguish a stale shared feature from a model-specific regression.

## Answer key

1. C. Shared features, contested resources, and independent alerts create interacting operational dependencies as the portfolio grows. Manual per-model maintenance becomes unsustainable, which motivates shared controls and automation. This is a scaling argument, not a theorem that every large fleet has identical complexity.

2. A. Recovered capacity is 50 models times 20 hours times 150 dollars, or 150,000 dollars monthly. Dividing by 120,000 dollars gives a benefit-cost ratio of 1.25; net ROI is 25%, or 30,000 dollars above cost. Recovered engineering time is capacity value, not automatic cash: realizing it requires productive redeployment.

3. Checks per day = 100 models x 10 metrics x 288 checks = 288,000. Expected crossings = 288,000 x 0.003 = 864 per day. These are threshold crossings, not distinct incidents or pages: hierarchical grouping, persistence checks, deduplication and calibrated policies reduce operator burden while urgent local alerts still page directly.

   Independent monitors multiply false crossings. The raw rate motivates the monitoring pyramid and persistence rules; it does not equal the number of pages an on-call engineer receives.

4. D. Upstream changes silently break downstream models unless the registry traverses the dependency graph: identifying consumers, triggering re-evaluation, blocking promotion until verified, and ordering compatible intermediate states. Undeclared consumers are never flagged.

5. B. Point-in-time correctness joins each feature as of the event's availability time. A noon event joined to a midnight batch sees future clicks the model cannot have at inference, inflating offline metrics while production accuracy collapses.

6. Rows = 1e8 users x 1,000 features x 8,760 snapshots = 8.76e14 feature values. Bytes = 8.76e14 x 32 = 2.8e16 bytes, about 28 PB. Metadata (key plus two timestamps, 24 of 32 bytes) is 75 percent of the row, which is why stores keep deltas, compress and tier rather than snapshot everything.

   Storage scales with entities, features, retention window over update interval and bytes per row. The metadata fraction is what makes point-in-time joins reproducible and also what forces delta storage.

7. t = n / (rate x fraction) = 10,000 / (1,000,000 x 0.01) = 1 hour. At 5 percent traffic the same samples take 12 minutes. The formula is a collection-time lower bound: delayed outcomes, correlated requests and prespecified guardrail windows can require longer stages.

   Stage duration is priced from the experiment's sample requirement, not the clock. The full rollout schedule is set by the slowest outcome the release must observe, from hours of guardrails to days of soak.

8. D. A gray failure lengthens the step critical path without crashing a process. Gradient communication overlaps computation as buckets become ready, so the slowdown depends on placement and the collective schedule rather than producing a visible outage.

9. B. Bonferroni controls the probability of any false rejection across the family at a power cost. Benjamini-Hochberg controls the expected false-discovery proportion among rejections under its dependence assumptions and can retain more power, but still requires valid p-values and does not guarantee zero false discoveries.

10. A. The failure follows model-family dependencies while unrelated services stay healthy, making the shared recommendation feature pipeline the strongest hypothesis. Confirm freshness, recent changes and cohort effects before declaring a root cause; the pattern narrows the search but does not prove it.

11. C. The ownership boundary includes acquisition and operating costs while cloud cost follows allocated GPU-hours at the rental rate. Lower allocation can favor rental when unused capacity can be released. Depreciation schedules and demand uncertainty do not remove the underlying demand-versus-cost comparison.

12. B. The hybrid pattern centralizes core infrastructure (compute, registries, feature stores, CI/CD, governance) while embedding domain platform leads in product teams, avoiding both the centralized ticket bottleneck and fragmented bespoke infrastructure.

13. Follow the five-step runbook: confirm user impact, localize the dependency, bound the blast radius, escalate by evidence, and record the gap for post-incident review. First check whether the failure is family-wide: if all recommendation models dropped while vision, NLP and infrastructure stayed green, the shared feature pipeline is the leading hypothesis, not fifty independent model bugs. Check feature freshness against each feature's SLO, then upstream queues (consumer lag versus normal), then broker or storage health. A stale shared feature predicts correlated degradation across every consumer of that feature and a freshness-SLO breach on one pipeline; a model-specific regression predicts isolated degradation with clean feature freshness. The chapter's worked chain ran engagement minus 5 percent to features 3 hours stale against a 1-hour SLO, to 10 million queued events against a 10 thousand normal, to a broker disk at 95 percent. The PIR then names the missing control, such as a freshness alert at 4 hours instead of 5-day detection, with an owner and deadline.

    Attribution is a dependency-graph traversal under time pressure: the cross-model failure pattern plus freshness evidence separates a shared-cause incident from coincident model regressions, and the post-incident review converts the gap into a control.

## Audio overview

[Listen to the Marcus & Iris read-along (~10 min)](https://benebsworth.com/study-audio/vol2/12-ops-scale.m4a) — a generated podcast walking this packet's argument.
