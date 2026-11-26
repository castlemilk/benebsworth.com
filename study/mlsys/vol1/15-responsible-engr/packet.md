---
openingQuestion: "A credit model approves 90% of qualified majority applicants and 60% of equally qualified minority applicants, and its aggregate accuracy looks healthy. Every dashboard is green. Did the system fail?"
---

# Responsible Engineering: Study Packet

*Working through [Responsible Engineering](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html), chapter 15 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

The credit model is not malfunctioning, it is ==efficiently optimizing an incomplete specification=={Latency, availability and aggregate accuracy targets say nothing about whom the system serves well, what it costs over its lifetime, or whether its decisions can be explained and contested. The omitted constraints don't disappear; they surface as harm.}. Every earlier chapter hardened the technical guarantees; this chapter extends the same engineering rigor to everything the spec left out. The instrument that does the work is the ==disaggregated evaluation=={Aggregate correctness hides harm. The Gender Shades audit: a face classifier at 99.2% accuracy for light-skinned males ran 34.5% error, 43.1×, on dark-skinned females, invisible under the aggregate.}: the number that matters lives in the slice, not the sum. Read the loop first in [the lifecycle duties](#fig-lifecycle-duties).

> [!note] Reading the marks
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### The Responsibility Gap

- The gap: a system can satisfy every stated objective and still cause harm, because the objectives never bounded the harm. ==Optimization succeeds while the specification fails=={The credit service approves 90% of qualified majority applicants vs 60% of equally qualified minority applicants, high aggregate accuracy, correct optimization, unfair outcome. Three pathways open the gap: proxy objectives, subgroup blindness, and feedback that amplifies small disparities.}.
- The silent failure here is social, not statistical: no drift detector pages on a fairness gap unless the spec declared the slices and their thresholds.
- The testing challenge: subgroup checks need ==samples the random draw won't give you=={A 1%-of-users subgroup needs ~10,000 evaluation images for a 1-pp error bound at 95% confidence. Random sampling expects 1,000,000 images to yield them; stratified recruitment needs only the 10,000, a 100× difference, priced before launch, not after.}, so representation is an engineering budget, not an aspiration.

::fig[responsibility-gap]

::chart[gender-shades]

### Specify: Requirements Before Training

- The lifecycle answer is duties per stage, starting before the model exists: declare ==protected slices, fairness criteria, error budgets, attribution needs and evidence=={Requirements like "works for our 1% subgroup within 1pp at 95% confidence" are concrete and testable, and they set the evaluation-set cost in advance. Undeclared slices cannot be tested; unbudgeted representation cannot be afforded.}.
- The ==proxy variable trap=={An objective can be perfectly optimized while tracking the wrong thing. The chapter's recruiting tool is one case; the deeper trap is a proxy that correlates at spec time and decorrelates under optimization, the same Goodhart pressure as any metric.}: a legal objective and its measurable proxy are not the same thing.
- Human oversight is placed at spec time too: who sits in the decision loop at deployment is a design decision with its own failure modes (automation bias, rubber-stamping).

::chart[sampling-cost]

::eq[representation-cost]
$$
N_{\mathrm{rand}}=\frac{n_{\mathrm{target}}}{p_{\mathrm{group}}}=\frac{10{,}000}{0.01}=1{,}000{,}000
$$

### Measure: Fairness Criteria Are a Choice

- The three standard criteria measure ==different errors, and they conflict=={Demographic parity: equal selection rates. Equalized odds: equal TPR and FPR. Equal opportunity: equal TPR alone. Calibration: score s means the same thing in every group. Under unequal base rates with imperfect prediction, satisfying one can violate another, choosing the criterion is a policy decision engineering must surface, not silently make.}.
- Worked through the credit confusion matrices: Group A approval 55%, Group B 40%, a 15-point parity gap; Group B's false-negative rate ~40% against A's ~10%, an equalized-odds violation; and scores can remain ==calibrated across groups while violating equalized odds=={COMPAS is the canonical case: approximately calibrated by race, clearly unequal error rates. Calibration answers "does 0.8 mean 0.8"; odds answers "who bears the misses". A model can pass one and fail the other.}.
- The law enters through measurable diagnostics: the ==four-fifths rule=={A selection rate below 80% of the highest group's rate is a practical adverse-impact flag from the 1978 US employment guidelines, not proof, a diagnostic. 40% vs 55% is 0.73, below the line.} translates disparate-impact doctrine into a number a release gate can check.

::eq[demographic-parity]
$$
\Pr(\hat{Y}\!=\!1\,|\,G\!=\!A)=\Pr(\hat{Y}\!=\!1\,|\,G\!=\!B)
$$

::eq[equalized-odds]
$$
\Pr(\hat{Y}\!=\!1\,|\,Y,G)=\text{equal across }G
$$

::eq[four-fifths]
$$
\frac{\mathrm{sel}_{\min}}{\mathrm{sel}_{\max}}<0.8
$$

::fig[criteria-conflict]

### Explain and Operate

- ==Explanation has a serving-path price=={Exact attribution is exponential in feature count, explanation compute on the request path costs like inference, not like logging. Budget it like any other serving resource, or approximate it and document the approximation.}, the chapter prices it like any other resource.
- Documentation makes the system legible: model cards and datasheets record intended slices, measured disparities, known failure modes, the facts a later auditor needs.
- In operation, fairness becomes ==loop stability=={A disparity the feedback loop amplifies drifts like any other signal: the model's decisions shape who enters the next training set. Per-group telemetry and bounded retraining keep the gap inside its budget, fairness is a stability property, not a launch property.}: the same feedback mechanics as ch14, with disparity as the drifting signal.

### Environmental and Cost Awareness

- The resource ledger continues into responsibility: energy and carbon are costs the task may not justify. The accounting is concrete, ==(0.4 kW × 1 h) × 0.4 kg CO₂eq/kWh = 0.16 kg per GPU-hour=={The chapter's baseline conversion. Scale it to a GPT-3-class run at 1,287 MWh and the figure exceeds 100 passenger-car-years of emissions, training runs are measured in car-lifetimes, not kilowatt-hours.}.
- Total cost of ownership counts the whole lifecycle: ==training is one entry; serving at DLRM scale dominates=={Per-request inefficiencies multiply across millions of requests; a training cycle that looks expensive can be dwarfed by years of inference. The accounting that caught Strubell et al.'s 2019 NAS estimate (revised downward by Patterson et al. 2021) shows the numbers are assumption-sensitive, record the boundary.}, so efficiency work pays where the runtime actually is.
- Compression has a fairness edge too: ==revalidate on the same subgroup slices=={A compressed model can match aggregate accuracy while shifting error onto the groups the specification protects. Quality gates inherit the slice structure.}.

::eq[gpu-hour-carbon]
$$
(0.4\,\mathrm{kW}\times 1\,\mathrm{h})\times 0.4\,\mathrm{kg}/\mathrm{kWh}=0.16\,\mathrm{kg}
$$

::fig[carbon-ledger]

### Data Governance and Compliance

- Governance turns the earlier guarantees into ==proof an outsider can check=={Access control (role-based on KWS), privacy protection (differential privacy as a budgeted bound on how much one record can change outputs), regulation rendered as architecture (the four-fifths diagnostic at a release gate), lineage (which training data produced this decision), and audit (events × bytes × retention sized before the log fills).}: access control, differential privacy, regulation as architecture, lineage, audit volume.
- Audit infrastructure is sized like any other system: recorded events per time × bytes per event × retention, a real storage budget, not a wish.

::eq[audit-volume]
$$
V=\mathrm{rate}\times\mathrm{bytes}\times\mathrm{retention}
$$

### Fallacies and Pitfalls

- ==Aggregate accuracy as the health metric=={The 99.2%/65.5% split: the aggregate concealed a 43.1× error ratio. Slice before you celebrate.}.
- ==Fairness as a post-launch patch=={Subgroup evaluation and representation budgets are set at specification; retrofitting means retraining on data you never collected.}.
- ==One fairness metric fits all=={The criteria conflict by construction; the choice is domain- and law-specific.}.
- ==Compliance as paperwork=={The four-fifths rule, lineage and audit are runtime checks and storage budgets, not documents filed after the fact.}.

### Summary

- Responsible engineering is ML systems engineering done completely: the specification extends past latency and accuracy to slices, costs, explanations and evidence.
- The instruments are familiar ones applied to new signals: disaggregated evaluation, budgeted representation, per-group drift monitoring, lifecycle accounting.
- The numbers worth pinning: 43.1× error ratio under a healthy aggregate, 15pp parity gap vs ~30pp TPR gap, 100× representation cost, 0.8 four-fifths threshold, 0.16 kg/GPU-hour, 1,287 MWh ≈ >100 car-years.

::fig[lifecycle-duties]

## The physics

| Quantity | Value | Use |
|---|---|---|
| Aggregate hiding | 99.2% acc vs 65.5% slice acc | Error ratio 43.1× under a healthy score. |
| Parity gap | 55% vs 40% approval | 15pp demographic-parity violation; ratio 0.73 < 0.8 flag. |
| Odds gap | FNR ~40% vs ~10% | Equalized-odds violation while calibration holds. |
| Representation cost | 10k needed; 1M random vs 10k stratified | 100× collection multiplier for a 1% subgroup. |
| GPU-hour carbon | 0.4 kW × 0.4 kg/kWh = 0.16 kg | Baseline accelerator conversion factor. |
| Training scale | 1,287 MWh ≈ >100 car-years | GPT-3-class run at grid intensity. |
| Proxy decay | correlation 0.8 → 0.2 | Optimizing the proxy decorrelates the goal. |
| Four-fifths rule | selection ratio < 0.8 | Employment-law adverse-impact diagnostic. |

## Glossary

- **Responsibility gap**: the distance between technical correctness (what was specified) and responsible outcomes (what was needed).
- **Disaggregated evaluation**: per-slice metrics that expose harm an aggregate hides.
- **Demographic parity**: equal positive selection rates across groups.
- **Equalized odds / opportunity**: equal TPR+FPR across groups / equal TPR alone.
- **Calibration**: a score means the same probability in every group.
- **Proxy variable trap**: optimizing a measurable stand-in that decorrelates from the real objective.
- **Representation cost**: the evaluation-set size a rare subgroup's error bound requires.
- **Four-fifths rule**: selection-rate ratio below 0.8 flags adverse impact.
- **Differential privacy**: a budgeted bound on how much any one record can change outputs.
- **Lineage**: recorded provenance of the data behind each artifact.
- **TCO**: lifecycle cost, training + serving + operations + decommission.

## → Ben's world

- On the shared droplet, per-tenant health is the analog of disaggregation: aggregate uptime can hide one tenant's broken route, add a per-service output check the way a fairness audit adds per-slice metrics.
- For Greenveil's evals, write subgroup budgets into the spec (which document classes must hit which recall floor) before tuning; the four-fifths rule pattern says pick the threshold and the population first.
- The LLM harness's seeded-baseline disclosure is the lineage instinct: record what each number's evidence is so a later audit can reconstruct it.

## Open questions

- Which slice would a fairness-style audit of the Greenveil eval expose first, document type, language, or tenant size?
- What is the droplet's audit-volume number (events × bytes × retention) for the four services behind Caddy?
- Does the harness publish per-slice results or only aggregates, and what would a "disaggregated eval" look like for benchmark tasks?
