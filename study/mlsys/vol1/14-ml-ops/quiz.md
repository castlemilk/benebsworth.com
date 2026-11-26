# Self-test: ML Operations

1. A recommender returns HTTP 200 on every request, holds 99.99% uptime, and sits inside its p99 budget, while accuracy slides from 94% to 88% over four weeks. Which instrument would have caught the slide first?
   - A. Latency percentiles at the edge, drift almost always surfaces as slower requests before any quality metric moves.
   - B. CPU, GPU and memory saturation dashboards on the serving cluster, predictive decay shows up as resource creep first.
   - C. A statistical monitor on model outputs or input features, infrastructure health cannot see predictive decay.
   - D. Error-rate alerts on the serving endpoint, failed requests are the first observable of a decaying model.

2. Sculley et al.'s audit of Google's production ML systems estimated the share of actual ML code in a mature system at roughly:
   - A. About 50%, the model and its integration plumbing tend to split a mature codebase evenly.
   - B. About 25%, models dominate, but pipelines and configuration claim roughly a quarter of the system.
   - C. About 80%, the model dominates, because it is the component that changes most often in production.
   - D. At most ~5% ML code against ~95% glue, integration wrappers, configuration, collection and serving plumbing.

3. A downstream team reads your model's scores to rank its own feed. You update the model and their system breaks, yet no dependency graph listed them. The pattern is:
   - A. A correction cascade, a chain of models compensating for each other's errors until an update snaps the chain.
   - B. An undeclared consumer, a downstream system using outputs without a contract, invisible to import statements.
   - C. Boundary erosion, statistical coupling dissolving the modular wall between two otherwise separate systems.
   - D. Training-serving skew, the feature computed differently in the offline pipeline versus the serving path.

4. A serving pipeline computes a feature differently than training. At 1,000,000 requests/day, 1% of queries get corrupted predictions costing \$0.10 each. What is the annual loss?

5. Why does a model release earn traffic in stages (shadow → canary → blue-green) rather than flipping at once?
   - A. Each stage bounds the blast radius while producing the evidence the next stage requires, with a revert path held open.
   - B. Stages exist mainly so caches and JIT paths warm up before the model faces full production load.
   - C. Stages are a compliance artifact, staged exposure is what regulation requires before certification.
   - D. Canary slices cost less compute, so staging a release primarily saves money on inference capacity.

6. Your drift detector needs ~1,000 labeled outcomes to confirm a shift. Traffic is high but labels arrive at 100/day. Roughly how long until detection is possible?
   - A. About a day, with high traffic the model sees enough examples to confirm the shift quickly.
   - B. About an hour, detection follows the request rate, which is high in this service.
   - C. About ten days, detection is bounded by labeled-outcome arrival, not traffic.
   - D. Effectively immediate, statistical drift detection does not depend on labels at all.

7. A service serves 500,000 queries/day, value \$0.40 per query per unit accuracy, accuracy 0.92 after each run, decay 0.2%/day, run cost \$4,000. Using T* = √(2C_r/(Q·v·A₀·δ)), the optimal retraining interval is about how many days? (Round to nearest whole day.)

8. A canary gate needs to detect a 2% relative lift. The team now wants the gate to certify a 1% lift instead. By what factor does the required sample size grow (n ∝ 1/MDE²)?

9. Explain to a teammate how a recommender's own rankings can quietly poison its retraining data.

10. Explain when you would retrain on a drift trigger versus a fixed schedule, and what number decides.

11. A drift alert fires on your serving model. What is the correct next step?
    - A. Retrain immediately, fresh data is always the right first response to a drift signal.
    - B. Roll back to the previous model version, the last good model is the safest fallback.
    - C. Raise the alert threshold, a noisy monitor is worse than a quiet one.
    - D. Diagnose whether the cause is data, model, or infrastructure first, retraining on the same broken feature re-learns the same failure.

## Answer key

1. C. Silent failure is predictive decay with green infrastructure. Only statistical monitors, drift on inputs/outputs, trend on accuracy, see it; uptime, latency and error rates measure the machine.

2. D. The maintenance surface is integration code, not the model, which is why technical debt lives in the couplings around the model rather than inside it.

3. B. Undeclared consumers break silently on model updates because no contract or import declares the dependency; only lineage tracking finds them.

4. 1,000,000 × 1% × \$0.10 = \$1,000 per day; × 365 = \$365,000 per year, a recurring annual cost that persists until the consistency bug is removed. The fix is a shared feature store, not a better model.

5. A. A release carries weights, contracts and feedback effects. Stages trade speed for bounded risk and evidence; rollback is a drilled procedure, not a hope.

6. C. Detection is capped by labeled-outcome arrival. 1,000 labels at 100/day ≈ 10 days. Low-label domains need proxy signals (input drift, perplexity, cohort stats) instead.

7. T* = √(2·4,000/(500,000·0.40·0.92·0.002)) = √(8,000/368) = √21.7 ≈ 4.7, so about 5 days. If the release path takes longer than the optimum, the deployment path is the constraint.

8. Halving the minimum detectable effect quadruples the sample: (2/1)² = 4× more traffic to certify the smaller lift.

9. The model ranks items; users click what it shows them; those clicks become training labels. The model's choices shape the data it later trains on, so it amplifies its own prior behavior, a feedback loop. Positions it never shows never get clicked, which looks like evidence they were bad. The fix is logging propensity/exposure data and exploring deliberately, not trusting the organic click stream as a fair sample.

10. A fixed schedule is predictable but pays the run cost whether or not staleness warranted it; a trigger pays only when a monitor shows real decay, but can chase noise. The deciding number is the staleness model: T* = √(2C_r/(Q v A₀ δ)). If drift is slow and runs are cheap, a schedule is fine; if drift is spiky and runs are costly, a trigger priced by that interval wins. Either way the answer comes from the cost comparison, not a calendar habit.

11. D. An alert is a symptom, not a cause. Retraining without tracing the shifted term re-learns the failure; rollback helps only if the model itself is the cause; silencing the alert hides the symptom.
