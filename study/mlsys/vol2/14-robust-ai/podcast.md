# hosts: Marcus | Iris

A: Today we are studying volume two, chapter fourteen: robust AI. I'm Marcus, and with me is Iris. The chapter opens with the most uncomfortable sentence in operations: your latency dashboards are green, your uptime counters are climbing, and your model has quietly stopped being right. Why doesn't anything alarm?

B: Because conventional health signals measure that the system is running, not that it is correct. A prediction pipeline can answer every request within its latency budget while the answers become statistically unreliable. Environmental shift, adversarial inputs, and corrupted computation all produce the same surface picture: falling accuracy with clean infrastructure.

A: The opening failure cases are not exotic. Google Photos first.

B: A labeling failure that concentrated on one population slice hid inside aggregate accuracy. The fleet-wide average looked fine while the worst errors landed on a specific group. That is the first lesson: averages conceal subgroup catastrophe, and a test set drawn from the training distribution cannot see it.

A: Then the Uber test vehicle, which detected the pedestrian five point six seconds before impact.

B: But recognized the collision course only at one point two seconds. The object classification toggled between vehicle, other, and bicycle, and each reclassification reset the trajectory history. Detection happened; safe action did not. Robustness is about behavior through the whole response chain, not the accuracy of one component.

A: And Boeing's seven eighty seven carried a counter overflow that only fired after two hundred forty eight days of continuous uptime. No short test reaches that.

B: Which is the endurance lesson: some hazards live beyond any feasible test horizon, so you cannot test your way to safety. You need behavioral invariants that run continuously in production.

A: The microscopic version is a single flipped bit. Walk me through the arithmetic.

B: Flip bit thirty of a floating-point weight, the exponent, and a weight of zero point zero four two scales by two to the power of one hundred twenty eight. It becomes roughly ten to the thirty-seven. The corrupted value is finite, so every NaN and infinity check passes it. And every forward pass of a dense model reads all of its weights, so one corrupted resident value participates in every request that replica serves until something detects it.

A: Small model, small problem though, right? Compression should help?

B: Not automatically. Quantization, pruning, and distillation can shrink the robustness margin, the slack the network has to absorb perturbations before its behavior changes. Clean accuracy holds while the margin quietly disappears.

A: Now the fleet arithmetic, which I found genuinely surprising.

::eq[fleet-sdc-probability]

B: Assume a residual silent-corruption probability of ten to the minus four per device per hour, after hardware correction has done its work. Across ten thousand independent devices, the probability of at least one event in a single hour is about sixty three percent. What is a tail event on one accelerator is a routine operational event for the fleet. Verification is not paranoia; it is arithmetic.

A: So the chapter organizes all of this into three pillars. Why three?

B: Because the failure families produce different evidence and demand different responses. Environmental shifts are statistical: population statistics move, and the evidence is a divergence measurement. Input-level attacks are adversarial: someone optimizes against your decision boundary, and the evidence is a stress test under a stated threat model. System-level faults corrupt the machinery itself, and the evidence is behavioral: outputs violating invariants.

::fig[silent-failure-triangle]

A: And the figure adds a fourth row.

B: Per-request competence. Even if the population looks stable, a single rare out-of-distribution request can be dangerous, so the evaluation matrix needs calibration, out-of-distribution scoring, and selective prediction alongside the three pillar rows. Passing one row proves nothing about the others.

A: Let's take the first pillar. The shift taxonomy separates three things that all get called drift.

B: The rule is: name the shift by what stays fixed. Covariate shift moves the input distribution while the labeling rule holds, so importance weighting can reweight existing labeled data, but only where training data cover the new inputs. Label shift moves the prior while each class's input distribution holds, so you can invert the confusion matrix and recalibrate without retraining.

A: And concept drift?

B: Concept drift moves the conditional relationship itself. The correct label for the same input changes. That is the expensive one, because remediation needs fresh outcome labels, and here is the trap: input-level monitoring stays completely silent because the input distribution may not move at all.

A: The cow on the beach is the mechanism story.

B: The model learned grass as evidence for cow, a spurious correlation that empirical risk minimization happily favors. The world did not change; the model learned the wrong lesson. Group distributionally robust optimization trains for worst-case group loss, but only for groups you can name in advance.

A: ImageNet-V2 is the cleanest evidence that shift costs even when nothing visibly changed.

B: Researchers rebuilt the validation set a decade later, following the original collection protocol exactly. Every one of the two hundred twelve models scoring at least fifty five percent on the original lost accuracy, seven to fourteen points, median twelve, along a nearly straight line. Held-out accuracy is an optimistic estimate of the next population, not a prediction of it.

A: Now the operational heart of the chapter: the fraud team's decision matrix. A drift alert fires. What happens next?

::eq[psi]

B: PSI is the cheap fleet-wide alert, built bin by bin so the total decomposes and shows which feature range moved. But the convention bands are monitoring conventions, not universal guarantees. In the worked example the team had three calibrated triggers, and the evidence split: country PSI stayed inside baseline, the KL divergence on transaction amount crossed into investigate, and the KS test rejected even at a level tightened tenfold.

A: Statistical significance but no retrain?

B: Exactly. Significance is cheap to buy with large samples because the critical value grows only with the square root of the log. The decision matrix reads statistical evidence together with practical significance. The team kept serving with weekly monitoring while investigating, and the delayed labels still owed the harder answer: whether the fraud rule stayed fixed or moved.

::fig[drift-decision]

A: The three-level framework generalizes it.

B: Level one automates detection only. Level two correlates alerts with observed performance and splits three ways: drift with degradation, drift without degradation, and the case the dashboard cannot explain, degradation without drift. Level three picks among update, investigate-first, and continue-monitoring. A fired metric is never a retraining command.

A: Second half of the first pillar: the per-request contract. Why isn't population monitoring enough?

B: A stable daily PSI can coexist with one rare dangerous request. Calibration tells you whether a score of zero point eight means eighty percent correct. Out-of-distribution scoring tells you how unlike the request is, because a calibrated classifier can stay confidently wrong on unfamiliar inputs. Selective prediction turns both into an action policy.

::eq[selective-risk]

A: And the threshold is a business decision, not just a statistical one.

::fig[risk-coverage]

B: The risk-coverage curve is the serving contract. Raising the threshold lowers accepted risk only when the score actually orders requests by error, and the rejected traffic does not disappear. It lands on a fallback path that needs queue, reviewer, or secondary-model capacity inside the original latency budget. Abstention is a capacity commitment.

A: Conformal prediction is the strongest contract in the chapter. What exactly does it promise?

::eq[conformal-coverage]

B: Finite-sample marginal coverage under exchangeability, with the n-plus-one rank correction doing the work. But read it precisely: marginal means averaged over the calibration sample and test point. It is not conditional on any subgroup, and a rare slice can be poorly covered while the aggregate number holds. And a distribution change between calibration and serving can invalidate the whole argument.

A: On to attacks. The key reframe is that adversarial examples are structural, not bugs.

B: Even a linear score is sensitive to many small aligned changes. Move every coordinate by its full budget in the direction of its weight's sign and the total shift grows with input dimension. Gradient-directed signs align; random noise cancels. That is the whole trick.

::eq[fgsm]

A: FGSM is one backward pass and one step.

B: At a perturbation budget of zero point zero zero seven it flips GoogLeNet from panda at fifty seven percent confidence to gibbon at ninety nine percent. More confident in the wrong answer than the right one. The taxonomy that matters is access: white-box gradients buy one-step attacks, black-box attackers spend queries or train surrogates and exploit transferability, and physical attackers spend control of the sensed environment, like calibrated stickers on a stop sign.

A: And the defenses spend the same budget the rest of the volume cares about.

B: Adversarial training costs several times more compute per epoch because every batch runs inner attack steps. Randomized smoothing is the only guarantee in the chapter, but it bounds stability only within its stated input, norm, radius, and assumptions, and pays in noise samples on every certified request. That is why certification often belongs on an audit path, not the latency-critical main line.

A: RobustBench is the evaluation cautionary tale.

B: Under one standardized attack ensemble, the best under-attack accuracy climbed steadily from twenty eighteen to twenty twenty four. But four published defenses with high clean accuracy fall below five percent under attack. Non-adaptive evaluation flattered them. Evaluation must know the defense: optimize through preprocessing, average over randomness, include the full pipeline.

A: Third pillar adjacency: poisoning. Why do the inference-time defenses not cover it?

B: They assume the training corpus was trustworthy. Clean-label poisoning keeps every label correct and corrupts features, so label audits pass it. The defense runs as four ordered gates: ingress controls with provenance and least privilege, anomaly detection and sanitization, robust training objectives, and post-training behavioral checks. No single gate substitutes for the others.

::eq[huber-loss]

A: Huber loss is the robust-objective workhorse.

B: Quadratic inside the threshold, linear beyond it. At a residual one hundred times normal, squared error pays ten thousand times the typical contribution while Huber pays about one hundred. Surviving outliers get bounded influence instead of quadratic pull.

::eq[influence-function]

A: And influence functions answer the forensic question.

B: Approximately. They estimate how much a training point shaped a suspicious behavior using inverse Hessian products, without retraining. In deep nonconvex networks that is a ranking signal for investigation, not a conviction. Underneath everything, provenance and lineage tracking make the response reversible: when a symptom surfaces, you can trace which batches fed which models.

A: Generative models change the question entirely.

B: The output is open-ended text, so robustness becomes whether content preserves factuality, policy, and intent across prompt variations. Hallucination is the generative silent failure: fluent, baseless, invisible to latency dashboards. And a hallucination rate is meaningful only against a named evidence source on a stated prompt set. The number does not travel.

A: Self-consistency sampling sounded free but isn't.

B: K samples multiply the decode work roughly k-fold; only the shared prompt's cached prefill escapes. And agreement is weak evidence, because correlated samples repeat the same misconception. Spend the expensive signal where cheap signals already indicate uncertainty. Guardrails trade the same quantities as selective prediction: false positives price false refusals, false negatives are residual risk, and the guardrail is itself a model that must pass adaptive evaluation.

A: Final pillar, and the most uncomfortable one: every defense in the first two reads evidence produced by the system it protects.

::fig[fault-masquerade]

B: A preprocessing bug that silently rescales a feature looks exactly like covariate shift, because the feature statistics genuinely moved. A numerical overflow producing confident misclassifications looks like an adversarial attack. The detectors fire on the symptom, not the cause.

A: Three signals separate them. Timing first.

B: A change synchronized with a deployment or dependency bump raises the pipeline-fault hypothesis, especially when multiple features move together in directions no physical process explains. Then reproducibility under fixed-input replay: a deterministic defect fails at the same stage every time, a transient upset vanishes, and a resident corrupted weight reproduces on the same replica but disappears after reload. Finally cross-layer correlation: deployment events and hardware counters support the fault hypothesis, query-rate anomalies support the attack one.

A: The credit-risk scenario lands all three.

B: Drift alerts on three income features the morning after a dependency update. Golden replay shows preprocessed tensors differing by a constant factor. The library changed a default normalization. Retraining on the corrupted features would have taught the model the bug. Recovery is complete only when the replayed outputs pass acceptance again.

A: The fallacies chapter is short but sharp. Pick your favorite.

B: Robustness is a model property. Everything in this chapter is a system: calibrated thresholds, provisioned fallback capacity, versioned calibration snapshots, pinned replay harnesses. The model is the smallest part of the contract.

A: And the one-line summary for the chapter?

B: Name the shift by what stays fixed, price every defense in the fleet's currencies, and read the system-level evidence before you believe what the symptom suggests.
