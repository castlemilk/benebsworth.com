---
title: "14-robust-ai — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html"
canonical_url: "https://benebsworth.com/study/vol2/14-robust-ai/"
---

## Thesis

Latency dashboards stay green and uptime counters keep climbing while a deployed model quietly stops being right. That is the failure shape this chapter is built against: predictions becoming statistically unreliable without tripping any conventional health signal. The environment moves underneath a frozen training snapshot, an attacker optimizes against the decision boundary, or the serving machinery itself corrupts a value — and every one of the three produces the same surface symptom, falling accuracy with clean infrastructure.

**Robustness is the discipline of producing evidence about whether predictions remain useful, then tying that evidence to bounded responses.** The evidence costs compute, communication, or coordination — the three currencies the rest of this volume spends — and the responses, from drift-triggered retraining to per-request abstention to replica quarantine, are never free either. A robustness design is therefore a budgeted contract, not a property you bolt onto a model.

## Accuracy Is Not Evidence of Correctness

The chapter opens with failures that clean evaluation never saw. Google Photos' labeling failure hid inside aggregate accuracy because the harmful errors concentrated on one population slice — **a fleet-wide average can hide a severe subgroup failure.** The 2018 Uber test vehicle detected the pedestrian 5.6 seconds before impact but recognized the collision course only at 1.2 seconds, because object classification toggled between 'vehicle', 'other', and 'bicycle', resetting the trajectory history on each reclassification. Mars Polar Lander's descent engines cut early on a spurious touchdown indication. Boeing's 787 carried a latent counter overflow that only surfaced after 248 days of continuous uptime — a hazard no short endurance test can reach.

The unified framework then shows the microscopic version. Flip one exponent bit of an FP32 weight — bit 30 of a weight at 0.042, and the value scales by 2^128 into roughly 1.4e37. The corrupted weight is finite, so it passes every NaN and infinity check; whether it dominates the output depends on the input and downstream weights, but every forward pass of a dense GPT-3-class model reads all 175 billion parameters, whose 350 GB footprint already exceeds an 80 GB accelerator's memory and lives distributed across the fleet. Replication does not remove this weakness: one corrupted gradient in an AllReduce step reaches every replica.

## Three Pillars, Three Evidence Families

Robust AI decomposes into three pillars because the three failure families produce different evidence and demand different responses. Environmental shifts are statistical: population statistics move, and the evidence is a divergence measurement. Input-level attacks are adversarial: someone optimizes against your decision boundary, and the evidence is a stress test under a stated threat model. System-level faults are physical and logical: a bit flips, a preprocessing library changes a default, and the evidence is behavioral, outputs violating invariants the correct system satisfies.

![Three pillars, three evidence families](https://benebsworth.com/study/vol2/14-robust-ai/diagrams/silent-failure-triangle.svg)

*Environmental shifts produce statistical evidence, input-level attacks produce adversarial evidence, and system-level faults corrupt the machinery that produces both. The evaluation matrix needs one row per pillar plus a per-request competence row, because a passed test in one row proves nothing about another.*
The decomposition matters because **each pillar suggests a different intervention and more than one cause can be active at once.** Retraining answers confirmed drift but teaches the model a preprocessing bug. Adversarial training hardens the boundary but does nothing for stale priors. A checkpoint rollback fixes corrupted weights but not the attacker's suffix. Three mechanisms recur across all pillars: detection (ECC memory, drift monitors, adaptive attack evaluation), containment (range checks, rollback, rate limits), and adaptation (retraining, adversarial training, robust aggregation). The evaluation matrix therefore needs one row per pillar plus a fourth row for per-request competence, because passing any single row proves nothing about the others.

## The Fleet Compounds Rarity

Assume a residual silent-corruption probability of 10^-4 per device per hour, after ECC and scrubbing have done their work. Across a fleet, independence compounds:

**Eq 1 · Fleet silent-corruption probability**
$$
\Pr(\geq 1)=1-(1-p)^{N}\approx 0.63\qquad(p=10^{-4},\;N=10^{4})
$$

At 10,000 devices the fleet expects at least one silent error in more than half of all hours. Per-device reliability numbers, however impressive, do not transfer: what is a tail event on one accelerator is a routine operational event at fleet scale, which is why verification and checksumming are architectural requirements rather than paranoia.


**One device is rare; a fleet is routine**

| independent devices | P(>= 1) per hour at p = 10^-4 |
|---|---|
| 100 devices | 0.01 |
| 1,000 devices | 0.095 |
| 10,000 devices | 0.632 |

*Probability of at least one silent-corruption event per hour, computed from the fleet formula at residual rate p = 10^-4 per device-hour. At 10,000 devices the fleet expects an event in more than half of all hours: per-device reliability becomes a coordination cost.*

The same multiplication governs training. A large run reads its full weight footprint every step, so a corrupted resident value participates in every subsequent update until something detects it. Quantization, pruning, and distillation complicate the picture further: **a smaller model is not automatically a more reliable one.** Compression can shrink the robustness margin, the slack the network has to absorb perturbations before behavior changes, even when clean accuracy holds.

## Name the Shift by What Stays Fixed

Distribution shift is three different problems wearing one name, separated by which probability stays fixed. Covariate shift moves the input distribution P(X) while the labeling rule P(Y|X) holds: a perception model trained on daytime images meets night. Because the rule is fixed, importance weighting can reweight existing labeled data, but only where training data cover the new inputs, since no weight recovers a region with no examples. Label shift moves the prior P(Y) while each class's input distribution P(X|Y) holds: a case mix changes during an epidemic. The fixed confusion matrix lets operators invert it to estimate new prevalence and recalibrate without retraining. Concept drift moves P(Y|X) itself: the correct label for the same input changes, as fraud adapts to the detector. That is the expensive one, remediation requires fresh outcome labels, and **input-level monitoring stays silent because P(X) may not move at all.**

The cow-on-the-beach failure names why even benign shift hurts: the model learned "grass" as evidence for "cow," a spurious correlation that empirical risk minimization happily favors when it predicts training labels well. Group distributionally robust optimization minimizes worst-case group loss instead of average loss, but only for groups you can name in advance.

The cleanest evidence that shift costs even when nothing visibly changed is ImageNet-V2: researchers rebuilt the validation set a decade later following the original collection protocol, and every one of the 212 models scoring at least 55 percent on the original lost accuracy on the new one. 7 to 14 points, median 12, along a nearly straight line.


**A same-recipe test set costs every model**

| gap across the evaluated models | points lost on ImageNet-V2 |
|---|---|
| minimum | 7 |
| median | 12 |
| maximum | 14 |

*Reported accuracy drop on ImageNet-V2 across 212 models scoring at least 55 percent on the original validation set: every model loses 7 to 14 points, median 12, and the loss tracks accuracy nearly linearly. Held-out accuracy is an optimistic estimate of the next population, not a prediction of it.*

No architecture, recipe, or extra data closes the gap. **Held-out accuracy is an optimistic estimate of the next population of inputs, not a prediction of it.**

## A Fired Metric Is Not a Retraining Command

Drift measurement exists to answer an operational question, serve, investigate, or retrain, not to decorate a dashboard. PSI is the cheap fleet-wide alert, built bin by bin so the total decomposes into per-bin contributions that show which feature range moved:

**Eq 2 · Population stability index**
$$
\mathrm{PSI}=\sum_{i=1}^{B}(c_{i}-r_{i})\ln\frac{c_{i}}{r_{i}}
$$

The convention bands (0.1, 0.25) are monitoring conventions from credit-scoring practice, not universal statistical guarantees, a large shift in a nonpredictive feature can be harmless while a small shift in a safety-critical slice demands containment. Binning is part of the hypothesis: boundaries frozen on the reference, a smoothing constant for empty bins, recorded alongside the monitor config. For continuous features the Gaussian closed form is exact for the fitted densities:

**Eq 6 · Gaussian KL divergence**
$$
D_{\mathrm{KL}}=\ln\frac{\sigma_{c}}{\sigma_{r}}+\frac{\sigma_{r}^{2}+(\mu_{r}-\mu_{c})^{2}}{2\sigma_{c}^{2}}-\frac{1}{2}
$$

The chapter's fraud-detection worked example is the discipline made concrete. Three calibrated triggers. PSI above 0.1 on a high-importance feature, KL above 0.05, a KS test at the Bonferroni-corrected per-test level, split their evidence: country PSI stays inside baseline, amount KL crosses into investigate, and the KS statistic rejects even at a level tightened tenfold (the critical value grows only with the square root of log(2/α), so statistical significance is cheap to buy with large samples). The decision matrix reads them together: continue serving with weekly instead of monthly monitoring while investigating. **Statistical significance alone does not mandate retraining; practical significance is the question.** And the delayed labels still owe the harder answer, whether the fraud rule stayed fixed (covariate shift, reweightable) or moved (concept drift, fresh labels needed).

![A fired metric is not a retraining command](https://benebsworth.com/study/vol2/14-robust-ai/diagrams/drift-decision.svg)

*The three-level framework: calibrated alerts automate detection only; performance correlation splits investigation into three cases; the decision rules pick among update, investigate-first and continue-monitoring. Statistical significance alone never commands a weight update.*
The three-level framework generalizes this: alerts automate detection only; performance correlation splits investigation into drift-with-degradation (isolate slices, consider retraining), drift-without-degradation (elevated monitoring), and degradation-without-drift, the case the feature dashboard cannot explain, pointing at joint-feature change, concept drift, or a fault. When an update is warranted, adaptation is budgeted: online learning bounds update frequency and state size, Elastic Weight Consolidation penalizes drift away from parameters important to earlier behavior, and federated updates pay in communication rounds and transmitted bytes. Monitor design itself is part of the hypothesis: comparing Monday traffic with Sunday traffic manufactures alerts, while averaging across a week hides a one-hour failure.

## The Risk-Coverage Curve Is the Serving Contract

Population monitors ask whether traffic changed in aggregate. But a stable daily PSI can coexist with one rare, dangerous out-of-distribution request, so serving needs a per-request contract assembled from three signals: calibration (does a 0.8 score mean 80 percent correct), out-of-distribution scoring (how unlike the request is from validated inputs, a calibrated classifier can stay confidently wrong on unfamiliar inputs), and selective prediction, which turns both into an action policy:

**Eq 3 · Coverage and selective risk**
$$
\mathrm{coverage}(\tau)=\Pr(X\in A),\qquad \mathrm{risk}(\tau)=\mathbb{E}[\ell\,|\,X\in A]
$$

![The risk-coverage curve is the serving contract](https://benebsworth.com/study/vol2/14-robust-ai/diagrams/risk-coverage.svg)

*Raising the acceptance threshold moves along the curve: lower accepted risk at lower coverage, but only when the score orders requests by error well. The rejected tail prices the fallback path in queue and reviewer capacity.*
Raising the threshold reduces coverage but lowers accepted risk only when the score actually orders requests by error, measured on the deployment population, not assumed. And **the rejected traffic does not disappear:** it lands on a fallback path that needs queue, reviewer, or secondary-model capacity provisioned within the original latency budget. If labels arrive days later, the system monitors scores immediately but cannot confirm selective risk until outcomes return; conservative thresholds limit exposure during the gap.

## Conformal Is a Marginal Promise

Conformal prediction offers the strongest contract in the chapter, a finite-sample coverage guarantee with no distributional assumption beyond exchangeability:

**Eq 4 · Conformal finite-sample coverage**
$$
C(X)=\{y:s(X,y)\leq q\},\qquad \Pr(Y\in C(X))\geq 1-\alpha
$$

The (n+1) rank correction is what makes it finite-sample rather than asymptotic. But read the promise precisely: coverage is marginal, averaged over the calibration sample and the test point. **it is not conditional on any subgroup, and a rare slice can be poorly covered while the aggregate number holds.** The guarantee also inherits its assumptions: distribution change between calibration and serving can invalidate exchangeability, and repeatedly tuning against the same calibration outcomes makes the evidence adaptive. Production systems therefore version predictor, score, calibration snapshot, and target miscoverage together. Larger prediction sets are honest uncertainty but also operational load: their tail distribution prices the review path exactly as the risk-coverage curve does. Conformalization does not protect against arbitrary shift.

## Attacks Are Priced by Access

Adversarial examples are not a bug to patch but a structural property of high-dimensional models trained by empirical risk minimization. Even a linear score is sensitive to many small aligned changes: move every coordinate by its full budget in the direction of its weight's sign and the total shift grows with input dimension, though no single coordinate moves visibly. FGSM turns that into a one-step attack:

**Eq 5 · Fast gradient sign method**
$$
x'=x+\epsilon\cdot\mathrm{sign}(\nabla_{x}\ell(\theta,x,y))
$$

At a perturbation budget of 0.007 it flips GoogLeNet from panda at 57.7 percent confidence to gibbon at 99.3 percent, more confident in the wrong answer than the right one. The first-order reason is alignment: gradient-directed signs all push the same direction, while independent zero-mean noise cancels in the sum.

The useful taxonomy is access, not attack names. White-box gradients buy FGSM in one step and PGD's iterative refinement at the price of repeated backward passes; C&W trades perturbation size against misclassification confidence as constrained optimization, and broke defensive distillation, the early gradient-masking defense. Black-box attackers spend queries or train surrogates, exploiting transferability: adversarial examples crafted against one model frequently fool different models trained on similar tasks. Physical attackers spend control over the sensed environment, small calibrated stickers on a stop sign that read as a speed-limit sign across distances, angles, and lighting. **Every mechanism reveals a cost the defense must raise: gradient access, optimization time, surrogate construction, or physical control.**

## Defenses Spend the Same Budget

The defense workflow starts from the threat model, not the technique menu. Adversarial training. PGD approximating the inner search for high-loss inputs, the outer loop training on them, is the empirical workhorse, and it costs several times more compute per epoch because every batch runs inner attack steps. In fleet terms the multiplier lands on the per-device compute term; adding workers buys communication cost, not free epochs. Randomized smoothing is the certified alternative: a certificate bounds prediction stability within its stated input, norm, radius, and assumptions, the only guarantee in the chapter, and pays for it in noise samples on every certified request, which is why certification often belongs on an asynchronous audit path or a selective serving path rather than the latency-critical main line.

Detection techniques screen inputs, but the evaluation discipline is the load-bearing wall. RobustBench exists because evaluation kept flattering defenses: under one standardized attack ensemble at a fixed threat model, the best under-attack accuracy on CIFAR-10 climbed steadily from 2018 to 2024 while clean accuracy stayed high, yet four published defenses with high clean accuracy fall below 5 percent under attack, the signature of non-adaptive evaluation. **Empirical evaluation must be adaptive to the defense: optimize through preprocessing, average over randomness, include the full pipeline.** A passed PGD test is evidence for one model, norm, budget, and restart count, nothing more. And MNIST-C/ImageNet-C measure common corruptions, a different cell of the matrix from worst-case attacks.

## Poisoning Defenses Are Four Ordered Gates

Inference-time defenses assume the training corpus was trustworthy. Poisoning attacks violate that assumption upstream, and Microsoft's Tay, subverted within a day of launch, is the reminder that any system learning from live interaction makes every user a potential contributor of training evidence. Aggregate validation accuracy cannot clear a corpus: a targeted attack is designed to hide inside normal performance, and clean-label poisoning keeps every label correct while corrupting features, defeating label audits entirely.

The defense runs as four ordered layers along the data path. Ingress controls establish provenance and least-privilege access, a training job allowed to read unverified sources is an attack surface, and promotion to the production registry alias belongs to a narrow audited set so compromised researcher credentials cannot replace the live model. Anomaly detection and sanitization inspect candidates: Z-score and Mahalanobis checks are cheap enough for ingestion but catch only statistical outliers, so learned representations carry the harder cases, with the caveat that autoencoders can reconstruct unfamiliar inputs well and even learn the attack pattern from a contaminated reference. Spectral signatures exploit the backdoor's internal signature: poisoned records force the network to learn both genuine features and the trigger pathway, shifting the poisoned subpopulation's mean activation and creating a variance spike along the top singular vector. Influence functions approximate which training points most shaped a suspicious test behavior without retraining:

**Eq 8 · Influence of a training point**
$$
I(z,z_{t})\approx-\nabla_{\theta}\ell(z_{t})^{T}\,H^{-1}\nabla_{\theta}\ell(z)
$$

The approximation is exactly that, inverse-Hessian-vector products in nonconvex networks, so it ranks candidates for investigation rather than convicting them. Robust training objectives bound the influence of poisons that survive ingestion. Huber loss is the canonical shape:

**Eq 7 · Huber loss**
$$
L_{\delta}(a)=\begin{cases}\tfrac{1}{2}a^{2}&|a|\leq\delta\\ \delta(|a|-\tfrac{1}{2}\delta)&|a|>\delta\end{cases}
$$

At a residual 100 times normal, squared error pays 10,000 times the typical contribution while Huber pays about 100. Finally, post-training behavioral checks test the targeted behaviors aggregate accuracy hides, and provenance and lineage tracking underneath everything makes the response reversible: when a poisoning symptom surfaces, lineage traces which batches fed which models and whether to remove, relabel, or reweight.

## Generative Models Change the Question

For generative models the output is open-ended text, so the robustness question changes from whether a label flips to whether content preserves factuality, policy constraints, and intent across prompt variations. Hallucination is the generative form of silent failure, fluent, baseless, and invisible to latency dashboards. A hallucination rate is meaningful only against a named evidence source, measured on a stated prompt set with stated retrieval context and decoding settings; the number does not travel across domains.

Per-request detection inherits the same traps. Token entropy exposes instability but is not a factuality score, a model assigns high probability to false statements it learned and low probability to rare true ones. Self-consistency sampling uses disagreement across reasoning paths as a routing signal, but agreement is weak evidence since correlated samples repeat the same misconception, and k samples multiply the decode work roughly k-fold (only the shared prompt's cached prefill escapes). **The expensive signal should be spent where cheap signals already indicate uncertainty.** Retrieval-augmented systems add retrieval noise as a failure mode: irrelevant or conflicting documents can override parametric knowledge, evaluation must separate retriever failure from generation failure, and the corpus itself is a writable input, a planted document is both a poisoning path and a prompt-injection vector. Output guardrails trade the same two quantities as selective prediction: the false-positive rate times legitimate traffic prices false refusals, each false negative is residual risk, and the guardrail's own inference latency counts against the deadline, plus the guardrail is itself a model that must pass adaptive evaluation.

## Three Signals Separate the Masquerade

The third pillar is the uncomfortable one: every defense in the first two reads evidence produced by the system it protects. Drift monitors read preprocessed features; adversarial detectors read model scores; poisoning filters read learned representations. A preprocessing bug that silently rescales a feature looks like covariate shift to the drift monitor because the feature statistics genuinely moved. A numerical overflow producing confident misclassifications looks like an adversarial attack because the decision flipped without a visible cause. **The cheap pillar-specific detectors fire on the symptom, not the cause.**

Behavioral checks test invariants cheaply: weight-range checks catch the exponent flip at one comparison per stored value, golden-input canaries replay fixed requests through replicas on a schedule, and cross-replica comparison doubles the work for every request it covers, so fleets apply it to sampled traffic. Each check spends a different currency: invariants cost compute on the serving path, canaries and comparisons cost compute and communication, and deciding which replicas remain trustworthy after a failure is coordination.

![Three signals separate the masquerade](https://benebsworth.com/study/vol2/14-robust-ai/diagrams/fault-masquerade.svg)

*The same symptom, falling accuracy with green health, can come from any pillar. Timing against deployment boundaries, reproducibility under fixed-input replay, and cross-layer correlation with infrastructure telemetry separate a software fault from drift or attack before choosing the intervention.*
Diagnosis combines three complementary signals. Timing: a shift synchronized with a deployment or dependency bump raises the pipeline-fault hypothesis, especially when multiple features move together in directions no physical process explains. Reproducibility under fixed-input replay: a deterministic software defect fails at the same stage every time, a transient upset vanishes on replay, and a resident corrupted weight reproduces on the same replica but disappears after reload, though shifted or adversarial inputs can also reproduce under fixed execution, so replay alone never settles it. Cross-layer correlation: deployment events, ECC counters, and memory-pressure alarms support the fault hypothesis while query-rate anomalies support the attack one, and neither is necessary or sufficient. The chapter's credit-risk scenario lands all three: drift alerts on three income features the morning after a dependency update, golden replay showing preprocessed tensors differing by a constant factor, the library changed a default normalization. **Retraining on the corrupted features would have taught the model the bug,** and the successful retries proved only that the service answered, not that its answers passed acceptance.

## Fallacies and Pitfalls

*Adversarial examples are an academic curiosity.* Published physical attacks, stickers on stop signs, patches on clothing, fool vision models under real viewing conditions. Digital adversarial training does not establish resistance to physical attacks; each physical condition needs its own evaluation.

*Test-set success is robustness proof.* An i.i.d. test set measures performance in the training population. It says nothing about a shifted deployment population, a named slice inside the same one, or an adversary, those are different cells of the evaluation matrix.

*Drift monitoring is optional after deployment.* Models degrade silently while confidence stays high. PSI and its kin surface population movement before accuracy breaches the service level, but only when the monitored features are predictive of downstream performance.

*Poisoning needs pipeline access.* Clean-label attacks need no internal access at all, public datasets and scraped sources are writable. Low-dose attacks can target a single prediction or implant a backdoor while passing every univariate check.

*Robustness is a model property.* Every defense in this chapter is a system: thresholds calibrated per service, fallback capacity provisioned, calibration snapshots versioned, replay harnesses pinned. The model is the smallest part of the contract.

## The physics

| Quantity | Value | Use |
|---|---|---|
| FP32 exponent bit-flip scaling | 2^128 (bit 30) | Weight 0.042 becomes ~1.4e37, finite, passing NaN checks |
| GPT-3-class weight footprint | 175B params ≈ 350 GB | Exceeds 80 GB HBM; every forward pass reads all of it |
| Fleet SDC incidence | 63% per hour | p = 10^-4/device-hour across 10,000 devices |
| ImageNet-V2 accuracy loss | 7–14 points, median 12 | All 212 models ≥55%; nearly linear tracking |
| FGSM budget flipping GoogLeNet | ε = 0.007 | Panda 57.7% → gibbon 99.3% in one step |
| PSI investigation conventions | 0.1 / 0.25 | Calibrated per service, not universal thresholds |
| Bonferroni per-test level | α / family size | Must be recomputed when features join the family |
| KS critical-value growth | √(ln(2/α)/2) | Significance is cheap at large samples |
| Conformal rank correction | ⌈(n+1)(1−α)⌉ | Finite-sample marginal coverage, not per-subgroup |
| Huber outlier scaling | ~100× vs 10,000× | At residual 100× normal, linear vs squared growth |
| Uber recognition gap | 5.6 s → 1.2 s | Reclassification reset trajectory history |
| Boeing 787 latency | 248 days | Hazards beyond short endurance tests |

## Glossary

- **adaptive evaluation**: attack evaluation conducted with full knowledge of the defense's preprocessing, randomness, and rejection rules; the minimum standard for empirical robustness evidence.

- **concept drift**: change in the conditional P(Y|X) over time; invisible to input-statistics monitors and requiring fresh outcome labels to remediate.

- **conformal prediction**: wrapper producing prediction sets with finite-sample marginal coverage under exchangeability, using the (n+1) rank correction.

- **covariate shift**: change in P(X) with P(Y|X) fixed; reweightable where training coverage exists.

- **distribution shift**: umbrella for covariate shift, label shift, and concept drift; separated by which probability stays fixed.

- **group distributionally robust optimization**: training objective minimizing worst-case group loss rather than average loss, for groups named in advance.

- **importance weighting**: reweighting training examples by the ratio of deployment to training input density; valid only where coverage exists.

- **influence function**: inverse-Hessian approximation of a training point's effect on a test loss, used to rank poisoning candidates.

- **label shift**: change in the prior P(Y) with class-conditional inputs fixed; correctable by confusion-matrix inversion and recalibration.

- **nonconformity score**: measure of how poorly a candidate outcome agrees with an input; the raw material of conformal calibration.

- **population stability index**: binned divergence between reference and current feature distributions; symmetric, nonnegative per bin, convention-banded.

- **risk-coverage curve**: selective risk against coverage as the acceptance threshold sweeps; the per-request serving contract.

- **robustness margin**: slack a network has to absorb perturbation before behavior changes; compression can shrink it while clean accuracy holds.

- **selective prediction**: policy answering high-confidence requests and routing the rest to fallback paths priced by the rejection rate.

- **silent failure**: behavioral degradation without infrastructure symptoms; the failure shape uniting all three pillars.

- **spectral signature**: variance spike along the top singular vector of target-class activations, exploited to filter backdoored training records.

- **spurious correlation**: feature predictive in training but not causally related to the label; the mechanism behind shortcut failures like cow-on-beach.

- **transferability**: property that adversarial examples crafted against one model often fool others trained on similar tasks; the basis of black-box surrogate attacks.## → Ben's world

- The per-request routing discipline, answer, fallback, abstain with priced capacity, is the same shape as the knowledge console's decision to serve cached, recompute, or degrade to a simpler view. The fallback path is a capacity commitment, not an afterthought.
- Golden-input canaries and version-pinned replay harnesses are the server-side analog of this site's e2e discipline: replaying fixed inputs through the built artifact and comparing against references, because dev-server behavior is not deployment behavior.
- The fraud team's decision matrix, alerts automate detection, evidence decides response, is the right template for benchmark harness regression triage: a statistically significant score movement triggers investigation, never automatic re-baselining.
- The fleet-incidence arithmetic applies directly to content correctness at scale: with hundreds of pages each carrying some residual defect probability, some defect is always live somewhere, which is what the postbuild grounded-output checks are for.

## Open questions

- The chapter prices detection and adaptation but rarely prices the *evidence pipeline* itself, the delayed-label collection that concept-drift confirmation depends on. What does a label-latency budget look like as a first-class design constraint?
- Conformal coverage is marginal, yet the operational failures concentrate in rare subgroups. Is there a practical fleet pattern for conditional guarantees that doesn't collapse into unachievable data requirements?
- The masquerade problem assumes one cause at a time in its examples. When drift and a fault are active simultaneously, does the three-signal diagnosis decompose cleanly or does one mask the other?


---

## Key equations

**Eq 1 · Fleet silent-corruption probability**

$$
\Pr(\geq 1)=1-(1-p)^{N}\approx 0.63\qquad(p=10^{-4},\;N=10^{4})
$$

*With $\DeviceCount$ independent devices each carrying residual error probability $p$ per interval, at least one silent error somewhere in the fleet is a routine event, not a tail case. A per-device reliability number becomes a coordination cost.*

**Eq 2 · Population stability index**

$$
\mathrm{PSI}=\sum_{i=1}^{B}(c_{i}-r_{i})\ln\frac{c_{i}}{r_{i}}
$$

*Each bin contributes a nonnegative term, so PSI decomposes per bin and shows which feature range moved. The fleet convention bands are monitoring conventions, calibrated per service, not universal statistical thresholds.*

**Eq 3 · Coverage and selective risk**

$$
\mathrm{coverage}(\tau)=\Pr(X\in A),\qquad \mathrm{risk}(\tau)=\mathbb{E}[\ell\,|\,X\in A]
$$

*Raising the acceptance threshold $\tau$ reduces coverage; it lowers accepted-request risk only when the score orders requests by error risk well enough, measured on the deployment population. Rejected traffic does not disappear: it prices the fallback path.*

**Eq 4 · Conformal finite-sample coverage**

$$
C(X)=\{y:s(X,y)\leq q\},\qquad \Pr(Y\in C(X))\geq 1-\alpha
$$

*With $q$ at rank $\lceil(n{+}1)(1{-}\alpha)\rceil$ of $n$ calibration nonconformity scores, coverage is a finite-sample marginal guarantee under exchangeability. It is not conditional on subgroup: a rare slice can be poorly covered while the aggregate holds.*

**Eq 5 · Fast gradient sign method**

$$
x'=x+\epsilon\cdot\mathrm{sign}(\nabla_{x}\ell(\theta,x,y))
$$

*One backward pass, one step to a corner of the $\ell_\infty$ budget cube. At $\epsilon=0.007$ it flips GoogLeNet from panda at 57.7 percent confidence to gibbon at 99.3 percent. A single step need not maximize the nonlinear loss or cause misclassification.*

**Eq 6 · Gaussian KL divergence**

$$
D_{\mathrm{KL}}=\ln\frac{\sigma_{c}}{\sigma_{r}}+\frac{\sigma_{r}^{2}+(\mu_{r}-\mu_{c})^{2}}{2\sigma_{c}^{2}}-\frac{1}{2}
$$

*Closed form for fitted Gaussian baseline and current densities. Exact for the density models; its fidelity to the transaction populations depends on the fit. Moderate values warrant investigation, not automatic retraining.*

**Eq 7 · Huber loss**

$$
L_{\delta}(a)=\begin{cases}\tfrac{1}{2}a^{2}&|a|\leq\delta\\ \delta(|a|-\tfrac{1}{2}\delta)&|a|>\delta\end{cases}
$$

*Quadratic inside the threshold, linear beyond it, so a surviving poisoned outlier grows linearly where squared error keeps squaring. At 100 times the normal residual, squared loss pays 10,000 times while Huber pays about 100.*

**Eq 8 · Influence of a training point**

$$
I(z,z_{t})\approx-\nabla_{\theta}\ell(z_{t})^{T}\,H^{-1}\nabla_{\theta}\ell(z)
$$

*Approximates how upweighting training point $z$ moves the test loss at $z_t$ without retraining, using inverse-Hessian-vector products. Approximate in deep nonconvex networks; validate against the architecture before treating it as attribution.*

## From the book

- [Book robustness taxonomy](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's full subtype decomposition: each pillar descends onto a defense wall where it enters the pipeline. Our silent-failure sketch keeps the three pillars but organizes them by evidence family instead.
- [Book shift-type geometry](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's three-panel picture of covariate shift, label shift and concept drift as changes in input region, label prior and mapping. Our packet carries the what-stays-fixed rule in prose.
- [Book bit-flip corruption path](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's figure tracing one flipped FP32 exponent bit from memory through a hidden unit to the output logits. Our packet keeps the 2^128 scaling arithmetic and the finite-outlier point in prose.
- [Book FGSM corner geometry](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's illustration of the sign-gradient step carrying the input to a corner of the budget cube across the decision boundary. Our packet states the same first-order alignment argument in the FGSM section.
- [Book selective-prediction routing](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's routing diagram for answer, stronger model or reviewer, and abstain. Our risk-coverage sketch focuses on the curve and the fallback-load arithmetic instead.
- [Book paired pipeline replay](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's diagram of replaying golden inputs through version-pinned pipelines and comparing tensors stage by stage. Our fault-masquerade sketch compresses the same diagnosis into its replay signal.
- [Book poisoning interception layers](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's figure of the interception layer examining contributed records before training. Our packet carries the four ordered layers as a numbered list in the poisoning section.
- [Book autoencoder ingestion gate](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's bottleneck autoencoder accepting low-reconstruction-error records and quarantining outliers. Our packet notes the blind spot: autoencoders can reconstruct unfamiliar inputs well or learn the attack pattern from a contaminated reference.
- [Book PSI timeline](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's PSI-over-weeks plot with warning and major-shift bands and the week-41 reference re-approval. Our packet explains in prose why the lower PSI after week 41 does not establish improved predictions.
- [Book clean-versus-robust trade-off](https://mlsysbook.ai/vol2/14_robust_ai/14_robust_ai.html) — The book's comparison of clean and robust decision boundaries. Our packet keeps the robustness-margin argument in prose: each compression technique can shrink the margin even when clean accuracy holds.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A medical imaging classifier reports 95 percent accuracy on its i.i.d. held-out test set. Applying the chapter's quantitative definition of Robust AI, which finding would indicate the model lacks robustness rather than generalization ability?
   - A. Accuracy drops to 94.8 percent when the model is evaluated on a second random split drawn from the same historical training distribution.
   - B. Accuracy drops to 35 percent under an imperceptible l-infinity perturbation of radius 8/255 applied to the same test images.
   - C. Inference latency increases from 50 ms to 120 ms when the batch size is doubled on the deployment accelerator under load.
   - D. Training loss fails to reach zero because the learning rate schedule decayed too early during the optimization phase.

2. In the March 2018 Uber ATG pedestrian fatality in Tempe, the perception stack detected the pedestrian 5.6 seconds before impact but did not recognize the collision course until 1.2 seconds before impact. Which mechanism described in the chapter contributed to that delay?
   - A. Object classification instability, toggling between 'vehicle', 'other', and 'bicycle' and resetting the trajectory prediction history on each reclassification.
   - B. Complete radar transceiver hardware failure that left the vehicle perception stack with zero usable sensor measurements during the approach.
   - C. A sudden geographic covariate shift caused by the desert lighting conditions rendered the obstacle detection model unable to process the Arizona road layouts it had never encountered during training.
   - D. A cloud network disconnection that prevented the on-vehicle computer from receiving remote classification confirmations from the data center.

3. An engineering organization is structuring its reliability teams according to the chapter's Three Pillars Framework. Which team structure correctly maps to the taxonomy?
   - A. Three separate teams dedicated respectively to training-time failures, validation-time failures, and serving-time failures.
   - B. Complementary teams addressing environmental shifts, input-level attacks, and system-level faults, with software diagnosis coordinated across all three categories.
   - C. Three teams organized respectively around model serving throughput targets, accelerator memory footprint reduction, and floating-point quantization numerics for the deployment platforms.
   - D. Two independent teams focused exclusively on user data privacy compliance and datacenter carbon accounting.

4. Assuming independent devices over the same one-hour interval and a residual silent data corruption probability of p = 10^-4 per device per hour, what is the probability of at least one SDC event in a single hour across a 10,000-accelerator training cluster, and what does it imply?
   - A. Roughly 10^-8 per hour, proving silent corruption is too rare to justify architectural defenses in distributed training clusters.
   - B. Exactly 10^-4 per hour, because device-level failure rates do not compound when nodes fail independently of one another.
   - C. Roughly 63 percent per hour, meaning silent corruption is an expected operational event requiring automated verification and checksumming.
   - D. Exactly 100 percent per hour with deterministic certainty, guaranteeing that every training step in the cluster fails irrecoverably.

5. A credit scoring model encounters applicants whose demographic and financial feature distributions P(X) remain unchanged, yet default rates rise because a macroeconomic policy change alters the relationship between income and repayment probability P(Y|X). Which shift type is this?
   - A. Concept drift, because the conditional relationship P(Y|X) changed while the input marginal P(X) stayed constant.
   - B. Covariate shift, because the input feature values moved away from the original training distribution over time.
   - C. Label smoothing, because the target probabilities were regularized during the model's original training procedure.
   - D. Hardware bit corruption, because the inference activations deviated from their mathematically correct ground-truth values.

6. Why can a small gradient-directed perturbation change a high-dimensional classifier's score more than independently sampled zero-mean noise of comparable per-coordinate scale?
   - A. Random noise changes model parameters directly during the forward pass, whereas gradient perturbations only affect input metadata fields.
   - B. Gradient-directed perturbations require visible large-scale pixel alterations that physically overwhelm the early convolutional filter banks.
   - C. The perturbation aligns coordinate changes with local loss sensitivity, while independent zero-mean changes cancel in the first-order sum.
   - D. Random noise affects only training data pipelines, whereas adversarial noise can exist exclusively during the inference serving path.

7. An attacker without access to a commercial vision API's weights or gradients trains a local surrogate, crafts PGD adversarial images against it, and fools the target API on half of queries. Which property enables this black-box attack?
   - A. Differential privacy, which mathematically guarantees bounded perturbation effects on model outputs across diverse neural architectures whenever they are trained on similar data distributions.
   - B. Transferability, where adversarial examples crafted against one model's decision boundaries frequently deceive different models trained on similar tasks.
   - C. Quantization noise, which forces all deployed production models into bit-identical weight matrices through uniform rounding of parameters.
   - D. Batch normalization collapse, which disables activation functions across distributed API serving replicas under adversarial input statistics.

8. Which scenario represents a physical-world adversarial attack rather than a digital evasion attack or an environmental covariate shift?
   - A. An attacker submits a JSON payload containing an l-infinity-perturbed pixel array directly to a cloud inference API endpoint.
   - B. A sudden heavy snowfall changes ambient lighting and road surface reflections across the entire deployment region, reducing camera detection accuracy by fifteen percent on the affected routes during the storm.
   - C. An engineer accidentally inverts the normalization constants in a client-side image preprocessing script before a routine deployment.
   - D. An attacker places small calibrated black-and-white stickers on a roadside stop sign, causing a vehicle camera to read a speed-limit sign across varying distances, angles, and lighting.

9. How does multi-step adversarial training (such as PGD-7) improve a network's robustness against evasion attacks at inference time?
   - A. It approximately searches for high-loss perturbations within the threat set and trains the model to reduce loss on those perturbed inputs.
   - B. It encrypts the model's weight matrices so external attackers cannot estimate loss gradients through backward passes at serving time.
   - C. It removes all nonlinear activation functions from the architecture, guaranteeing the decision boundary stays strictly linear under attack.
   - D. It replaces model weights with freshly sampled random distributions at inference time without requiring any changes during training.

10. Which statement correctly distinguishes certified robustness (such as randomized smoothing) from empirical robustness (such as PGD adversarial training)?
   - A. Empirical robustness provides mathematical worst-case guarantees across all possible perturbation norm balls simultaneously, whereas certified robustness is validated experimentally only against the specific implemented attacks chosen by the evaluator.
   - B. Certified defenses require zero additional compute at inference time, making them ideal for latency-critical high-throughput microservices at scale.
   - C. A valid certificate bounds prediction stability within its stated set and assumptions; empirical tests supply evidence for tested cases, while smoothing adds sampling cost on certified inputs.
   - D. Certified robustness applies only to training-data poisoning scenarios and cannot defend against any form of test-time evasion attack.

11. A team relies on standard Z-score outlier filtering and label-consistency checks on crowdsourced training data, yet its deployed model contains a severe backdoor. Why do naive data-cleaning filters fail against sophisticated poisoning?
   - A. Poisoning attacks only ever modify model weights during inference and leave the training data pipeline completely untouched.
   - B. Poisoned samples can have valid feature ranges and correct labels while passing the pipeline's univariate statistical checks.
   - C. Z-score filtering works only on text data and cannot be applied to numerical sensor features or image pixel intensities.
   - D. Standard regularization applied during model training completely disables all upstream data validation checks in the pipeline.

12. After an unauthorized training batch degrades a recommendation model, an audit team must identify the origin of the poisoned records, the transformation steps applied to them, and every downstream model artifact trained on that batch. Which capability provides this audit trail?
   - A. Randomized smoothing certificates issued for the affected production endpoints during the incident response window.
   - B. Monte Carlo dropout sampling applied repeatedly to the degraded model's serving predictions under live traffic.
   - C. Huber loss gradient clipping applied to the training objective during the next retraining run on cleaned data.
   - D. Data provenance and lineage tracking recorded as the batch moved through the pipeline into training runs.

13. *(numeric)* A fleet operator assumes a residual silent-corruption probability of 10^-5 per device-hour. Across 50,000 independent devices, what is the approximate probability (in percent, to one decimal place) of at least one silent-corruption event in a single hour?

14. *(explain)* An on-call engineer sees accuracy falling on a fraud model while latency, error rates, and uptime all hold steady. Explain, in plain language a new hire would understand, why the engineer cannot yet tell whether this is distribution drift, an adversarial attack, or a system fault — and name the three diagnostic signals that separate them. Then explain why retraining immediately is the dangerous move.

---

**Answer key:** 1-B, 2-A, 3-B, 4-C, 5-A, 6-C, 7-B, 8-D, 9-A, 10-C, 11-B, 12-D, 13-39.4%, 14-see rubric in quiz.json

## Audio overview

[Listen to the Marcus & Iris read-along (~15 min)](https://benebsworth.com/study-audio/vol2/14-robust-ai.m4a) — a generated podcast walking this packet's argument.
