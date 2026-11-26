# hosts: Marcus | Iris
# Chapter 9 -- Data Selection. Thesis: the only lever that shrinks the work itself,
# and it charges its own compute tax.

A: Welcome back to our study of Machine Learning Systems. Last time we ran
::fig[inequality-timeline]
training backwards -- the iron law says time is work over rate, and every trick
in that chapter moved the rate side. Faster silicon, better kernels, higher
efficiency. The work term itself, the six-P-D operation count, looked untouchable.

B: And this chapter touches it. Data selection is the only lever in the book so
far that shrinks the numerator. Every token costs the same forward pass,
backward pass, and optimizer update -- whether it teaches anything or is a
duplicate of a duplicate. So if the marginal tokens carry almost no signal,
deleting them is the cheapest FLOP in the whole system.

A: Which sounds like an obvious win. But the chapter opens with a wall, not a
win. Walk me through the data wall.

B: GPT-2's corpus, WebText, is about forty gigabytes of text -- roughly ten
billion unique tokens. The Chinchilla-fitted balance wants about twenty unique
tokens per parameter. For a one-and-a-half-billion-parameter model that's
thirty billion unique tokens needed, against ten billion supplied. The corpus
is a third of the fit.

A: So the run covered the gap by repetition -- it re-read the same corpus
roughly seventeen times. One hundred sixty-seven billion tokens processed, of
which about a hundred fifty-seven billion were tokens the model already owned.
And GPT-3 sat even deeper, at about one-point-seven tokens per parameter.

B: Right. And here's the subtlety -- repeating isn't free filler. Every repeat
still costs a full training step. It buys less each pass, because the marginal
learning signal decays. The chapter models information content as growing only
logarithmically with data -- so the marginal information-compute ratio falls as
one over the dataset size. Each doubling of the corpus halves what the next
FLOP learns.

A: ICR -- that's the unit price the chapter puts on data. Learning gained per
::eq[icr]
FLOP spent. And they actually measured it: a half-size ImageNet coreset gained
four-point-five points against full data's five, in one epoch. Slightly worse
score, half the compute -- which is one-point-eight times the ICR.

B: That example is doing real work. It shows the trade isn't "prune and lose
nothing" -- it's "accept a small quality delta for a large compute delta, and
check whether the exchange rate is good." Which brings us to the law of the
chapter.

A: The selection inequality. Selection time plus training time on the subset
::eq[selection-inequality]
must be less than training time on the full set -- at matched quality and
coverage. It's a break-even, not a bonus.

B: And the worked case shows how easily it clears: a hundred twenty-eight
thousand image coreset -- ten percent of ImageNet -- where the scoring pass
costs at most a third of an epoch, and subset training makes every one of a
hundred epochs ten times cheaper. The scorer could cost almost the whole run
and it would still win on time.

A: But the inequality has a second clause people forget -- matched quality AND
::fig[coverage-floors]
coverage. That ten-percent subset can hit top-one accuracy while quietly
deleting a rare class. Which is why the chapter adds coverage floors: minimum
representation per class or slice, applied before the score ranking gets to
spend the budget.

B: Floors are a constraint layer, not a quality tweak. If the summed floors
exceed the budget, the plan is infeasible -- no ranking can fix it. And there's
an honest cost: every forced low-score keep displaces a high-score one.

A: Let's hit the actual toolbox. Static pruning first -- the unambiguous win is
deduplication. On the GPT-2 corpus, dedup reads forty gigabytes once -- six
seconds at seven gigabytes per second on NVMe -- and keeps a hundred
twenty-eight hash MinHash signature per document, about four gigabytes of RAM.
The return is three to fourteen hours of the four-day run and tens of
kilowatt-hours, at essentially zero accuracy cost, because the deleted tokens
were literally copies.

B: Everything after dedup trades signal for cost -- quality pruning, coresets.
::fig[active-loop]
Then the dynamic levers: curriculum learning, which reorders samples by
difficulty because a hard case is noise to an unstabilized model. And active
learning, which is the same inequality paid in dollars -- score the unlabeled
pool, send the top-k to an oracle, retrain, repeat. The worked ROI: a million
unlabeled scans at five dollars a label, and the active strategy reaches the
target with fifty thousand labels -- two hundred fifty thousand dollars,
against five million naive.

A: But the scorer bill is per-round, and rescore-the-whole-pool each round
reintroduces the cost the loop was avoiding. The inequality survives only if
per-round scoring stays sublinear in pool size.

B: Then the unlabeled-data levers. Semi-supervised and self-supervised trade
::fig[foundation-be]
extra compute for fewer labels. And the foundation-model version: pay ten
thousand GPU-hours of pretraining once, then fifty per fine-tune, versus a
thousand per task from scratch. The break-even is ten-point-five -- so at least
eleven downstream tasks before prepaid wins.

A: Now the part I liked best -- the engineering tax. Selection removes
::fig[read-penalty]
accelerator work but adds host work, and the worst of it is the random-access
penalty. A retained subset scattered across shards turns sequential reads into
thousands of little random reads. Realized bandwidth on four-kilobyte reads:
three hundred seventy-five times worse on spinning disk, fourteen times on
SATA SSD, under two on NVMe.

B: Which produces the practical rule: a ten-percent subset only saves reads
when it's materialized into its own shards. Stream-and-discard filtering keeps
sequential speed but reads a hundred percent of the bytes to deliver ten
percent of the samples.

A: And data echoing sits on the other side -- when the host is the slow stage,
::eq[echo-factor]
re-using a prepared batch twice from cache fills the accelerator's idle slots.
For the input-bound ResNet-fifty the GPU sat half idle; echo factor two closes
the gap. But -- and this is the fallacy -- echo recovers stranded cycles. If the
host already outruns the GPU, echoing recovers nothing.

B: Finally the economics. Total data cost includes licensing, annotation,
::eq[amortized-roi]
storage -- routinely dwarfing compute. And amortization decides whether a fixed
curation cost is a loss or a multiplication: the book's dedup pipeline is
negative eighty-two percent ROI on its first run and positive eight hundred
nine percent by the fiftieth. Same pipeline, same per-run saving -- only the
divisor changes.

A: So the chapter's discipline, end to end: data selection is the only lever
::fig[inequality-timeline]
that shrinks O. But it only counts when score-plus-subset beats full at
matched quality and coverage, the data path is engineered so the fix doesn't
move the bottleneck, and fixed costs amortize across the runs that share them.

B: Same discipline as training, one layer upstream -- measure value against
cost, prove the overhead fits the budget, attack the limiting term. Next time:
data engineering -- the pipeline that feeds all of this.
