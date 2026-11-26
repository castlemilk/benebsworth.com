---
title: "Responsible Engineering — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html"
canonical_url: "https://benebsworth.com/study/vol1/15-responsible-engr/"
---

# Responsible Engineering: Study Packet

A credit model approves 90% of qualified majority applicants and 60% of equally qualified minority applicants, and its aggregate accuracy looks healthy. Every dashboard is green. Did the system fail?

*Working through [Responsible Engineering](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html), chapter 15 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

The credit model is not malfunctioning, it is **efficiently optimizing an incomplete specification** *(why it matters: Latency, availability and aggregate accuracy targets say nothing about whom the system serves well, what it costs over its lifetime, or whether its decisions can be explained and contested. The omitted constraints don't disappear; they surface as harm.)*. Every earlier chapter hardened the technical guarantees; this chapter extends the same engineering rigor to everything the spec left out. The instrument that does the work is the **disaggregated evaluation** *(why it matters: Aggregate correctness hides harm. The Gender Shades audit: a face classifier at 99.2% accuracy for light-skinned males ran 34.5% error, 43.1×, on dark-skinned females, invisible under the aggregate.)*: the number that matters lives in the slice, not the sum. Read the loop first in [the lifecycle duties](#fig-lifecycle-duties).

> **note: Reading the marks**
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### The Responsibility Gap

- The gap: a system can satisfy every stated objective and still cause harm, because the objectives never bounded the harm. **Optimization succeeds while the specification fails** *(why it matters: The credit service approves 90% of qualified majority applicants vs 60% of equally qualified minority applicants, high aggregate accuracy, correct optimization, unfair outcome. Three pathways open the gap: proxy objectives, subgroup blindness, and feedback that amplifies small disparities.)*.
- The silent failure here is social, not statistical: no drift detector pages on a fairness gap unless the spec declared the slices and their thresholds.
- The testing challenge: subgroup checks need **samples the random draw won't give you** *(why it matters: A 1%-of-users subgroup needs ~10,000 evaluation images for a 1-pp error bound at 95% confidence. Random sampling expects 1,000,000 images to yield them; stratified recruitment needs only the 10,000, a 100× difference, priced before launch, not after.)*, so representation is an engineering budget, not an aspiration.

![Correct optimization, wrong objective](https://benebsworth.com/study/vol1/15-responsible-engr/diagrams/responsibility-gap.svg)

*The system satisfies every stated objective — latency, uptime, aggregate accuracy — while the unstated constraints (slices, cost, contestability, evidence) carry the harm. The gap is between what was specified and what was needed.*

**The slice the aggregate hid**

| Demographic group | Error rate |
|---|---|
| Light male | 0.8 |
| Dark male | 0.7 |
| Light female | 9.8 |
| Dark female | 34.5 |

*Gender Shades audit of a commercial face classifier (Buolamwini & Gebru 2018): error rates by demographic group. Dark-skinned females carry a 43.1× error rate over light-skinned males — invisible under a high aggregate accuracy.*

### Specify: Requirements Before Training

- The lifecycle answer is duties per stage, starting before the model exists: declare **protected slices, fairness criteria, error budgets, attribution needs and evidence** *(why it matters: Requirements like "works for our 1% subgroup within 1pp at 95% confidence" are concrete and testable, and they set the evaluation-set cost in advance. Undeclared slices cannot be tested; unbudgeted representation cannot be afforded.)*.
- The **proxy variable trap** *(why it matters: An objective can be perfectly optimized while tracking the wrong thing. The chapter's recruiting tool is one case; the deeper trap is a proxy that correlates at spec time and decorrelates under optimization, the same Goodhart pressure as any metric.)*: a legal objective and its measurable proxy are not the same thing.
- Human oversight is placed at spec time too: who sits in the decision loop at deployment is a design decision with its own failure modes (automation bias, rubber-stamping).


**100× the collection for a 1% subgroup**

| Collection strategy | Images |
|---|---|
| Stratified | 10000 |
| Random | 1000000 |

*Bounding a rare subgroup's error to 1pp at 95% confidence needs ~10,000 of its images. Random sampling expects 1,000,000 total images to yield them; recruiting the subgroup directly needs only its 10,000 — a 100× multiplier.*

**Eq 3 · The representation cost of a rare subgroup**
$$
N_{\mathrm{rand}}=\frac{n_{\mathrm{target}}}{p_{\mathrm{group}}}=\frac{10{,}000}{0.01}=1{,}000{,}000
$$

### Measure: Fairness Criteria Are a Choice

- The three standard criteria measure **different errors, and they conflict** *(why it matters: Demographic parity: equal selection rates. Equalized odds: equal TPR and FPR. Equal opportunity: equal TPR alone. Calibration: score s means the same thing in every group. Under unequal base rates with imperfect prediction, satisfying one can violate another, choosing the criterion is a policy decision engineering must surface, not silently make.)*.
- Worked through the credit confusion matrices: Group A approval 55%, Group B 40%, a 15-point parity gap; Group B's false-negative rate ~40% against A's ~10%, an equalized-odds violation; and scores can remain **calibrated across groups while violating equalized odds** *(why it matters: COMPAS is the canonical case: approximately calibrated by race, clearly unequal error rates. Calibration answers "does 0.8 mean 0.8"; odds answers "who bears the misses". A model can pass one and fail the other.)*.
- The law enters through measurable diagnostics: the **four-fifths rule** *(why it matters: A selection rate below 80% of the highest group's rate is a practical adverse-impact flag from the 1978 US employment guidelines, not proof, a diagnostic. 40% vs 55% is 0.73, below the line.)* translates disparate-impact doctrine into a number a release gate can check.

**Eq 1 · Demographic parity**
$$
\Pr(\hat{Y}\!=\!1\,|\,G\!=\!A)=\Pr(\hat{Y}\!=\!1\,|\,G\!=\!B)
$$

**Eq 2 · Equalized odds**
$$
\Pr(\hat{Y}\!=\!1\,|\,Y,G)=\text{equal across }G
$$

**Eq 6 · The four-fifths diagnostic**
$$
\frac{\mathrm{sel}_{\min}}{\mathrm{sel}_{\max}}<0.8
$$

![Three fairness criteria that can't all hold](https://benebsworth.com/study/vol1/15-responsible-engr/diagrams/criteria-conflict.svg)

*Demographic parity, equalized odds and calibration measure different errors. Under unequal base rates with imperfect prediction, satisfying one can violate another — the choice is a policy decision, not an optimization.*
### Explain and Operate

- **Explanation has a serving-path price** *(why it matters: Exact attribution is exponential in feature count, explanation compute on the request path costs like inference, not like logging. Budget it like any other serving resource, or approximate it and document the approximation.)*, the chapter prices it like any other resource.
- Documentation makes the system legible: model cards and datasheets record intended slices, measured disparities, known failure modes, the facts a later auditor needs.
- In operation, fairness becomes **loop stability** *(why it matters: A disparity the feedback loop amplifies drifts like any other signal: the model's decisions shape who enters the next training set. Per-group telemetry and bounded retraining keep the gap inside its budget, fairness is a stability property, not a launch property.)*: the same feedback mechanics as ch14, with disparity as the drifting signal.

### Environmental and Cost Awareness

- The resource ledger continues into responsibility: energy and carbon are costs the task may not justify. The accounting is concrete, **(0.4 kW × 1 h) × 0.4 kg CO₂eq/kWh = 0.16 kg per GPU-hour** *(why it matters: The chapter's baseline conversion. Scale it to a GPT-3-class run at 1,287 MWh and the figure exceeds 100 passenger-car-years of emissions, training runs are measured in car-lifetimes, not kilowatt-hours.)*.
- Total cost of ownership counts the whole lifecycle: **training is one entry; serving at DLRM scale dominates** *(why it matters: Per-request inefficiencies multiply across millions of requests; a training cycle that looks expensive can be dwarfed by years of inference. The accounting that caught Strubell et al.'s 2019 NAS estimate (revised downward by Patterson et al. 2021) shows the numbers are assumption-sensitive, record the boundary.)*, so efficiency work pays where the runtime actually is.
- Compression has a fairness edge too: **revalidate on the same subgroup slices** *(why it matters: A compressed model can match aggregate accuracy while shifting error onto the groups the specification protects. Quality gates inherit the slice structure.)*.

**Eq 4 · Carbon per GPU-hour**
$$
(0.4\,\mathrm{kW}\times 1\,\mathrm{h})\times 0.4\,\mathrm{kg}/\mathrm{kWh}=0.16\,\mathrm{kg}
$$

![The carbon ledger](https://benebsworth.com/study/vol1/15-responsible-engr/diagrams/carbon-ledger.svg)

*0.16 kg CO₂eq per GPU-hour at the baseline assumptions; at GPT-3 scale, 1,287 MWh exceeds 100 passenger-car-years. Training is one ledger entry — serving at scale dominates the lifecycle.*
### Data Governance and Compliance

- Governance turns the earlier guarantees into **proof an outsider can check** *(why it matters: Access control (role-based on KWS), privacy protection (differential privacy as a budgeted bound on how much one record can change outputs), regulation rendered as architecture (the four-fifths diagnostic at a release gate), lineage (which training data produced this decision), and audit (events × bytes × retention sized before the log fills).)*: access control, differential privacy, regulation as architecture, lineage, audit volume.
- Audit infrastructure is sized like any other system: recorded events per time × bytes per event × retention, a real storage budget, not a wish.

**Eq 5 · Audit log volume**
$$
V=\mathrm{rate}\times\mathrm{bytes}\times\mathrm{retention}
$$

### Fallacies and Pitfalls

- **Aggregate accuracy as the health metric** *(why it matters: The 99.2%/65.5% split: the aggregate concealed a 43.1× error ratio. Slice before you celebrate.)*.
- **Fairness as a post-launch patch** *(why it matters: Subgroup evaluation and representation budgets are set at specification; retrofitting means retraining on data you never collected.)*.
- **One fairness metric fits all** *(why it matters: The criteria conflict by construction; the choice is domain- and law-specific.)*.
- **Compliance as paperwork** *(why it matters: The four-fifths rule, lineage and audit are runtime checks and storage budgets, not documents filed after the fact.)*.

### Summary

- Responsible engineering is ML systems engineering done completely: the specification extends past latency and accuracy to slices, costs, explanations and evidence.
- The instruments are familiar ones applied to new signals: disaggregated evaluation, budgeted representation, per-group drift monitoring, lifecycle accounting.
- The numbers worth pinning: 43.1× error ratio under a healthy aggregate, 15pp parity gap vs ~30pp TPR gap, 100× representation cost, 0.8 four-fifths threshold, 0.16 kg/GPU-hour, 1,287 MWh ≈ >100 car-years.

![A duty per stage](https://benebsworth.com/study/vol1/15-responsible-engr/diagrams/lifecycle-duties.svg)

*Specify the slices and budgets, measure the disaggregated criteria, explain and document the decisions, then operate fairness as loop stability — the duties chain like the rest of the lifecycle.*
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


---

## Key equations

**Eq 1 · Demographic parity**

$$
\Pr(\hat{Y}\!=\!1\,|\,G\!=\!A)=\Pr(\hat{Y}\!=\!1\,|\,G\!=\!B)
$$

*Equal positive selection rates across groups. The credit service fails it: 55% vs 40% approval — a 15-point gap, and a 0.73 selection ratio under the four-fifths diagnostic.*

**Eq 2 · Equalized odds**

$$
\Pr(\hat{Y}\!=\!1\,|\,Y,G)=\text{equal across }G
$$

*Both error rates — true and false positive — must match across groups. The credit matrices violate it: ~40% false-negative rate for B against ~10% for A, even where scores stay calibrated.*

**Eq 3 · The representation cost of a rare subgroup**

$$
N_{\mathrm{rand}}=\frac{n_{\mathrm{target}}}{p_{\mathrm{group}}}=\frac{10{,}000}{0.01}=1{,}000{,}000
$$

*To bound a 1% subgroup's error within 1pp at 95% confidence you need ~10,000 of its samples. Random collection expects 100× more total images than recruiting the subgroup directly — representation is a budget, not an aspiration.*

**Eq 4 · Carbon per GPU-hour**

$$
(0.4\,\mathrm{kW}\times 1\,\mathrm{h})\times 0.4\,\mathrm{kg}/\mathrm{kWh}=0.16\,\mathrm{kg}
$$

*The chapter's baseline: a 0.4 kW accelerator hour at 0.4 kg CO₂eq per kWh emits 0.16 kg. At GPT-3 scale — 1,287 MWh — the run exceeds 100 passenger-car-years.*

**Eq 5 · Audit log volume**

$$
V=\mathrm{rate}\times\mathrm{bytes}\times\mathrm{retention}
$$

*Recorded events per unit time × bytes per event × retention window — sized like any storage budget before the log fills or the bill lands.*

**Eq 6 · The four-fifths diagnostic**

$$
\frac{\mathrm{sel}_{\min}}{\mathrm{sel}_{\max}}<0.8
$$

*A group's selection rate below 80% of the highest group's flags adverse impact under the 1978 US employment guidelines. 40%/55% = 0.73 — under the line.*

## From the book

- [Blast radius](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html) — How far a silently unfair decision propagates before anyone aggregates the outcomes.
- [D·A·M locator: data](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html) — The data axis of the chapter's architecture map — where responsibility attaches.
- [Goodhart anchor](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html) — The proxy decorrelation pattern — optimizing the metric until it stops tracking the goal.
- [Total cost of ownership](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html) — Lifecycle cost decomposition: training, serving and operations as ledger entries.
- [Responsible engineering margin study](https://mlsysbook.ai/vol1/15_responsible_engr/15_responsible_engr.html) — Margin study — fairness criteria and the impossibility result.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A credit model approves 90% of qualified majority applicants and 60% of equally qualified minority applicants, and still reports high aggregate accuracy. The chapter calls this gap between technical correctness and responsible outcome:
   - A. A calibration error, the predicted scores stop meaning the same probability in each of the two groups.
   - B. The responsibility gap, the system is efficiently optimizing an incomplete specification.
   - C. Boundary erosion, statistical coupling between systems that dissolves the modular wall the spec relied on.
   - D. Training-serving skew, a feature pipeline that diverges between the offline path and online serving.

2. The Gender Shades audit measured Face++ error at 0.8% for light-skinned males and 34.5% for dark-skinned females, a 43.1× ratio under a high aggregate accuracy. What made the disparity visible?
   - A. A larger test set, bigger evaluation samples always expose hidden bias, so collecting more data was the fix.
   - B. A stricter latency budget, the slow serving paths tend to correlate with the slices that fail first.
   - C. Disaggregated evaluation, error rates reported per demographic slice rather than pooled.
   - D. Differential privacy, bounding how much influence any single record can have on the model outputs.

3. Why can a model calibrated across groups still violate equalized odds?
   - A. Calibration measures whether a score means the same probability in each group; equalized odds measures whether error rates match, different properties that conflict under unequal base rates.
   - B. Calibration is the weaker of the two metrics, so under any base-rate imbalance it is the constraint that breaks first.
   - C. Equalized odds requires randomized, group-dependent decision thresholds, a mechanism calibration formally forbids.
   - D. Calibration only applies to regression-style outputs and has no meaning for classification decisions like this one.

4. A subgroup is 2% of your user base, and you need ~5,000 of its samples in the evaluation set. By random sampling alone, how many total images must you collect in expectation?

5. At the chapter's baseline (0.4 kW per GPU, 0.4 kg CO₂eq per kWh), what does a 72-hour run on 8 GPUs emit in kg CO₂eq? (Round to the nearest kg.)

6. A hiring tool selects 48% of Group A applicants and 30% of Group B. Under the four-fifths rule, does the tool flag adverse impact, and what is the selection ratio? (Answer as the ratio.)

7. Your compressed model matches the original's aggregate accuracy. What must you check before shipping under the chapter's framework?
   - A. Nothing, matched aggregate accuracy means the compressed and original models are equivalent in quality.
   - B. Only latency, compression is purely a serving-performance question and touches nothing else.
   - C. Whether the quantization step hurt the score calibration measured across the full pooled test set.
   - D. The same subgroup slices as the original, a compressed model can hold the aggregate while shifting error onto protected groups.

8. The chapter sizes audit infrastructure like which other system resource?
   - A. Storage, recorded events per unit time, times bytes per event, times the retention window.
   - B. Compute, audit analysis jobs run on the same accelerator pool as the serving workload they watch.
   - C. Network, audit volume is bounded by the ingest bandwidth of the logging pipeline into storage.
   - D. Memory, audit records must stay resident in RAM so regulator queries can be answered quickly.

9. Explain to a teammate why 'the model did exactly what we asked' is not a defense of a harmful outcome.

10. Explain why fairness in operation is a 'loop stability' problem rather than a launch-time check.

## Answer key

1. B. The system did exactly what it was told. The omitted constraints, subgroup error, cost, contestability, evidence, surface as harm while every health check stays green.

2. C. The aggregate averaged the harm away. Only slicing the evaluation by demographic group exposed the 43.1× error ratio, the number that matters lives in the slice.

3. A. COMPAS is the canonical case: approximately calibrated by race, clearly unequal error rates. The criteria encode different policy choices about which errors matter.

4. N = n_target / p_group = 5,000 / 0.02 = 250,000 images. Stratified recruitment needs only the 5,000, the 50× multiplier is why representation is a specification-time budget.

5. Per GPU-hour: 0.4 kW × 1 h × 0.4 kg/kWh = 0.16 kg CO₂eq. For 8 GPUs × 72 h = 576 GPU-hours: 576 × 0.16 = 92.16 ≈ 92 kg CO₂eq. The boundary matters: this is the accelerator-only figure, facility overhead and grid intensity assumptions shift the real number.

6. 30% / 48% = 0.625, below 0.8, the diagnostic flags. It is evidence of adverse impact, not proof of it; the ratio is a screen a release gate can check.

7. D. Quality gates inherit the slice structure. Compression revalidated only on the aggregate can move error onto the very groups the specification protected.

8. A. Audit volume = recorded events × bytes per event × retention, a real storage budget to size before the log fills, not a wish.

9. Because 'what we asked' is a specification, and the specification was incomplete. The model optimized the stated objective, aggregate accuracy, latency, and the omitted constraints (subgroup error, contestability, evidence) carried the harm. Doing exactly what was asked is the problem, not the excuse: it means the spec, not the optimizer, needs fixing.

10. A disparity that clears the gate at launch can still grow: the model's decisions shape who enters the next training set, so feedback can amplify a small gap like any drifting signal. Per-group telemetry and bounded retraining keep the disparity inside its budget, the same mechanics as drift monitoring, with the slice as the signal.

## Audio overview

[Listen to the Marcus & Iris read-along (~7 min)](https://benebsworth.com/study-audio/vol1/15-responsible-engr.m4a) — a generated podcast walking this packet's argument.
