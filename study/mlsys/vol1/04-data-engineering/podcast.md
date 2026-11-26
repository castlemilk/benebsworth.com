# hosts: Marcus | Iris

A: Welcome back to the study room, I'm Marcus.
::fig[two-contracts]

B: And I'm Iris. Chapter four: data engineering. And the thesis is that data bounds your system twice, once in what the model can learn, and once in how fast it can learn it.

A: Right. The chapter frames it as two contracts. The dataset keeps a statistical contract with the algorithm, coverage, labels, clean splits, and a physical contract with the machine, bytes arriving at the rate the accelerator eats them. Break either one and the system fails, just in different ways.

B: Start with the statistical side. The data-as-code principle: changing the dataset changes the trained model, even when no code changes. So the pipeline that produces the dataset is the system's build, and every retraining is a rebuild.

A: Which means data deserves the disciplines code already has. Versioned releases, review, tests, immutable lineage. And the cost asymmetry is wild, the chapter prices labeling the image dataset at roughly six hundred to a thousand times the cost of one training run on it.

B: That's the anchor for why this chapter exists. And then the failure mode: the data cascade. A defect enters early, say a mislabeled slice or a retyped column, and it passes every schema check, because schemas check shape, not truth.
::fig[data-cascade]

A: Each downstream stage trusts it and converts it into new derived state. Labels, features, trained weights. And the reason it's expensive is silence. A code bug raises a stack trace. A data-induced error just emits plausible wrong answers.

B: So when it finally surfaces at deployment, the rework bill is every artifact that consumed the defect. Rebuild, retrain, revalidate, maybe roll back contaminated predictions downstream. Prevention belongs at the source, that whole insight is the Sambasivan data cascades paper.

A: The catcher's checklist is the four pillars: quality, reliability, scalability, governance. And they pull against each other, stricter validation costs throughput, consistency costs coordination, privacy costs performance. Every pipeline decision is a trade among them.

B: Then the chapter does my favorite thing: turns a product target into data requirements by pure arithmetic. The wake-word detector budgets one false wake per month.

A: And the always-on detector classifies a non-keyword window about once a second, two point six million windows a month. So per-window false positive rate has to be under about four in ten million. Even ninety-nine point nine nine nine percent rejection still leaves twenty-six false wakes a month.

::eq[false-wake-budget]

B: Which is why real assistants pass candidate wakes to a second, larger verifier instead of asking the tiny always-on model to meet that bound alone. And there's a second requirement people forget: to claim one-per-month, the rule of three says you need about three months of representative listening with zero observed wakes.

A: The rule of three, if you see zero events in n trials, the upper bound on the true rate is roughly three over n. So zero wakes in five hundred hours proves much less than it feels like.
::eq[rule-of-three]

B: Then acquisition. Coverage has to serve both halves, labeled wake words for recognition, plus separately collected ordinary audio with duration and sequence preserved, so you can actually measure false accepts per hour.

B: And at scale, the Multilingual Spoken Words Corpus is the clever part: forced alignment over continuous speech with transcripts, sliced into one-second keyword windows. Over a million labeled clips without paying a human per clip.

A: Ingestion splits into two clocks. Synchronous schema checks at the boundary, every record, right now, and asynchronous statistical checks over windows of accepted data. Plus the degradation machinery: retries with backoff, a dead-letter queue for records that still fail, circuit breakers for whole dependencies.
::fig[ingestion-boundary]

B: And the dead-letter queue is secretly a diagnostic feed. Unparsable audio reveals a new hardware revision. Schema violations reveal an upstream change you weren't told about.

A: Labeling gets the strongest line in the chapter: labels are the specification. The model learns your label errors as confidently as your truths. And granularity sets the price, a class label is a click, but one quality bounding box took about thirty-five seconds in ImageNet's campaign.

B: Quality is bounded, not assumed. Cohen's kappa discounts agreement that would happen by chance, on a ninety-ten class split, two annotators agreeing ninety-two percent is only a kappa around point five six. Gold-standard items audit annotators continuously.
::eq[cohens-kappa]

A: Then processing, and the signature defect: training-serving skew. The feature is computed one way in training and another way in serving, and the skewed output is still a valid vector, so nothing errors. It just quietly degrades.
::fig[two-contracts]

B: The fix is that fitted state, normalization constants, vocabularies, gets fitted once on the training split, persisted with the model, replayed identically at serving. And skew is different from drift: skew is your own pipelines disagreeing, drift is the world moving.

A: Quick detour to physics: data gravity. Bytes have mass. Moving a petabyte corpus between regions is tens of thousands in egress plus the real cost, all the pipelines, validators, and caches that grew around the data. Compute moves to data, not the reverse.

B: And the feeding problem. Step time is the max of compute time and input time. The supply rate is physical bandwidth times format efficiency minus overhead, columnar Parquet versus row CSV is a throughput decision, not a storage decision.
::eq[feeding-bound]

A: Storage tiers exist because no medium is both cheap and fast, and training's sequential scans pull opposite to serving's point lookups. The feature store bridges them, offline store for training, online store for serving, with point-in-time joins so each training example only sees feature values that existed at its timestamp.

B: Then acceptance: it's an experiment, not a demo. Fix confidence and listening duration before evaluating; untouched eval set for recognition; dedicated streams for false accepts per hour; replay fixed audio through both the training and device preprocessing paths for parity.

A: And operational health: drift decomposes into covariate shift, label shift, concept drift, only the last needs labels to detect. PSI and the K-S statistic flag divergence as a prompt to investigate, not proof of degradation.
::eq[psi]

B: Last idea: data debt. Four categories, documentation, schema, quality, freshness, measured against thresholds, and it compounds like interest. Strategic debt taken deliberately for a launch is a trade; unconscious debt compounding silently is the failure mode.
::eq[debt-compound]

A: So the two contracts, condensed: the statistical contract governs what the model can learn; the physical contract governs how fast. Every failure in the chapter, starved accelerator, silently retyped ZIP code, came from keeping one and breaking the other.
::fig[two-contracts]

B: Next up we take the quiz and see if the packet actually stuck. Read order suggestion: the cascade figure first, then the false-wake arithmetic, then the feeding bound.

A: Until then, check your splits, persist your fitted state, and count your listening hours.
