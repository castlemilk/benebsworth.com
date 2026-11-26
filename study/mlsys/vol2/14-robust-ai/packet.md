---
title: "Robust AI"
chapter: "vol2/14"
description: "Latency and uptime can stay green while predictions quietly stop being reliable. Robustness is the behavioral contract that spans environmental shifts, input-level attacks, and system-level faults — and every defense spends the fleet's compute, communication, or coordination budget."
---

## Thesis

Latency dashboards stay green and uptime counters keep climbing while a deployed model quietly stops being right. That is the failure shape this chapter is built against: predictions becoming statistically unreliable without tripping any conventional health signal. The environment moves underneath a frozen training snapshot, an attacker optimizes against the decision boundary, or the serving machinery itself corrupts a value — and every one of the three produces the same surface symptom, falling accuracy with clean infrastructure.

==Robustness is the discipline of producing evidence about whether predictions remain useful, then tying that evidence to bounded responses.== The evidence costs compute, communication, or coordination — the three currencies the rest of this volume spends — and the responses, from drift-triggered retraining to per-request abstention to replica quarantine, are never free either. A robustness design is therefore a budgeted contract, not a property you bolt onto a model.

## Accuracy Is Not Evidence of Correctness

The chapter opens with failures that clean evaluation never saw. Google Photos' labeling failure hid inside aggregate accuracy because the harmful errors concentrated on one population slice — ==a fleet-wide average can hide a severe subgroup failure.== The 2018 Uber test vehicle detected the pedestrian 5.6 seconds before impact but recognized the collision course only at 1.2 seconds, because object classification toggled between 'vehicle', 'other', and 'bicycle', resetting the trajectory history on each reclassification. Mars Polar Lander's descent engines cut early on a spurious touchdown indication. Boeing's 787 carried a latent counter overflow that only surfaced after 248 days of continuous uptime — a hazard no short endurance test can reach.

The unified framework then shows the microscopic version. Flip one exponent bit of an FP32 weight — bit 30 of a weight at 0.042, and the value scales by 2^128 into roughly 1.4e37. The corrupted weight is finite, so it passes every NaN and infinity check; whether it dominates the output depends on the input and downstream weights, but every forward pass of a dense GPT-3-class model reads all 175 billion parameters, whose 350 GB footprint already exceeds an 80 GB accelerator's memory and lives distributed across the fleet. Replication does not remove this weakness: one corrupted gradient in an AllReduce step reaches every replica.

## Three Pillars, Three Evidence Families

Robust AI decomposes into three pillars because the three failure families produce different evidence and demand different responses. Environmental shifts are statistical: population statistics move, and the evidence is a divergence measurement. Input-level attacks are adversarial: someone optimizes against your decision boundary, and the evidence is a stress test under a stated threat model. System-level faults are physical and logical: a bit flips, a preprocessing library changes a default, and the evidence is behavioral, outputs violating invariants the correct system satisfies.

::fig[silent-failure-triangle]

The decomposition matters because ==each pillar suggests a different intervention and more than one cause can be active at once.== Retraining answers confirmed drift but teaches the model a preprocessing bug. Adversarial training hardens the boundary but does nothing for stale priors. A checkpoint rollback fixes corrupted weights but not the attacker's suffix. Three mechanisms recur across all pillars: detection (ECC memory, drift monitors, adaptive attack evaluation), containment (range checks, rollback, rate limits), and adaptation (retraining, adversarial training, robust aggregation). The evaluation matrix therefore needs one row per pillar plus a fourth row for per-request competence, because passing any single row proves nothing about the others.

## The Fleet Compounds Rarity

Assume a residual silent-corruption probability of 10^-4 per device per hour, after ECC and scrubbing have done their work. Across a fleet, independence compounds:

::eq[fleet-sdc-probability]
$$
\Pr(\geq 1)=1-(1-p)^{N}\approx 0.63\qquad(p=10^{-4},\;N=10^{4})
$$

At 10,000 devices the fleet expects at least one silent error in more than half of all hours. Per-device reliability numbers, however impressive, do not transfer: what is a tail event on one accelerator is a routine operational event at fleet scale, which is why verification and checksumming are architectural requirements rather than paranoia.

::chart[sdc-fleet-probability]

The same multiplication governs training. A large run reads its full weight footprint every step, so a corrupted resident value participates in every subsequent update until something detects it. Quantization, pruning, and distillation complicate the picture further: ==a smaller model is not automatically a more reliable one.== Compression can shrink the robustness margin, the slack the network has to absorb perturbations before behavior changes, even when clean accuracy holds.

## Name the Shift by What Stays Fixed

Distribution shift is three different problems wearing one name, separated by which probability stays fixed. Covariate shift moves the input distribution P(X) while the labeling rule P(Y|X) holds: a perception model trained on daytime images meets night. Because the rule is fixed, importance weighting can reweight existing labeled data, but only where training data cover the new inputs, since no weight recovers a region with no examples. Label shift moves the prior P(Y) while each class's input distribution P(X|Y) holds: a case mix changes during an epidemic. The fixed confusion matrix lets operators invert it to estimate new prevalence and recalibrate without retraining. Concept drift moves P(Y|X) itself: the correct label for the same input changes, as fraud adapts to the detector. That is the expensive one, remediation requires fresh outcome labels, and ==input-level monitoring stays silent because P(X) may not move at all.==

The cow-on-the-beach failure names why even benign shift hurts: the model learned "grass" as evidence for "cow," a spurious correlation that empirical risk minimization happily favors when it predicts training labels well. Group distributionally robust optimization minimizes worst-case group loss instead of average loss, but only for groups you can name in advance.

The cleanest evidence that shift costs even when nothing visibly changed is ImageNet-V2: researchers rebuilt the validation set a decade later following the original collection protocol, and every one of the 212 models scoring at least 55 percent on the original lost accuracy on the new one. 7 to 14 points, median 12, along a nearly straight line.

::chart[imagenet-v2-gap]

No architecture, recipe, or extra data closes the gap. ==Held-out accuracy is an optimistic estimate of the next population of inputs, not a prediction of it.==

## A Fired Metric Is Not a Retraining Command

Drift measurement exists to answer an operational question, serve, investigate, or retrain, not to decorate a dashboard. PSI is the cheap fleet-wide alert, built bin by bin so the total decomposes into per-bin contributions that show which feature range moved:

::eq[psi]
$$
\mathrm{PSI}=\sum_{i=1}^{B}(c_{i}-r_{i})\ln\frac{c_{i}}{r_{i}}
$$

The convention bands (0.1, 0.25) are monitoring conventions from credit-scoring practice, not universal statistical guarantees, a large shift in a nonpredictive feature can be harmless while a small shift in a safety-critical slice demands containment. Binning is part of the hypothesis: boundaries frozen on the reference, a smoothing constant for empty bins, recorded alongside the monitor config. For continuous features the Gaussian closed form is exact for the fitted densities:

::eq[kl-gaussian]
$$
D_{\mathrm{KL}}=\ln\frac{\sigma_{c}}{\sigma_{r}}+\frac{\sigma_{r}^{2}+(\mu_{r}-\mu_{c})^{2}}{2\sigma_{c}^{2}}-\frac{1}{2}
$$

The chapter's fraud-detection worked example is the discipline made concrete. Three calibrated triggers. PSI above 0.1 on a high-importance feature, KL above 0.05, a KS test at the Bonferroni-corrected per-test level, split their evidence: country PSI stays inside baseline, amount KL crosses into investigate, and the KS statistic rejects even at a level tightened tenfold (the critical value grows only with the square root of log(2/α), so statistical significance is cheap to buy with large samples). The decision matrix reads them together: continue serving with weekly instead of monthly monitoring while investigating. ==Statistical significance alone does not mandate retraining; practical significance is the question.== And the delayed labels still owe the harder answer, whether the fraud rule stayed fixed (covariate shift, reweightable) or moved (concept drift, fresh labels needed).

::fig[drift-decision]

The three-level framework generalizes this: alerts automate detection only; performance correlation splits investigation into drift-with-degradation (isolate slices, consider retraining), drift-without-degradation (elevated monitoring), and degradation-without-drift, the case the feature dashboard cannot explain, pointing at joint-feature change, concept drift, or a fault. When an update is warranted, adaptation is budgeted: online learning bounds update frequency and state size, Elastic Weight Consolidation penalizes drift away from parameters important to earlier behavior, and federated updates pay in communication rounds and transmitted bytes. Monitor design itself is part of the hypothesis: comparing Monday traffic with Sunday traffic manufactures alerts, while averaging across a week hides a one-hour failure.

## The Risk-Coverage Curve Is the Serving Contract

Population monitors ask whether traffic changed in aggregate. But a stable daily PSI can coexist with one rare, dangerous out-of-distribution request, so serving needs a per-request contract assembled from three signals: calibration (does a 0.8 score mean 80 percent correct), out-of-distribution scoring (how unlike the request is from validated inputs, a calibrated classifier can stay confidently wrong on unfamiliar inputs), and selective prediction, which turns both into an action policy:

::eq[selective-risk]
$$
\mathrm{coverage}(\tau)=\Pr(X\in A),\qquad \mathrm{risk}(\tau)=\mathbb{E}[\ell\,|\,X\in A]
$$

::fig[risk-coverage]

Raising the threshold reduces coverage but lowers accepted risk only when the score actually orders requests by error, measured on the deployment population, not assumed. And ==the rejected traffic does not disappear:== it lands on a fallback path that needs queue, reviewer, or secondary-model capacity provisioned within the original latency budget. If labels arrive days later, the system monitors scores immediately but cannot confirm selective risk until outcomes return; conservative thresholds limit exposure during the gap.

## Conformal Is a Marginal Promise

Conformal prediction offers the strongest contract in the chapter, a finite-sample coverage guarantee with no distributional assumption beyond exchangeability:

::eq[conformal-coverage]
$$
C(X)=\{y:s(X,y)\leq q\},\qquad \Pr(Y\in C(X))\geq 1-\alpha
$$

The (n+1) rank correction is what makes it finite-sample rather than asymptotic. But read the promise precisely: coverage is marginal, averaged over the calibration sample and the test point. ==it is not conditional on any subgroup, and a rare slice can be poorly covered while the aggregate number holds.== The guarantee also inherits its assumptions: distribution change between calibration and serving can invalidate exchangeability, and repeatedly tuning against the same calibration outcomes makes the evidence adaptive. Production systems therefore version predictor, score, calibration snapshot, and target miscoverage together. Larger prediction sets are honest uncertainty but also operational load: their tail distribution prices the review path exactly as the risk-coverage curve does. Conformalization does not protect against arbitrary shift.

## Attacks Are Priced by Access

Adversarial examples are not a bug to patch but a structural property of high-dimensional models trained by empirical risk minimization. Even a linear score is sensitive to many small aligned changes: move every coordinate by its full budget in the direction of its weight's sign and the total shift grows with input dimension, though no single coordinate moves visibly. FGSM turns that into a one-step attack:

::eq[fgsm]
$$
x'=x+\epsilon\cdot\mathrm{sign}(\nabla_{x}\ell(\theta,x,y))
$$

At a perturbation budget of 0.007 it flips GoogLeNet from panda at 57.7 percent confidence to gibbon at 99.3 percent, more confident in the wrong answer than the right one. The first-order reason is alignment: gradient-directed signs all push the same direction, while independent zero-mean noise cancels in the sum.

The useful taxonomy is access, not attack names. White-box gradients buy FGSM in one step and PGD's iterative refinement at the price of repeated backward passes; C&W trades perturbation size against misclassification confidence as constrained optimization, and broke defensive distillation, the early gradient-masking defense. Black-box attackers spend queries or train surrogates, exploiting transferability: adversarial examples crafted against one model frequently fool different models trained on similar tasks. Physical attackers spend control over the sensed environment, small calibrated stickers on a stop sign that read as a speed-limit sign across distances, angles, and lighting. ==Every mechanism reveals a cost the defense must raise: gradient access, optimization time, surrogate construction, or physical control.==

## Defenses Spend the Same Budget

The defense workflow starts from the threat model, not the technique menu. Adversarial training. PGD approximating the inner search for high-loss inputs, the outer loop training on them, is the empirical workhorse, and it costs several times more compute per epoch because every batch runs inner attack steps. In fleet terms the multiplier lands on the per-device compute term; adding workers buys communication cost, not free epochs. Randomized smoothing is the certified alternative: a certificate bounds prediction stability within its stated input, norm, radius, and assumptions, the only guarantee in the chapter, and pays for it in noise samples on every certified request, which is why certification often belongs on an asynchronous audit path or a selective serving path rather than the latency-critical main line.

Detection techniques screen inputs, but the evaluation discipline is the load-bearing wall. RobustBench exists because evaluation kept flattering defenses: under one standardized attack ensemble at a fixed threat model, the best under-attack accuracy on CIFAR-10 climbed steadily from 2018 to 2024 while clean accuracy stayed high, yet four published defenses with high clean accuracy fall below 5 percent under attack, the signature of non-adaptive evaluation. ==Empirical evaluation must be adaptive to the defense: optimize through preprocessing, average over randomness, include the full pipeline.== A passed PGD test is evidence for one model, norm, budget, and restart count, nothing more. And MNIST-C/ImageNet-C measure common corruptions, a different cell of the matrix from worst-case attacks.

## Poisoning Defenses Are Four Ordered Gates

Inference-time defenses assume the training corpus was trustworthy. Poisoning attacks violate that assumption upstream, and Microsoft's Tay, subverted within a day of launch, is the reminder that any system learning from live interaction makes every user a potential contributor of training evidence. Aggregate validation accuracy cannot clear a corpus: a targeted attack is designed to hide inside normal performance, and clean-label poisoning keeps every label correct while corrupting features, defeating label audits entirely.

The defense runs as four ordered layers along the data path. Ingress controls establish provenance and least-privilege access, a training job allowed to read unverified sources is an attack surface, and promotion to the production registry alias belongs to a narrow audited set so compromised researcher credentials cannot replace the live model. Anomaly detection and sanitization inspect candidates: Z-score and Mahalanobis checks are cheap enough for ingestion but catch only statistical outliers, so learned representations carry the harder cases, with the caveat that autoencoders can reconstruct unfamiliar inputs well and even learn the attack pattern from a contaminated reference. Spectral signatures exploit the backdoor's internal signature: poisoned records force the network to learn both genuine features and the trigger pathway, shifting the poisoned subpopulation's mean activation and creating a variance spike along the top singular vector. Influence functions approximate which training points most shaped a suspicious test behavior without retraining:

::eq[influence-function]
$$
I(z,z_{t})\approx-\nabla_{\theta}\ell(z_{t})^{T}\,H^{-1}\nabla_{\theta}\ell(z)
$$

The approximation is exactly that, inverse-Hessian-vector products in nonconvex networks, so it ranks candidates for investigation rather than convicting them. Robust training objectives bound the influence of poisons that survive ingestion. Huber loss is the canonical shape:

::eq[huber-loss]
$$
L_{\delta}(a)=\begin{cases}\tfrac{1}{2}a^{2}&|a|\leq\delta\\ \delta(|a|-\tfrac{1}{2}\delta)&|a|>\delta\end{cases}
$$

At a residual 100 times normal, squared error pays 10,000 times the typical contribution while Huber pays about 100. Finally, post-training behavioral checks test the targeted behaviors aggregate accuracy hides, and provenance and lineage tracking underneath everything makes the response reversible: when a poisoning symptom surfaces, lineage traces which batches fed which models and whether to remove, relabel, or reweight.

## Generative Models Change the Question

For generative models the output is open-ended text, so the robustness question changes from whether a label flips to whether content preserves factuality, policy constraints, and intent across prompt variations. Hallucination is the generative form of silent failure, fluent, baseless, and invisible to latency dashboards. A hallucination rate is meaningful only against a named evidence source, measured on a stated prompt set with stated retrieval context and decoding settings; the number does not travel across domains.

Per-request detection inherits the same traps. Token entropy exposes instability but is not a factuality score, a model assigns high probability to false statements it learned and low probability to rare true ones. Self-consistency sampling uses disagreement across reasoning paths as a routing signal, but agreement is weak evidence since correlated samples repeat the same misconception, and k samples multiply the decode work roughly k-fold (only the shared prompt's cached prefill escapes). ==The expensive signal should be spent where cheap signals already indicate uncertainty.== Retrieval-augmented systems add retrieval noise as a failure mode: irrelevant or conflicting documents can override parametric knowledge, evaluation must separate retriever failure from generation failure, and the corpus itself is a writable input, a planted document is both a poisoning path and a prompt-injection vector. Output guardrails trade the same two quantities as selective prediction: the false-positive rate times legitimate traffic prices false refusals, each false negative is residual risk, and the guardrail's own inference latency counts against the deadline, plus the guardrail is itself a model that must pass adaptive evaluation.

## Three Signals Separate the Masquerade

The third pillar is the uncomfortable one: every defense in the first two reads evidence produced by the system it protects. Drift monitors read preprocessed features; adversarial detectors read model scores; poisoning filters read learned representations. A preprocessing bug that silently rescales a feature looks like covariate shift to the drift monitor because the feature statistics genuinely moved. A numerical overflow producing confident misclassifications looks like an adversarial attack because the decision flipped without a visible cause. ==The cheap pillar-specific detectors fire on the symptom, not the cause.==

Behavioral checks test invariants cheaply: weight-range checks catch the exponent flip at one comparison per stored value, golden-input canaries replay fixed requests through replicas on a schedule, and cross-replica comparison doubles the work for every request it covers, so fleets apply it to sampled traffic. Each check spends a different currency: invariants cost compute on the serving path, canaries and comparisons cost compute and communication, and deciding which replicas remain trustworthy after a failure is coordination.

::fig[fault-masquerade]

Diagnosis combines three complementary signals. Timing: a shift synchronized with a deployment or dependency bump raises the pipeline-fault hypothesis, especially when multiple features move together in directions no physical process explains. Reproducibility under fixed-input replay: a deterministic software defect fails at the same stage every time, a transient upset vanishes on replay, and a resident corrupted weight reproduces on the same replica but disappears after reload, though shifted or adversarial inputs can also reproduce under fixed execution, so replay alone never settles it. Cross-layer correlation: deployment events, ECC counters, and memory-pressure alarms support the fault hypothesis while query-rate anomalies support the attack one, and neither is necessary or sufficient. The chapter's credit-risk scenario lands all three: drift alerts on three income features the morning after a dependency update, golden replay showing preprocessed tensors differing by a constant factor, the library changed a default normalization. ==Retraining on the corrupted features would have taught the model the bug,== and the successful retries proved only that the service answered, not that its answers passed acceptance.

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
