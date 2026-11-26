# Robust AI — self-test

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
