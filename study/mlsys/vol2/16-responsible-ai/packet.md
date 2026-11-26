---
title: "Responsible AI"
chapter: "vol2/16"
description: "Responsibility is an architectural property, not a post-training checklist. The governance band prices every control in evidence, latency, memory, and owners, and the impossibility results mean the choice of fairness criterion is a decision someone must sign."
openingQuestion: "A loan-screening team ships a fairness dashboard showing small subgroup gaps, a privacy accountant, and a red-team report, and declares the system responsible. Six months later a journalist shows that identical repayment-risk scores yield different decisions in two demographic groups, and no one can say who approved that policy, what evidence supported it, or how a borrower contests the outcome. Which artifact was missing?"
---

# Responsible AI: Study Packet

## Thesis

Responsible AI is not a supplement to the fleet engineering of the previous chapters; it is the governance band of the same stack. Robust AI asked whether predictions survive the world. Responsible AI asks a prior question: ==whether the system should be making those predictions at all, for whom, under whose authority, and with what evidence.== Every control in this chapter, fairness constraint, privacy mechanism, explanation service, safety filter, is an architectural component with a latency budget, a memory budget, an owner, and a boundary within which its evidence is valid. The teams that fail at this are rarely the ones that skipped ethics review. They are the ones that treated a dashboard as proof, a metric as a guarantee, and a deferred cost as a removed one.

## The Governance Band Is Not a Checklist

The fleet stack of this volume runs silicon, fabric, storage, scheduling, serving, and security. Governance sits above them all because it constrains why the system runs at all: intended use, requirements, evidence, accountable owners, and response paths. A post-training checklist cannot do this work because the obligations are architectural. The EU AI Act, US sectoral rules, and Asian regimes do not agree with each other, so a global fleet binds approved policies to use, organizational role, and jurisdiction at the control plane, with regional gateways and shared weights as one possible implementation. Jurisdiction is a routing input, not a server location.

::fig[assurance-chain]

The assurance case is the working artifact. An explicit claim, an argument connecting controls to that claim, evidence bounded by stated assumptions, and an owner who can act on the result. ==A fairness dashboard is evidence for a bounded claim, not proof of responsibility.== It becomes operational only when an accountable owner can act on it and affected people can contest decisions. The same discipline prices a randomized-smoothing certificate: it proves a property only for its stated norm, radius, confidence, and model configuration, exactly as an empirical attack evaluation reports resistance only under the tested protocol. Neither establishes safety for the complete workflow.

## Three Fairness Criteria, One Impossibility

The chapter's worked example is two hundred loan applicants. Group A: seventy approved of a hundred, forty of whom repaid. Group B: forty approved of a hundred, thirty of whom repaid. Three criteria now diverge measurably:

::eq[demographic-parity-gap]
$$
\Delta_{\mathrm{DP}}=\bigl|\Pr(\hat{Y}=1\mid A{=}a)-\Pr(\hat{Y}=1\mid A{=}b)\bigr|=|0.70-0.40|=0.30
$$

::eq[equal-opportunity-gap]
$$
\Delta_{\mathrm{EOpp}}=\bigl|\mathrm{TPR}_{a}-\mathrm{TPR}_{b}\bigr|=\bigl|\tfrac{40}{45}-\tfrac{30}{50}\bigr|\approx|0.89-0.60|=0.29
$$

The false positive rates diverge further, 55 percent for group A against 20 percent for group B, because approval composition differs across the groups. Three families of criteria are now in tension. Demographic parity wants equal selection rates. Equalized odds and equality of opportunity want equal error rates conditional on outcomes. Calibration wants the score to mean the same thing within each group.

::eq[impossibility-constraint]
$$
\mathrm{calib}_{a}=\mathrm{calib}_{b}\;\wedge\;\mathbb{E}[s\mid Y{=}1,a]=\mathbb{E}[s\mid Y{=}1,b]\;\wedge\;\mathbb{E}[s\mid Y{=}0,a]=\mathbb{E}[s\mid Y{=}0,b]\;\Rightarrow\;\text{impossible}
$$

With unequal base rates and imperfect prediction, groupwise calibration and equal mean scores within both outcome classes cannot all hold. The escapes are degenerate: perfect prediction or identical base rates. This is not a modeling deficiency that more data repairs. It is arithmetic. ==The choice of fairness criterion is therefore a decision, and a decision needs an owner, a justification, and a record.== Optimizing demographic parity first and declaring fairness achieved is the most common version of skipping that decision.

::fig[fairness-impossibility-triangle]

## The Threshold Is Policy, Not Machinery

Moving a decision threshold changes who is admitted; it does not change what the score means. In the chapter's scenario, a group A threshold of 0.75 and a group B threshold of 0.45 mean identical scores yield different decisions, and the positive predictive value of an approval diverges across groups even when the underlying model stays calibrated. A loan officer reading an approval cannot know what repayment risk it represents without documentation of the group-specific policy.

Thresholds live in serving code, review queues, audit records, and downstream decisions. They are operational policy. The intervention tier taxonomy prices the infrastructure each choice needs. Preprocessing changes the training distribution and demands lineage. In-processing changes the optimization itself. Postprocessing changes the decision policy and, for group-specific thresholds, requires authorized group information at the decision component, a dependency with its own legal and ethical review.


Freshness also differs by criterion. Demographic parity depends only on decisions and group membership at inference time, so its statistics update immediately. Equalized odds needs matched outcome labels, and in lending those labels arrive months later. The monitoring architecture inherits this difference: some fairness evidence is always older than the serving system it describes.

## The Proxy Is the Target

The healthcare study is the chapter's central warning about prediction targets. A widely used risk algorithm predicted healthcare expenditure as a proxy for health need. Because Black patients faced historical access barriers and generated lower costs at equal illness burden, the algorithm inferred they were healthier than equally ill white patients. In the study's simulated correction, the share of Black patients identified for additional care at the enrollment threshold rose from 17.7 percent to 46.5 percent.

Nothing in the pipeline malfunctioned. The model predicted its target accurately. ==The failure was upstream of every fairness metric: the target itself encoded the disparity.== No amount of representative data or algorithmic improvement repairs a wrongly chosen proxy, because the system is optimizing the wrong quantity faithfully. This is why the impossibility result and the proxy problem compound: even perfect execution of the wrong specification produces measured, documented, optimized harm.

## Conservation of Overhead

Explanation work deferred does not vanish; it moves. The chapter's conservation-of-overhead principle states that producing attribution evidence demands compute, storage, and interfaces somewhere, and deferring the work to after deployment relocates it onto the request path, the memory budget, or a review queue.

::eq[shapley-enumeration]
$$
T_{\mathrm{shap}}=2^{n}\cdot t_{\mathrm{eval}}=2^{20}\times 1\,\mu\mathrm{s}\approx 1.05\,\mathrm{s}
$$

Exhaustive Shapley enumeration visits every feature coalition. At twenty features and one microsecond per coalition the calculation exceeds one second, which no hundred-millisecond serving budget absorbs. Sampled KernelSHAP, exact TreeSHAP on tree models, cached attribution, and asynchronous generation are the architectural answers, each with its own fidelity and cost profile.

::eq[explanation-capacity]
$$
\mathrm{capacity}=\frac{100\,\mathrm{ms}+[50,200]\,\mathrm{ms}}{100\,\mathrm{ms}}\approx[1.5,3.0]\times
$$

A service running a hundred milliseconds of processing per request at ten thousand queries per second, adding fifty to two hundred milliseconds of inline explanation work, needs roughly one and a half to three times the capacity to preserve throughput, under the assumption that occupied resource time grows in proportion to latency. And ==additional replicas preserve throughput but cannot restore the per-request latency, because the explanation sits on the serial path.== Meeting the original latency deadline requires reducing the work or moving it off the critical path. Adversarial training multiplies batch compute roughly eightfold for a seven-step attack. Every responsible-AI technique appears in the overhead table with a training, inference, memory, or accuracy cost. The question is never whether to pay, but where.

::fig[conservation-of-overhead]

## Privacy Is a Retraining Architecture

::eq[dp-sgd-update]

$$
\tilde{g}=\sum_{i}\mathrm{clip}\bigl(g_i,C\bigr)+\mathcal{N}\!\bigl(0,\sigma^{2}C^{2}\mathbb{I}\bigr)
$$

DP-SGD applies two operations before each weight update: per-example gradient clipping to a maximum norm, and calibrated Gaussian noise addition. The privacy bound depends on sampling and composition accounting, and the compute and utility costs must be measured for the configuration chosen. Machine unlearning prices deletion differently.

::eq[sisa-erasure-cost]
$$
\mathrm{cost}_{\mathrm{erase}}\propto\frac{|\text{shards touched}|}{S}\times\mathrm{cost}_{\mathrm{full}}\qquad(S=100)
$$

SISA training shards the data, isolates the shards, slices training within them, and aggregates the results, so one deletion affects one shard of a hundred rather than the full corpus. The saving erodes exactly when erasure requests arrive fast enough that each retraining batch touches essentially all shards. The architecture encodes an assumption about request distribution, batching intervals, and saved slice states. GDPR Article 17 is not a feature flag; it is a training-pipeline design constraint with a workload attached.

## Reliability Breeds Over-Reliance

The paradox of reliability: the better the model appears, the worse the human oversight becomes. Automation bias leads reviewers to accept wrong recommendations because the system is usually right, and ==a low override rate cannot distinguish few model errors from failure to notice them.== Interface evaluation must measure how often users accept erroneous recommendations, correct errors, and introduce new ones, not the overall override rate.

The bias amplification loop closes the sociotechnical circuit. A model trained on historically biased data produces biased outputs; those outputs shape user behavior and future data collection; the reinforced bias is captured in operational data; retraining on that data deepens it.

::eq[feedback-amplification]
$$
b_{t+1}=b_{t}+\gamma\cdot g(b_{t})\qquad(\gamma>0\;\Rightarrow\;\text{divergent})
$$

Unconstrained retraining pipelines are feedback amplifiers with positive gain.

::fig[bias-amplification-loop]

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
