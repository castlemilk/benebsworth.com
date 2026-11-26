# Self-test -- ch9 · Data Selection

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
