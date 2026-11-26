# Operations at Scale — self-test

1. Why can manual, per-model operational maintenance become difficult to sustain as an organization expands to hundreds of models that share features, resources, and release dependencies?
   - A. Each model requires its own dedicated datacenter zone, so facility costs scale with model count regardless of how well the hardware is utilized
   - B. Shared dependencies reduce coordination work because one upstream pipeline update automatically propagates correct behavior to every downstream consumer
   - C. Shared data dependencies, contested resources, and independent alert streams add coordination work that can exceed the capacity of manual per-model processes
   - D. Model count increases only inference latency, which lengthens request queues but never changes the coordination structure between the teams that own the models

2. An organization operates 50 models. A platform team costs 120,000 dollars per month and recovers 20 engineering hours per model monthly, valued at 150 dollars per hour. What are the benefit-cost ratio and net ROI based on this recovered-capacity value?
   - A. Benefit-cost ratio 1.25 and net ROI of 25%, with 30,000 dollars in net monthly capacity value above platform cost
   - B. Benefit-cost ratio 0.80 and net ROI of -20%
   - C. Benefit-cost ratio 2.50 and net ROI of 150%, with 180,000 dollars in net monthly capacity value above platform cost
   - D. Benefit-cost ratio 0.50 and net ROI of -50%

3. A fleet has 100 models with 10 metrics each, checked every 5 minutes at a threshold with false-positive rate alpha = 0.003. Calculate the expected raw false threshold crossings per day, and explain why this number is not the page count.

4. When an upstream User Embedding Model is updated in an enterprise model registry, which automated sequence must the registry execute to prevent silent production failures?
   - A. Deploy the new embedding immediately, then file follow-up tickets for each downstream team to validate compatibility on their own schedules
   - B. Rebuild the entire feature store from raw sources so every consumer implicitly receives compatible embeddings without any explicit re-evaluation step
   - C. Roll back every downstream model to its last known-good artifact version and redeploy the entire consumer set against the new embedding schema before any serving traffic shifts
   - D. Identify dependent downstream models, trigger compatibility re-evaluations, block promotion until all dependents pass, and coordinate staged deployment order

5. What failure mode occurs when a training pipeline constructs examples using current feature values rather than historical values as of each event timestamp?
   - A. Schema drift: current values carry different units, ranges and missing-value conventions than the historical values they replace, so gradients optimize a shifted objective function
   - B. Time-travel data leakage: future information contaminates training data, producing deceptively high offline metrics but degraded production performance
   - C. Survivorship bias: only entities with complete current features enter training, systematically dropping long-tail users from the dataset
   - D. Label delay: future feature values leak into the training labels themselves, inflating offline AUC without affecting the features the model is served

6. Calculate the raw uncompressed historical storage for a feature store with 100 million users, 1,000 features per user, 1 year retention (8,760 hourly snapshots), and 32-byte rows (8-byte value, 8-byte entity key, two 8-byte timestamps).

7. A model serves 1 million requests per hour and its canary plan needs about 10,000 samples per variant. How long must the 1 percent stage run to collect that evidence, and what assumption does the calculation ignore?

8. Why are gray failures, such as an accelerator whose GEMM throughput drops 20 percent or an NVLink link with intermittent retries, exceptionally damaging in large synchronous distributed training runs?
   - A. Gray failures corrupt gradient checksums, forcing the runtime to discard the entire step's accumulated gradients and restart from the last checkpoint
   - B. A degraded rank triggers automatic cluster-wide preemption, so one slow GPU evacuates every rank from its node and requeues the whole job
   - C. Intermittent link retries inflate only logging volume and retry counters, because the collective runtime's double-buffered gradient communication buckets fully absorb the added latency without delaying any step boundary
   - D. A degraded rank or link on the communication critical path can delay collective completion and the next training step while ordinary availability checks remain healthy

9. When an ML platform evaluates 20 simultaneous A/B experiments, why might the team adopt Benjamini-Hochberg FDR control instead of the Bonferroni correction?
   - A. FDR control removes the need for prespecified sample sizes because sequential peeking at results is permitted under its assumptions
   - B. Bonferroni divides alpha by the number of tests, creating an overly conservative threshold that inflates false negatives and discards real model gains
   - C. Bonferroni correction is only defined for two-arm experiments, so portfolio platforms running multi-arm bandits must use FDR procedures
   - D. Benjamini-Hochberg provides uniform statistical power across experiments of different sample sizes, while the Bonferroni threshold varies with traffic

10. On-call alerts report that all recommendation models across multiple teams dropped 15 percent in conversion over two hours, while vision models, NLP services, and raw server health remain green. What is the most probable root cause among these choices?
    - A. An upstream feature store pipeline delay leaving user interaction features stale across all recommender models
    - B. A synchronized bad data batch that reached every recommendation training pipeline, while vision models simply were not retrained in the window
    - C. A load balancer began routing recommender traffic to a degraded serving tier that lacks the newest model versions
    - D. An upstream ranking model release introduced a subtle composition bias that only surfaces when downstream ensembles combine its scores

11. In a build-versus-buy TCO evaluation for a 1,024-GPU cluster against a cloud rate of 4 dollars per GPU-hour, what operational invariant determines whether ownership achieves lower cumulative cost over a 30-month horizon?
    - A. Whether the cluster can sustain a 99.99 percent availability SLA under the cloud provider's service-credit terms, since ownership is only economically justified when rental penalties are certain
    - B. The ratio of GPU count to datacenter power density, since ownership is only economically viable above a fixed rack-density threshold
    - C. Sustained useful demand relative to full ownership cost; under the plotted assumptions an 80 percent cloud allocation crosses the owned-capacity cost near month 26
    - D. Whether reserved cloud commitments can be canceled mid-term, since ownership wins whenever future demand is uncertain

12. Which organizational structure best balances platform standardization with domain-specific velocity for an enterprise running 80 production models across recommendation, fraud, search and ads?
    - A. A pure centralized ticket queue where every training run, hyperparameter sweep and deployment request routes through the platform team
    - B. A hybrid model: a centralized core platform team owns shared infrastructure while domain platform engineers stay embedded in product teams
    - C. A pure decentralized model where each product team operates its own clusters, pipelines and monitoring with no shared contracts
    - D. An outsourced operations model where a third-party vendor runs all infrastructure, on-call rotation and release engineering while product teams retain modeling decisions and acceptance criteria

13. A recommendation ensemble's conversion drops 5 percent within one hour and no model deployed recently. Walk through how you would attribute the cause using the chapter's runbook, and what evidence would distinguish a stale shared feature from a model-specific regression.

## Answer key

1. C. Shared features, contested resources, and independent alerts create interacting operational dependencies as the portfolio grows. Manual per-model maintenance becomes unsustainable, which motivates shared controls and automation. This is a scaling argument, not a theorem that every large fleet has identical complexity.

2. A. Recovered capacity is 50 models times 20 hours times 150 dollars, or 150,000 dollars monthly. Dividing by 120,000 dollars gives a benefit-cost ratio of 1.25; net ROI is 25%, or 30,000 dollars above cost. Recovered engineering time is capacity value, not automatic cash: realizing it requires productive redeployment.

3. Checks per day = 100 models x 10 metrics x 288 checks = 288,000. Expected crossings = 288,000 x 0.003 = 864 per day. These are threshold crossings, not distinct incidents or pages: hierarchical grouping, persistence checks, deduplication and calibrated policies reduce operator burden while urgent local alerts still page directly.

   Independent monitors multiply false crossings. The raw rate motivates the monitoring pyramid and persistence rules; it does not equal the number of pages an on-call engineer receives.

4. D. Upstream changes silently break downstream models unless the registry traverses the dependency graph: identifying consumers, triggering re-evaluation, blocking promotion until verified, and ordering compatible intermediate states. Undeclared consumers are never flagged.

5. B. Point-in-time correctness joins each feature as of the event's availability time. A noon event joined to a midnight batch sees future clicks the model cannot have at inference, inflating offline metrics while production accuracy collapses.

6. Rows = 1e8 users x 1,000 features x 8,760 snapshots = 8.76e14 feature values. Bytes = 8.76e14 x 32 = 2.8e16 bytes, about 28 PB. Metadata (key plus two timestamps, 24 of 32 bytes) is 75 percent of the row, which is why stores keep deltas, compress and tier rather than snapshot everything.

   Storage scales with entities, features, retention window over update interval and bytes per row. The metadata fraction is what makes point-in-time joins reproducible and also what forces delta storage.

7. t = n / (rate x fraction) = 10,000 / (1,000,000 x 0.01) = 1 hour. At 5 percent traffic the same samples take 12 minutes. The formula is a collection-time lower bound: delayed outcomes, correlated requests and prespecified guardrail windows can require longer stages.

   Stage duration is priced from the experiment's sample requirement, not the clock. The full rollout schedule is set by the slowest outcome the release must observe, from hours of guardrails to days of soak.

8. D. A gray failure lengthens the step critical path without crashing a process. Gradient communication overlaps computation as buckets become ready, so the slowdown depends on placement and the collective schedule rather than producing a visible outage.

9. B. Bonferroni controls the probability of any false rejection across the family at a power cost. Benjamini-Hochberg controls the expected false-discovery proportion among rejections under its dependence assumptions and can retain more power, but still requires valid p-values and does not guarantee zero false discoveries.

10. A. The failure follows model-family dependencies while unrelated services stay healthy, making the shared recommendation feature pipeline the strongest hypothesis. Confirm freshness, recent changes and cohort effects before declaring a root cause; the pattern narrows the search but does not prove it.

11. C. The ownership boundary includes acquisition and operating costs while cloud cost follows allocated GPU-hours at the rental rate. Lower allocation can favor rental when unused capacity can be released. Depreciation schedules and demand uncertainty do not remove the underlying demand-versus-cost comparison.

12. B. The hybrid pattern centralizes core infrastructure (compute, registries, feature stores, CI/CD, governance) while embedding domain platform leads in product teams, avoiding both the centralized ticket bottleneck and fragmented bespoke infrastructure.

13. Follow the five-step runbook: confirm user impact, localize the dependency, bound the blast radius, escalate by evidence, and record the gap for post-incident review. First check whether the failure is family-wide: if all recommendation models dropped while vision, NLP and infrastructure stayed green, the shared feature pipeline is the leading hypothesis, not fifty independent model bugs. Check feature freshness against each feature's SLO, then upstream queues (consumer lag versus normal), then broker or storage health. A stale shared feature predicts correlated degradation across every consumer of that feature and a freshness-SLO breach on one pipeline; a model-specific regression predicts isolated degradation with clean feature freshness. The chapter's worked chain ran engagement minus 5 percent to features 3 hours stale against a 1-hour SLO, to 10 million queued events against a 10 thousand normal, to a broker disk at 95 percent. The PIR then names the missing control, such as a freshness alert at 4 hours instead of 5-day detection, with an owner and deadline.

    Attribution is a dependency-graph traversal under time pressure: the cross-model failure pattern plus freshness evidence separates a shared-cause incident from coincident model regressions, and the post-incident review converts the gap into a control.
