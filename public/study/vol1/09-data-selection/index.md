---
title: "Data Selection — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html"
canonical_url: "https://benebsworth.com/study/vol1/09-data-selection/"
---
# Data Selection: Study Packet

*Working through Machine Learning Systems (Reddi, Harvard CS249r, mlsysbook.ai, CC-BY-NC-SA 4.0).
Chapter 9 of Volume I: the data wall, the information-compute ratio, the selection inequality, deduplication and coresets, curriculum and active learning, the unlabeled-data levers, and the engineering tax selection charges the data path.*

## Thesis

Every optimization so far in this book moved the denominator -- faster silicon, better kernels, tighter efficiency. **Data selection is the only lever that shrinks the numerator** *(why it matters: O = 6PD is linear in tokens, and the chapter's opening observation is that every token costs the same forward pass, backward pass, and update whether it teaches anything or not. Marginal learning signal varies by orders of magnitude across the corpus, so deleting the worthless share is the cheapest FLOP in the whole system.)*. But selection is not free: it spends its own compute on scoring, hashing, and re-reads, so a selection pipeline only counts as an optimization when it satisfies **the selection inequality** *(why it matters: T_select + T_train(subset) < T_train(full) at matched quality and coverage. Scorer cost and refresh rate -- not the retained fraction -- decide whether selection is a net saving, which is why a cheap proxy scorer often beats an accurate one.)*. The discipline is the same one the training chapter taught: measure the value against its cost, prove the overhead is inside the budget, engineer the data path so the fix does not move the bottleneck, and amortize the one-time investments across the runs that share them.

> **note**
> Amber dotted marks each carry a one-line why-it-matters card: hover, tap, or
> tab to them. Select any text to pin your own highlight or note.

## Guided notes

### The data wall

- GPT-2 XL's training corpus, WebText, holds ~40 GB of text -- about 10
  billion unique tokens at ~4 bytes per token. The Chinchilla-fitted
  balance wants ~20 unique tokens per parameter: for 1.5 billion
  parameters that is **30 billion unique tokens, three times the supply** *(why it matters: WebText delivers only ~6.7 unique tokens per parameter -- a third of the fitted balance. The original run covered the gap by re-reading its corpus roughly seventeen times. GPT-3 sat even lower at ~1.7 tokens per parameter.)*.
- The wall is asymmetric. A run starved of unique tokens must either
  repeat the corpus -- paying the same step cost for tokens the model
  already owns -- or grow the model past its data, which is the
  **data-starved regime** *(why it matters: Below the compute-optimal frontier: the run's unique tokens per parameter sit under the fitted ~20, so it repeats its corpus and the repeated passes buy little new signal. The right response is more unique tokens or a smaller model, not more epochs.)* where every repeated pass returns less.
- Placed on the eight-H100 machine of the training chapter at 50%
  efficiency, GPT-2 XL's full 167-billion-token budget is ~4.4 days and
  ~590 kWh of accelerator energy. Halving *token work* halves both --
  which is exactly what a good deduplication pass can buy.
- ResNet-50 on ImageNet is the second lighthouse: one epoch costs
  ~3.2 x 10^16 FLOPs, and the corpus question there is not token supply
  but **which images are worth their step** *(why it matters: ImageNet's 1.28M images are unique-ish but unequal -- near-duplicates, mislabeled shots, easy cases long since mastered. The vision analogue of token starvation is label and compute budget, which is why the chapter's selection examples lean on ResNet-50.)*.


**GPT-2 XL's token wall: supply, need, and what it actually processed**

| token pool | unique tokens (billions) | re-read copies of the same tokens |
|---|---|---|
| WebText unique supply | 10 | 0 |
| Chinchilla-fitted need | 30 | 0 |
| tokens the run processed | 10 | 157 |

*WebText holds ~10B unique tokens (~6.7 per parameter); the Chinchilla-fitted ~20 tokens/param asks 30B for 1.5B parameters -- 3x the supply. The original run covered the gap by re-reading: ~167B processed tokens, of which ~157B were repeats of the same unique pool. Book values, rounded.*

### Measuring data value

- Value needs a unit price, and the chapter prices it in compute:
  **information-compute ratio** *(why it matters: Learning signal gained per unit of training compute spent. It turns "is this example useful" into "is this example worth the FLOPs it will burn" -- the same shape as the iron law's time accounting, applied to data.)* -- ICR = measured gain / FLOPs spent.
- ICR decays as the corpus grows: under the chapter's illustrative
  model, marginal ICR falls as $1/(O_{\mathrm{sample}} \cdot D)$, so
  doubling the dataset halves what the next FLOP learns. A measured
  2x ICR improvement halves the FLOPs needed for the same gain.
- On ImageNet, the half-size coreset gained 4.5 points against full
  data's 5.0 in one epoch -- a slightly smaller gain at half the
  compute, which is 1.8x the ICR. A subset that *matched* the full
  gain would post 2x.


**Marginal ICR halves with each corpus doubling (illustrative model)**

| dataset size relative to first corpus | marginal ICR (normalized) |
|---|---|
| 1x | 1 |
| 2x | 0.5 |
| 4x | 0.25 |
| 8x | 0.125 |

*The chapter's illustrative model: marginal ICR ~ 1/(O_sample x D). Each doubling of consumed data halves what the next FLOP learns -- the frontier bends down, which is why pruning repeats beats buying more corpus at the margin.*

**Eq 1 · Information-compute ratio**
$$
\mathrm{ICR} = \frac{\text{learning signal gained}}{\text{training compute spent}}
$$

- Three complementary metrics, three different questions: performance
  per data (gain per sample), **area under the learning curve** *(why it matters: Total competence accumulated over the run, not just the endpoint -- two datasets that reach the same final accuracy can differ hugely in how fast they got there, and fast matters when the budget is measured in wall-clock and joules.)*, and the
  **data compression ratio** *(why it matters: DCR = full size / subset size at a target accuracy. A DCR of 5 means the coreset hits target with 20% of the data -- a compression claim, not a quality claim, and it must be validated for coverage separately.)* DCR = D_full / D_sub at target accuracy.
- Validation is its own step: dropping 640,000 ImageNet images can
  hold top-1 accuracy while quietly deleting a rare class, skewing
  the distribution away from production, or concentrating mislabels.
  Coverage metrics -- per-class and per-slice floors -- are what the
  retained set must satisfy, not just a score distribution.

### The selection inequality

- The one law the whole chapter lives under:

**Eq 3 · The selection inequality**
$$
T_{\mathrm{select}} + T_{\mathrm{train}}(D_{\mathrm{sub}}) < T_{\mathrm{train}}(D_{\mathrm{full}})
$$

- Selection time only counts the *marginal* pass -- scorer prep and
  feature extraction amortize across every downstream run that reuses
  them, which is the **amortization rule** *(why it matters: A pipeline's one-time curation bill should be spread across every training run in the campaign. The chapter's worked dedup pipeline loses 82% ROI on its first run and returns +809% by the fiftieth -- the same fixed cost divided differently.)* the economics section makes
  precise.
- Worked example: a 128,117-image coreset (10% of ImageNet) for
  ResNet-50 on one H100 at 25% of peak. The scoring pass costs at
  most one forward pass per candidate -- about a third of a full
  epoch -- and a light proxy scorer costs less still. Subset training
  then shrinks *every* epoch of the 100-epoch run, so the inequality
  clears by a wide margin on both options.
- The inequality is where "prune more" meets its limit: scorer cost
  scales with pool size and scorer size, so a too-fancy scorer can
  eat the saving it was meant to earn.

![The selection inequality as two bars](https://benebsworth.com/study/vol1/09-data-selection/diagrams/inequality-timeline.svg)

*Top bar: full-data training time. Bottom bar: the selection pipeline's bill -- scorer pass plus training on the subset. Selection is a win only while the bottom bar stays shorter at matched quality; the margin between them is the saving, and scorer cost is what eats it.*
### Static pruning

- The cheapest samples to delete are repeats. On GPT-2's corpus,
  deduplication reads the 40 GB once -- ~6 s at the machine's 7 GB/s
  NVMe -- and holds a 128-hash MinHash signature per document for its
  ~8 million documents, ~4.1 GB of host RAM. The return: ~3-14 hours
  of the 4.4-day run and ~18-80 kWh, at essentially zero accuracy
  cost, because the deleted tokens were copies.
- **Deduplication is the unambiguous win** *(why it matters: Duplicates charge full step price for zero new information -- removing them cannot hurt quality at fixed schedule, and for language corpora the Pile/C4 template content makes it a first-order systems issue, not a hygiene nicety. It also measurably reduced memorization at equal perplexity in the cited study.)*; it is the one cut that is
  subtract-only. Everything after it trades signal for cost and must
  be validated.
- Quality pruning removes garbled content and contradictory labels.
  With clean data the chapter's illustrative target needs 10,000
  samples; noisy labels need 16,000 for the same 1% error -- **noise
  is a data multiplier** *(why it matters: 1.6x the samples to reach the same target in the worked case. Label noise does not just cost accuracy -- it inflates the corpus size you must buy, store, and train against, so cleaning is a throughput measure as much as a quality one.)*, not just an accuracy tax.
- Coreset selection turns pruning into a coverage problem: find the
  smallest subset preserving the dataset's statistics. Scores come
  from proxies -- an EL2N score trains a small model a few epochs and
  ranks examples by prediction-error norm; a prototype metric ranks
  by embedding distance to class center and discarded 20% of the data
  with no loss in the cited result.
- Score rankings alone are dangerous. **Coverage floors** *(why it matters: Per-class or per-slice minimums applied on top of the score ranking. They carry an explicit opportunity cost -- every forced low-score keep displaces a high-score keep -- and they can make a budget infeasible: if floors A+B exceed the coreset budget, the plan must change before any training starts.)* are the
  constraint layer: a budget smaller than the summed floors is
  infeasible regardless of how good the retained scores look.

![Coverage floors constrain the score ranking](https://benebsworth.com/study/vol1/09-data-selection/diagrams/coverage-floors.svg)

*A score-ranked pool (left) under a three-slot budget and a one-per-slice floor: the rare class keeps its floor slot even with the lowest score, displacing the third-ranked common example. Floors spend opportunity cost on representativeness; a budget smaller than the summed floors is infeasible.*
### Dynamic selection

- Sample value is not fixed -- it moves as the model learns.
  **Curriculum learning** *(why it matters: Ordering data by difficulty under a pacing schedule, e.g. linear pacing sort_by_difficulty[:D * min(1, t/W)]. Early on, hard boundary cases are noise to an unstabilized model; later, easy examples stop paying. Reordering costs almost nothing and harvests the time-variation in sample value that static pruning cannot see.)* exploits the schedule:
  linear pacing reveals the easiest slice first and reaches the full
  dataset after the warmup window.
- **Active learning** *(why it matters: A label-efficiency loop: score the unlabeled pool with the current model, query the most informative samples for expert annotation, add them, retrain, repeat. It exists because in domains like radiology the label, not the FLOP, is the scarce resource -- the selection inequality replays in dollars.)* is the same loop
  spent on labels instead of FLOPs: score the pool, query the top-k,
  annotate, retrain. The book's worked ROI: 1M unlabeled scans at
  \$5/label against a \$500,000 budget -- naive labeling wants \$5M
  (10x over), the active strategy reaches the same accuracy with
  50,000 labels (\$250,000). Illustrative curves put the label gap
  near 4.6x at 90% accuracy.
- The catch is the same inequality in disguise: pool scoring,
  acquisition, and repeated retraining are the overhead term, and a
  label saving must be measured against a budget-matched random
  baseline after those costs -- not against naive label-everything.

![The active-learning loop and who pays each stage](https://benebsworth.com/study/vol1/09-data-selection/diagrams/active-loop.svg)

*Score the unlabeled pool, query the top-k for the oracle, add the new labels, retrain, repeat. The label bill sits at the oracle; the compute bill sits at scoring and retraining -- both enter the inequality against a budget-matched random baseline.*
### Synthetic data and the unlabeled levers

- Augmentation is synthesis without storage: crop, flip, color-shift
  on the fly at ingestion, so every epoch sees fresh variants without
  multiplying the archive. Mixup goes further -- convex combinations
  of pairs, $x' = \lambda x_i + (1-\lambda)x_j$ with the same blend on
  labels; CutMix pastes patches and blends by area.
- Generative synthesis replaces curation when the pool lacks the
  cases: simulation and diffusion models mint rare examples at a
  per-sample price, paying for it in **domain gap** *(why it matters: Synthetic samples approximate but do not equal real ones. Bridging needs domain randomization, adaptation, or a real-data anchor -- and recursive self-training risks model collapse, where the model's own outputs become its training distribution and rare modes shrink away.)*.
- Semi-supervised and self-supervised learning trade extra training
  compute for fewer task labels -- valid only when the unlabeled pool
  matches the target distribution. Pseudo-labeling's failure mode is
  confirmation bias: the model grades its own mistakes as confident.
- The foundation-model version amortizes one giant run across many
  tasks: 10,000 GPU-hours of pretraining plus 50 GPU-hours per
  fine-tune versus 1,000 GPU-hours trained from scratch each time.
  **The break-even is N > 10 downstream tasks** *(why it matters: 10,000 + 50N < 1,000N gives N >= 11 under the worked values -- at least eleven tasks before the pretrained path uses fewer total GPU-hours. The same scenario cuts the per-task label bill ~100x. Fewer tasks and self-supervision is the more expensive option.)* under the worked
  numbers.

![Foundation amortization: prepaid versus scratch](https://benebsworth.com/study/vol1/09-data-selection/diagrams/foundation-be.svg)

*From-scratch training costs 1,000 GPU-hours per task; the pretrained path pays 10,000 once and 50 per fine-tune. The lines cross at N = 11 downstream tasks -- below it, self-supervision is the more expensive option; above it, the per-task marginal cost is ~20x lower.*
### Selection engineering: the data path tax

- Selection removes accelerator work but *adds* host work: hashing,
  scoring passes, shard coordination, and -- worst of all --
  **the random-access penalty** *(why it matters: A retained subset scattered across shards turns bulk sequential reads into thousands of small nonsequential reads, defeating readahead and page-cache hits. The chapter's 4 KB table: ~375x realized-bandwidth loss on HDD, ~14x on SATA SSD, under 2x on NVMe. On slow tiers the "saving" can be eaten by seeks.)*.
- A 10% subset only saves reads when it is *materialized* into its
  own shards. Stream-and-discard filtering keeps sequential speed but
  still reads 100% of the corpus bytes to deliver 10% of the samples.
- **Data echoing** *(why it matters: Repeat a prepared batch e times before the host produces the next one: re-reading from a fast local cache recovers accelerator cycles the slow input stage strands. Works only when the pipeline ratio R = T_pipeline/T_GPU > 1 -- when the host already outruns the GPU there is nothing to recover, and the echo is pure overhead.)* recovers the other side: when host prep is
  the slow stage, re-using a prepared batch e times from cache fills
  the accelerator's idle slots. For the chapter's input-bound
  ResNet-50 the GPU sat ~half idle; echo factor 2 closes that gap --
  recovering idleness, not doubling throughput.
- Distributed selection multiplies the coordination cost: the same
  sample must be scored, deduplicated, and sharded consistently
  across workers, and dynamic selection adds consensus problems on
  top -- which is another reason the scorer must be cheap.

![The random-access penalty by storage tier](https://benebsworth.com/study/vol1/09-data-selection/diagrams/read-penalty.svg)

*A retained subset scattered across shards turns sequential reads into small random reads. Realized-bandwidth loss for 4 KB reads: ~375x on HDD, ~14x on SATA SSD, under 2x on NVMe. Stream-and-discard keeps sequential speed but still reads every corpus byte; materialized subset shards are what make the saving physical.*
### Choosing a strategy

- Total data cost is bigger than the cloud invoice: licensing,
  annotation, and storage bills routinely dwarf compute cost. The
  chapter's accounting: labels at \$10/sample, active learning's
  \$50-per-round pool-scoring cost, and an amortized MinHash pipeline
  that runs **-82% ROI on its first use and +809% by the fiftieth** *(why it matters: Break-even lands at five runs; after ten, net savings are \$30k on \$30k of investment -- 100% ROI. The point is not the specific numbers but the shape: fixed curation cost divided by run count is what makes static pipelines cheap at scale.)*.
- The decision process follows the primary constraint: labeling
  budget sends you to the unlabeled-data branch; redundancy sends you
  to dedup and coresets; rare classes force coverage floors; privacy
  rules can forbid retaining data at all; convergence speed is what
  curriculum buys. One constraint at a time -- the same discipline as
  the training chapter's fix-the-limiting-term loop.


**Dedup savings accumulating against a fixed setup cost**

| campaign runs reusing the pipeline | gross savings ($k) |
|---|---|
| 1 run | 6 |
| 5 runs | 30 |
| 10 runs | 60 |
| 50 runs | 300 |

*The book's worked dedup pipeline: gross saving is \$6k per run against a fixed \$30k setup. The bar reaches the cost at five runs; net ROI is therefore negative at one run, break-even at five, and positive after that (+100% at ten runs in the worked accounting).*

### Fallacies and pitfalls

- *More data is better.* A 10x corpus can multiply storage, IO, and
  accelerator bills while barely moving test accuracy -- the
  budget-only mindset mistakes the corpus size for its signal.
- *Selection is free.* The scorer has a compute bill of its own; the
  inequality is a break-even, not a bonus.
- *The retained set is representative because it scored well.* Top-1
  accuracy can hide a deleted rare class -- coverage metrics are the
  audit, the score ranking is not.
- *Amortization does not matter.* It decides whether a fixed curation
  cost is a loss or a multiplication -- the dedup pipeline's ROI
  flips sign purely on run count.
- *Echoing doubles throughput.* Echo recovers stranded accelerator
  cycles; with R < 1 the host already outruns the GPU and echoing
  gains nothing.

## The physics

| Quantity | Value | Use |
|---|---|---|
| WebText corpus | ~40 GB, ~10B tokens | GPT-2's supply |
| Chinchilla balance | ~20 tokens/param | the fitted reference, not a law |
| GPT-2 XL need | ~30B unique tokens | 1.5B params x 20 |
| WebText supply | ~6.7 unique tok/param | 1/3 of the fit -> ~17x repeats |
| GPT-3 ratio | ~1.7 tok/param | deeper starvation |
| ImageNet epoch | ~3.2 x 10^16 FLOPs | ResNet-50 lighthouse |
| Full budget on 8xH100 | ~4.4 days, ~590 kWh | @50% efficiency |
| Dedup read | ~6 s @7 GB/s | one corpus pass |
| MinHash index | 128 hashes x ~8M docs, ~4.1 GB | host-RAM cost |
| Dedup return | ~3-14 h, ~18-80 kWh | of the 4.4-day run |
| Half-ImageNet coreset | 4.5pp vs 5.0pp | 1.8x ICR at half compute |
| Clean vs noisy to 1% | 10,000 vs 16,000 | noise = 1.6x data |
| Random 4 KB reads | ~375x HDD, ~14x SATA, <2x NVMe | the scatter tax |
| AL worked ROI | 50k labels @\$5 = \$250k | vs \$5M naive, \$500k budget |
| Label-efficiency gap | ~4.6x @90% accuracy | illustrative curve |
| Foundation break-even | N >= 11 tasks | 10k + 50N < 1000N GPU-hr |
| Foundation labels | ~100x fewer per task | same worked scenario |
| Amortized dedup ROI | -82% @1 run -> +809% @50 | break-even at 5 |
| Label price | \$5-10/sample, \$50/round scoring | active-learning economics |

## Glossary

- **Data wall**: the point where compute outruns the corpus's unique
  supply; every extra pass buys less.
- **ICR**: information-compute ratio -- learning gained per FLOP spent.
- **DCR**: data compression ratio -- full size over subset size at a
  target accuracy.
- **AULC**: area under the learning curve -- total competence over the
  run, not just the endpoint.
- **Selection inequality**: T_select + T_train(sub) < T_train(full) --
  selection must pay for itself at matched quality.
- **Coreset**: smallest subset preserving the dataset's statistics.
- **Coverage floor**: per-class/slice minimum that constrains the score
  ranking; can make a budget infeasible.
- **MinHash/LSH**: sketch-based near-duplicate detection -- signatures
  in RAM instead of pairwise reads.
- **EL2N**: error L2 norm -- proxy score from a small model's
  prediction-error magnitude.
- **Curriculum**: difficulty-ordered scheduling under a pacing function.
- **Active learning**: model-in-the-loop label acquisition; the
  selection inequality in dollars.
- **Mixup/CutMix**: convex-combination / patch-paste synthesis.
- **Domain gap**: synthetic != real; bridged by randomization,
  adaptation, or real anchors.
- **Model collapse**: recursive self-training shrinking the output
  distribution's modes.
- **Pseudo-labeling**: self-training on confident guesses; fails by
  confirmation bias.
- **Data echoing**: re-use prepared batches to recover host-starved
  accelerator cycles; needs R > 1.
- **Random-access penalty**: scatter reads lose readahead -- 375x/14x/
  <2x by tier.
- **Amortized ROI**: fixed curation cost spread across campaign runs.

## → Ben's world

- The benchmark harness is this chapter's economics in miniature: a
  seeded-sample disclosure and merge-protected results.json are
  coverage floors -- you cannot cheaply delete the rows that make the
  plot honest.
- The shared droplet's fixed \$24/mo over per-request pricing is the
  amortization argument again: fixed cost divided by runs wins at
  some N, loses below it.
- doc-analyser's OCR pipeline is the input-bound case for echoing:
  the GPU's step floor is the slowest of prep/xfer/compute, and
  recovering stranded cycles beats adding capacity.

## Open questions

- The chapter prices selection against *time at matched quality* --
  but "matched" hides the interesting bit. At equal end accuracy, does
  the coreset's different data distribution shift the failure profile
  in ways the metric cannot see? Coverage floors are the answer the
  chapter gives; are they enough for production skew?
- Chinchilla's ~20 tok/param is a fitted balance in one regime. Does
  the ratio survive FP8-precision runs, or does cheaper compute move
  the frontier toward bigger models on the same data?
- Dedup at GPT-2 scale costs ~6 s of reads. At trillion-token scale
  the corpus scan and the signature store grow linearly -- where does
  the read pass itself hit the inequality's ceiling?
- Echoing recovers host-stranded cycles by reusing batches -- does the
  reuse show up as effective-data repetition in the ICR accounting,
  or does it escape the metric entirely?


---

## Key equations

**Eq 1 · Information-compute ratio**

$$
\mathrm{ICR} = \frac{\text{learning signal gained}}{\text{training compute spent}}
$$

*Sample value priced in compute: gain per unit of training FLOPs. Turns 'is this example useful' into 'is it worth the FLOPs it burns' — the selection counterpart of the training chapter's time accounting.*

**Eq 2 · Marginal ICR decay**

$$
\mathrm{ICR}_{\mathrm{marg}} \propto \frac{1}{O_{\mathrm{sample}} \cdot D}
$$

*The chapter's illustrative model: as the dataset doubles, the next FLOP's learning yield halves. Explains why adding data buys less each pass — the ICR frontier bends down.*

**Eq 3 · The selection inequality**

$$
T_{\mathrm{select}} + T_{\mathrm{train}}(D_{\mathrm{sub}}) < T_{\mathrm{train}}(D_{\mathrm{full}})
$$

*The chapter's break-even law: selection counts as an optimization only when scoring plus subset training beats full training at matched quality and coverage. Scorer cost and refresh rate decide — not the retained fraction.*

**Eq 4 · Data compression ratio**

$$
\mathrm{DCR} = \frac{D_{\mathrm{full}}}{D_{\mathrm{sub}}} \;\bigg|_{\mathrm{Acc}_{\mathrm{target}}}
$$

*How much smaller the selected set is at a target accuracy — a compression claim, not a quality claim. DCR 5 means the coreset hits target on 20% of the data; coverage must be validated separately.*

**Eq 5 · Constrained coreset budget**

$$
B \;\geq\; \sum_{c} F_c, \qquad \text{else infeasible}
$$

*Per-class/slice coverage floors are applied before spending the score budget. If summed floors exceed the budget, no ranking can fix it — the selection plan itself must change.*

**Eq 6 · Foundation-model break-even**

$$
C_{\mathrm{pretrain}} + N \cdot C_{\mathrm{finetune}} \le N \cdot C_{\mathrm{scratch}} \;\Rightarrow\; N \ge \frac{C_{\mathrm{pretrain}}}{C_{\mathrm{scratch}} - C_{\mathrm{finetune}}}
$$

*The amortization law for one shared pretrained run: 10,000 + 50N <= 1,000N GPU-hours gives N >= 11 tasks in the book's worked scenario. Below that task count, self-supervision is the more expensive option.*

**Eq 7 · Amortized selection ROI**

$$
\mathrm{ROI} = \frac{R \cdot S_{\mathrm{run}} - C_{\mathrm{setup}}}{C_{\mathrm{setup}}}
$$

*Fixed curation cost spread across every run in the campaign. The book's worked dedup pipeline: -82% ROI at one run, break-even near five, +809% by fifty — the same fixed bill divided differently.*

**Eq 8 · Data echoing fill**

$$
e^{*} \approx \frac{T_{\mathrm{pipeline}}}{T_{\mathrm{GPU}}} = R, \qquad R > 1 \;\text{only}
$$

*Reuse a prepared batch e times to recover accelerator cycles the slow host strands. The useful factor is the pipeline ratio itself — echo only exists when the host is the slow stage (R > 1); below that it recovers nothing.*

## From the book

- [Data wall — web-corpus growth vs dataset demand](https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html) — The chapter's framing figure: public text corpora have grown far slower than compute budgets, pushing large runs into the repeat-everything regime.
- [Information-compute ratio frontier](https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html) — Marginal ICR declines as dataset size grows — the diminishing-returns curve the selection inequality prices against.
- [Scaling saturation on unique vs repeated data](https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html) — Model performance saturates as data repeats — the empirical shape behind the token-supply shortfall for GPT-2-scale runs.
- [Active learning closed loop](https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html) — Score unlabeled pool → query top-k → human annotates → retrain → rescore. The book's loop figure; our original diagram redistributes the same stages by who pays each cost.
- [Random-access penalty table](https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html) — Realized bandwidth on 4 KB random reads vs sequential, by storage tier — the source table behind our read-penalty diagram.
- [Data echoing](https://mlsysbook.ai/vol1/09_data_selection/09_data_selection.html) — Echo factor fills accelerator idle slots when the input pipeline is the slow stage; nothing recovered when R < 1.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

Six from the book's own bank (adapted, lightly), two Feynman prompts, three
numeric problems. Answers at the bottom -- work first.

## Book questions

**Q1.** A team's GPU compute grows ~10x every 3 years while usable public-text
corpora grow far slower. Which regime does this trajectory produce for
GPT-3-scale runs?
- A. Compute-starved -- models shrink to fit the data
- B. Data-starved -- runs re-read the same unique tokens many times
- C. Balanced -- Chinchilla's ratio holds automatically at larger scale
- D. Label-bound -- the binding constraint becomes annotation, not tokens

**Q2.** True or false: doubling the raw, deduplicated web corpus always doubles
the total information a run learns from it.

**Q3.** Under the chapter's illustrative model with I(D) ∝ ln D and linear
compute, marginal ICR scales as:
- A. ∝ D (rises with more data)
- B. ∝ 1/D (halves with each doubling)
- C. ∝ √D (sublinear growth)
- D. constant -- corpus size doesn't change the ratio

**Q4.** A team reduces 1,000,000 images to 100,000. Full-data training takes 10
hours; scoring costs 1 hour; subset training costs 3 hours. Does the selection
inequality pass, and by what margin?
- A. Fails -- selection adds work
- B. Passes by 6 hours
- C. Passes by 7 hours
- D. Passes by 1 hour

**Q5.** Why is MinHash + LSH preferred over exhaustive pairwise Jaccard for
near-duplicate detection at corpus scale?
- A. It produces higher recall
- B. Pairwise comparison is quadratic in document count; sketches make it
  near-linear with signatures held in RAM
- C. It requires no corpus read
- D. It works only on text, so it is more specialized

**Q6.** In foundation-model amortization with pretraining at 10,000 GPU-hours,
fine-tuning at 50 GPU-hours/task, and scratch training at 1,000 GPU-hours/task,
the compute-only break-even is:
- A. N = 5 tasks
- B. N = 10 tasks
- C. N = 11 tasks
- D. N = 20 tasks

## Feynman prompts

**F1.** The selection inequality is a *time* inequality. Explain to a colleague
why "we pruned 40% of the dataset" is not, by itself, evidence the pipeline
saved anything -- name at least three terms that can quietly eat the margin.

**F2.** Your ImageNet coreset hits top-1 target on 30% of the data, but the
rare-class slice dropped 9 points. Using the coverage-floor framing, explain
why "the scores said these were the best examples" is not a defense.

## Numeric problems

**N1.** A corpus has 20B unique tokens; the model has 2.5B parameters.
(a) What is the tokens-per-parameter ratio, and is the run above or below the
fitted ~20? (b) If the schedule demands 75B tokens, how many passes over the
corpus does that imply?

**N2.** Scoring an ImageNet-scale pool costs at most one forward pass per
image -- about one-third of an epoch's compute. Training takes 100 epochs on
full data, 100 epochs on a 10% subset (≈10x cheaper per epoch). Compute both
sides of the selection inequality. What is the largest scorer cost (in epochs)
that still leaves selection profitable?

**N3.** Labels cost \$5 each; pool scoring costs \$50/round and runs 10 rounds.
Two strategies: (a) random -- label 100,000; (b) active -- label 50,000 and reach
the same accuracy. Total spend for each, including the scorer? What must be
true of the scorer's cost curve for active learning to stay ahead as the pool
grows?

---

## Answer key

**Q1 → B.** Demand outgrows unique supply → repeated epochs over the same
corpus (the data-starved regime); ~17x repeats for GPT-2's run, ~1.7 tok/param
for GPT-3.

**Q2 → False.** Marginal ICR decays ~1/(O·D); a twice-size corpus does not buy
twice the signal -- most of the marginal tokens are near-duplicates of what the
model already owns.

**Q3 → B.** I(D) ∝ ln D ⇒ dI/dD ∝ 1/D; with linear per-sample compute,
marginal ICR ∝ 1/(O_sample · D). Each doubling halves the next FLOP's yield.

**Q4 → B.** 1 + 3 = 4 h vs 10 h → passes with a 6-hour margin. Selection is
judged on *time at matched quality*, not retained fraction.

**Q5 → B.** Pairwise Jaccard over ~8M documents is ~3×10^13 comparisons --
infeasible; MinHash reduces each doc to a ~128-hash signature (~4.1 GB total)
and LSH buckets candidates so near-dupes collide in one pass.

**Q6 → C.** 10,000 + 50N < 1,000N ⇒ N > 10.53 ⇒ N ≥ 11 tasks. At N = 10 the
paths cost 10,500 vs 10,000 -- scratch still wins.

**F1.** Score + subset-train < full-train *at matched quality* is the claim --
retained fraction alone says nothing about (1) scorer cost (a fat scorer can
exceed the margin), (2) coverage/quality loss on rare slices, (3) the
data-path tax -- scattered 4 KB reads can lose ~375x/14x/<2x bandwidth by tier,
(4) refresh cadence -- every re-score re-spends the overhead.

**F2.** The score ranking optimizes an aggregate; the floor is the constraint
layer that enforces representation per slice. A 9-point rare-class regression
means the "best" subset failed the constraint it was supposed to satisfy --
raise the floor (or the budget), don't debate the scores. If summed floors
exceed the budget, the plan is infeasible regardless of ranking.

**N1.** (a) 20B/2.5B = 8 tokens/param -- below the fitted ~20 (data-starved).
(b) 75B/20B = 3.75 passes -- the schedule repeats the corpus nearly four times.

**N2.** Full: 100 epochs. Selected: ≤1/3 epoch + 10 epochs ≈ 10.33 epochs →
clears by ~89.7 epochs. Scorer budget ceiling: T_select < 100 − 10 = 90
epochs of compute -- scoring could cost nearly the whole run and still win;
the binding limits in practice are quality and coverage, not time.

**N3.** Random: 100,000 × \$5 = \$500,000 (no scorer). Active: 50,000 × \$5 +
10 × \$50 = \$250,500 → ~\$249,500 saved. For the advantage to survive a
growing pool, per-round scoring must stay sub-linear in pool size -- an
all-pool rescore each round reintroduces the very cost the loop was meant
to avoid.

## Audio overview

[Listen to the Marcus & Iris read-along (~7 min)](https://benebsworth.com/study-audio/vol1/09-data-selection.m4a) — a generated podcast walking this packet's argument.
