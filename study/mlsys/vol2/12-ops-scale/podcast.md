# hosts: Marcus | Iris

A: Today we are studying volume two, chapter twelve: operations at scale. Marcus, the chapter opens with a vignette. Five engineers run one recommendation model, then the org grows to hundreds. Why do the same MLOps habits that worked at five stop working at five hundred?

B: Because the unit of work changes. One model is a project. A hundred models form a system of systems, and the operational object stops being the model and becomes the dependency graph.

A: So what breaks first?

B: Coupling. Shared features, shared pipelines, contested capacity and independent alerts. The book's sketch has monitoring growing roughly linearly with model count, deployment coordination near N log N, and dependency conflicts near N squared over two, since every pair of models is a possible conflict.

A: And the crossing point?

B: In the book's illustrative sketch, repeated coordination work outgrows a team around fifty models. That is a scenario, not a threshold. The transferable rule is that the platform decision is economic: build the control plane when recovered capacity exceeds its full cost.

A: The multi-tenant example makes that concrete. Same active workload, two ways to provision it.

B: Thirty GPU-equivalents of active work needs one hundred dedicated GPUs at thirty percent occupancy, or about forty-three shared GPUs at seventy percent. On a one-point-seven-five million dollar budget that is a fifty-seven percent saving, and the same money buys seventy GPU-equivalents of active work instead of thirty. It needs headroom for coincident peaks and isolation, but statistical multiplexing is an infrastructure multiplier.

A: Now the platform has to earn that keep. How is the case made?

B: A benefit-cost ratio: model count times hours saved per model-month times loaded engineer cost, divided by total platform cost. One is break-even.

::eq[platform-roi]

A: And the chapter's numbers?

B: Fifty models times forty saved hours per month times twelve months times about a hundred fifty dollars an hour gives a ratio of one point two five. The twenty-model variant gives zero point five, a loss. The ratio is linear in model count. But recovered engineering time is capacity value, not cash: the saved hours have to be productively redeployed.

A: Technical debt is the other side of the ledger.

B: Four categories: data debt from unversioned inputs, configuration debt from duplicated settings, model debt from undeclared consumers, infrastructure debt from brittle pipelines. Each scores impact times frequency over resolution cost. In the forty-model audit, configuration scores four point five and pays back in about eight and a half months; deploy automation pays back in about four weeks.

A: Next, the registry. What makes it more than a phone book?

B: It is the system's memory of who depends on whom: pinned artifacts plus lineage, metadata, ownership, access control. When an embedding bumps a version, the registry traverses recorded edges into an impact set.

::fig[impact-set]

A: Walk me through it.

B: Retrieval, three rankers and the ensemble must all re-evaluate before promotion proceeds: traverse, re-evaluate, block until pass, roll out compatible states with validated rollback. The trap is the unrecorded edge: a fraud model consumes the same embeddings but was never registered, so nothing flags it.

A: Ensembles have their own trap.

B: Components interact. A ranker retrained during an upstream bug learns to discount the semantic score; fixing upstream then degrades end-to-end quality. Component metrics can improve while the ensemble regresses, so the contract must measure the composed system.

A: Features next. What is the training-serving gap really?

B: A correctness problem disguised as plumbing. The invariant is that training and serving transforms agree on the same raw input. Freshness is per-feature: demographics get days, last-action features get seconds, each with its own materialization path feeding one offline store and one online store.

::eq[freshness-latency]

A: And point-in-time correctness prevents?

B: Time-travel leakage. In the book's noon example, a point-in-time join sees four clicks while a naive midnight-batch join sees ten, inflating today's count two and a half times. The join uses availability time, not event time. And the storage arithmetic is brutal: a hundred million users, a thousand features, hourly snapshots for a year is about twenty-eight petabytes, three quarters metadata, which is why stores keep deltas.

A: Releases. Deploy versus contract?

B: Five evidence planes bind to one versioned artifact: offline behavior, system performance, responsibility and safety, online experiment, recovery and audit. Promotion needs every required sign-off on the same candidate; an invalidated plane sends it back to its owning gate.

::fig[evaluation-contract]

A: The warning example?

B: A ranking model passes every gate, then a schema change imputes a missing feature as zero for eight percent of queries and conversion drops three point two percent for forty-eight hours. The gates checked the model; nothing checked the feature contract end to end.

A: How does traffic actually move?

B: Shadow first, then interleaving for ranking experiments, which Netflix reports needs over a hundred times fewer users, then A/B with real sample-size math.

::eq[ab-sample-size]

A: The worked cases?

B: A ten percent relative lift on a five percent click-through rate needs about thirty thousand samples per variant. Five percent relative on a one percent rate needs about six hundred twenty-one thousand. Small effects on rare events are calendar problems. SUTVA breaks too: spillover can halve the measured effect, which is why social products use cluster randomization or switchbacks.

A: And rollout risk is priced how?

::eq[rollout-risk]

B: Probability of regression times impact per exposed unit times exposed units. A five percent canary cuts blast radius twentyfold, and stage duration comes from the experiment: ten thousand samples at a million requests an hour takes about an hour at one percent traffic.

::eq[canary-duration]

A: Monitoring at fleet scale. What breaks?

B: Scale before insight. A ten-thousand-GPU cluster fails roughly every five hours; one metric per second per GPU is eight hundred sixty-four million observations a day. And independent alerts multiply: one hundred models, ten metrics, point-zero-zero-three false-positive rate gives about eight hundred sixty-four raw false crossings per day, over fourteen thousand at two sigma.

::eq[false-alert-rate]

A: Hence the pyramid.

B: Business, portfolio, model, infrastructure, each with its own owner. And fleet health is a vector: the chapter's example sits at zero point four, zero point six, one point three and zero point five on four budgets. The mean of zero point seven looks healthy while freshness is over budget. Healthy means the maximum stays at or below one.

::fig[slo-vector]

A: Incidents then.

B: Five runbook steps: detect impact, localize the dependency, bound blast radius, escalate by evidence, learn the gap. The worked chain: engagement down five percent, features three hours stale against a one-hour SLO, ten million queued events against ten thousand normal, broker disk at ninety-five percent. All recommendation models failing while vision stays green points at the shared feature pipeline, not fifty independent bugs.

A: Economics last. The invariant?

B: Occupancy. Platform economics asks if the control plane repays its fixed cost; fleet economics asks if shared hardware produces useful work; workload economics asks if one run earns its marginal cost. Every capacity decision reduces to sustained useful demand against fully loaded cost.

::fig[build-vs-buy]

A: The crossover?

B: For a thousand-and-twenty-four GPUs, owned cumulative cost crosses cloud rental near month twenty-six of thirty. Break-even occupancy is about forty-two point five percent for a single node and fifty-four at ten thousand GPUs, while dedicated fleets run fifteen to twenty and portfolios seventy to ninety.

A: And TCO has four planes.

::eq[ml-tco]

B: Training, inference, data, iteration. A startup spends about forty-seven thousand five hundred dollars a month where iteration is eighty-four percent; a fifty-model production fleet spends about nine hundred eighty thousand where inference is forty-one percent. The dominant term moves as the system matures.

A: Case studies close the loop.

B: Uber Michelangelo standardized the workflow and shared features. Meta FBLearner compiled typed operators into a DAG with dark-launch canaries. Netflix separates candidate generation from ranking. Vertex respects information-availability time. Spotify runs a paved road on TFX with lineage for regression tracing. Shared state, release evidence, resource policy and ownership are platform interfaces; domain teams keep workload intent and acceptance criteria.

A: Takeaway?

B: Three principles. Release evidence is valid only when bound to one versioned contract. Regression is priced by exposure as well as detection. And occupancy is the economic invariant under every capacity decision. Technical debt is measurable before it blocks: deploy lead time, incident frequency and toil share show the boundary failing while repair is still cheap.

A: Next chapter: security and privacy. See you then.
