# hosts: Marcus | Iris

A: Today we are studying volume two, chapter sixteen: responsible AI. I'm Marcus, and with me is Iris. The opening scenario: a loan-screening team ships a fairness dashboard showing small subgroup gaps, plus a privacy accountant and a red-team report, and declares the system responsible. Six months later a journalist shows identical risk scores yield different decisions across two demographic groups, and nobody can say who approved that policy or how a borrower contests it. Which artifact was missing?

B: The assurance case. Not more evidence, but the chain that makes evidence operational: an explicit claim, an argument connecting controls to that claim, evidence bounded by stated assumptions, an owner who can act, and a remedy path. The dashboard was evidence for one link of a chain that was never assembled.

A: The chapter frames responsible AI as the governance band of the fleet stack. Why governance rather than a post-training checklist?

B: Because the obligations are architectural. Global regulation does not agree with itself: the EU AI Act, US sectoral rules, Asian regimes. A global fleet binds approved policies to use, organizational role, and jurisdiction at the control plane. And the questions governance asks, why the system runs, whom it serves, who answers for it, come before every optimization the lower bands perform.

::fig[assurance-chain]

A: Then the mathematics intrudes. Fairness has an impossibility theorem.

B: Three properties people want: calibration within each group, equal mean scores among positive outcomes across groups, equal mean scores among negative outcomes. With unequal base rates and imperfect prediction, all three cannot hold. The escapes are degenerate: perfect prediction or identical base rates. So some criterion is always being sacrificed. The only question is whether someone chose it, documented it, and owns it.

A: The worked example makes it concrete. Two hundred loan applicants.

B: Group A: seventy approved of a hundred, forty of whom repaid. Group B: forty approved of a hundred, thirty of whom repaid. Approval rates differ by thirty points, true positive rates by twenty-nine, and false positive rates diverge further, fifty-five percent against twenty, because approval composition differs.

::eq[demographic-parity-gap]

B: That is the demographic parity gap, the selection-rate difference. It uses only decisions and group membership, which matters operationally: you can compute it at inference time.

A: Whereas the error-rate criteria wait for labels.

B: Exactly. Equalized odds conditions on outcomes. In lending, repayment labels arrive months after the decision. So some fairness evidence is always older than the serving system it describes. The monitoring architecture inherits that lag whether anyone plans for it or not.

::eq[equal-opportunity-gap]

A: And the impossibility result says you cannot buy your way out with data or model quality.

::eq[impossibility-constraint]

B: Right. It is arithmetic, not a modeling deficiency. Which is why optimizing demographic parity first and declaring victory is the most common failure: reaching approval parity in the credit scenario cost accuracy and left the two groups carrying different default risk. Passing one metric leaves the others unevaluated.

A: Thresholds make it worse. They look like machinery but they are policy.

B: A group A threshold of zero point seven five and a group B threshold of zero point four five means identical scores produce different decisions. Positive predictive value diverges across groups even when the underlying model stays calibrated. And a loan officer reading an approval cannot know what it means without documentation of the group-specific policy. The threshold lives in serving code, review queues, and audit records. It is operational policy, and postprocessing with group-specific thresholds needs authorized group information at the decision component, which carries its own legal review.

::fig[fairness-impossibility-triangle]

A: Now the healthcare study, which I think is the chapter's deepest warning.

B: A widely used algorithm predicted healthcare expenditure as a proxy for health need. Black patients faced historical access barriers, so at equal illness burden they generated lower costs. The algorithm inferred they were healthier. In the simulated correction, the share of Black patients identified for additional care at the enrollment threshold rose from seventeen point seven percent to forty-six point five percent.

A: And the pipeline never malfunctioned.

B: Never. It predicted its target accurately. The failure was upstream of every fairness metric: the target itself encoded the disparity. More data and better algorithms cannot repair a misspecified proxy, because the system is optimizing the wrong quantity faithfully. Combined with the impossibility result, you see the shape of the problem: even perfect execution of the wrong specification produces measured, documented, optimized harm.

A: Conservation of overhead. Explanation work deferred does not vanish.

B: It moves. Producing attribution evidence demands compute, storage, and interfaces somewhere. Defer it and it lands on the request path, the memory budget, or a review queue. The arithmetic is brutal.

::eq[shapley-enumeration]

B: Exhaustive Shapley enumeration visits every feature coalition. Twenty features, one microsecond per coalition, and you are already past one second. No hundred-millisecond serving budget absorbs that. Sampled methods, TreeSHAP's exact structural computation, caching, asynchronous generation: each is an architectural answer with a fidelity cost.

A: And the retrofit sizing example?

::eq[explanation-capacity]

B: A hundred milliseconds of baseline processing per request at ten thousand queries per second. Add fifty to two hundred milliseconds of inline explanation and you need one and a half to three times the capacity to hold throughput. But replicas cannot restore the per-request latency, because the explanation sits on the serial path. Meeting the original deadline means shrinking the work or moving it off the critical path. Same lesson as adversarial training: a seven-step attack per batch multiplies batch compute roughly eightfold. The question is never whether to pay, but where.

::fig[conservation-of-overhead]

A: Privacy gets the same architectural treatment. DP-SGD first.

::eq[dp-sgd-update]

B: Two operations before each weight update: per-example gradient clipping to a maximum norm, then calibrated Gaussian noise. The clipping bounds any single example's influence; the noise hides its contribution. The privacy bound depends on sampling and composition accounting, and the utility cost must be measured per configuration. There is no free privacy.

A: And machine unlearning has a workload attached.

::eq[sisa-erasure-cost]

B: SISA training shards the data a hundred ways, isolates, slices, aggregates. One deletion retrains one shard instead of the full corpus. But the saving erodes exactly when erasure requests arrive fast enough that every retraining batch touches essentially all shards. GDPR's right to erasure is not a feature flag; it is a training-pipeline design constraint whose cost depends on request distribution, batching intervals, and saved slice state.

A: The sociotechnical half of the chapter. The paradox of reliability.

B: The better the model appears, the worse the human oversight becomes. Automation bias: reviewers accept wrong recommendations because the system is usually right. A low override rate cannot distinguish few model errors from failure to notice them. So the interface evaluation must measure error-specific behavior: how often users accept wrong recommendations, correct errors, introduce new ones. The aggregate rate is uninformative.

A: And the bias amplification loop closes the circuit.

::eq[feedback-amplification]

B: Biased outputs shape user behavior, behavior shapes future data collection, retraining on that data deepens the bias. Positive loop gain. The unconstrained retraining pipeline is a divergent amplifier, and model-side debiasing treats one generation while the loop re-creates the problem in the next corpus. Breaking it means intervening on data collection: sampling policy, labeling audit.

::fig[bias-amplification-loop]

A: Accountability at fleet scale. Third-party foundation models.

B: Accountability does not transfer to the vendor. The deploying organization still chooses the use, the interface, the retrieved context, the user population, the monitoring, and the response process. Procurement needs the same rigor as an internal build. And representation cost: the medical imaging scenario prices representative data at one hundred twenty-five million dollars or more, fifty to two hundred dollars per image plus thirty to fifty percent harmonization overhead. Underrepresented populations are expensive to source. Cheap data is expensive exactly where fairness matters most.

A: Favorite fallacy?

B: Monitoring dashboards create accountability. A metric no team owns is a log entry. Alerts age out, regressions become accepted baselines, and affected users get no route to contest. Every signal needs an owner, a threshold, an escalation path, and a remediation budget.

A: One-line summary?

B: Responsibility is architectural: every control is evidence with a boundary, a cost with a home, and a decision with a name on it.
