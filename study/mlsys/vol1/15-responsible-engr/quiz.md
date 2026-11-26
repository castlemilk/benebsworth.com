# Self-test: Responsible Engineering

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
