# hosts: Marcus | Iris

A: Today we are studying volume two, chapter thirteen: security and privacy. I'm Marcus, and with me is Iris. The chapter opens with a claim that sounds backwards: your dashboards can be green while the building burns. Why?

B: Because security and privacy fail silently. Nothing in throughput, latency or accuracy moves when an attacker extracts your model or a poisoned batch enters training. The signal you watch is not the signal that breaks.

A: And the reason the usual perimeter does not help?

B: ML systems have an algorithmic attack surface. Properly authenticated requests carrying valid inputs still leak, because the model itself is the asset and the response channel is the exfiltration path. mTLS proves who is calling; it says nothing about what the call teaches them.

A: The chapter sorts this into two different problems. Walk me through the split.

B: Security asks whether an adversary can make the system do something it should not: evasion, poisoning, theft of the artifact. Privacy asks what the system's own outputs reveal about the people in the data. An adversarial audio clip that hides a distress call is a security failure. Inferring whether one executive was in the training set is a privacy failure. Different threat models, different controls.

A: The breach section makes this concrete with four cases. Strava first.

B: An aggregated heatmap of athlete activity exposed military-base routines. Dense regions hid people in the crowd; sparse regions kept enough structure to single them out. Aggregation is not privacy. It protects only when you state the protected unit and bound the release.

A: Then Stuxnet, which is the supply-chain lesson.

B: Stuxnet modified centrifuge control parameters while reporting normal telemetry to the operators. The ML analog: whoever controls the pipeline, the checkpoint or the update channel can steer the model while every dashboard stays clean. Silent manipulation is the signature.

A: Jeep Cherokee and Mirai round out the edge cases.

B: Jeep showed an infotainment interface could reach safety-critical actuators, which is the fleet lesson: shared accelerators and shared caches are interfaces too. Mirai showed compromised endpoints become weapons, which is exactly the federated-learning threat: one malicious client tilts the weighted aggregate.

A: So the method is threat modeling before defense. What does the chapter say a threat model has to name?

B: The asset, the adversary's access, the auxiliary knowledge they bring, and the lifecycle stage where the boundary fails. Access, knowledge and timing classify every attack. A black-box query attacker knows the task and output format but nothing else; that is enough for extraction.

::fig[attack-surface]

A: The figure maps five lifecycle gates. Give me the shape of it.

B: Ingestion faces poisoning, training faces update attacks, the registry faces artifact theft, serving faces extraction and injection, and the edge faces compromised endpoints. Each stage has a different first control, and no availability or accuracy signal moves when one succeeds.

A: Now the money question: model theft. The chapter prices it in queries.

B: Two thefts, two budgets. Exact artifact theft needs a storage or registry compromise and falls to encryption, signing and access control. Behavioral theft needs only query access and is bounded by a cumulative per-principal budget plus the output contract.

::fig[extraction-budget]

A: How cheap is the behavioral version really?

B: The book's OpenAI table: recovering ada's output projection took under two million queries for about one dollar of spend; babbage under four million for about two dollars; the instruct models under forty million for hundreds to thousands. Extraction is cheap relative to training, so the defense question is not "can it be stolen" but "what does the thief's bill look like versus ours".

::eq[extraction-economics]

A: And the break-even?

B: With a hundred million queries needed and five million dollars of training cost, the break-even price is five cents per query. Pay-as-you-go pricing at or above that makes the full extraction set cost about what training did. A lifetime per-principal budget bills the same set the same way.

::eq[output-shaping]

A: So what actually shapes the bill?

B: Four levers: output precision, query quotas, pricing and behavioral monitoring. Rounding ImageNet's thousand-class softmax from six decimals to two removes about thirteen point three bits per class and keeps about six point seven. Returning only the top five classes eliminates over ninety-nine percent of the distribution entries. Neither is a privacy guarantee; both raise the query cost of a fixed-fidelity surrogate.

A: The ResNet scenario prices the regimes end to end.

B: Training costs about five thousand dollars; a ninety-percent-fidelity surrogate needs about five million queries. On a free tier of a hundred queries a day the attacker needs about two hundred days; pay-as-you-go makes the set cost about the training bill; and a lifetime budget allowance below five million lands within five percent of it.

A: Monitoring adds the behavioral layer.

B: A KL-divergence detector compares an account's query distribution to the population, and an adaptive quota multiplies the base limit by e to the minus gamma times the anomaly score. An anomaly score of zero point eight at sensitivity one keeps about forty-five percent of the base quota. The score drives a response policy; it is not proof of attack.

A: Now the authorized-caller leaks. Three escalating kinds.

B: Membership inference returns one bit: was this record in training. Model inversion reconstructs class properties or representative inputs from confidence scores. Memorization returns verbatim records — the diffusion example reproduced a training photo almost exactly, and the GPT-2 extraction confirmed six hundred four unique memorized examples from six hundred thousand generations.

A: And the relationship between auditing and guaranteeing?

B: An empirical audit is a lower bound on leakage; differential privacy is the upper bound. A shadow-model audit measures what one attack under stated access assumptions could extract. A stronger attack, released parameters or auxiliary information could still succeed. The gap between audit result and accounted bound is the honest uncertainty.

::eq[mia-dp-ceiling]

A: Poisoning next. Why is it a bilevel problem?

B: Because the attacker optimizes their objective subject to the defender's training procedure: pick poisoned inputs that maximize attack success after the model trains on them. A few hundred poisoned examples can plant a backdoor while validation accuracy stays flat. Retraining does not cleanse poison if the compromised data or checkpoint is reused.

::eq[poisoning-bilevel]

A: Inside the fleet the boundary moves again. The mean gradient's breakdown point is zero.

B: One compromised worker contributes to every replica's update, and an unbounded malicious gradient corrupts the mean no matter how many honest workers voted. Robust rules like Krum, trimmed mean and coordinate-wise median restore a positive breakdown point, at a traffic price.

::eq[robust-agg-traffic]

A: Spell out the price.

B: A gather-based median receives sixty-three peer gradients per worker at sixty-four workers; ring AllReduce moves about twice the gradient size. That is roughly thirty-two times the per-worker traffic, landing in the CommunicationTime term of the fleet law. On the chapter's reference cluster, one thousand twenty-four GPUs moving three hundred fifty gigabytes of gradients per step, the multiplier is expensive in dollars, not just milliseconds.

A: And RDMA?

B: RDMA moves bytes; it does not encrypt them. Plaintext collective traffic is observable to anyone who can reach the links, switches or endpoints. Line-rate encryption halves effective bandwidth on bandwidth-bound collectives, so the confidentiality control spends the same axis it protects.

A: Shared accelerators leak through state too.

B: A shared prefix cache is a cross-tenant timing channel: a cache hit returns the first token measurably sooner, so a probing tenant learns that a prefix was recently processed. Per-tenant cache scoping removes the reuse path at the price of hit rate. MPS gives address spaces without fault isolation, and MIG partitions hardware at about fifteen percent throughput cost in the matched-budget scenario.

A: Hardware is four decisions, then defenses.

B: Root of trust, measured boot, attestation, key custody. Meltdown and Spectre show transient execution can leave cache effects after architectural results are discarded, so enclave boundaries need hardware support, not software promises. Laser fault injection skips the guard on ReLU's zeroing block; power analysis collapses a password search from two hundred fifty-six to the fifth down to a handful of traces.

::fig[defense-stack]

A: The defense stack has four tiers.

B: Hardware roots prove what is genuine; platform controls bound what runs beside what; model-level shaping bounds what responses teach; data-level privacy bounds what the release reveals. Each tier spends a different axis of the fleet law, and a gap in any tier is a gap in the stack.

A: Finally, differential privacy as an account. How does DP-SGD actually spend the budget?

B: Three per-step operations: clip each sample's gradient to an l2 bound, add Gaussian noise scaled to sensitivity over epsilon, and take the averaged step. Querying the fixed trained model in production costs nothing further, because post-processing never touches protected data again.

A: And composition across thousands of steps?

B: Basic composition just sums the per-step epsilons, which is pessimistic. The accountant is mechanism-specific: Renyi DP or the moments accountant tracks the actual noise and lands far below the naive sum.

::eq[composition-basic]

A: Where does the Gaussian scale come from?

B: Sigma equals the l2 sensitivity times the square root of two times the natural log of one point two five over delta, all divided by epsilon. Tighter clipping bounds sensitivity, which is why the clip norm and the noise scale are the two knobs that trade utility against privacy.

::eq[gaussian-sigma]

A: And the accountant itself?

B: The moments accountant accumulates the log-moment generating function of the privacy loss across steps, then converts to an (epsilon, delta) pair by a tail bound. It is what makes a thousand-step run publishable at all.

::eq[moments-accountant]

A: How does Renyi DP tighten it further?

B: Renyi divergence of order alpha gives a family of bounds; converting back to approximate DP and optimizing over alpha yields the tightest published accountant for subsampled DP-SGD. The bound is a function of the mechanism, not a universal ranking.

::eq[rdp-bound]

A: And the figure?

B: Ten releases at epsilon equals one each accumulate to a basic bound of ten. The accountant tightens below the naive sum, and post-processing a fixed release adds nothing because it never touches protected data again.

::fig[privacy-budget-account]

A: Where does the accuracy cost land?

B: Task-dependent, not a property of epsilon alone. MNIST stays within about eight points at single-digit epsilon; CIFAR-10 trained from scratch at epsilon eight sits fourteen to twenty-two points below baseline in the published results.

A: Close with the fallacies.

B: Security through obscurity fails because black-box queries reveal behavior and adversarial examples transfer. "More clean data washes out poison" is false for targeted triggers. Secure aggregation hides individual updates but not the aggregate. And a rate limit is a speed bump, not a wall: only the lifetime budget caps the total.

A: The takeaway?

B: Write the threat model before the defense. Name the lifecycle gate, the access level, the auxiliary knowledge and the budget axis each control spends. Security and privacy are different problems with different proofs, and the fleet law prices every control in the same currency: capacity.
