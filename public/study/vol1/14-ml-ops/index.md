---
title: "ML Operations — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html"
canonical_url: "https://benebsworth.com/study/vol1/14-ml-ops/"
---

# ML Operations: Study Packet

Your recommender returns HTTP 200 on every request, holds 99.99% uptime, and sits inside its p99 budget, while click accuracy slides 94% to 88% over four weeks. Nothing pages anyone. What failed, and what do you build first?

*Working through [ML Operations](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html), chapter 14 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

Every prior chapter optimized a model inside a controlled loop; this chapter runs a **closed loop you didn't schedule** *(why it matters: DevOps inherits automation for crashes, latency and availability. ML adds a failure mode those controls cannot see: predictive correctness can decay while every health check stays green.)*. The recommender's dashboards are honest about infrastructure and silent about semantics, **the model is a claim, not a binary** *(why it matters: A release carries weights, learned parameters, drift behavior, and feedback effects, not just code. Statistical quality degrades as the world moves; binary health cannot express it.)*. The chapter's spine is the loop that catches it: [monitor, decide, release, repeat](#fig-ops-loop).

> **note: Reading the marks**
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### Silent Failure: Green Dashboards, Red Quality

- A serving cluster can return HTTP 200 on every request, stay inside tail latency, and pass every health check while **the predictions lose relevance week after week** *(why it matters: The chapter's ranking service slides 94%→88% click accuracy over four weeks after a competitor's promotion shifts what users click, zero alerts, because uptime and latency measure the machine, not the model.)*.
- Detection has a **time signature** *(why it matters: Acute drops, gradual drift, and localized cohort decay each call for different detectors and different responses. The four-week slide is the gradual signature: trend analysis on accuracy, invisible to uptime.)*: acute drop, gradual drift, cohort decay.
- Five principles gate the loop: reproducibility, separation of concerns, the **consistency imperative** *(why it matters: Offline training and online serving must compute the same features, or skew corrupts predictions regardless of model quality.)*, observable degradation, and cost-aware automation.

![Every check green while quality decays](https://benebsworth.com/study/vol1/14-ml-ops/diagrams/green-but-dying.svg)

*HTTP 200, p99 inside budget, 99.99% uptime — and accuracy sliding 94% toward 88%. Infrastructure health and model health are different instruments.*
### Technical Debt: Where the Coupling Hides

- Sculley's audit of Google's production systems found a mature system can end up at most **5% machine-learning code and 95% glue** *(why it matters: Integration wrappers shuttling tensors and records between frameworks, feature pipelines and serving engines. The maintenance surface is integration code, not the model.)*.


**The maintenance surface is not the model**

| Code share | ML code | Glue + plumbing |
|---|---|---|
| Production code | 5 | 95 |

*Sculley et al.'s audit of production ML systems: a mature system ends up at most ~5% machine-learning code and ~95% glue — integration wrappers, configuration, collection and serving plumbing. Debt accumulates in the 95%.*

- The debt patterns group by where the coupling hides: **boundary erosion** *(why it matters: Statistical software loses modular boundaries: features entangle, and a change to one input silently shifts dependent outputs. Data contracts (allowed ranges, null tolerances, drift thresholds) rebuild the boundary at runtime.)*, **correction cascades** *(why it matters: A model trained to correct another model's errors creates a fragile dependency chain, fixing the upstream model breaks the downstream corrector.)*, and **undeclared consumers** *(why it matters: Downstream systems that consume outputs without a contract break silently when the model updates. No import statement declares them; only lineage does.)*.
- Feedback and configuration accumulate: the model's own rankings shape the clicks it later trains on (the loop feeds itself), and config sprawl turns hyperparameters into an unversioned shadow codebase.

![Where ML technical debt hides](https://benebsworth.com/study/vol1/14-ml-ops/diagrams/debt-map.svg)

*The model is ~5% of the code; the debt lives around it — boundary erosion, correction cascades, undeclared consumers, feedback loops, config sprawl and glue.*
### Development Infrastructure

- The consistency imperative needs machinery: **shared feature stores** *(why it matters: One feature-extraction implementation invoked identically offline and online. The skew example prices the alternative: 1M requests/day at 1% skew-induced errors and \$0.10 per error loses \$1,000 a day, \$365,000 every year until the cause is removed.)*, versioned datasets/schemas/configs, and CI/CD pipelines that parity-test training against serving.
- Reproducibility is a function, not a hope: the same output requires the same pipeline inputs.

**Eq undefined · Reproducibility as a function**
$$
\mathrm{Output}=f(\mathrm{Code}_{v},\mathrm{Data}_{v},\mathrm{Config}_{v},\mathrm{Env}_{v})
$$

**Eq undefined · Training-serving skew as a recurring loss**
$$
L_{\mathrm{day}}=Q\cdot r_{\mathrm{skew}}\cdot c_{\mathrm{err}}
$$

### Releasing Models

- A model release carries more than a binary: weights, feature contracts, drift behavior and feedback effects all ship together. The candidate earns traffic in stages, **shadow, canary, blue-green** *(why it matters: Shadow serves the candidate against live traffic without answering; canary takes a small real slice; blue-green swaps fully with an instant revert path. Each bounds the blast radius differently.)*, and rollback is a drilled procedure (runbooks, drills, calibrated triggers), not a hope.
- Evidence for a stage advance is a comparison under controlled conditions: delayed conversions make the attribution window part of the test design, and novelty effects inflate early numbers.

![Which model answers the request?](https://benebsworth.com/study/vol1/14-ml-ops/diagrams/release-ladder.svg)

*In shadow mode, both models can see a request and the incumbent supplies the reply. In this illustrative 5% canary, the router assigns one request in twenty on average to the candidate for a real reply. Full rollout moves all replies to the candidate. Rollback routes new requests back to the incumbent.*
### Production Monitoring

- Drift detection is statistical, not binary: **PSI for binned features, KS for continuous, JS divergence for symmetric bounded comparison** *(why it matters: Each needs an alert threshold, and sample size complicates it: the KS critical threshold shrinks ~1/√n, so millions of requests flag shifts far below practical significance. Thresholds must mix statistical and business significance.)*.
- Detection is **bounded by labeled-outcome arrival** *(why it matters: At 1 label/second a detectable sample collects in ~17 minutes; at 100 labels/day it takes ~10 days. Low-volume or delayed-label domains need proxy signals, perplexity on live traffic, input drift, cohort stats.)*, which can lag traffic by orders of magnitude.
- Monitoring itself has a price, and a price of skipping it: five prevented incidents at \$50K each against \$50K of monitoring spend is a 5× benefit/cost.

**Eq undefined · Stage-gate evidence is priced in requests**
$$
n\propto\frac{\sigma^{2}}{(\mathrm{MDE})^{2}}
$$

### Retraining Decisions

- The packet's deciding comparison: **staleness accrues, runs cost** *(why it matters: Accuracy decays at rate δ per day; each run restores it for a fixed cost C_r. Total cost per unit time = C_r/T + accrued staleness over the interval. The minimum lands where amortized retraining meets accrued staleness.)*. For the ranking service: \$5,000 a run, 1M queries/day, \$0.50 per unit accuracy per query, 0.24%/day decay → **T\* ≈ 3 days**.

**Eq undefined · The optimal retraining interval**
$$
T^{*}\approx\sqrt{2C_{r}\,/\,(Q\,v\,A_{0}\,\delta)}
$$


**Daily cost vs retraining interval**

| Interval T (days) | C_r/T + staleness |
|---|---|
| 1 | 5564 |
| 3 | 3359 |
| 7 | 4662 |
| 14 | 8253 |
| 30 | 17087 |

*Amortized run cost + accrued staleness per day for the ranking service (C_r = \$5,000, Q = 1M/day, v = \$0.50, A₀ = 0.94, δ = 0.24%/day). The sum bottoms out near T* ≈ 3 days; shorter intervals overspend on runs, longer ones bleed staleness.*

- T\* shorter than the deployment path means **the economics outrun the team** *(why it matters: A 3-day optimum with a week-long release process is unachievable, the fix is shortening the update path, not accepting staleness.)*, so the update path itself becomes the constraint.
- Scheduled vs triggered: a fixed cadence is predictable; a drift trigger pays only when needed but can chase noise. The staleness model prices both.

![The interval that pays for itself](https://benebsworth.com/study/vol1/14-ml-ops/diagrams/retrain-clock.svg)

*Staleness accrues as accuracy decays; each run restores it for a fixed cost. The optimal interval sits where amortized run cost meets accrued staleness.*
### Incident Response, Governance, and Maturity

- ML incidents need **diagnosis before remediation** *(why it matters: An alert names a symptom (drift, skew, degradation); the cause can be data, model, or infrastructure. Retraining on new data does not resolve distribution shift if the shift lives in a broken feature, trace to the term before spending a run.)*: the same p99 can hide three different causes.
- The ML test score turns readiness debates into measurable criteria; maturity levels move a team from manual pipelines to automated closed loops.
- Investment economics: the control to add next is the one whose prevented loss exceeds its cost, monitoring, then parity tests, then automated rollback, sized to model criticality.

### Case Studies

- The **ranking service** *(why it matters: Drifts daily; clicks label within hours; its own rankings shape the clicks it trains on, a feedback-rich regime where freshness and loop-awareness dominate.)* and the **keyword spotter** *(why it matters: 200 KB INT8 on a microcontroller with 4 MB flash; radio and flash writes draw on a tiny energy budget; left it six months and detection fell four points below target, a power-bound, reach-constrained regime where OTA updates and on-device health dominate.)* are the two regimes: labels fast and feedback-loopy vs labels scarce and unreachable.
- ClinAIOps transplants the same loop to clinical care, hypertension management as three coupled loops (patient-AI, clinician-AI, patient-clinician), where fatigue and accountability reshape the controls.

### Fallacies and Pitfalls

- **Green dashboards as model health** *(why it matters: Availability metrics cannot express predictive correctness; add statistical monitors.)*.
- **Retraining as the fix for shift** *(why it matters: Retraining without diagnosing what shifted re-learns the same broken feature.)*.
- **Accuracy alert = root cause** *(why it matters: An alert is a symptom; data, model and infrastructure causes need different fixes.)*.
- **Rollout as a binary event** *(why it matters: A release is a sequence of evidence gates with a revert path, not a flag flip.)*.
- **More monitoring as more safety** *(why it matters: Sample-size-sensitive tests flag insignificant shifts; unactioned alerts train teams to ignore real ones.)*.

### Summary

- MLOps closes the loop the earlier chapters opened: the model becomes a maintained claim, monitored, decided upon, and re-released continuously.
- Debt lives in the couplings (data-model, model-infrastructure, production-monitoring); contracts and parity tests pay it down.
- The deciding instrument is the staleness model: T\* = √(2C_r/(Q v A₀ δ)) prices the interval against the run, the economics, not the calendar, set the cadence.
- Every stage of the loop has its own number: 5%/95% glue share, \$1K/day skew loss, ~17 min vs ~10 days detection bound, 5× monitoring benefit/cost, ≈3-day optimal interval.

![The closed operations loop](https://benebsworth.com/study/vol1/14-ml-ops/diagrams/ops-loop.svg)

*Deploy, monitor, detect, diagnose, retrain, release — the loop turns a static artifact into a maintained claim.*
## The physics

| Quantity | Value | Use |
|---|---|---|
| Glue share | ≤5% ML code vs ≥95% integration | The maintenance surface is the plumbing, not the model. |
| Skew loss | 1M/day × 1% × \$0.10 = \$1K/day → \$365K/yr | One consistency bug is a recurring annual cost. |
| Detection bound | 1 label/s → ~17 min; 100/day → ~10 days | Detection is capped by labeled-outcome arrival, not traffic. |
| Sample size | n ∝ σ²/MDE²; halving MDE quadruples traffic | Stage-gate evidence is priced in requests. |
| Drift stats | PSI (binned), KS (continuous), JS (bounded symmetric) | Statistical monitors see what uptime cannot. |
| Monitoring ROI | 5 × \$50K / \$50K = 5× | Prevention pays when incidents cost more than observation. |
| Optimal interval | T\* = √(2C_r/(Q v A₀ δ)) ≈ 3 days | Amortized run meets accrued staleness. |
| Edge regime | 200 KB INT8, 4 MB flash, −4pp at 6 months | Power- and reach-bounded deployments drift silently too. |

## Glossary

- **Silent failure**: predictive degradation with all infrastructure health green.
- **Technical debt (ML)**: accumulated coupling at data-model, model-infra and monitoring boundaries.
- **Boundary erosion**: lost modular boundaries through entangled features and statistical coupling.
- **Correction cascade**: a downstream model trained on another's errors, a fragile chain.
- **Undeclared consumer**: a downstream system using outputs without a contract.
- **Glue code**: integration wrappers dominating the codebase (~95%).
- **Feature store**: shared feature definitions served identically offline and online.
- **Training-serving skew**: divergence between offline and online feature computation.
- **Shadow / canary / blue-green**: staged release patterns bounding the blast radius.
- **PSI / KS / JS divergence**: distribution-shift statistics for drift monitors.
- **Staleness model**: cost framing trading retraining runs against accuracy decay.
- **MDE**: minimum detectable effect; drives A/B sample size.
- **Feedback loop**: the model's outputs shaping future training inputs.
- **ML test score**: rubric scoring operational readiness.

## → Ben's world

- On the shared droplet, a green Caddy/upptime view is the uptime analog of HTTP 200: add an output-level check (a known query with an expected answer) before calling any service "healthy".
- In the LLM harness, treat each published score like a release artifact: record dataset version, eval config and environment beside the number so a later run can reproduce it.
- For Greenveil, the staleness framing maps to model+prompt pairs: accuracy decays as document mixes shift, budget a re-eval cadence the same way T\* budgets a retrain.

## Open questions

- What is the droplet's equivalent of "label arrival", how quickly could a silent quality regression in a tenant be detected at all?
- Which control would a test-score audit flag first for the LLM harness: versioned datasets, parity tests, or staged rollouts?
- At Greenveil's query volume, what re-eval interval would the T\* math produce given a plausible decay rate and eval cost?


---

## Key equations

**Eq undefined · Reproducibility as a function**

$$
\mathrm{Output}=f(\mathrm{Code}_{v},\mathrm{Data}_{v},\mathrm{Config}_{v},\mathrm{Env}_{v})
$$

*The same output requires every pipeline input at the same version: code, data, configuration and environment. A model artifact without its versions cannot be reproduced.*

**Eq undefined · Training-serving skew as a recurring loss**

$$
L_{\mathrm{day}}=Q\cdot r_{\mathrm{skew}}\cdot c_{\mathrm{err}}
$$

*Daily loss from a consistency bug = requests × skewed fraction × loss per error. At 1M requests, 1% skew and \$0.10 per error: \$1,000/day, \$365,000 every year until the cause is removed.*

**Eq undefined · Stage-gate evidence is priced in requests**

$$
n\propto\frac{\sigma^{2}}{(\mathrm{MDE})^{2}}
$$

*Sample size for detecting an effect grows with outcome variance and shrinks with the square of the minimum detectable effect — halving the MDE quadruples the traffic a canary stage needs.*

**Eq undefined · The optimal retraining interval**

$$
T^{*}\approx\sqrt{2C_{r}\,/\,(Q\,v\,A_{0}\,\delta)}
$$

*Amortized run cost meets accrued staleness at the square root. For the ranking service — \$5,000 per run, 1M queries/day, \$0.50 per unit accuracy, 0.24%/day decay — T* ≈ 3 days.*

**Eq undefined · Staleness decay as a half-life**

$$
A(t)=A_{0}\,e^{-\delta t}
$$

*Exponential accuracy decay fitted to the observed slide: at 0.24%/day a 94% baseline reaches ~88% in about four weeks. The half-life puts deployments with different decay rates on one scale.*

**Eq undefined · Monitoring benefit/cost**

$$
\mathrm{B/C}=\frac{n_{\mathrm{prev}}\cdot c_{\mathrm{inc}}}{c_{\mathrm{mon}}}
$$

*Monitoring pays when prevented incidents outweigh its cost: 5 prevented incidents at \$50K against \$50K of spend is a 5× benefit/cost — and it sizes which metrics deserve fine-grained observation.*

## Charts

**Four weeks of silent accuracy decay**

| Week | Accuracy |
|---|---|
| Week 0 | 94 |
| Week 1 | 92.4 |
| Week 2 | 90.9 |
| Week 3 | 89.4 |
| Week 4 | 88 |

*The ranking service's click accuracy, modeled at 0.24%/day decay: 94% → ~88% over four weeks while uptime, latency and error rate stay green. The signature is gradual — visible to a trend monitor, invisible to every health check.*


## From the book

- [Drift threshold knee](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html) — Sample size vs detection threshold: monitors over millions of requests flag shifts far below practical significance — thresholds must mix statistical and business significance.
- [ML Ops margin study I](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html) — Margin study from the chapter's margins — the operations loop and its controls.
- [ML Ops margin study II](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html) — Margin study from the chapter's margins — debt patterns and where coupling hides.
- [ML Ops margin study III](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html) — Margin study from the chapter's margins — release strategies and monitoring layers.
- [ML Ops margin study IV](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html) — Margin study from the chapter's margins — retraining economics and operational maturity.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A recommender returns HTTP 200 on every request, holds 99.99% uptime, and sits inside its p99 budget, while accuracy slides from 94% to 88% over four weeks. Which instrument would have caught the slide first?
   - A. Latency percentiles at the edge, drift almost always surfaces as slower requests before any quality metric moves.
   - B. CPU, GPU and memory saturation dashboards on the serving cluster, predictive decay shows up as resource creep first.
   - C. A statistical monitor on model outputs or input features, infrastructure health cannot see predictive decay.
   - D. Error-rate alerts on the serving endpoint, failed requests are the first observable of a decaying model.

2. Sculley et al.'s audit of Google's production ML systems estimated the share of actual ML code in a mature system at roughly:
   - A. About 50%, the model and its integration plumbing tend to split a mature codebase evenly.
   - B. About 25%, models dominate, but pipelines and configuration claim roughly a quarter of the system.
   - C. About 80%, the model dominates, because it is the component that changes most often in production.
   - D. At most ~5% ML code against ~95% glue, integration wrappers, configuration, collection and serving plumbing.

3. A downstream team reads your model's scores to rank its own feed. You update the model and their system breaks, yet no dependency graph listed them. The pattern is:
   - A. A correction cascade, a chain of models compensating for each other's errors until an update snaps the chain.
   - B. An undeclared consumer, a downstream system using outputs without a contract, invisible to import statements.
   - C. Boundary erosion, statistical coupling dissolving the modular wall between two otherwise separate systems.
   - D. Training-serving skew, the feature computed differently in the offline pipeline versus the serving path.

4. A serving pipeline computes a feature differently than training. At 1,000,000 requests/day, 1% of queries get corrupted predictions costing \$0.10 each. What is the annual loss?

5. Why does a model release earn traffic in stages (shadow → canary → blue-green) rather than flipping at once?
   - A. Each stage bounds the blast radius while producing the evidence the next stage requires, with a revert path held open.
   - B. Stages exist mainly so caches and JIT paths warm up before the model faces full production load.
   - C. Stages are a compliance artifact, staged exposure is what regulation requires before certification.
   - D. Canary slices cost less compute, so staging a release primarily saves money on inference capacity.

6. Your drift detector needs ~1,000 labeled outcomes to confirm a shift. Traffic is high but labels arrive at 100/day. Roughly how long until detection is possible?
   - A. About a day, with high traffic the model sees enough examples to confirm the shift quickly.
   - B. About an hour, detection follows the request rate, which is high in this service.
   - C. About ten days, detection is bounded by labeled-outcome arrival, not traffic.
   - D. Effectively immediate, statistical drift detection does not depend on labels at all.

7. A service serves 500,000 queries/day, value \$0.40 per query per unit accuracy, accuracy 0.92 after each run, decay 0.2%/day, run cost \$4,000. Using T* = √(2C_r/(Q·v·A₀·δ)), the optimal retraining interval is about how many days? (Round to nearest whole day.)

8. A canary gate needs to detect a 2% relative lift. The team now wants the gate to certify a 1% lift instead. By what factor does the required sample size grow (n ∝ 1/MDE²)?

9. Explain to a teammate how a recommender's own rankings can quietly poison its retraining data.

10. Explain when you would retrain on a drift trigger versus a fixed schedule, and what number decides.

11. A drift alert fires on your serving model. What is the correct next step?
    - A. Retrain immediately, fresh data is always the right first response to a drift signal.
    - B. Roll back to the previous model version, the last good model is the safest fallback.
    - C. Raise the alert threshold, a noisy monitor is worse than a quiet one.
    - D. Diagnose whether the cause is data, model, or infrastructure first, retraining on the same broken feature re-learns the same failure.

## Answer key

1. C. Silent failure is predictive decay with green infrastructure. Only statistical monitors, drift on inputs/outputs, trend on accuracy, see it; uptime, latency and error rates measure the machine.

2. D. The maintenance surface is integration code, not the model, which is why technical debt lives in the couplings around the model rather than inside it.

3. B. Undeclared consumers break silently on model updates because no contract or import declares the dependency; only lineage tracking finds them.

4. 1,000,000 × 1% × \$0.10 = \$1,000 per day; × 365 = \$365,000 per year, a recurring annual cost that persists until the consistency bug is removed. The fix is a shared feature store, not a better model.

5. A. A release carries weights, contracts and feedback effects. Stages trade speed for bounded risk and evidence; rollback is a drilled procedure, not a hope.

6. C. Detection is capped by labeled-outcome arrival. 1,000 labels at 100/day ≈ 10 days. Low-label domains need proxy signals (input drift, perplexity, cohort stats) instead.

7. T* = √(2·4,000/(500,000·0.40·0.92·0.002)) = √(8,000/368) = √21.7 ≈ 4.7, so about 5 days. If the release path takes longer than the optimum, the deployment path is the constraint.

8. Halving the minimum detectable effect quadruples the sample: (2/1)² = 4× more traffic to certify the smaller lift.

9. The model ranks items; users click what it shows them; those clicks become training labels. The model's choices shape the data it later trains on, so it amplifies its own prior behavior, a feedback loop. Positions it never shows never get clicked, which looks like evidence they were bad. The fix is logging propensity/exposure data and exploring deliberately, not trusting the organic click stream as a fair sample.

10. A fixed schedule is predictable but pays the run cost whether or not staleness warranted it; a trigger pays only when a monitor shows real decay, but can chase noise. The deciding number is the staleness model: T* = √(2C_r/(Q v A₀ δ)). If drift is slow and runs are cheap, a schedule is fine; if drift is spiky and runs are costly, a trigger priced by that interval wins. Either way the answer comes from the cost comparison, not a calendar habit.

11. D. An alert is a symptom, not a cause. Retraining without tracing the shifted term re-learns the failure; rollback helps only if the model itself is the cause; silencing the alert hides the symptom.

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol1/14-ml-ops.m4a) — a generated podcast walking this packet's argument.
