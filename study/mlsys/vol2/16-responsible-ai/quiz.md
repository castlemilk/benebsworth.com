# Responsible AI — self-test

1. In the ML fleet stack, why does Responsible AI constitute the Governance band rather than existing as a supplementary post-training checklist?
   - A. Because it replaces lower-level distributed execution frameworks with legal compliance parsers that scan inference traffic for regulatory violations in real time, translating statute text directly into serving configuration without human interpretation.
   - B. Because it serves solely to optimize training throughput and hardware acceleration efficiency across the fleet's accelerator population.
   - C. Because it establishes requirements, evidence, and accountable owners for why the system runs and whom it serves, including risks that statistical optimization alone does not resolve.
   - D. Because it operates exclusively as a hardware watchdog circuit preventing physical server overheating in dense accelerator deployments.

2. A product team submits a fairness dashboard showing small subgroup gaps as proof that its loan-screening system is responsible. Within an assurance case, what role should the dashboard play?
   - A. It is sufficient proof, because a fairness dashboard already covers the system's privacy, security, and contestability obligations across the deployment lifecycle, so no further evidence collection or ownership assignment is required for launch.
   - B. It is evidence for a bounded claim, valid only under stated assumptions, and it becomes operational only when an accountable owner can act on it and affected people can contest decisions.
   - C. It replaces the claim and argument entirely, because measured results speak for themselves without requiring interpretation or stated assumptions.
   - D. It is irrelevant once the model registry records which weights reached production, since versioning establishes accountability.

3. For risk scores, the chapter's score-balance impossibility result combines calibration within each group with equal mean scores across groups among positive outcomes and, separately, among negative outcomes. Which cases escape the stated incompatibility?
   - A. Whenever the training dataset contains more than one million balanced records across all demographic slices of the population, because statistical estimation error is the sole source of the incompatibility.
   - B. Whenever the model is trained with L2 regularization followed by post-hoc isotonic calibration on a held-out validation set.
   - C. Only in degenerate or trivial cases, such as perfect prediction with zero error or identical base rates across the groups being compared.
   - D. Whenever demographic parity is explicitly enforced through multi-task adversarial training with a gradient-reversal layer.

4. Which statement correctly differentiates preprocessing, in-processing, and postprocessing fairness interventions with respect to ML system infrastructure requirements?
   - A. Preprocessing modifies serving thresholds at inference time, in-processing requires anonymizing all operational logs before training can start, and postprocessing alters training labels inside the feature store retroactively after deployment.
   - B. Preprocessing changes training data and needs lineage; in-processing changes training optimization; group-specific threshold postprocessing requires authorized group information at the decision component.
   - C. All three methods require identical runtime compute overhead on the live model serving path, because fairness logic executes at inference regardless of tier.
   - D. Preprocessing applies only to TinyML devices, while in-processing and postprocessing can only execute inside cloud clusters with dedicated fairness accelerators.

5. A streaming loan-approval service records authorized group attributes and decisions immediately, but repayment outcomes arrive months later. Why can demographic-parity statistics update earlier than equalized-odds statistics?
   - A. Demographic parity depends only on model predictions and input demographics available at inference time, whereas equalized odds requires true outcome labels that arrive with substantial real-world latency.
   - B. Demographic parity requires calculating large matrix inverses that execute faster on GPU tensor cores than the iterative constraint solvers that equalized odds needs for evaluating streaming data at scale.
   - C. Equalized odds is a convex optimization problem that cannot be evaluated on streaming CPU worker nodes without specialized hardware acceleration support.
   - D. Demographic parity violates privacy regulations when processed asynchronously in background databases, forcing it to complete synchronously during inference.

6. An engineering team implements SISA training with 100 independent shards to support GDPR Article 17 erasure for a large model. Under what operational workload does this sharded unlearning strategy lose its cost advantage?
   - A. When the model is quantized from FP16 to INT8 for edge deployment, because quantization entangles parameters across shard boundaries.
   - B. When the primary storage system transitions from NVMe SSDs to distributed object storage, because retraining becomes network-bound.
   - C. When the training pipeline switches from plain stochastic gradient descent to the Adam optimizer, because the second-moment optimizer state statistically couples parameter updates across all of the shard boundaries.
   - D. When the daily volume of erasure requests is high enough that each retraining batch touches essentially all 100 shards, eroding the sharding-only saving.

7. In Differentially Private Stochastic Gradient Descent, what are the two core operations applied to gradients before weight updates, and what are their primary systems impacts?
   - A. Gradient quantization to 4 bits and dropout pruning applied before each weight update in the training loop, reducing GPU memory consumption by roughly half while preserving convergence rates across all standard benchmark training workloads evaluated.
   - B. Gradient checkpointing and layer freezing, eliminating backpropagation memory overhead across the training pipeline.
   - C. Per-example gradient clipping to a maximum norm and calibrated Gaussian noise addition, whose privacy bound requires sampling and composition accounting and whose compute and utility costs must be measured per configuration.
   - D. Spectral normalization of weight matrices and label smoothing, eliminating adversarial vulnerability with zero additional compute overhead.

8. A model-agnostic explanation service enumerates all feature coalitions for 20 input features, taking at least one microsecond per coalition. Why does this exhaustive Shapley calculation exceed a 100 ms inline serving budget?
   - A. Because Shapley values can only be computed in double-precision floating-point arithmetic, which crashes GPU tensor cores on modern accelerators and forces the computation onto slow host memory fallback paths.
   - B. It evaluates 2^20 coalitions, requiring more than one second even at one microsecond per coalition; a cheaper method or a separate explanation path is needed.
   - C. Because cooperative game theory axioms prohibit computing feature contributions for tabular data of any dimensionality.
   - D. Because exact SHAP requires reading the client's raw hardware registers during inference, adding unavoidable bus latency.

9. A robustness report for a deployed model includes a randomized-smoothing certificate and an empirical attack evaluation. What must the assurance case record about each before a launch authority relies on it?
   - A. Nothing beyond the headline accuracy number, because both evaluation results already establish that the end-to-end workflow is safe for deployment across all operating conditions the fleet will encounter in production.
   - B. Only the empirical result, because a certificate is a mathematical proof and needs no stated scope to remain valid.
   - C. Only the certificate, because empirical attack results already guarantee immunity against all unseen future attacks.
   - D. The certificate's norm, radius, confidence, and model configuration, and the empirical evaluation's attack protocol, since each supports a claim only within those stated boundaries.

10. In human-AI collaborative decision-making, what is the paradox of reliability and what is its primary engineering implication for interface design?
   - A. High apparent reliability can encourage over-reliance; interface design must be evaluated by how often users accept erroneous recommendations, correct errors, or introduce new errors, not by the overall override rate.
   - B. A model with 50 percent accuracy causes hardware crashes more frequently than a model with 90 percent accuracy, because predictive uncertainty propagates through the inference pipeline into memory corruption faults on the serving hosts.
   - C. As model latency decreases, network packet loss increases proportionally, so interfaces must add confirmation delays artificially.
   - D. Highly compressed models consume more DRAM than uncompressed ones, so interfaces must pre-cache all possible recommendations.

11. A study of a widely used healthcare risk-prediction algorithm found that predicted healthcare expenditure could reproduce racial disparities in access to care. Why does this example challenge the claim that more data and better algorithms alone eliminate bias?
   - A. The training dataset contained fewer than one thousand total medical records across all patient populations and care settings, making every downstream statistical estimate unreliable regardless of the model class or training procedure chosen by the team, as documented in the deployment review checklist for the serving fleet.
   - B. The engineers selected healthcare expenditure as a proxy for health need; because Black patients faced historical access barriers and lower spending at equal illness, the model inferred they were less sick, and no improvement in predicting the proxy repairs the target.
   - C. The deep neural network suffered from vanishing gradients across recurrent layers, corrupting the learned representations beyond repair.
   - D. An external adversary poisoned the training labels with malicious random noise, so the failure is a security incident rather than a design flaw.

12. A service uses 100 ms of baseline processing per request at 10,000 QPS. Adding inline explanations requires another 50 to 200 ms of processing. What is the approximate capacity increase needed to preserve throughput, and does it also preserve a 100 ms latency limit?
   - A. Approximately 1.5x to 3x capacity can preserve throughput, but serial request latency rises to 150 to 300 ms; meeting 100 ms requires reducing or moving explanation work off the critical path.
   - B. No capacity increase is needed because SHAP values are precomputed during compiler optimization passes over the model graph, so explanation work adds no marginal cost to the inference serving path at runtime.
   - C. Serving capacity can be reduced by half because explanations compress network bandwidth requirements for each response.
   - D. The system requires upgrading DRAM from DDR4 to DDR5 with zero additional server nodes, because explanation work is memory-bandwidth bound.

13. *(numeric)* In the chapter's loan scenario, Group A approves 70 of 100 applicants (40 repay, 30 default) and rejects 30 (5 would have repaid). Group B approves 40 of 100 (30 repay, 10 default) and rejects 60 (20 would have repaid). Compute the equality-of-opportunity gap: the absolute difference in true positive rates between the groups.

14. *(explain)* A colleague argues that their hiring model must be fair because it passes a demographic-parity check with flying colors, uses state-of-the-art architectures, and trains on millions of balanced records. Explain in plain language why each of those three defenses can be true while the system still produces measured, documented harm.

---

**Answer key:** 1-C, 2-B, 3-C, 4-B, 5-A, 6-D, 7-C, 8-B, 9-D, 10-A, 11-B, 12-A, 13-0.29 (29 pp), 14-see modelAnswer in quiz.json
 