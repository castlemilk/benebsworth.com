# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Last chapter was ML Ops, keeping the model honest after launch. Today the chapter goes wider: responsible engineering. It opens with a credit model that approves ninety percent of qualified majority applicants and sixty percent of equally qualified minority applicants, and reports high aggregate accuracy the whole time.

B: Right, and the question the chapter asks is the uncomfortable one: did the system fail? And the answer is, not the optimizer. The optimizer did exactly what it was told. What failed is the specification, because the specification never bounded the harm.
::fig[responsibility-gap]

A: So it's the same silent-failure shape as the ops chapter, but the thing silently decaying isn't accuracy, it's an outcome nobody measured.

B: That's the connection the chapter draws. Conventional health checks can stay green while harm accumulates, because the omitted constraints, subgroup error rates, lifetime cost, decisions people can't contest, evidence nobody can reconstruct, were never requirements. If it's not in the spec, it doesn't get monitored; if it's not monitored, it doesn't get paged on.

A: The evidence that made this real for me is the Gender Shades audit.

B: Buolamwini and Gebru, 2018. A commercial face classifier posts high overall accuracy, 0.8 percent error for light-skinned males. Disaggregate by demographic group and the dark-skinned female error rate is 34.5 percent. That's a forty-three-times error ratio hiding under a healthy aggregate.
::fig[responsibility-gap]

A: And the only instrument that saw it was slicing the evaluation.

B: Right, the number that matters lives in the slice, not the sum. Which leads straight to the testing problem: subgroup checks need samples a random draw won't give you. Take a subgroup that's one percent of your users. To bound its error within one percentage point at ninety-five percent confidence you need about ten thousand of its images. Random sampling expects a million images to yield them.
::eq[representation-cost]

A: A hundred times more collection, unless you recruit the subgroup directly, which needs only its ten thousand.

B: And that's why representation is a specification-time budget, not an aspiration. You declare the slices, the fairness criteria, the error bound and the evidence before training, the requirements become concrete and testable, and the evaluation cost is priced in advance. Undeclared slices cannot be tested; unbudgeted representation cannot be afforded.

A: The chapter calls the spec-time hazard the proxy variable trap.

B: A legal objective and its measurable proxy are not the same thing. The recruiting tool is one case, but the deeper trap is a proxy that correlates when you write the spec and decorrelates under optimization, the same Goodhart pressure the benchmarking chapter put on metrics, now pointed at objectives.

A: Then measurement, which is where it gets subtle, there isn't one fairness criterion, there are several, and they fight.

B: Three standard ones. Demographic parity says equal selection rates across groups, the credit service fails it at fifty-five versus forty percent approval. Equalized odds says equal true- and false-positive rates, it fails harder: a forty percent false-negative rate for one group against about ten for the other. And calibration says a score means the same probability in every group.
::fig[criteria-conflict]

A: And COMPAS is the case that shows they can diverge, roughly calibrated across race, clearly unequal error rates.

B: Exactly. Calibration answers does a 0.8 mean 0.8; odds answers who bears the misses. Under unequal base rates with imperfect prediction, no model satisfies all three, so which criterion governs is a policy decision that engineering has to surface, not silently make inside a loss function. The law enters through a number, too: the four-fifths rule flags a selection ratio below 0.8. Forty over fifty-five is 0.73.
::eq[four-fifths]

A: Explanation has a price as well, and it's priced like serving.

B: Exact attribution is exponential in feature count. Explanation compute on the request path costs like inference, not like logging, so you either budget it or approximate it and document the approximation. And documentation itself is a control, model cards and datasheets record intended slices and measured disparities for whoever audits later.

A: Then operation closes the loop, fairness as loop stability.

B: Same mechanics as the ops chapter, different signal. A disparity that passes at launch can still grow, because the model's decisions shape who enters the next training set. Per-group telemetry and bounded retraining keep the gap inside its budget, fairness is a stability property, not a launch property.
::fig[lifecycle-duties]

A: Environmental and cost, this section put a number on something I'd only heard in headlines.

B: The baseline conversion: a 0.4-kilowatt accelerator hour at 0.4 kilograms of CO2-equivalent per kilowatt-hour emits 0.16 kilograms per GPU-hour. Scale that to a GPT-3-class run, 1,287 megawatt-hours, and one training run exceeds a hundred passenger-car-years of emissions.
::eq[gpu-hour-carbon]

A: And the honest part: the famous estimate that a neural architecture search could emit as much as five car lifetimes got revised downward.

B: Strubell et al. 2019, corrected by Patterson et al. 2021, the estimate was sensitive to proxy task, hardware, data-center efficiency and grid intensity. The chapter's lesson is to record the measurement boundary with the number, the same discipline as the benchmarking chapter.
::fig[carbon-ledger]

A: And one fairness edge I'd never have guessed: compression can move the error.

B: Revalidate a compressed model on the same subgroup slices, it can hold the aggregate while shifting error onto the protected groups. Quality gates inherit the slice structure.

A: Governance turns all of this into something an outsider can check.

B: Access control on the keyword-spotting system, differential privacy as a budgeted bound on how much one record can change the outputs, regulation rendered as architecture, the four-fifths diagnostic at a release gate, lineage tracing which training data produced a decision, and audit logs sized like any storage: events times bytes times retention.
::eq[audit-volume]

A: Pull it together, what does the chapter want the engineer to actually do differently?

B: Extend the same rigor you already apply to latency and cost. Specify slices, criteria, budgets and oversight before training. Measure disaggregated, because the aggregate hides harm. Explain and document so the system is legible to whoever contests or audits it. Operate fairness as a stability property. And account the resources, carbon, audit storage, with the same boundary discipline as every other number.

A: The model did what it was told. The job is to tell it completely.

B: Next chapter: the conclusion, the whole book's principles in one place.
