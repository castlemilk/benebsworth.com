# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Today's chapter opens with a scenario that should unsettle anyone who trusts a green dashboard. Your recommender returns HTTP 200 on every request, holds 99.99% uptime, sits inside its p99 budget. Meanwhile its click accuracy slides from 94 to 88 percent over four weeks. Nothing alerts anyone.
::fig[green-but-dying]

B: Right, and that's the chapter's whole premise, the silent failure. Everything we built before this chapter optimized a model inside a loop we controlled. This chapter is about a loop that runs without asking: the model is live, the world moves, quality decays while every health check stays green.

A: So the dashboards were honest, just about the wrong thing.

B: Exactly. They measured the machine, not the claim. A model isn't a binary that either works or crashes; it's a claim about the world, and the world drifts. A competitor ran a promotion, users changed what they click, and four weeks of gentle decay became real money lost, with a perfect uptime record the whole time.

A: Before the fix, the chapter spends time on where this failure comes from, technical debt. And it opens with a number I want on a poster.
::fig[debt-map]

B: The Sculley audit. A mature production system can end up at most five percent machine-learning code and ninety-five percent glue, integration wrappers, config, collection, serving plumbing. The maintenance surface isn't the model; it's everything the model is wrapped in. That's where the debt lives.

A: And it hides in specific patterns, correction cascades was the one I had to read twice.

B: A model trained to correct another model's errors. You fix the upstream model and the downstream corrector, which had learned to compensate for its mistakes, suddenly gets fed corrected inputs it was never designed for. The dependency chain breaks silently. Then there are undeclared consumers, a downstream team reads your scores to rank their feed, you update the model, their system breaks, and no import statement ever listed them. Only lineage finds them.

A: And boundary erosion underneath it all.

B: Features entangle. A change to one input silently shifts dependent outputs, and statistical software just doesn't have the modular walls deterministic software does. The defense is data contracts, allowed ranges, null tolerances, drift thresholds, rebuilding the boundary at runtime.

A: The chapter has a price tag for one flavor of this: training-serving skew. A feature computed differently offline versus online. Put numbers on it.

B: At a million requests a day with one percent of queries getting skew-corrupted predictions at ten cents of loss each, that's a thousand dollars a day. Three hundred sixty-five thousand a year, recurring, until somebody removes the cause. Not a better model, a shared feature store so offline and online compute the same thing.
::eq[skew-loss]

A: So the development infrastructure is contracts, feature stores, versioning, CI/CD with parity tests. Then the release side, you don't just ship the model.

B: A release is more than a binary. Weights, feature contracts, drift behavior, feedback effects all ship together, so the candidate earns traffic in stages. Shadow first, it serves against live traffic without answering anyone. Then canary, a small real slice. Then blue-green, full traffic with an instant revert path. Each stage bounds the blast radius a different way.
::fig[release-ladder]

A: And rollback isn't a panic button, it's a procedure.

B: Runbooks, rollback drills, calibrated auto-triggers. The chapter is blunt that a rollback nobody drilled is a hope, not a control. And even the evidence between stages is subtle, conversions can arrive days after the prediction, so the attribution window is part of the test design. Novelty effects inflate early numbers too; users poke at the new thing, not the better thing.

A: Then monitoring, which is where the silent failure actually gets seen. What's in the detector kit?

B: Statistical, not binary. PSI for binned features, KS for continuous, Jensen-Shannon when you want symmetric and bounded. And here's the trap the chapter loves: sample size. The KS critical threshold shrinks roughly as one over root-n, so a monitor over millions of requests flags shifts far below practical significance. The alert threshold has to mix statistical and business significance or you drown in pages.
::eq[mde-sample]

A: Same square-root law on the A/B side, halve the effect you want to detect and the traffic quadruples.

B: Same math, different door. And one more bound people miss: detection is capped by labeled-outcome arrival, not traffic. A thousand labels at one per second is seventeen minutes. At a hundred a day it's ten days. Low-label domains need proxy signals, input drift, perplexity on live traffic, cohort stats, because the truth arrives too slowly to steer by.

A: Now the part I'd argue is the chapter's real instrument: the retraining decision. How often should you retrain, and the answer isn't a cadence, it's a cost curve.
::fig[retrain-clock]

B: It is. Staleness accrues as accuracy decays; each run restores it for a fixed cost. Total cost per unit time is the amortized run cost plus the staleness you ate over the interval. Minimize it and the optimum falls out at a square root: T-star equals the square root of two C-sub-r over Q-v-A-zero-delta.
::eq[retrain-interval]

A: Plug in the ranking service's numbers.

B: Five thousand dollars a run, a million queries a day, fifty cents per unit accuracy per query, decay of zero point two four percent a day, initial accuracy ninety-four percent. T-star comes out about three days. And here's the kicker, if your release path takes a week, the economics outrun the team. The fix isn't accepting staleness, it's shortening the update path.

A: So retraining is a pricing problem, not a schedule.

B: That's the whole framing. Scheduled is predictable but pays the run cost regardless; triggered pays only when needed but chases noise. The staleness model prices both, so you stop arguing calendars and start comparing costs.

A: Then the people side, incident response and governance. The chapter insists on diagnosis before remediation.

B: Because an alert names a symptom, not a cause. Drift, skew, degradation can all come from data, model, or infrastructure. Retrain on new data without tracing which term shifted and you re-learn the same broken feature. And governance is what makes the decision repeatable, who's on-call, what the runbook says, how the rollback drill went.

A: Maturity is scored, not vibes.

B: The ML test score turns readiness debates into criteria. And the investment logic is refreshingly cold: add the control whose prevented loss exceeds its cost, sized to how critical the model is. Five prevented incidents at fifty thousand each against fifty thousand of monitoring spend, a five-times benefit-cost. Monitoring pays for itself precisely when incidents cost more than watching.
::eq[monitoring-roi]

A: The case studies split the world in two, the ranking service versus a keyword spotter on a microcontroller.

B: Two opposite regimes. The ranking service drifts daily, labels arrive within hours, and its own rankings shape the clicks it trains on, label-rich and feedback-loopy. The spotter is the other pole: two hundred kilobyte INT8 model on a chip with four megabytes of flash, every radio transmission and flash write on a tiny energy budget, and after six months its detection rate sits four points below target. Power-bound, unreachable, and drifting silently anyway.

A: And the clinical case maps the same loop onto hypertension care, three coupled loops instead of one.

B: Patient-AI, clinician-AI, patient-clinician. Same closed-loop logic, but the failure modes now include alert fatigue and accountability, so the controls reshape. The point the chapter keeps making: the loop is portable, the instruments change.

A: Close it, back to the green dashboard.

B: The dashboards were telling the truth about the wrong question. The fix isn't a better health check; it's the loop, monitor statistically, decide by the staleness model, release in stages, diagnose before you remediate, and keep doing it forever because the world won't sit still. A model is a maintained claim, not a shipped artifact.
::fig[ops-loop]

A: Green dashboards measure the machine. The loop measures the claim. Next chapter: responsible engineering.
