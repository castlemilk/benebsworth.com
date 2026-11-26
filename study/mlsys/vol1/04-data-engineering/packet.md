# Data Engineering: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 4 of Volume I: data as the system's source code, data cascades, the two contracts data keeps, and the physics of keeping the accelerator fed.*

## Thesis

Data bounds the system twice. The ==capability bound=={What the model can learn: the dataset's coverage, composition, and labels become the trained model's definition of correct, no later stage can recover evidence the data never contained.} follows from the ==data-as-code principle=={Changing a dataset changes the trained model just as changing source code changes a program, even when no algorithmic code is touched. The pipeline that produces a dataset is the system's build, and every retraining is a rebuild, so data needs the disciplines code has: versioning, review, tests, and releases.}: the dataset is the specification, and a defect that enters early propagates through every later stage as a ==data cascade=={An upstream data quality problem that passes schemas and tests, gets converted by each downstream stage into new derived state, and surfaces only at evaluation or deployment. Remediation cost scales with how many downstream artifacts consumed the defect; prevention belongs at the source.}.
The ==throughput bound=={How fast learning can proceed: every training step reads, decodes, transforms, and transfers examples, and an accelerator waiting on input computes nothing. This is the data-movement term of the iron law.} is physical: bytes have mass, moving them costs time and money (==data gravity=={The bandwidth, I/O, and latency cost of moving a large byte volume, why petabyte-scale datasets pin computation to where the data lives rather than the reverse.}), and they must arrive at least as fast as the accelerator consumes them.
Data engineering is the discipline of holding both contracts at once, a ==statistical contract=={The dataset must represent the deployment distribution: coverage, labels as spec, clean splits, no leakage, the capability bound.} with a moving deployment distribution, and a ==physical contract=={The input path must deliver bytes at the rate the machine consumes: storage bandwidth, formats, loaders, the throughput bound.} with the machine it feeds.

Two lighthouse workloads carry the chapter: ==keyword spotting (KWS)=={Always-on wake-word detection ("Alexa", "OK Google"), a few words across accents, microphones, and rooms, silent through months of ordinary speech, in tens of kilobytes on a TinyML device. It carries the capability bound.} on the Multilingual Spoken Words Corpus carries "what must the data contain," and ResNet-50 image classification on one accelerator carries "how fast must data arrive."

## Guided notes

### Data as code

- In conventional software, programmers write logic; in ML they write an
  optimization procedure that *extracts* logic from data. The trained model is
  a compressed summary of its training set, it can represent only the evidence
  the data contains, and it treats the labels as the definition of a correct
  answer.
- The bitter lesson (ch 1) explains why the dependence grew: methods that learn
  from data at scale keep overtaking hand-encoded knowledge, so knowledge that
  engineers once wrote into programs must now arrive through data.
- Cost anchor: labeling the image-classification dataset costs roughly
  **600-1,000×** the price of one 8×A100 ResNet-50 training run on it
  ($\sim$90 epochs at a sustained rate once input keeps up). Cleaning and
  organizing data was the most common answer for where practitioners' time goes
  (~80% name data work vs ~16% model work, CrowdFlower 2016, the same
  survey chart the ch 3 packet drew).
- ==Data leakage=={Information crossing the boundaries between train, validation, and test splits, so the evaluation score rewards what the model or its designers already saw instead of measuring generalization.} enters through duplicates in both splits, near-copies of one source record, user records from the same group, time-derived features computed with future observations, and preprocessing fitted before the split.
- Because the pipeline is the build, datasets need what code has: immutable
  lineage, executable validation suites, versioned releases, and debugging by
  controlled comparison of versions.

> [!note]
> The D·A·M framing: data sits in two pairwise overlaps at once, *what to learn
> from* (Data-Algorithm, the capability bound) and *how to move information*
> (Data-Machine, the throughput bound). The chapter's section order follows
> exactly this: capability first, throughput second.

### How data fails

- A broken software build fails loudly at compile time; a broken data build
  finishes cleanly and fails in production. Three example failures, a
  retyped ZIP-code column, a microphone revision the model never heard, a
  six-month-stale fraud corpus, share one shape: defect enters early, every
  later stage trusts it, failure surfaces at deployment.
- ==Data cascade=={An upstream data quality problem that passes schemas and tests, gets converted by each downstream stage into new derived state, and surfaces only at evaluation or deployment.} (Sambasivan et al., the "data cascades" paper) is the name for that shape. What makes it expensive is **silence**: a crash raises a stack trace; a data-induced model error produces valid-looking outputs that are simply less accurate. Each stage the defect passes adds artifacts that must be rebuilt.
- The ==four pillars=={Quality (does the data meet requirements), Reliability (does the pipeline deliver it dependably), Scalability (does the decision survive growth), Governance (is access, consent, and lineage controlled). Each pillar pulls against its neighbors: stricter validation costs throughput, consistency costs coordination, privacy constraints cost performance, bias mitigation can shrink the usable training set.}, quality, reliability, scalability, governance, are the checklist that catches cascades before they ship. Every pipeline choice is a trade among them.

::fig[data-cascade]

> [!caution]
> Leakage is not just duplicates in two splits. Fitting a scaler or vocabulary
> on the full dataset before splitting leaks test statistics into training
> features. The rule: ==fit transforms on train only=={Any learned preprocessing state, normalization constants, vocabularies, encodings, must be estimated from the training split alone, then applied unchanged to validation and test.}.

### Requirements and the data budget

- The KWS scenario: an always-on detector budgets **one false wake per month**.
  With ~1 non-keyword classification window per second, that is ~2.59M windows
  a month, so the per-window false-positive rate must satisfy the false-wake
  bound, ~$3.9\times10^{-7}$.

::eq[false-wake-budget]

$$
\mathrm{FPR}_{win} \leq \frac{\mathrm{FW}_{budget}}{W_{month}} \approx \frac{1}{2.59\times 10^{6}} \approx 3.9\times 10^{-7}
$$

  Even 99.999% per-window rejection leaves ~26 false wakes a month. Aggregate
  accuracy is the wrong target; evaluation must report **false accepts per
  hour** alongside false rejections.

::chart[false-wake-curve]

- Zero-event evidence: observing zero false wakes over $T$ hours bounds the rate
  only with uncertainty, the ==rule of three=={If zero events are observed over $n$ trials, the one-sided ~95% upper bound on the true rate is ≈ 3/n. A "one false wake per month" claim needs ~3 months of representative listening with zero observed wakes, and less proves less, not "it's fine."} means a
  one-per-month claim needs roughly three months of representative listening.

::eq[rule-of-three]

$$
\lambda_{95} \approx \frac{3}{n} \quad\Longrightarrow\quad T_{listen} \approx \frac{3}{\lambda_{target}}
$$
- A product target becomes a data requirement by arithmetic: the false-wake
  budget fixes a per-window rate; a fixed budget at a per-label cost buys a
  computable number of labels (~the KWS scenario lands just under 1M labels);
  the rule of three fixes the evaluation-listening requirement, a cost the
  naive allocation forgets to budget.
- Every data choice is a D·A·M coupling: 16 kHz vs 8 kHz sampling raises
  detection rate but doubles raw-audio storage and input work; 13 vs 40 MFCC
  coefficients trades accuracy against the on-device footprint. The design
  space is priced per row, and the rows don't commute.

### Acquisition

- Coverage must serve **both** sides of the contract: labeled wake-word clips
  measure recognition, but only separately collected, consented streams of
  ordinary audio (conversation, TV, music, silence, across real microphones and
  rooms, with duration and sequence preserved) can measure false accepts per
  hour.
- Scale routes: curated repositories and recording studies close coverage gaps
  one slice at a time; web scraping, crowdsourcing, and synthetic generation
  reach millions of examples. Acquisition scalability is an economic problem, 
  unit labeling, ingestion, and storage costs scale along different curves, and
  labeling dominates.
- MSWC itself was built programmatically: ==forced alignment=={Aligning continuous speech audio with its transcript to locate word boundaries, then slicing per-word windows, how MSWC extracted >1M labeled one-second clips across 50 keywords in 5 languages without paying per-clip human annotation.} over continuous
  speech corpora with transcripts, sliced into one-second keyword windows, 
  >1M labeled clips, 50 keywords, 5 languages, no per-clip human annotation.

### Ingestion and validation

- The ingestion boundary admits only well-formed, plausible data. Split the
  checks: ==synchronous schema validation=={Type, range, and presence checks executed as each record enters, rejecting malformed records before they propagate. TFDV-style tools infer the baseline schema from training data.} at the boundary; ==asynchronous statistical checks=={Distribution comparisons (PSI, K-S, parity replays) run off the hot path over windows of accepted data, catching shifts and training-serving skew that per-record rules can't see.} over windows of accepted data.
- Batch vs streaming is priced by how fast data loses value: fraud scoring
  needs records as they arrive; nightly features don't. Streaming buys latency
  and pays ==backpressure=={The condition where downstream stages can't keep pace with the input rate, the system must buffer (memory + latency), sample (lose data), or push back on producers (risk their failure).}, out-of-order windows held open for late
  events, freshness SLAs, and a real cost premium (the book's clickstream
  scenario prices streaming compute at roughly an order of magnitude above
  batch for the same volume).
- Failure machinery: retries with exponential backoff; a ==dead-letter queue=={A side store for records that still fail after retries, they neither block the pipeline nor disappear. Reviewed regularly it becomes a diagnostic feed: schema violations reveal upstream changes; unparsable audio reveals new hardware revisions.}; a ==circuit breaker=={Stops calling a failing dependency after repeated failures and fails fast or takes a validated fallback until a trial request succeeds, one dead feature service shouldn't stall every caller on timeouts.} for whole-dependency failures with a validated fallback.

::fig[ingestion-boundary]
- ETL vs ELT is where the transformation boundary sits relative to storage.
  ELT keeps raw immutable events and recomputes features by query, flexible,
  but the raw copy is the bill; a lakehouse that queries files in place can
  flip the accounting.

### Labeling

- ==Labels are the specification=={Ground truth is the system's spec, so a labeling error becomes part of the definition of correct. Labeling usually dominates dataset cost; granularity sets per-label cost.}, the model learns the labels' mistakes as confidently as their truths.
- Granularity sets price: a class label is a click; one quality bounding box
  took ~35 s in ImageNet's campaign; segmentation and medical labels cost
  orders of magnitude more and take weeks, not the milliseconds of a serving
  lookup or the hours of a training run.
- Quality is bounded, not assumed: ==Cohen's kappa=={Chance-corrected inter-annotator agreement: $\kappa = (p_o - p_e)/(1-p_e)$. Two annotators who agree 90% of the time on a 90/10 class split agree mostly by chance; $\kappa$ discounts that.} discounts agreement-by-chance;
 gold-standard checks catch careless annotators; ==predictive entropy=={$H = -\sum_i p_i \ln p_i$ over a trained model's class distribution, rising entropy flags inconsistent supervision, *if* the model is calibrated.}

::eq[label-entropy]

$$
H_{label} = -\sum_i p_i \ln p_i
$$
  rises on contradictory labels.
- Scaling: consensus voting multiplies both accuracy and bill; model-assisted
  pre-labeling shifts routine work to a model (audit it, its systematic errors
  become the new ground truth); ==active learning=={Spends model inference to reduce human labeling: route examples near the decision boundary (near-homophones, far-field wake words) to humans, auto-label the confident rest with spot checks. Whether it pays depends on whether scoring compute fits the same budget as the labels.} routes the most
  informative examples to humans first.

::eq[cohens-kappa]

$$
\kappa = \frac{p_o - p_e}{1 - p_e}
$$

### Processing

- ==Training-serving skew=={Training and serving compute the same feature differently, different logic or different fitted state, so the model receives inputs unlike those it learned from. A skewed feature is still a valid vector: it raises no error, it just silently degrades.} is the signature processing defect. Shared feature code is not
  enough: fitted state (normalization constants, vocabularies, gain handling)
  must be fitted **once on the training split**, persisted **with the model**,
  and replayed identically at serving. Detect it by passing raw serving
  requests through both pipelines and diffing, skew differs from drift (an
  internal divergence, not a changed world).
- ==Feature computation placement=={Which resource pays for a feature: storage pays when features are materialized (ETL precompute, disk-speed epochs, frozen augmentations, recompute-the-corpus for any logic change); compute and latency pay when features are computed on the fly in the loader (fresh augmentation per epoch, immediate logic changes, accelerator stall risk).} picks who pays: precompute in ETL and every epoch reads ready tensors but augmentation freezes and logic changes mean reprocessing the corpus; compute in the loader and the host CPU repeats work per epoch and can stall the accelerator. KWS precomputes MFCCs, deterministically, with window/hop/coefficient counts versioned beside the code.
- Pipelines run on preemptible workers and flaky networks, so retries re-execute
  stages: writes must be ==idempotent=={$f(f(x)) = f(x)$, re-execution converges to the same final state. Keyed upserts and atomic directory swaps are; blind appends and counter increments are not.}. Amdahl's law caps host-side scaling, even
  90% parallel loader code can't exceed ~10×, so kill serial stages before
  adding workers.

### Dataset release

- A release is an **immutable, versioned record**: sources, split assignment
  (KWS splits by hashing the *speaker* key, same speaker never crosses
  train/test), label and rubric version, feature configuration.
- ==Data lineage=={Links each dataset, feature, and model to what produced it. A regression is debugged by snapshot comparison of releases, not guesswork.} turns a model regression into a diff: which of the inputs changed between release $n$ and $n+1$.
- Datasheets / data cards document provenance, consent, and known gaps, 
  their absence is documentation debt (below).

### Physics of data

- Bytes have mass. The chapter's example: moving a ~petabyte-scale corpus across
  regions costs tens of thousands in egress plus hours of wire time, and wire
  time isn't even the critical path; refactoring the pipelines, validators,
  caches, and metadata that grew around the data is. Data gravity is why
  compute moves to data, not the reverse.
- The third property is flow rate, which the storage half quantifies.
- ==Data selection gain=={$\propto \text{information entropy} / \text{data gravity}$, a heuristic lens: an example is worth acquiring/moving when the task-relevant signal it carries justifies the cost of moving its bytes.} prices signal against mass.

### Storage and delivery

- The ==feeding problem=={Training throughput is the minimum of the compute-limited rate and the data-supply rate. Storage bandwidth, host decode, and bytes-per-sample each impose a slowest-stage bound; the input path must be sized for the rate the accelerator consumes, or it starves.} : step time is
  $T_{step} = \max(T_{compute}, T_{IO})$, feeding loss is the idle fraction
  when the second term wins.
- Effective bandwidth = physical bandwidth × format efficiency: columnar
  Parquet reads only needed fields; row-wise CSV/JSON pays full parse per
  record. Format choice is a throughput decision, not a storage decision.
- Access patterns pull in opposite directions, training wants bulk sequential
  scans, serving wants millisecond point lookups, so warehouses (OLAP),
  lakes/object stores, OLTP stores, and caches each own a lifecycle phase, and
  a ==feature store=={Registers each feature definition once and serves it from an offline store for training (point-in-time "as-of" retrieval so training sees only values available at each observation's timestamp) and an online store for serving. Shared definitions cut skew only if fitted state, timestamps, and freshness are synchronized too.} bridges the two with point-in-time correctness.
- Petabyte "migrations" are not bandwidth problems: wire time for the book's
  PB example is hours, but the dependent infrastructure is the real move.

::eq[feeding-bound]

$$
T_{step} = \max(T_{compute},\, T_{IO}), \qquad R_{supply} = \mathrm{BW}_{phys} \cdot \eta_{fmt} \cdot (1 - \varepsilon_{ovh})
$$

### Accepting the pipeline

- Acceptance is an experiment, not a demo: same versioned speaker-separated
  splits and label budget for both candidates (13 vs 40 MFCCs); threshold set
  on validation; an untouched evaluation set measures recognition; dedicated
  representative non-keyword streams measure false accepts per hour through
  the deployed path.
- Fix confidence and listening duration **before** evaluating; accept the
  false-wake claim only when the upper uncertainty bound meets the target.
  Zero wakes in insufficient hours establishes nothing.
- Feature parity is replayed, fixed audio through both the training and the
  device preprocessing paths, and peak memory/latency/power are measured on
  the target device, not inferred.

### Operational data health

- ==Drift=={The production distribution moving away from the training distribution, degrades a static model even when no code changes. Decomposes into covariate shift ($P(x)$ changes, $P(y|x)$ stable, the new-microphone case), label shift, and concept drift ($P(y|x)$ itself changes; detectable only with outcome labels).} decomposes
  into covariate, label, and concept shift. Two statistics make it
 actionable: ==PSI=={Population Stability Index, $\sum_i (A_i - E_i)\ln(A_i/E_i)$ over binned features. Bands: <0.1 stable, 0.1-0.25 moderate, >0.25 investigate. Conventions to calibrate, not physical limits.} and ==K-S=={Kolmogorov-Smirnov: the max gap between two empirical CDFs, $D = \max_x|F_P - F_Q|$, with critical value $\approx 1.36\sqrt{(n_P+n_Q)/(n_P n_Q)}$, a univariate continuous-feature drift trigger.}.

::eq[psi]

$$
\mathrm{PSI} = \sum_i \left( A_i - E_i \right) \ln\!\left(\frac{A_i}{E_i}\right)
$$

::eq[ks-test]

$$
D_{KS} = \max_x \lvert F_P(x) - F_Q(x) \rvert, \qquad D_{crit} \approx 1.36\sqrt{\frac{n_P + n_Q}{n_P n_Q}}
$$

  KL divergence is the third statistic, asymmetric, infinite on unseen
  values, so fix direction and smooth empty bins. All are **prompts for
  investigation, not proof** of degradation.
- ==Data debt=={The accumulated cost of implicit coupling and missing documentation across four categories: documentation (unrecorded provenance), schema (undocumented changes + defensive workarounds), quality (known defects left unfixed, a 3% label-error corpus corrupts every run), freshness (staleness vs the live distribution).} compounds like interest:
  $\text{Debt}_n \approx \text{Debt}_0(1+r)^n$.

::eq[debt-compound]

$$
\mathrm{Debt}_n \approx \mathrm{Debt}_0 \times (1 + r)^n
$$

::chart[debt-compound]

  *Strategic* debt taken deliberately for a
  launch window is a trade; *unconscious* debt compounding silently is the
  failure mode.
- Debugging a production regression is a triage by symptom: suspect the
  ingestion boundary first (DLQ contents, schema diffs), then corpus alignment
  (PSI/K-S vs baseline), then freshness vs outcome evidence, drift in inputs
  alone isn't proof accuracy fell.

> [!note]
> Fallacies worth quoting back: "more data always improves performance" (adds
> cost and sometimes noise, check coverage, not volume); "preprocessing can be
> finished once" (it's part of the model artifact, it drifts and skews); "high
> training accuracy means production readiness" (that's the capability contract
> only; the physical and operational contracts are unmeasured); "production
> logs show where the model fails" (logs show requests, not ground truth, 
> most failures are invisible without labels or audits).

## The two contracts, condensed

::fig[two-contracts]

| Contract | Bound | Failure if broken | Chapter machinery |
|---|---|---|---|
| Statistical (Data-Algorithm) | Capability: what the model can learn | Cascades, leakage, label noise, skew, drift | Validation boundary, kappa/gold checks, speaker-keyed splits, release lineage, drift stats |
| Physical (Data-Machine) | Throughput: how fast it can learn | Starved accelerator, blown budgets, migration stalls | Feeding bound, format efficiency, tier matching, loader workers, idempotent writes |

## Exercises

1. A smart-doorbell always-on person detector budgets **one false positive
   per week**, evaluating a 0.5 s window (~1.2M windows/week). What per-window
   FPR does that imply? The team tests 200 h of home audio and sees zero false
   fires, do they ship? (Use the false-wake bound and the rule of three.)

::eq[false-wake-budget]

$$
\mathrm{FPR}_{win} \leq \frac{\mathrm{FW}_{budget}}{W_{month}} \approx \frac{1}{2.59\times 10^{6}} \approx 3.9\times 10^{-7}
$$

::eq[rule-of-three]

$$
\lambda_{95} \approx \frac{3}{n} \quad\Longrightarrow\quad T_{listen} \approx \frac{3}{\lambda_{target}}
$$
2. Two annotators agree on 92% of wake-word clips. The non-wake class is 90%
   of clips. Compute $\kappa$. Is the labeling spec healthy?

::eq[cohens-kappa]

$$
\kappa = \frac{p_o - p_e}{1 - p_e}
$$
3. Your trainer consumes 2,000 samples/s at 25 KB/sample after decode. Storage
   delivers 40 MB/s; the loader path adds 15% overhead. What is the steady-state
   sample rate, and which side of $\max(T_{compute}, T_{IO})$ are you on?

::eq[feeding-bound]

$$
T_{step} = \max(T_{compute},\, T_{IO}), \qquad R_{supply} = \mathrm{BW}_{phys} \cdot \eta_{fmt} \cdot (1 - \varepsilon_{ovh})
$$
4. A PSI monitor on a binned feature returns 0.31. Before retraining, name
   two checks that distinguish covariate shift from concept drift, and say
 why only one of them can be run without labels.

::eq[psi]

$$
\mathrm{PSI} = \sum_i \left( A_i - E_i \right) \ln\!\left(\frac{A_i}{E_i}\right)
$$

## Review prompts

- Why is a data cascade more expensive than a code regression of the same
  "size"? What does the *silence* property do to detection cost?
- "The dataset is the build", what engineering disciplines does that import,
  and which one is most often skipped until a regression demands it?
- The one-false-wake-per-month target produced *three* data requirements.
  What are they, and which is easiest to forget?
- When is skew not drift, and how do you detect each?
- Labels are the specification. Trace a 3% label-error rate forward: where
  does it surface, and what would each defense cost vs the defect?

## Connections

- **Ch 1 (D·A·M, iron law, bitter lesson, silent degradation):** data sits in
  both Data-Algorithm and Data-Machine overlaps; the iron law's
  $\DataVolume/\Bandwidth$ data-movement term is this chapter's throughput
  half; the degradation equation is why drift statistics exist.
- **Ch 2 (data gravity, bottleneck principle, memory wall):** gravity decides
  where compute runs; the feeding problem is the bottleneck principle applied
  to the input path; the memory hierarchy is why format efficiency matters.
- **Ch 3 (lifecycle, constraint propagation):** Stage 2 hands the versioned
  dataset forward; a cascade is constraint propagation through derived state
  instead of through stage artifacts; acceptance is the evaluation/validation
  split applied to data.
- **Forward (ch 8-14):** the input pipeline and data parallelism, compute-optimal
  data selection, request-keyed parity testing, and layered monitoring all
  build on the contracts defined here.

## Glossary

- **Data-as-code principle**: changing a dataset changes the trained model even when no algorithmic code changes; the pipeline that produces a dataset is the system's build, and every retraining is a rebuild.
- **Data cascade**: an upstream data quality problem that passes schemas and tests, converts to new derived state at each stage, and surfaces at evaluation or deployment; remediation cost scales with downstream artifacts consumed.
- **Data leakage**: information crossing train/validation/test trust boundaries through duplicates, group members, future-derived features, or preprocessing fitted before the split.
- **Training-serving skew**: an internal divergence where training and serving compute the same feature differently (logic or fitted state); the skewed output is a valid vector, so it degrades silently.
- **Feeding problem**: training throughput is the minimum of compute rate and data supply rate; storage bandwidth, host decode, and bytes-per-sample each bound the slowest stage.
- **Rule of three**: zero events in $n$ trials bounds the true rate at ≈ $3/n$; a "one false wake per month" claim needs ~3 months of representative zero-wake listening.
- **Cohen's kappa**: chance-corrected inter-annotator agreement, $\kappa = (p_o - p_e)/(1 - p_e)$; raw agreement lies on imbalanced classes.
- **Data gravity**: the bandwidth, I/O, and latency cost of moving a large byte volume; why compute moves to data rather than the reverse.
- **Feature store**: registers each feature definition once and serves it offline for training (point-in-time as-of retrieval) and online for serving.
- **Data debt**: the accumulated cost of implicit coupling and missing documentation across documentation, schema, quality, and freshness categories, compounding as $\text{Debt}_0(1+r)^n$.
- **Point-in-time correctness**: each training example sees only feature values that existed at its observation timestamp; the as-of join that prevents future leakage.
- **Covariate / label / concept shift**: the drift decomposition; only concept drift ($P(y|x)$ changes) requires labels to detect.

## → Ben's world

- **Greenveil's whole product is the labeling economics row.** Truelabel is a
  labeling platform, the exact line item the chapter prices at 600-1,000× a
  training run. Kappa, gold checks, consensus queues, and pre-annotation review
  are the product surface, not abstractions; the "labels are the specification"
  claim is the business case.
- **The droplet's four-way co-location is a feeding decision.** Polling
  services share one box because their data supply (poll → parse → store) is
  trivially below demand; the day any tenant's input path starves its workers,
  the packing argument dies on the same bound the chapter formalizes.
- **DLQ review is already paying rent on the knowledge graph.** The ingest
  scripts that assembled blog/lab/study nodes produced rejected records the
  whole time; treating the reject file as a diagnostic feed instead of trash is
  exactly how the KWS pipeline found a new microphone revision.
- **Point-in-time correctness is the bug the bench records can't afford.**
  Benchmark rows joined to model metadata as of *today* instead of *run date*
  is the same leakage class, training set built with information that didn't
  exist at observation time.
- **Drift statistics are the honest version of "feels slower lately."** PSI on
  a binned feature is one SQL query away for anything already in a warehouse;
  the harder part the chapter keeps repeating is treating it as a prompt, not a
  verdict.

## Open questions

- The rule of three assumes independent trials; neighboring classification
  windows are correlated. How does the book's "expectations add anyway" line
  interact with the bound for the *upper* interval, not the mean? Worth
  checking Hanley & Lippman-Hand's original argument before quoting 3/n for
  rare-event budgets generally.
- The four pillars organize detection, but the chapter never prices the
  *coverage* trade-off inside governance: how much does consent-scoped
  acquisition shrink the usable negative-audio pool for false-wake eval?
- KWS splits by speaker hash; what grouping key does a recommendation system
  use when "the entity" is a user×item pair that legitimately recurs?
- Feature stores promise skew elimination but only synchronize definitions;
  the packet lists fitted state, timestamps, freshness as the residual
  requirement. Is there a minimal manifest schema that would make parity
  replayable by construction?


## Essay candidates (for the POST phase)

- **"Your dataset is a build artifact"**: data-as-code taken seriously means
  versioned releases, executable validation, and debugging by diff, and most
  teams run their training corpus with less rigor than a README.
- **"The silence is the bill"**: cascades cost more than bugs not because the
  defect is bigger but because valid-looking wrong answers skip every alarm;
  detection distance is the multiplier.
- **"One false wake a month is a data spec"**: a product sentence becomes three
  arithmetic requirements (per-window FPR, label budget, listening hours), and
  the listening hours are the one nobody budgets.
- **"Skew is not drift"**: your own two pipelines disagreeing is a different
  disease than the world moving; parity replay catches the first, PSI the
  second, and conflating them misdirects the fix.
- **"Feed the machine"**: every 'GPU at 30% MFU' story is a data-supply story
  wearing a compute costume; the min() in the feeding bound is the whole
  diagnosis.
