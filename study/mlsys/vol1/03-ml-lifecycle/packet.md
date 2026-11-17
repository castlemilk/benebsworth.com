# ML Lifecycle: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 3 of Volume I: the six-stage loop, constraint propagation, and the contracts that carry artifacts between stages.*

## Thesis

Deployment is not the end of the pipeline; it is where the lifecycle closes
into a ==loop=={Six stages (problem definition → data → model development → evaluation/validation → deployment → monitoring) each hand an artifact to the next, and monitoring feeds production evidence back to earlier stages because the world, not the code, keeps changing. A static model on a moving distribution degrades silently.}.
Each stage produces an artifact the next stage consumes: a measurable
objective, a versioned dataset, a trained model, a release manifest, a serving
endpoint, drift evidence, and each hand-off is a place where an unstated
constraint can become a ==late-discovery rework bomb=={The constraint-propagation principle: a constraint that exists but is never written into an early stage's contract doesn't vanish; it re-emerges at a downstream boundary after dependent decisions have hardened, and the rework bill is every affected artifact revised, retrained, and re-validated.}.
The running case, a diabetic retinopathy screener that needed to run on a
clinic device with ~500 MB spare, lost five months to a 4 GB model nobody
priced against the device until day 153. The fix is not more ML skill; it is
writing ==stage interface contracts=={Per-stage input contract, output contract, and quality invariant. A defect found at stage N walks back to the earliest boundary whose contract never stated the condition, in the day-153 case, problem definition, not deployment.},
separating evaluation (measurement) from validation (the release decision),
and running monitoring as a first-class stage with its own timescales.

## Guided notes

### The lifecycle as a loop

- The six stages chain artifacts: problem definition hands measurable
  targets; data collection/preparation hands a versioned dataset +
  preprocessing pipeline + measured delivery rate; model development hands a
  reproducible artifact; evaluation/validation hands a release manifest;
  deployment hands a serving endpoint; monitoring hands drift evidence back
  to earlier stages.
- ML diverges from traditional software on six axes the book tabulates:
  requirements (explicit spec vs statistical behavior discovered through
  data), development (code-centric vs data-and-code), testing (deterministic
  cases vs statistical performance on held-out data), deployment (binary vs
  statistical artifact whose validity is tied to a distribution),
  maintenance (patches vs retraining), and feedback (error reports vs
  distribution telemetry).
- ==Silent degradation=={Chapter 1's degradation equation returns here: accuracy erodes as production data diverges from training data, with no exception thrown. The artifact is untouched; the world moved. This is why monitoring exists as a stage, not an afterthought.}
  is the loop's justification: deployment starts an
  operational phase rather than ending a project.

::fig[lifecycle-loop]

### The running case: diabetic retinopathy screening

- The goal: screen diabetic patients for retinopathy in rural clinics, in
  the visit, without depending on intermittent uplinks. Deployment lands on
  an Orin-Nano-class edge device with 4–8 GB DRAM shared with the OS, camera
  pipeline, and clinic software, the model gets ~500 MB.
- The clinical bar is a floor pair, not a single accuracy number:
  >90% sensitivity (miss almost no real cases) and >80% specificity
  (don't swamp specialists with false referrals).

::eq[sensitivity]
$$
\mathrm{Sens} = \frac{\mathrm{TP}}{\mathrm{TP} + \mathrm{FN}}
$$

::eq[specificity]
$$
\mathrm{Spec} = \frac{\mathrm{TN}}{\mathrm{TN} + \mathrm{FP}}
$$

- Beede et al. 2020 shipped this exact system to Thai clinics, a model at
  specialist-level lab accuracy, and ~21% of clinic images came back
  ungradable:

::eq[ungradable-share]
$$
f_{\mathrm{reject}} = \frac{N_{\mathrm{ungradable}}}{N_{\mathrm{submitted}}} = \frac{393}{1838} \approx 0.21
$$

  Optical blur, low illumination, variable pupil dilation, and technicians
  with two weeks of training produced pixel distributions absent from the
  curated training set. ==Lab accuracy is evidence about curated inputs; it
  says nothing about the field=={The lab-to-field gap: training data cannot capture the full diversity of production conditions, cameras, operators, lighting, patient populations. Bridging it requires validation under production conditions, not higher test-set scores.}:
  and a rejected image is a patient sent home unscreened.

### The day-153 failure: constraint propagation

- The team built for five months; on day 153, deployment found the model
  needed 4 GB against the device's ~500 MB reservation. Months of data
  curation, training, and validation had hardened around an infeasible
  target. The five months of accuracy gains (92% → 94%) were discarded with
  the architecture.
- The ==constraint-propagation principle=={A constraint existing in the physical or operational environment but never bound into problem definition doesn't disappear. It resurfaces at the downstream boundary after dependent work has accrued, and the rework cost is every affected artifact revised, repeated, and re-validated. Deployment hardware dictates which models are realizable, not merely where they run.}
  names the mechanism. The rework bill:

::eq[constraint-rework]
$$
R = \sum_{a \in A_{\mathrm{dep}}} \bigl( c_{\mathrm{revise}}(a) + c_{\mathrm{repeat}}(a) + c_{\mathrm{validate}}(a) \bigr)
$$

- The book's illustrative repair: revise preparation, retrain new weights,
  repeat validation, repackage: a six-day sequential schedule *after* the
  five-month discovery, and only because the fix turned out feasible.
- Deployment paradigm (cloud / edge / mobile / TinyML) is therefore a
  stage-1 output, not a stage-5 decision. The paradigm choice constrains
  every downstream stage: a TinyML target imposes different data, model,
  and monitoring requirements than a cloud target.

::fig[day-153-cascade]

### Where the hours go: iteration tax

- CrowdFlower's 2016 survey: ~80% of practitioners named data collection
  or cleaning as their most time-consuming activity; model-focused work
  (mining, training sets, algorithm refinement) drew ~16% combined.
  ==Data engineering deserves explicit planning, not setup-work status=={Survey shares aren't a universal hour split, each team must find its own bottleneck. In the DR case, multi-grader labeling delays experiments more than training does, so the collection pipeline, not the trainer, is the first optimization target.}.

::chart[time-allocation]
- Wherever the hours concentrate, the binding constraint is cycle time.
  A weekly training loop tests ~26 candidates in six months; an hourly
  loop tests ~100, nearly 4× the search breadth:

::eq[iteration-tax]
$$
N_{\mathrm{ideas}} \approx \frac{T_{\mathrm{window}}}{t_{\mathrm{cycle}}}
$$

  The iteration tax is time spent waiting on training runs and validation
  pipelines; ==it buys search breadth, not accuracy=={Faster cycles don't guarantee a better final model: the book's scenario has the fast small model reach its accuracy ceiling early while the slow large model keeps climbing per-iteration. What the tax actually costs is optionality: fewer experiments means fewer chances to find the right family, not a slower path to a known one.}.
  Feedback loops (data fixes, validation reruns, production retriggers) are
  traversed repeatedly, so each cycle's length bounds what a team can learn.

::chart[iteration-tax]

### Stage ownership and interface contracts

- Ownership maps to D·A·M: problem definition sets requirements for all
  three axes; data owns D; model development owns A; deployment commits both
  to a physical M. Evaluation and monitoring own no axis, they verify the
  three work together, before release and continuously after.
- Every hand-off needs an explicit ==stage interface contract=={Input contract (what the stage requires), output contract (what it must deliver), and a quality invariant (what must hold for the stage to count as complete). Violations create technical debt that compounds downstream, the defect that travels silently until a later stage crashes on it.}:
  the book's six-row table is the skeleton:

  | Stage | Output contract | Quality invariant |
  |---|---|---|
  | Problem definition | Measurable objectives; paradigm; resource constraints | All success criteria quantifiable |
  | Data | Versioned dataset + preprocessing + validation rules | Distribution approximates production |
  | Model dev | Weights + config + experiment logs | Meets targets inside compute budget |
  | Eval/validation | Metrics by subgroup; failure analysis; release manifest | No critical subgroup below floor |
  | Deployment | Serving endpoint + instrumentation + rollback | Latency/throughput meet the SLA |
  | Monitoring | Drift alerts; review criteria; incident reports | Detection windows defined; degradation triggers review |

- The day-153 audit is the contract table earning its keep: deployment
  *found* the defect but didn't own it. Walk back the boundary chain:
  evaluation measured sensitivity (contract met), model development got no
  memory budget (never stated), problem definition handed off without
  recording the 500 MB limit, ==the fix starts at the earliest boundary
  whose contract never stated the condition=={Deployment found the defect; problem definition owned it. The audit trail also routes other defects differently: camera-drifted images → targeted collection; serving-vs-training resize skew → pipeline bug. Ownership is assigned by which boundary the condition should have been written at, not by where it surfaced.}.

::fig[contract-audit]

- Each stage also owns a term of the iron law's additive form:

::eq[iron-law-task]
$$
T_{\mathrm{task}} = \frac{D_{\mathrm{vol}}}{BW} + \frac{\mathrm{Ops}}{R_{\mathrm{peak}} \cdot \eta} + L
$$

  Capture resolution (data stage) sets $D_{\mathrm{vol}}$; the backbone
  (model stage) sets Ops; the device + runtime (deployment) sets
  $R_{\mathrm{peak}}$, $\eta$, and $L$. The stages and the terms are the
  same decomposition viewed from opposite ends.

### Stage 1: problem definition

- Requirements decompose into three coupled constraint layers:
  **statistical** (>90% sens / >80% spec across demographics and cameras,
  not aggregate accuracy), **physical** (edge device, 4–8 GB shared DRAM,
  ~500 MB reservation, ~2 Mbps uplink, result in-visit), **operational**
  (auditability, regulatory clearance, maintenance rules, including
  machine unlearning, where deleting a record's influence from weights is
  nothing like a SQL `DELETE`).
- The metric-vs-goal trap: in a population that is 90% healthy, "predict no
  disease" scores 90% aggregate accuracy while missing every case that
  matters. ==Training optimizes the metric it is given, not the goal it was
  given=={Amazon's 2018 recruiting tool is the canonical war story: trained on ten years of male-dominated hiring outcomes, it learned to penalize "women's" as a feature. The labels were the bias, no downstream stage can fix a contract that encoded the wrong objective.}.
  Translate the domain invariant (a missed diagnosis costs far more than a
  false referral) into a statistical contract: weighted loss, sensitivity
  floor, subgroup targets.
- Problem definitions evolve: one pilot clinic's calibrated camera becomes
  dozens of centers with different optics and demographics. Governance
  rules (which monitoring signals trigger re-evaluation, how threshold
  changes propagate) belong in stage 1, not in a post-launch panic.

### Stage 2: data collection and preparation

- The hand-off is a versioned dataset + preprocessing pipeline + validation
  rules + a *measured delivery rate*. Training reads ~$10^5$ fundus images
  many times in fresh random order each epoch; if the loader can't deliver
  as fast as training consumes, ==the accelerator idles however fast it
  is=={The feeding problem: scattered random reads defeat OS locality, and delivery shortfall is a stage-2 contract failure that shows up as low accelerator occupancy in stage 3. Measure the rate at the boundary; route the shortfall to its owner.}.
- Collection never ends: evaluation and production keep revising what gets
  collected (targeted collection for old cameras, synthetic augmentation
  for cataract-heavy cohorts). Data work is a stage with a contract, not
  a milestone to clear.

### Stage 3: model development and training

- Accuracy-vs-efficiency is decided here but priced by stage 1's physical
  layer. MobileNetV2-class backbones (~14 MB FP32 weights, ~600 MFLOPs per
  inference via depthwise separable convolutions, ~8–9× cheaper than
  standard convs) fit the 500 MB reservation with room for runtime and
  activations; a competition-winning 50-model ensemble does not.
- ==Reproducibility is the stage's quality invariant=={A +1pp gain Tuesday that won't reproduce Thursday is indistinguishable from noise. Floating-point addition is non-associative, parallel accumulation order varies per run, so identical code yields slightly different weights. Recording a seed is necessary but not sufficient; bound the variation across repeated runs.}:
  the deliverable is a *reproducible system artifact*: weights + inference
  code + environment spec + configuration, linked to dataset version,
  training code, and hyperparameters. Data-as-code: a changed training set
  changes learned behavior as surely as changed code.

### Stage 4: evaluation and validation

- ==Evaluation measures; validation decides=={Model validation is the evidence-based release decision for a specified use: does the integrated software+hardware pipeline meet latency targets, subgroup floors, robustness under shift, and cost budgets? Test-set accuracy supplies part of the evidence; it cannot certify safety under every condition. Three things share the word "validation", the data partition (guides model selection), data validation (stage 2's schema checks), and this release decision. Keep them separate.}.
- First check: does any operating point exist? Sweeping the classification
  threshold traces the ROC curve; the release floors define a pass region:

::eq[operating-point]
$$
\exists\, \tau:\ \mathrm{Sens}(\tau) \ge 0.90 \ \land\ \mathrm{Spec}(\tau) \ge 0.80
$$

  If no threshold hits the corner under intended conditions, the candidate
  fails before any deployment question is asked.

::fig[roc-corner]

- Stratified evaluation splits by age brackets, conditions, camera models:
  94% aggregate sensitivity can hide <80% on cataracts or low-light
  clinics. Calibration checks predicted confidence against observed
  accuracy. The test set is evidence *after* selection; reusing it to
  select models weakens its independence.
- Output: a release manifest: what was measured, on what data, against
  which floors, including subgroup and regression evidence.

### Stage 5: deployment and integration

- Requirements: serving endpoint, monitoring instrumentation, rollback
  procedures, integration tests pass and latency/throughput meet the SLA.
  For a regulated device, staged rollout follows a predetermined
  change-control plan; exposure limits apply while outcome evidence
  accumulates.
- ==Rollback is containment, not restore=={An ML model's validity is coupled to the data distribution it trained on. Rolling back the binary doesn't restore the past data distribution, the old model may also misbehave on today's inputs. Fast rollback buys time for a real fix; it is not a restore point.}.

### Stage 6: monitoring and maintenance

- Four metric categories on different timescales:
  - **Model performance** (delayed, needs ground truth): sensitivity alert
    below 88% vs the 90% target; any demographic subgroup >5pp under
    baseline.
  - **Proxy metrics** (immediate, no labels): confidence distribution,
    referral rate (±15% alert), image-quality rejection rate (>20% alert).
  - **Operational**: p95 latency target 50 ms / alert at 100 ms, queue
    depth, error rate <0.1%.
  - **Data stability**: feature and prediction distributions vs baseline
    (PSI, KS tests), flags input shifts before labels arrive.
- The alert hierarchy matters: missing a target opens a review; crossing an
  alert threshold escalates it urgent; ==neither threshold alone chooses
  retraining=={Pipeline thrashing, retraining on a transient one-day referral spike, is as real a failure as ignoring a sustained shift. Match response cadence to signal trustworthiness: minutes for a misconfigured camera, days for proxy drift, weeks for labeled accuracy, months for coverage, quarters for architecture.}.
- The labels trap: routine care grades only *referred* patients; the model's
  "healthy" calls are never re-checked. Sensitivity in the field is
  unmeasurable unless the team labels a sample of unreferred images: a
  data path monitoring must build, via off-hours uploads of sampled images
  for central grading.
- Multi-scale feedback: loops run minute → quarterly, ~5 orders of
  magnitude. Emergent behavior lives in the gaps: a network-wide
  sensitivity drop in one age group can be invisible at every individual
  clinic.

::fig[feedback-timescales]
- The camera-upgrade scenario ties it together: new fundus cameras shift
  color profiles → data-stability alert fires fast → sensitivity loss
  confirmed only when labels arrive → remedy re-enters the lifecycle at the
  owning stage and exits through the same release checks.

### Systems thinking and fallacies

- Three structural mechanisms explain the coupling: backward constraint
  propagation (day-153), multi-scale feedback (no single clock), and
  emergent behavior (no single vantage point). Modular decomposition alone
  doesn't engineer this system.
- The chapter's fallacies, condensed: "ML follows traditional software
  workflows" (data-derived behavior needs its own discipline); "data prep
  is a one-time preprocessing step" (distributions keep moving; validate
  continuously); "passing evaluation means deployment-ready" (curated
  accuracy ≠ production readiness, see 21% ungradable); "collect more
  data" (measure marginal value per subgroup, not dataset size); "skip
  validation to ship faster" (risk transfers to production traffic);
  "pick the deployment target later" (the day-153 failure in one sentence).

## The physics

| Quantity | Value | Where it binds |
|---|---|---|
| Device model reservation | ~500 MB | Stage 1 physical layer; day-153 failure at 4 GB |
| Shared DRAM on device | 4–8 GB | OS + camera pipeline + clinic software compete |
| Sensitivity floor | >90% | Validation pass region; alert fires at ~88% |
| Specificity floor | >80% | Specialist referral capacity |
| Ungradable field share | 393/1838 ≈ 21% | Beede 2020; the lab-to-field gap measured |
| Practitioner data-work share | ~80% most-time | CrowdFlower 2016; planning weight for stage 2 |
| Iteration capacity | ~26 vs ~100 ideas / 6 mo | Weekly vs hourly cycle; ~3.8× search breadth |
| MobileNetV2 footprint | ~14 MB FP32, ~600 MFLOPs | Fits reservation with runtime headroom |
| Latency target / alert | p95 <50 ms / >100 ms | Monitoring operational tier |
| Feedback timescale span | minutes → quarters, ~10⁵× | Multi-scale monitoring design |

## Glossary

- **Constraint propagation principle**: a constraint that exists but is never bound into an early stage's contract re-emerges downstream after dependent decisions harden; rework costs every affected artifact revised, repeated, and re-validated.
- **Iteration tax**: time spent waiting on slow training and validation cycles, priced in candidates never tested per window rather than in wall-clock pain.
- **Lab-to-field gap**: the accuracy difference between curated development data and production inputs: cameras, operators, lighting, populations that training never sampled.
- **Stage interface contract**: per-stage input contract, output contract, and quality invariant; violations become technical debt that compounds through later stages.
- **Model validation**: the evidence-based release decision for a specified use, latency, subgroup floors, robustness, cost, distinct from evaluation, which only measures.
- **Release manifest**: validation's output artifact: what was measured, on what data, against which floors, with subgroup and regression evidence.
- **Reproducible system artifact**: model development's deliverable: weights + inference code + environment spec + configuration, plus lineage back to dataset and training config.
- **Feeding problem**: the data-loader delivery rate versus training consumption; a shortfall idles the accelerator regardless of its peak rate.
- **Proxy metrics**: label-free production signals (confidence, referral rate, rejection rate) that flag possible model issues while ground truth is still arriving.
- **Emergent behavior**: failures visible only at fleet scale: a subgroup sensitivity drop no single clinic sees often enough to detect locally.
- **Pipeline thrashing**: reacting to short-term variance with a slow-cadence remedy, e.g. retraining on a one-day referral spike.
- **Machine unlearning**: removing one record's influence from trained weights: the operational layer's answer to deletion rights, far messier than `DELETE`.

## → Ben's world

- **The droplet co-location argument was constraint propagation done right.**
  Four polling products on one ~\$24/mo box beat per-request serverless *for
  that workload*: the constraint (polling duty cycle, fixed capacity) was
  bound at design time, not discovered at deploy time. Day-153 is what the
  alternative looks like.
- **The benchmark harness is stage 3+4 with contracts.** `results.json` merge
  protection + `source: 'seeded'` disclosure is lineage tracking; the
  `BUST=1` honest-sweep distinction is exactly evaluation-vs-validation:
  structural pass (evaluation) vs behavioral checks under `chromium partial`
  (validation). A harness without the second half measures and never decides.
- **flaggr/telesis on the droplet: monitoring as a stage.** The uptime
  platform's alert tiers (immediate proxy-style signals vs slower aggregate
  views) mirror the four-category hierarchy, and its rollout story is why
  staged exposure exists.
- **doc-analyser/greenveil: the operational layer is the product.**
  Auditability and data-lineage requirements were stage-1 constraints there
  (regulated-ish document processing), which is why the architecture
  pre-gates secondary reads rather than discovering the cost constraint in
  production.

> [!connection] The iron law is the contract language
> Chapter 1 gave the time equation; this chapter assigns each term an owner.
> `D_vol`, `Ops`, `R·η`, `L` are respectively the data, model, and deployment
> stages' deliverables: the interface contracts are literally the iron law
> written as an org chart.

## Open questions

1. The book's rework equation prices each affected artifact equally. In
   practice validation re-runs dominate: is there a clean way to weight
   $c_{\mathrm{validate}}$ by downstream dependency depth?
2. Unreferred-image labeling solves the sensitivity blind spot but creates
   a grading budget question: what sampling rate makes field sensitivity
   measurable at acceptable cost? Does the book ever price it?
3. Stage contracts assume a human team per boundary. In a one-person
   project (this site, the harness) the contracts collapse to checklists:
   which invariants survive the collapse and which exist only for hand-offs?
4. Machine unlearning is flagged as an operational constraint but not
   priced. If a clinic exits the program, is retraining-without-their-data
   the only real option at DR scale?

## Figures to look at in the book

Reference links appear alongside the discussion above; open the source book for
the full figures, captions and surrounding prose.

- [`fig-lifecycle-overview`](#fig-lifecycle-overview): the six-stage loop with
  artifacts on the edges: the figure the whole chapter defends. Ours
  ([`lifecycle-loop.svg`](#fig-lifecycle-loop)) distils the same cycle with
  the operational phase shaded.
- [`fig-ml-lifecycle`](#fig-lifecycle-detail): the dual-pipeline detail view
  (upper data pipeline, lower model pipeline) with named feedback arrows.
- [`fig-ds-time`](#fig-ds-time): the CrowdFlower pie: 60% cleaning, 19%
  collecting: the survey anchor for where the hours go.
- [`fig-eye-dr`](#fig-eye-dr): the actual fundus photographs: gradable vs
  ungradable makes the 21% reject share visceral.
- [`vol1_ml_lifecycle_margin_003.svg`](#fig-roc-corner): the ROC pass corner:
  the threshold sweep must reach Sens ≥ 0.90 ∧ Spec ≥ 0.80.
- [`ml_lifecycle_feedback_timescales.svg`](#fig-feedback-timescales): the
  five-bar log-scale ladder: monitoring loops spanning minutes to quarters.
- [`vol1_ml_lifecycle_margin_001.svg`](#fig-iteration-tax-bars): the margin bars:
  ~100 experiments hourly vs ~26 weekly over six months; our `iteration-tax`
  chart plots the same arithmetic.
- [`fig-ml-lifecycle-feedback`](#fig-feedback-paths): the named upstream
  return paths (data gaps, validation issues, performance insights) drawn
  across stages 2–6.

## Essay candidates

- *The day-153 failure*: constraint propagation as an org-design problem:
  why "we'll pick the deployment target later" is the most expensive sentence
  in ML engineering, told through five months of discarded DR work.
- *Evaluation measures, validation decides*: the test-set-accuracy cargo cult,
  the ROC pass corner, and what a release manifest actually is, with the
  harness's `BUST=1` sweep as the worked local example.
- *Monitoring is a stage, not a dashboard*: four metric categories, five
  orders of feedback timescale, and the unreferred-patients labeling trap.
