# Self-test: ML Lifecycle

Ten questions: six MCQ, two Feynman, two numeric. Answers and reasoning in
`quiz.json`; the deck exports to Anki from the chapter page.

## Questions

1. **(MCQ, book)** Team A ships a DR screening model and freezes development
   once it clears lab validation, treating later tasks as standard ops.
   Team B treats launch as the start of a feedback loop, telemetry and
   drift monitoring driving evidence-based updates. Which posture matches
   the chapter's lifecycle, and why?

2. **(MCQ, book)** A team finishes problem definition with clinical
   sensitivity targets but leaves "deployment environment TBD." Which
   failure does this set up?

3. **(MCQ, book)** Deployment discovers the trained model needs 4 GB on a
   device with ~500 MB reserved. Tracing through stage interface contracts,
   which stage owns the defect?

4. **(MCQ, book)** What is the primary distinction between model evaluation
   and model validation as the chapter defines them?

5. **(MCQ, book)** A DR model hits 94% aggregate sensitivity on held-out
   data. How should the validation stage treat this result before release?

6. **(MCQ, book)** Post-deployment, only *referred* patients get specialist
   grading in routine care. What does this imply for field sensitivity
   measurement?

7. **(Feynman, original)** Explain to a software-engineering colleague why
   "the artifact is untouched but the model degraded" (no exception, no
   crash, silent accuracy loss) and why a monitoring stage exists because
   of it.

8. **(Feynman, original)** A team treats its test set as the model-selection
   signal, retraining until a candidate clears it. Explain what this does to
   the evidence the release decision relies on.

9. **(Numeric, original)** A validation pipeline runs one full check per
   week; a rebuilt pipeline runs one per day. Over a 26-week window, how
   many release candidates does each clear, and what is the search-breadth
   ratio?

10. **(Numeric, original)** A screening program submits 1,838 clinic images;
    393 come back ungradable. What share is rejected, and at 100 patients/day
    how many unscreened patients does that rate produce weekly?
