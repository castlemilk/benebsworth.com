# Self-test: Data Engineering

Ten questions: six MCQ, two Feynman, two numeric. Answers and reasoning in
`quiz.json`; the deck exports to Anki from the chapter page.

## Questions

1. **(MCQ, book)** A team discovers the same sensor event can appear in
   multiple log partitions feeding their training set. They deduplicate within
   each partition and declare the leakage risk handled. What did they miss?
2. **(MCQ, book)** A pipeline runs full synchronous schema and
   distribution checks inline on a real-time event stream, then misses a slow
   distribution shift. Which pillar combination best explains the failure?
3. **(MCQ, book)** Two annotators agree on 92% of clips, but the non-wake
   class is 90% of the corpus. Why is the raw agreement figure misleading,
   and what should the team report instead?
4. **(MCQ, book)** During serving, an engineer computes z-scores
   $(x-\mu)/\sigma$. Where must $\mu$ and $\sigma$ come from, and what failure
   results if they're recomputed on live traffic?
5. **(MCQ, book)** A KWS evaluation produces zero false wakes over 500 hours
   of representative non-keyword audio. Does this establish a budget of one
   false wake per month? Why or why not?
6. **(MCQ, book)** An architect must serve (a) millisecond point lookups of
   feature vectors at inference, (b) bulk sequential scans for nightly
   training, (c) point-in-time-correct training sets. Which storage
   arrangement matches all three?
7. **(Feynman, original)** Explain to a junior engineer why a data cascade is
   more expensive than a code bug of comparable "size" — use the silence
   property and the widening rework bill.
8. **(Feynman, original)** "Labels are the specification." Explain what this
   means for label errors, labeling economics, and why kappa/gold checks exist.
9. **(Numeric, original)** An always-on detector evaluates ~2.88M windows/month
   (1 window every ~0.9 s) and budgets 0.5 expected false wakes/month. What is
   the per-window FPR bound, and how many months of zero-false-wake listening
   does a claim at that rate require?
10. **(Numeric, original)** A trainer needs 2,000 samples/s at 25 KB each.
    Storage sustains 40 MB/s; loader overhead is 15%. Compute the supply rate
    in samples/s and state whether the accelerator is fed or starved.
