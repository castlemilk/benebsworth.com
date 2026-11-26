---
title: "Responsible AI — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html"
canonical_url: "https://benebsworth.com/study/vol2/16-responsible-ai/"
---

# Responsible AI: Study Packet

A loan-screening team ships a fairness dashboard showing small subgroup gaps, a privacy accountant, and a red-team report, and declares the system responsible. Six months later a journalist shows that identical repayment-risk scores yield different decisions in two demographic groups, and no one can say who approved that policy, what evidence supported it, or how a borrower contests the outcome. Which artifact was missing?

## Thesis

Responsible AI is not a supplement to the fleet engineering of the previous chapters; it is the governance band of the same stack. Robust AI asked whether predictions survive the world. Responsible AI asks a prior question: **whether the system should be making those predictions at all, for whom, under whose authority, and with what evidence.** Every control in this chapter, fairness constraint, privacy mechanism, explanation service, safety filter, is an architectural component with a latency budget, a memory budget, an owner, and a boundary within which its evidence is valid. The teams that fail at this are rarely the ones that skipped ethics review. They are the ones that treated a dashboard as proof, a metric as a guarantee, and a deferred cost as a removed one.

## The Governance Band Is Not a Checklist

The fleet stack of this volume runs silicon, fabric, storage, scheduling, serving, and security. Governance sits above them all because it constrains why the system runs at all: intended use, requirements, evidence, accountable owners, and response paths. A post-training checklist cannot do this work because the obligations are architectural. The EU AI Act, US sectoral rules, and Asian regimes do not agree with each other, so a global fleet binds approved policies to use, organizational role, and jurisdiction at the control plane, with regional gateways and shared weights as one possible implementation. Jurisdiction is a routing input, not a server location.

![The assurance chain](https://benebsworth.com/study/vol2/16-responsible-ai/diagrams/assurance-chain.svg)

*Claim, argument, evidence, owner, action. A dashboard feeds the evidence link only; without the owner and the action path it is a log entry, not a control.*
The assurance case is the working artifact. An explicit claim, an argument connecting controls to that claim, evidence bounded by stated assumptions, and an owner who can act on the result. **A fairness dashboard is evidence for a bounded claim, not proof of responsibility.** It becomes operational only when an accountable owner can act on it and affected people can contest decisions. The same discipline prices a randomized-smoothing certificate: it proves a property only for its stated norm, radius, confidence, and model configuration, exactly as an empirical attack evaluation reports resistance only under the tested protocol. Neither establishes safety for the complete workflow.

## Three Fairness Criteria, One Impossibility

The chapter's worked example is two hundred loan applicants. Group A: seventy approved of a hundred, forty of whom repaid. Group B: forty approved of a hundred, thirty of whom repaid. Three criteria now diverge measurably:

**Eq 1 · Demographic parity gap**
$$
\Delta_{\mathrm{DP}}=\bigl|\Pr(\hat{Y}=1\mid A{=}a)-\Pr(\hat{Y}=1\mid A{=}b)\bigr|=|0.70-0.40|=0.30
$$

**Eq 2 · Equality of opportunity gap**
$$
\Delta_{\mathrm{EOpp}}=\bigl|\mathrm{TPR}_{a}-\mathrm{TPR}_{b}\bigr|=\bigl|\tfrac{40}{45}-\tfrac{30}{50}\bigr|\approx|0.89-0.60|=0.29
$$

The false positive rates diverge further, 55 percent for group A against 20 percent for group B, because approval composition differs across the groups. Three families of criteria are now in tension. Demographic parity wants equal selection rates. Equalized odds and equality of opportunity want equal error rates conditional on outcomes. Calibration wants the score to mean the same thing within each group.

**Eq 3 · Score-balance impossibility**
$$
\mathrm{calib}_{a}=\mathrm{calib}_{b}\;\wedge\;\mathbb{E}[s\mid Y{=}1,a]=\mathbb{E}[s\mid Y{=}1,b]\;\wedge\;\mathbb{E}[s\mid Y{=}0,a]=\mathbb{E}[s\mid Y{=}0,b]\;\Rightarrow\;\text{impossible}
$$

With unequal base rates and imperfect prediction, groupwise calibration and equal mean scores within both outcome classes cannot all hold. The escapes are degenerate: perfect prediction or identical base rates. This is not a modeling deficiency that more data repairs. It is arithmetic. **The choice of fairness criterion is therefore a decision, and a decision needs an owner, a justification, and a record.** Optimizing demographic parity first and declaring fairness achieved is the most common version of skipping that decision.

![Three criteria, two chairs](https://benebsworth.com/study/vol2/16-responsible-ai/diagrams/fairness-impossibility-triangle.svg)

*Groupwise calibration, balance in the positive class, and balance in the negative class: with unequal base rates and imperfect prediction, at most two of the three can hold. The worked-example numbers annotate each edge.*
## The Threshold Is Policy, Not Machinery

Moving a decision threshold changes who is admitted; it does not change what the score means. In the chapter's scenario, a group A threshold of 0.75 and a group B threshold of 0.45 mean identical scores yield different decisions, and the positive predictive value of an approval diverges across groups even when the underlying model stays calibrated. A loan officer reading an approval cannot know what repayment risk it represents without documentation of the group-specific policy.

Thresholds live in serving code, review queues, audit records, and downstream decisions. They are operational policy. The intervention tier taxonomy prices the infrastructure each choice needs. Preprocessing changes the training distribution and demands lineage. In-processing changes the optimization itself. Postprocessing changes the decision policy and, for group-specific thresholds, requires authorized group information at the decision component, a dependency with its own legal and ethical review.


Freshness also differs by criterion. Demographic parity depends only on decisions and group membership at inference time, so its statistics update immediately. Equalized odds needs matched outcome labels, and in lending those labels arrive months later. The monitoring architecture inherits this difference: some fairness evidence is always older than the serving system it describes.

## The Proxy Is the Target

The healthcare study is the chapter's central warning about prediction targets. A widely used risk algorithm predicted healthcare expenditure as a proxy for health need. Because Black patients faced historical access barriers and generated lower costs at equal illness burden, the algorithm inferred they were healthier than equally ill white patients. In the study's simulated correction, the share of Black patients identified for additional care at the enrollment threshold rose from 17.7 percent to 46.5 percent.

Nothing in the pipeline malfunctioned. The model predicted its target accurately. **The failure was upstream of every fairness metric: the target itself encoded the disparity.** No amount of representative data or algorithmic improvement repairs a wrongly chosen proxy, because the system is optimizing the wrong quantity faithfully. This is why the impossibility result and the proxy problem compound: even perfect execution of the wrong specification produces measured, documented, optimized harm.

## Conservation of Overhead

Explanation work deferred does not vanish; it moves. The chapter's conservation-of-overhead principle states that producing attribution evidence demands compute, storage, and interfaces somewhere, and deferring the work to after deployment relocates it onto the request path, the memory budget, or a review queue.

**Eq 4 · Exhaustive Shapley enumeration cost**
$$
T_{\mathrm{shap}}=2^{n}\cdot t_{\mathrm{eval}}=2^{20}\times 1\,\mu\mathrm{s}\approx 1.05\,\mathrm{s}
$$

Exhaustive Shapley enumeration visits every feature coalition. At twenty features and one microsecond per coalition the calculation exceeds one second, which no hundred-millisecond serving budget absorbs. Sampled KernelSHAP, exact TreeSHAP on tree models, cached attribution, and asynchronous generation are the architectural answers, each with its own fidelity and cost profile.

**Eq 5 · Explanation capacity multiple**
$$
\mathrm{capacity}=\frac{100\,\mathrm{ms}+[50,200]\,\mathrm{ms}}{100\,\mathrm{ms}}\approx[1.5,3.0]\times
$$

A service running a hundred milliseconds of processing per request at ten thousand queries per second, adding fifty to two hundred milliseconds of inline explanation work, needs roughly one and a half to three times the capacity to preserve throughput, under the assumption that occupied resource time grows in proportion to latency. And **additional replicas preserve throughput but cannot restore the per-request latency, because the explanation sits on the serial path.** Meeting the original latency deadline requires reducing the work or moving it off the critical path. Adversarial training multiplies batch compute roughly eightfold for a seven-step attack. Every responsible-AI technique appears in the overhead table with a training, inference, memory, or accuracy cost. The question is never whether to pay, but where.

![Deferred work relocates](https://benebsworth.com/study/vol2/16-responsible-ai/diagrams/conservation-of-overhead.svg)

*Explanation work deferred after deployment does not vanish; it moves onto the serial request path, the memory budget, or a human review queue. Capacity multiples preserve throughput, never serial latency.*
## Privacy Is a Retraining Architecture

**Eq 6 · DP-SGD gradient transformation**
$$
\tilde{g}=\sum_{i}\mathrm{clip}\bigl(g_i,C\bigr)+\mathcal{N}\!\bigl(0,\sigma^{2}C^{2}\mathbb{I}\bigr)
$$

DP-SGD applies two operations before each weight update: per-example gradient clipping to a maximum norm, and calibrated Gaussian noise addition. The privacy bound depends on sampling and composition accounting, and the compute and utility costs must be measured for the configuration chosen. Machine unlearning prices deletion differently.

**Eq 7 · SISA erasure cost**
$$
\mathrm{cost}_{\mathrm{erase}}\propto\frac{|\text{shards touched}|}{S}\times\mathrm{cost}_{\mathrm{full}}\qquad(S=100)
$$

SISA training shards the data, isolates the shards, slices training within them, and aggregates the results, so one deletion affects one shard of a hundred rather than the full corpus. The saving erodes exactly when erasure requests arrive fast enough that each retraining batch touches essentially all shards. The architecture encodes an assumption about request distribution, batching intervals, and saved slice states. GDPR Article 17 is not a feature flag; it is a training-pipeline design constraint with a workload attached.

## Reliability Breeds Over-Reliance

The paradox of reliability: the better the model appears, the worse the human oversight becomes. Automation bias leads reviewers to accept wrong recommendations because the system is usually right, and **a low override rate cannot distinguish few model errors from failure to notice them.** Interface evaluation must measure how often users accept erroneous recommendations, correct errors, and introduce new ones, not the overall override rate.

The bias amplification loop closes the sociotechnical circuit. A model trained on historically biased data produces biased outputs; those outputs shape user behavior and future data collection; the reinforced bias is captured in operational data; retraining on that data deepens it.

**Eq 8 · Bias amplification loop**
$$
b_{t+1}=b_{t}+\gamma\cdot g(b_{t})\qquad(\gamma>0\;\Rightarrow\;\text{divergent})
$$

Unconstrained retraining pipelines are feedback amplifiers with positive gain.

![The retraining feedback loop](https://benebsworth.com/study/vol2/16-responsible-ai/diagrams/bias-amplification-loop.svg)

*Biased outputs shape behavior and future data collection; retraining on that data deepens the bias. Positive loop gain makes the unconstrained pipeline a divergent amplifier.*
## Accountability Does Not Transfer

A company building on a third-party foundation model inherits weights, safety evaluations, documentation, and contractual controls. It does not transfer accountability. The deploying organization still chooses the use, the interface, the retrieved context, the user population, the monitoring, and the response process. Procurement needs the same rigor as an internal build, because the assurance case must cover components the organization did not train and cannot inspect.

Representation cost is the fleet-scale version of the same lesson. In the chapter's medical imaging scenario, representative data costs one hundred twenty-five million dollars or more to collect, fifty to two hundred dollars per image plus thirty to fifty percent harmonization overhead, because underrepresented populations are expensive to source: rural clinics, minority demographics, uncommon equipment. The cost scales with subgroup coverage, not total volume. Cheap data is expensive exactly where fairness matters most.

## Fallacies and Pitfalls

*Bias will disappear with more data and better algorithms.* The proxy problem and the impossibility result are both invariant to data quality and model class. Engineers must distinguish a remediable data defect from incompatible requirements and a misspecified target.

*Achieving one fairness metric guarantees overall fairness.* Reaching approval parity in the chapter's credit scenario cost accuracy and left the groups carrying different default risk. Passing one metric leaves the others to evaluate, and the choice is a documented decision.

*Monitoring dashboards create accountability.* A metric no team owns is a log entry. Alerts age out, regressions become accepted baselines, and users receive no route to contest. Production responsibility binds each signal to an owner, a threshold, an escalation path, and a remediation budget.

*Responsible AI is pure compliance overhead.* Differential privacy enables work with sensitive data under clearer guarantees; fairness monitoring is risk management. Detection still requires an owner with authority, capacity, and a validated remedy.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Worked-example approval rates | 70% vs 40% | Demographic parity gap 0.30 |
| Group TPRs | 89% vs 60% | Equal opportunity gap 0.29 |
| Group FPRs | 55% vs 20% | Error composition diverges with approval mix |
| Shapley enumeration, 20 features | 2^20 ≈ 1.05M coalitions | Over 1 second at 1 microsecond each |
| Inline explanation retrofit | +50-200 ms on 100 ms | 1.5-3x capacity; replicas cannot cut serial latency |
| Adversarial training overhead | ~8x batch compute | Seven-step attack per batch |
| Healthcare correction | 17.7% → 46.5% | Black patients' share of selected population after proxy repair |
| SISA sharding | 100 shards | Saving erodes when batches touch all shards |
| Representation cost | $125M+ scenario | $50-200/image plus 30-50% harmonization |
| Group thresholds | 0.75 vs 0.45 | Identical scores, different decisions, diverging PPV |

## Glossary

- **assurance case**: the structured argument linking an explicit responsibility claim to bounded evidence, with an owner empowered to act on the result.
- **automation bias**: the tendency of reviewers to accept system recommendations because the system is usually right, degrading oversight as reliability improves.
- **calibration within groups**: the property that a score means the same outcome frequency inside each demographic group.
- **demographic parity**: the criterion that selection rates equalize across groups, independent of outcomes.
- **equalized odds**: the criterion that true and false positive rates equalize across groups conditional on outcomes.
- **equality of opportunity**: the relaxation of equalized odds requiring only equal true positive rates.
- **impossibility result**: the theorem that groupwise calibration and equal mean scores in both outcome classes cannot all hold when base rates differ and prediction is imperfect.
- **machine unlearning**: removing the influence of specific training examples, architected through sharding, slicing, and aggregation rather than full retraining.
- **paradox of reliability**: the observation that higher apparent model reliability degrades the human oversight meant to catch its errors.
- **postprocessing**: fairness intervention at the decision policy, including group-specific thresholds that need authorized group information at the decision component.
- **proxy variable**: a measurable stand-in for the intended target, capable of encoding the disparity it was meant to avoid.
- **representation cost**: the financial and logistical cost of collecting data for underrepresented subgroups, scaling with coverage rather than volume.
- **SISA training**: sharded, isolated, sliced, aggregated training that bounds retraining cost per erasure to the affected shard.
- **sociotechnical feedback loop**: the cycle by which model outputs shape behavior and data collection, reinforcing the biases retraining then captures.

## Open questions

1. When fairness criteria conflict, who in the organization holds the authority to choose, and what does the record of that decision look like in your systems?
2. Which of your monitoring signals currently lacks a bound owner, and what is the escalation path when it fires?
3. Where does your explanation budget sit: inline on the request path, asynchronous, or cached, and what fidelity did that placement cost?
4. If an erasure request arrived today, which components would retrain, and how does that cost scale with request rate?


---

## Key equations

**Eq 1 · Demographic parity gap**

$$
\Delta_{\mathrm{DP}}=\bigl|\Pr(\hat{Y}=1\mid A{=}a)-\Pr(\hat{Y}=1\mid A{=}b)\bigr|=|0.70-0.40|=0.30
$$

*The selection-rate difference across groups uses only decisions and group membership, so it is computable at inference time, months before outcome labels arrive. In the two-hundred-applicant scenario the gap is thirty points.*

**Eq 2 · Equality of opportunity gap**

$$
\Delta_{\mathrm{EOpp}}=\bigl|\mathrm{TPR}_{a}-\mathrm{TPR}_{b}\bigr|=\bigl|\tfrac{40}{45}-\tfrac{30}{50}\bigr|\approx|0.89-0.60|=0.29
$$

*True positive rates condition on the outcome, so they cannot be computed until labels arrive. Group A repayers are approved 89 percent of the time, group B repayers 60 percent.*

**Eq 3 · Score-balance impossibility**

$$
\mathrm{calib}_{a}=\mathrm{calib}_{b}\;\wedge\;\mathbb{E}[s\mid Y{=}1,a]=\mathbb{E}[s\mid Y{=}1,b]\;\wedge\;\mathbb{E}[s\mid Y{=}0,a]=\mathbb{E}[s\mid Y{=}0,b]\;\Rightarrow\;\text{impossible}
$$

*When base rates differ across groups and prediction is imperfect, groupwise calibration and equal mean scores within both outcome classes cannot all hold. The escapes are degenerate: perfect prediction or identical base rates.*

**Eq 4 · Exhaustive Shapley enumeration cost**

$$
T_{\mathrm{shap}}=2^{n}\cdot t_{\mathrm{eval}}=2^{20}\times 1\,\mu\mathrm{s}\approx 1.05\,\mathrm{s}
$$

*Enumerating every feature coalition grows exponentially in feature count. Twenty features at one microsecond per coalition already exceeds any inline serving budget, before counting the model evaluations each coalition value requires.*

**Eq 5 · Explanation capacity multiple**

$$
\mathrm{capacity}=\frac{100\,\mathrm{ms}+[50,200]\,\mathrm{ms}}{100\,\mathrm{ms}}\approx[1.5,3.0]\times
$$

*Capacity scales with occupied resource time per request when latency grows on the serial path. Replicas preserve throughput but cannot restore per-request latency; meeting the original deadline requires shrinking or relocating the explanation work.*

**Eq 6 · DP-SGD gradient transformation**

$$
\tilde{g}=\sum_{i}\mathrm{clip}\bigl(g_i,C\bigr)+\mathcal{N}\!\bigl(0,\sigma^{2}C^{2}\mathbb{I}\bigr)
$$

*Per-example clipping bounds each training example's influence; Gaussian noise scaled to the clipping norm hides any single example's contribution. The privacy bound depends on sampling and composition accounting, and utility cost must be measured per configuration.*

**Eq 7 · SISA erasure cost**

$$
\mathrm{cost}_{\mathrm{erase}}\propto\frac{|\text{shards touched}|}{S}\times\mathrm{cost}_{\mathrm{full}}\qquad(S=100)
$$

*One deletion re-trains one shard of a hundred. When erasure volume is high enough that each retraining batch touches essentially all shards, the sharding saving erodes and the architecture must be re-evaluated against batching interval and saved slice state.*

**Eq 8 · Bias amplification loop**

$$
b_{t+1}=b_{t}+\gamma\cdot g(b_{t})\qquad(\gamma>0\;\Rightarrow\;\text{divergent})
$$

*When outputs shape the data the next generation trains on, bias is a feedback state with positive gain. Unconstrained retraining amplifies; breaking the loop requires intervening on data collection, not just the model.*

## Charts

**Worked example: three rates by group**

| rate | Group A | Group B |
|---|---|---|
| approval | 70 | 40 |
| TPR | 89 | 60 |
| FPR | 55 | 20 |

*Approval rate, true positive rate, and false positive rate for the two hundred-applicant scenario. The three criteria diverge because approval composition differs.*

**Inline explanation cost**

| configuration | baseline work | explanation work |
|---|---|---|
| baseline | 100 | 0 |
| plus light explanation | 100 | 50 |
| plus heavy explanation | 100 | 200 |

*Per-request processing before and after adding inline explanations, with the capacity multiple needed to preserve throughput at ten thousand queries per second.*


## From the book

- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined
- [undefined](https://mlsysbook.ai/vol2/16_responsible_ai/16_responsible_ai.html) — undefined

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

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

## Audio overview

[Listen to the Marcus & Iris read-along (~9 min)](https://benebsworth.com/study-audio/vol2/16-responsible-ai.m4a) — a generated podcast walking this packet's argument.
