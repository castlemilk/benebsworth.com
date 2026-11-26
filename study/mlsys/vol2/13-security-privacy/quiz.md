# Security and Privacy — self-test

1. An ML platform engineer must classify two failure modes: (1) a malicious actor submits crafted audio noise so an emergency-dispatch classifier misses distress calls, and (2) an observer examines a public salary-prediction model and infers whether a specific executive was in the training set. How should these be categorized by threat model and objective?
   - A. (1) is a privacy violation targeting confidentiality of the dispatch audio stream; (2) is a security breach targeting the availability of the salary service.
   - B. Both are pure infrastructure security incidents that the network layer resolves with updated firewall rule sets and stricter ingress filtering.
   - C. (1) is a stochastic robustness failure caused by sensor noise rather than intent; (2) is an unauthorized access-control violation that credential rotation would resolve.
   - D. (1) is an adversarial security attack targeting model integrity; (2) is a privacy leakage issue targeting participation inference.

2. In 2018, an aggregated activity heatmap revealed sensitive military locations through distinctive activity patterns in sparsely populated areas. What fundamental systems-privacy vulnerability did this incident illustrate?
   - A. The platform suffered an unencrypted database breach that exposed user account names together with plaintext GPS coordinate columns stored at rest.
   - B. An adversary ran a physical side-channel power analysis attack directly against the GPS receiver hardware chips embedded inside users' mobile devices.
   - C. Aggregation can expose sensitive locations in sparse environments where high-dimensional behavioral traces retain distinct structural patterns.
   - D. The web application's TLS termination layer failed to validate certificate chains on incoming client telemetry upload streams, exposing raw location fixes.

3. An adversary queries an open prediction endpoint, records confidence scores, and trains a surrogate. The actor knows the task and output format but has no weights, source code, architecture details, or training records. How should access, auxiliary knowledge, and timing be classified?
   - A. Black-box access, limited task-and-interface knowledge, inference-time attack.
   - B. White-box access, full architectural knowledge, training-time attack on the served checkpoint.
   - C. Gray-box access, full knowledge of internals, deployment-time attack on the release pipeline.
   - D. Black-box access, limited task-and-interface knowledge, post-deployment configuration attack.

4. A security architect must deploy defenses against two model-theft vectors: (1) an unauthorized party copying serialized checkpoints from a cloud bucket, and (2) a competitor sending millions of synthetic queries to a public endpoint to distill a student model. Which combination targets each vector correctly?
   - A. Vector (1) requires output rounding and top-k truncation of every API response; vector (2) requires hardware security modules protecting model weights at rest inside the cloud bucket.
   - B. Vector (1) requires encrypted storage, signed model artifacts, and strict IAM/RBAC permissions; vector (2) requires rate limiting, query-anomaly monitoring, and confidence-score truncation.
   - C. Vector (1) requires differential privacy applied retroactively during the original training run; vector (2) requires physically air-gapping the inference server away from the public internet.
   - D. Both vectors are mitigated exclusively by converting every serialized checkpoint into the Python pickle format with embedded cryptographic signatures for distribution.

5. A 64-worker data-parallel job replaces ring AllReduce with a gather-based coordinate-wise median: every worker gathers every individual gradient before computing the median. Approximately how does per-worker gradient traffic change?
   - A. It is unchanged, because the coordinate-wise median consumes only the single summed gradient tensor that the ring AllReduce already returns to every worker each step.
   - B. It roughly doubles, because gathering all individual gradients costs approximately one extra full pass around the communication ring per training step.
   - C. It falls, because the median rule discards statistical outlier gradients before they finish traversing the network fabric between workers.
   - D. It rises by about 32 times, because the gather receives the 63 peer gradients per worker instead of moving about twice the gradient size around the ring.

6. A multi-tenant LLM service shares one prefix cache across all tenants, and cache hits are distinguishable in time-to-first-token measurements. What can a probing tenant infer, and which control removes this cross-tenant cache-reuse path?
   - A. Evidence that a probed prefix was recently processed outside the probing tenant; per-tenant cache scoping removes the shared-reuse path at the cost of a lower hit rate.
   - B. The model weights of the serving replica; encrypting the weights at rest inside the trusted execution environment closes this cross-tenant timing side channel completely.
   - C. Another tenant's API credentials and request history; mutual TLS authentication between client and gateway closes the channel at the transport layer.
   - D. The exact output tokens produced for other tenants' prompts; rounding the returned output probability distributions before serialization closes the channel.

7. Vulnerabilities like Meltdown and Spectre exploit transient execution in modern processors. What microarchitectural mechanism lets an attacker infer protected data across an intended isolation boundary?
   - A. Speculative execution permanently overwrites physical DRAM cells with ciphertext key material without raising any fault or notifying the operating system kernel.
   - B. The CPU floating-point unit truncates all FP32 tensor activations down to INT8 precision during branch-prediction windows, corrupting enclave memory.
   - C. Transient instructions can encode protected data in cache state that remains measurable after the processor discards their architectural effects.
   - D. Speculative branch predictors disable the hardware AES encryption engines on the PCIe accelerator interconnect fabric during misprediction recovery.

8. A production ML platform is replacing legacy PyTorch .pth checkpoint files with the SafeTensors format for its public model repository. What primary security vulnerability does this change eliminate?
   - A. It prevents black-box model-extraction queries against the deployed HTTP API endpoint by binding every served response to a cryptographically signed tensor manifest.
   - B. It eliminates arbitrary code execution during model deserialization by storing only tensor data buffers without executable Python object serialization.
   - C. It guarantees (epsilon, delta)-differential privacy for whatever training dataset was originally encoded into the stored weight tensors at publication time.
   - D. It reduces steady-state inference latency by replacing floating-point matrix operations with optical computing primitives along the production serving path.

9. An aggregate query has l1 sensitivity Delta_1 f = 2.0 and l2 sensitivity Delta_2 f = 2.0. For pure epsilon-DP with epsilon = 0.5, what is the Laplace scale parameter b, and why is the Gaussian mechanism preferred in deep-learning DP-SGD?
   - A. b = 0.25; the Laplace mechanism is preferred for deep learning because it eliminates the need for per-sample gradient clipping during training.
   - B. b = 1.0; the Gaussian mechanism is preferred because it guarantees delta = 0 for any arbitrary query function and composes without budget loss.
   - C. b = 4.0; Gaussian noise matches an l2 clipped-gradient mechanism and supports mechanism-specific composition accounting such as Renyi DP.
   - D. b = 10.0; the Gaussian mechanism is preferred because it adds zero noise to gradients whose norms already fall below the clipping threshold.

10. A startup keeps its proprietary vision model's architecture and hyperparameters secret, assuming this prevents adversarial attacks and model theft. Under Kerckhoffs's principle and empirical ML security findings, why does this defense fail?
    - A. Black-box queries can reveal model behavior, and adversarial examples can transfer between models; secrecy alone therefore does not establish a tested security boundary.
    - B. Adversarial attacks are physically impossible unless the attacker first recovers the exact PyTorch random seed used during the original distributed training run.
    - C. Neural networks automatically publish their full learned weight tensors over standard DNS broadcast protocols immediately upon process initialization in production.
    - D. Security through obscurity remains a valid defense for deep learning systems because gradient descent provably produces non-invertible mathematical functions by construction.

11. A healthcare startup builds an ECG arrhythmia detector on 5,000 patients; the model is safety-critical, requiring under 2 percent accuracy loss. When evaluating DP-SGD under epsilon <= 3, what does the DP decision framework indicate?
    - A. DP-SGD should ship immediately: at 5,000 patients the privacy-utility trade-off is favorable at epsilon below 1, the clinical acceptance test can be deferred to post-deployment monitoring, and secure aggregation can substitute for the accountant.
    - B. DP-SGD will accelerate training throughput roughly fivefold by eliminating cross-worker gradient synchronization entirely, so the epsilon budget can be spent wholly on utility and the accountant becomes advisory.
    - C. The team must measure private-model utility under the stated budget and clinical acceptance criteria; dataset size alone does not establish feasibility, and secure aggregation is no substitute for a DP guarantee.
    - D. The startup should raise epsilon to one million: pure privacy then requires no noise at all, and the DP accountant can be replaced by conventional access logging and rate limits.

12. A surrogate attack needs 5 million queries to reach 90 percent fidelity. The attacker sustains 25,000 queries per day through allowed tiers. How many days does the extraction take, and which single control most directly extends that time without changing per-query cost?

13. A teammate says: 'We ran a membership-inference audit and attack accuracy was barely above chance, so the model has no privacy leakage.' Explain what the audit actually establishes, what it cannot rule out, and how a DP accountant changes the claim.

## Answer key

1. D. Failure (1) is an active adversary compromising integrity through crafted inputs (evasion). Failure (2) infers sensitive individual participation from model outputs without touching availability or software vulnerabilities. Confusing confidentiality with operational integrity, or treating both as network incidents, misses the algorithmic nature of each attack.

2. C. Dense regions hid individuals in the crowd; sparse regions kept enough structure to single them out. Aggregation protects privacy only when the protected unit is stated and the release is bounded — it is not a privacy guarantee by itself.

3. A. Prediction queries give black-box access; the known task and output format count as limited auxiliary knowledge; extraction happens against a deployed model at inference time. Calling it a configuration attack misplaces when in the lifecycle the leakage occurs.

4. B. Exact artifact theft is a storage/registry failure bounded by encryption, signing, and access control. Behavioral theft needs only query access and is bounded by cumulative per-principal budgets plus the output contract. Swapping the control sets leaves each vector open.

5. D. Gather-based median moves (N-1)M bytes per worker versus about 2(N-1)M/N for ring AllReduce; at N=64 that ratio is N/2 = 32. The integrity control lands directly in the CommunicationTime term of the fleet law unless overlapped.

6. A. A cache hit returns the first token measurably sooner than a miss, so probing yields evidence that a prefix was recently processed — without identifying who processed it. Per-tenant scoping removes the reuse path at the price of the hit rate.

7. C. Transient execution can leave measurable cache effects even when its architectural results are discarded. The side channel is microarchitectural state, not a software or transport-layer failure — which is why it crosses enclave and VM boundaries.

8. B. PyTorch's default .pth format uses Python pickle, which can execute arbitrary code at deserialization. SafeTensors stores only tensor buffers, removing the code-execution path. It says nothing about extraction, privacy, or latency.

9. C. Laplace scale is b = Delta_1 f / epsilon = 2/0.5 = 4. Gradient clipping supplies an l2 sensitivity bound, Gaussian noise matches that geometry, and approximate DP admits tighter accountants like Renyi DP or the moments accountant — none of which Laplace's pure-epsilon composition gives for free.

10. A. Kerckhoffs's principle requires security to survive disclosure of the design apart from protected keys. Black-box queries reveal behavior and adversarial examples transfer across models, so secrecy without a tested boundary defends nothing.

11. C. Small datasets can make the privacy-utility trade-off hard, but no universal sample-count rule decides it. Utility must be measured against the acceptance criteria under the stated budget; secure aggregation hides individual updates, not the aggregate, so it cannot stand in for DP.

12. 5,000,000 / 25,000 = 200 days. The control that most directly extends the time is a cumulative per-principal query budget (or equivalent quota accounting across accounts and tiers): a daily rate limit alone still collects 3.65 million queries per year at 10,000 per day, so only a lifetime bound changes the total the attacker can accumulate. Output-contract changes (rounding, top-k truncation) raise the query cost per unit of fidelity instead of extending the calendar time directly.

    The arithmetic is 5M / 25k = 200 days. The packet's point is that the lifetime budget, not the daily limit, is the bound that matters; shaping the output contract attacks fidelity per query rather than the schedule.

13. The audit is a lower bound on leakage: it measures what one attack under stated access assumptions could extract. Barely-above-chance accuracy rules out that particular attack succeeding at that access level, nothing more. It cannot rule out a stronger attack, released parameters, auxiliary information, or rare records that leak even when average accuracy sits near chance. A DP mechanism plus its accountant supplies the complementary upper bound: epsilon bounds the worst-case divergence for any attacker, which is why the honest claim is 'audited leakage is X, accounted bound is epsilon'; the gap between them is the residual uncertainty.

    Audit = lower bound on what was shown; DP accountant = upper bound on what is possible. Confusing the two turns an empirical result into a guarantee it never made.
