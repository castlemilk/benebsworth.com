---
openingQuestion: "Your recommender returns HTTP 200 on every request, holds 99.99% uptime, and sits inside its p99 budget, while click accuracy slides 94% to 88% over four weeks. Nothing pages anyone. What failed, and what do you build first?"
---

# ML Operations: Study Packet

*Working through [ML Operations](https://mlsysbook.ai/vol1/14_ml_ops/14_ml_ops.html), chapter 14 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

Every prior chapter optimized a model inside a controlled loop; this chapter runs a ==closed loop you didn't schedule=={DevOps inherits automation for crashes, latency and availability. ML adds a failure mode those controls cannot see: predictive correctness can decay while every health check stays green.}. The recommender's dashboards are honest about infrastructure and silent about semantics, ==the model is a claim, not a binary=={A release carries weights, learned parameters, drift behavior, and feedback effects, not just code. Statistical quality degrades as the world moves; binary health cannot express it.}. The chapter's spine is the loop that catches it: [monitor, decide, release, repeat](#fig-ops-loop).

> [!note] Reading the marks
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### Silent Failure: Green Dashboards, Red Quality

- A serving cluster can return HTTP 200 on every request, stay inside tail latency, and pass every health check while ==the predictions lose relevance week after week=={The chapter's ranking service slides 94%→88% click accuracy over four weeks after a competitor's promotion shifts what users click, zero alerts, because uptime and latency measure the machine, not the model.}.
- Detection has a ==time signature=={Acute drops, gradual drift, and localized cohort decay each call for different detectors and different responses. The four-week slide is the gradual signature: trend analysis on accuracy, invisible to uptime.}: acute drop, gradual drift, cohort decay.
- Five principles gate the loop: reproducibility, separation of concerns, the ==consistency imperative=={Offline training and online serving must compute the same features, or skew corrupts predictions regardless of model quality.}, observable degradation, and cost-aware automation.

::fig[green-but-dying]

### Technical Debt: Where the Coupling Hides

- Sculley's audit of Google's production systems found a mature system can end up at most ==5% machine-learning code and 95% glue=={Integration wrappers shuttling tensors and records between frameworks, feature pipelines and serving engines. The maintenance surface is integration code, not the model.}.

::chart[glue-share]

- The debt patterns group by where the coupling hides: ==boundary erosion=={Statistical software loses modular boundaries: features entangle, and a change to one input silently shifts dependent outputs. Data contracts (allowed ranges, null tolerances, drift thresholds) rebuild the boundary at runtime.}, ==correction cascades=={A model trained to correct another model's errors creates a fragile dependency chain, fixing the upstream model breaks the downstream corrector.}, and ==undeclared consumers=={Downstream systems that consume outputs without a contract break silently when the model updates. No import statement declares them; only lineage does.}.
- Feedback and configuration accumulate: the model's own rankings shape the clicks it later trains on (the loop feeds itself), and config sprawl turns hyperparameters into an unversioned shadow codebase.

::fig[debt-map]

### Development Infrastructure

- The consistency imperative needs machinery: ==shared feature stores=={One feature-extraction implementation invoked identically offline and online. The skew example prices the alternative: 1M requests/day at 1% skew-induced errors and \$0.10 per error loses \$1,000 a day, \$365,000 every year until the cause is removed.}, versioned datasets/schemas/configs, and CI/CD pipelines that parity-test training against serving.
- Reproducibility is a function, not a hope: the same output requires the same pipeline inputs.

::eq[model-output]
$$
\mathrm{Output}=f(\mathrm{Code}_{v},\mathrm{Data}_{v},\mathrm{Config}_{v},\mathrm{Env}_{v})
$$

::eq[skew-loss]
$$
L_{\mathrm{day}}=Q\cdot r_{\mathrm{skew}}\cdot c_{\mathrm{err}}
$$

### Releasing Models

- A model release carries more than a binary: weights, feature contracts, drift behavior and feedback effects all ship together. The candidate earns traffic in stages, ==shadow, canary, blue-green=={Shadow serves the candidate against live traffic without answering; canary takes a small real slice; blue-green swaps fully with an instant revert path. Each bounds the blast radius differently.}, and rollback is a drilled procedure (runbooks, drills, calibrated triggers), not a hope.
- Evidence for a stage advance is a comparison under controlled conditions: delayed conversions make the attribution window part of the test design, and novelty effects inflate early numbers.

::fig[release-ladder]

### Production Monitoring

- Drift detection is statistical, not binary: ==PSI for binned features, KS for continuous, JS divergence for symmetric bounded comparison=={Each needs an alert threshold, and sample size complicates it: the KS critical threshold shrinks ~1/√n, so millions of requests flag shifts far below practical significance. Thresholds must mix statistical and business significance.}.
- Detection is ==bounded by labeled-outcome arrival=={At 1 label/second a detectable sample collects in ~17 minutes; at 100 labels/day it takes ~10 days. Low-volume or delayed-label domains need proxy signals, perplexity on live traffic, input drift, cohort stats.}, which can lag traffic by orders of magnitude.
- Monitoring itself has a price, and a price of skipping it: five prevented incidents at \$50K each against \$50K of monitoring spend is a 5× benefit/cost.

::eq[mde-sample]
$$
n\propto\frac{\sigma^{2}}{(\mathrm{MDE})^{2}}
$$

### Retraining Decisions

- The packet's deciding comparison: ==staleness accrues, runs cost=={Accuracy decays at rate δ per day; each run restores it for a fixed cost C_r. Total cost per unit time = C_r/T + accrued staleness over the interval. The minimum lands where amortized retraining meets accrued staleness.}. For the ranking service: \$5,000 a run, 1M queries/day, \$0.50 per unit accuracy per query, 0.24%/day decay → **T\* ≈ 3 days**.

::eq[retrain-interval]
$$
T^{*}\approx\sqrt{2C_{r}\,/\,(Q\,v\,A_{0}\,\delta)}
$$

::chart[retrain-cost]

- T\* shorter than the deployment path means ==the economics outrun the team=={A 3-day optimum with a week-long release process is unachievable, the fix is shortening the update path, not accepting staleness.}, so the update path itself becomes the constraint.
- Scheduled vs triggered: a fixed cadence is predictable; a drift trigger pays only when needed but can chase noise. The staleness model prices both.

::fig[retrain-clock]

### Incident Response, Governance, and Maturity

- ML incidents need ==diagnosis before remediation=={An alert names a symptom (drift, skew, degradation); the cause can be data, model, or infrastructure. Retraining on new data does not resolve distribution shift if the shift lives in a broken feature, trace to the term before spending a run.}: the same p99 can hide three different causes.
- The ML test score turns readiness debates into measurable criteria; maturity levels move a team from manual pipelines to automated closed loops.
- Investment economics: the control to add next is the one whose prevented loss exceeds its cost, monitoring, then parity tests, then automated rollback, sized to model criticality.

### Case Studies

- The ==ranking service=={Drifts daily; clicks label within hours; its own rankings shape the clicks it trains on, a feedback-rich regime where freshness and loop-awareness dominate.} and the ==keyword spotter=={200 KB INT8 on a microcontroller with 4 MB flash; radio and flash writes draw on a tiny energy budget; left it six months and detection fell four points below target, a power-bound, reach-constrained regime where OTA updates and on-device health dominate.} are the two regimes: labels fast and feedback-loopy vs labels scarce and unreachable.
- ClinAIOps transplants the same loop to clinical care, hypertension management as three coupled loops (patient-AI, clinician-AI, patient-clinician), where fatigue and accountability reshape the controls.

### Fallacies and Pitfalls

- ==Green dashboards as model health=={Availability metrics cannot express predictive correctness; add statistical monitors.}.
- ==Retraining as the fix for shift=={Retraining without diagnosing what shifted re-learns the same broken feature.}.
- ==Accuracy alert = root cause=={An alert is a symptom; data, model and infrastructure causes need different fixes.}.
- ==Rollout as a binary event=={A release is a sequence of evidence gates with a revert path, not a flag flip.}.
- ==More monitoring as more safety=={Sample-size-sensitive tests flag insignificant shifts; unactioned alerts train teams to ignore real ones.}.

### Summary

- MLOps closes the loop the earlier chapters opened: the model becomes a maintained claim, monitored, decided upon, and re-released continuously.
- Debt lives in the couplings (data-model, model-infrastructure, production-monitoring); contracts and parity tests pay it down.
- The deciding instrument is the staleness model: T\* = √(2C_r/(Q v A₀ δ)) prices the interval against the run, the economics, not the calendar, set the cadence.
- Every stage of the loop has its own number: 5%/95% glue share, \$1K/day skew loss, ~17 min vs ~10 days detection bound, 5× monitoring benefit/cost, ≈3-day optimal interval.

::fig[ops-loop]

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
