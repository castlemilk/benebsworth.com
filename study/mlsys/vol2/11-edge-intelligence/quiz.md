# Edge Intelligence — self-test

1. A phone already runs a model offline. Why does that not establish that it can adapt the model offline?
   - A. Offline inference removes communication delay, so any local training that fits flash can run whenever the scheduler has spare time
   - B. Local inference always uses more memory than local training because forward activations dominate every mobile training budget
   - C. Training adds backward state, memory traffic, energy, heat and foreground contention beyond the forward pass
   - D. The operating system permits any background task to use all installed RAM once the device is charging

2. In the chapter's 10M-parameter FP32 example, why does the full update working set reach 360 MB?
   - A. Forty MB weights are joined by forty MB gradients, eighty MB Adam state and two hundred MB saved activations
   - B. The weights are 360 MB before training starts because gradients and optimizer state reuse the same memory in place
   - C. The optimizer stores ten full model copies while activations are released before they consume memory
   - D. The example counts flash storage rather than live working memory

3. A smartphone has 8 GB installed RAM. Why can a 360 MB training working set still be infeasible?
   - A. Installed RAM is never available to machine-learning runtimes because mobile operating systems reserve it for the foreground interface
   - B. Flash memory is always faster than RAM, so the working set must remain in flash
   - C. The model must reserve all memory for federated downloads before training starts
   - D. The operative ceiling is the smaller background allowance after the OS and foreground application reserve memory

4. A device is charging, so its energy allowance increases. Why can the adaptation window still be rejected?
   - A. Charging disables the high-power accelerators adaptation would otherwise use, so the energy test becomes irrelevant
   - B. The update might still violate the thermal power limit or foreground-latency deadline under concurrent adaptation
   - C. Energy, thermal and latency are the same test expressed in three units
   - D. The battery test applies only when the device is already at full charge

5. For a 768 by 768 weight matrix, what does rank-4 LoRA shrink from 589,824 to 6,144?
   - A. The full model's inference latency by ninety-nine percent, because low rank removes most backward computation
   - B. The bytes of the frozen base model stored in flash memory
   - C. The number of trainable parameters, not necessarily the backward path or activation memory
   - D. The number of examples required for federated aggregation to converge

6. Which statement correctly describes weight freezing?
   - A. It removes gradients and optimizer state for frozen parameters while leaving their forward and possible backward roles intact
   - B. It removes frozen weights from memory after the first optimizer step because training no longer needs their forward values during later epochs
   - C. It eliminates the backward path through every frozen layer in all implementations
   - D. It guarantees better personalization than adapters because fewer parameters are trained

7. Under ordinary FedAvg example weighting, what influence does a client with ten times as many local examples receive?
   - A. Exactly the same influence as every other participant, because federated objectives always treat users rather than examples as the unit
   - B. No influence until user weighting is enabled by the coordinator
   - C. Influence proportional only to its network bandwidth and hardware tier
   - D. Ten times the influence, because its update is weighted by its share of examples in the round

8. Why can a larger local-epoch setting reduce communication rounds yet increase total time to target?
   - A. Local epochs reduce computation on every participating device, so the server must wait longer even though fewer communication rounds are required
   - B. More local work lengthens each round and non-IID client drift can increase the number of rounds needed to reach target quality
   - C. The server must retrain the global model from scratch after every additional local epoch
   - D. Communication time is independent of update size and network bandwidth

9. Why is federated learning not inherently private?
   - A. Raw data is always uploaded beside every model update, so secure aggregation only hides the final aggregate from clients rather than the server
   - B. Secure aggregation reveals every client update but hides the final global model
   - C. Returned updates and metadata can leak information; secure aggregation and differential privacy are separate explicit mechanisms
   - D. Privacy is impossible whenever more than one client participates in a round

10. A keyboard model adapts nightly for a year. Each update passes its memory and energy admission tests and improves a metric on recent typing. Why must acceptance also measure retained behavior against a recoverable baseline?
    - A. Individually useful updates can accumulate into forgetting; retained-task evidence and a compatible recovery point remain necessary
    - B. Passing memory and energy admission guarantees that earlier predictions remain unchanged because resource fit and behavior are equivalent budgets
    - C. Freezing the backbone prevents head or adapter updates from changing any earlier-task prediction
    - D. Improving the recent-data metric establishes quality for all past tasks whenever each update is small

11. A 10M-parameter FP32 model has 40 MB weights and 40 MB gradients. Adam stores two moment arrays totaling 80 MB. Under a revised activation schedule, saved activations cost 6x the weight bytes, or 240 MB. Ignoring workspace, what is the total working set and its amplification over the weights?

12. A weekly raw-image upload would cost 200 MB. A compressed federated update costs 2.5 MB per round. Ignoring downloads, retries and protocol bytes, after how many update rounds do cumulative uploads equal the raw-data volume?

13. Design a release and rollback policy for a keyboard model that adapts locally across flagship and budget phones. Explain what artifact is versioned, how evidence is gathered, and what happens when a cohort stops reporting.

## Answer key

1. C. Inference fit only proves that the forward-pass model and its runtime fit. Training introduces gradients, optimizer state, saved activations, workspace and user-facing power and latency costs.

2. A. The illustrated stack is 40 + 40 + 80 + 200 MB, or 360 MB. That is 9x the inference weights under the chapter's stated activation assumption.

3. D. The chapter uses a 200-300 MB background-memory allowance for the keyboard profile. Installed RAM overstates what a background learning task may use.

4. B. The admission rule is a conjunction. Charging can enlarge the energy allowance, but it does not remove heat or foreground contention.

5. C. LoRA trains two thin matrices containing r(d_in + d_out) parameters. The frozen base still exists, and activations, workspace and backward computation remain separate costs.

6. A. Freezing reduces trainable state, but it does not make the frozen base or every backward dependency disappear. That distinction governs peak memory.

7. D. Example weighting uses n_k divided by total samples n. The book emphasizes that this is a population policy choice, not a neutral implementation detail.

8. B. The chapter ranks settings by measured time to target, not communication count. Each round can become longer, and drift can erode the expected reduction in round count.

9. C. Data locality removes one transfer path but does not make the released update harmless. Secure aggregation hides individual contributions under assumptions; differential privacy bounds a different release guarantee.

10. A. Continual adaptation is a trajectory problem. Small, individually admitted updates can overwrite earlier competence, so acceptance needs retained-task evidence and a recovery point as well as new-data improvement.

11. 40 + 40 + 80 + 240 = 400 MB. The amplification over weights is 400 / 40 = 10x.

    Each memory term has a different owner. The activation multiplier applies only to the activation term, not to the already-counted gradients and optimizer state.

12. 200 MB / 2.5 MB per round = 80 rounds. After about 80 rounds, upload bytes alone match the raw-data volume, before counting the rest of the round traffic.

    The one-round compression ratio is 80x, but federation repeats the upload every round. Lifetime communication cost must be compared over the training run.

13. A strong answer treats the release as a compatible policy bundle: base model, adapter schema, per-tier adaptation strategy, resource admission rules, telemetry policy and rollback plan. Validation uses hardware-in-the-loop tests and cohort-level distributed or privacy-preserving metrics. A frozen shadow model can detect behavioral change but not prove accuracy without labels or a validated proxy. Promotion requires sufficient reporting coverage by cohort. If a cohort stops reporting, the fleet should hold rather than treat silence as health. Rollback restores a compatible set of base model, adapters, schemas and policy, accounting for version skew rather than rolling back one artifact in isolation.

    The operational problem is population evidence plus compatibility. Average fleet metrics are insufficient because reporting itself is biased by device capability and connectivity.
