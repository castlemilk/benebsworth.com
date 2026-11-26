# hosts: Marcus | Iris

A: Today we are studying volume two, chapter eleven: edge intelligence. Marcus, a phone can already run a model offline. Why is that not proof that the phone can learn offline?

B: Because inference is only the forward pass. Training has to carry gradients, optimizer state, saved activations and temporary workspace, then pay the energy, heat and latency cost of moving all that state.

A: So the opening mistake is collapsing two different machines into one.

B: Exactly. And the first design question is even earlier. Should learning happen on the device at all? Sometimes cloud fine tuning, retrieval, caching or feature based personalization solve the problem with no local gradient.

A: The architecture picture makes the boundary concrete.

::fig[boundary-map]

B: Local-only learning sends nothing. Centralized learning uploads raw observations. Federated learning downloads a shared model and sends updates. Moving from raw data to updates changes the exposure; it does not make the update harmless.

A: That distinction matters because privacy is often treated as automatic once data stays on device.

B: It is not. An update is still a function of private examples. Secure aggregation and differential privacy are separate mechanisms with separate guarantees.

A: Once local adaptation is justified, memory becomes the first hard test.

::fig[memory-amplifier]

B: The book's ten million parameter FP32 example has only forty megabytes of weights. Training adds forty megabytes of gradients, eighty megabytes of Adam state and, in the illustrative schedule, two hundred megabytes of saved activations. That is three hundred sixty megabytes, nine times the weights.

A: Meanwhile the relevant ceiling is not the eight gigabytes installed in the phone.

B: No. A background keyboard task may receive only two hundred to three hundred megabytes after the operating system and foreground application reserve memory. Even a fifty to one hundred megabyte update working set can consume a quarter of that allowance.

A: And memory capacity is not the same as memory time.

B: Right. One update step in the same example moves about eight hundred megabytes across DRAM, twenty times the weight bytes read by one inference. At a fifty one gigabyte per second mobile interface, that traffic alone costs about sixteen milliseconds before arithmetic.

A: Let's put the memory equation up.

::eq[peak-memory]

B: Peak memory is resident weights plus trainable state plus the maximum simultaneous activation and workspace footprint. It is a peak scheduling problem, not an average footprint problem.

A: Suppose the update fits. Can it run whenever the phone is charging?

B: Not automatically. Charging relaxes the energy constraint only. The admission envelope is conjunctive: predicted energy within allowance, sustained device power within the thermal limit, and foreground latency still inside deadline.

A: The battery example is blunt.

B: Four point five watts for thirty minutes is two point two five watt hours, fifteen percent of a fifteen watt hour battery. Charging may solve that number, but heat and user-facing contention remain.

A: Once the budget is explicit, the chapter's adaptation methods look less like a leaderboard and more like different levers.

::fig[lora-slimming]

B: Weight freezing removes gradients and optimizer state for frozen parameters, but not the frozen weights or every backward dependency. TinyTL targets activation memory. LoRA makes the trainable artifact tiny: a rank four update to a seven hundred sixty eight square matrix has six thousand one hundred forty four parameters instead of five hundred eighty nine thousand eight hundred twenty four.

A: But the small adapter does not make the whole backward problem vanish.

B: Exactly. The artifact shrinks; backward traversal, activations and adapter optimizer state still have to fit. The right question is which memory term dominates, not which method has the fashionable name.

A: Data is the other scarcity. Edge sensors generate millions of events, but labels are rare.

B: A thirty frame per second camera produces about two point six million frames a day, nearly all unlabeled. Few-shot learning, replay and compression allocate scarce supervision and memory differently. Continual adaptation adds drift: every individual update can fit while the sequence forgets validated behavior.

A: Federated learning enters when many devices need to share adaptation without centralizing raw data. Here is the averaging rule.

::eq[fedavg]

B: FedAvg weights client models by local example count. That sounds neutral, but it is a population policy. A client with ten times the examples receives ten times the influence. User weighting would make participants equal.

A: Local epochs create another non-obvious tradeoff.

B: More local work may reduce synchronization rounds, but each round gets longer, and non-IID clients drift toward different local optima. The book insists on measured time to target: rounds to target multiplied by observed round duration.

A: The uplink arithmetic also punctures a common claim.

B: Yes. A two point five megabyte compressed update can be eighty times smaller than a two hundred megabyte raw image upload in one round. After about eighty rounds, uploads alone reach the same volume, before downloads, retries and protocol traffic.

A: So federation moves the boundary rather than deleting the cost.

B: And it creates a population-selection system. The funnel is the key picture.

::fig[participation-funnel]

B: Deployed devices pass energy, thermal and latency admission. Some are selected. Some finish before the deadline. The aggregate learns only the survivors. Coverage ratio compares a cohort's share of completed updates with its share of the deployed fleet.

A: A ratio near one means proportional participation.

B: Right. Far below one means the shared model under-learns that cohort. This is why secure aggregation has a participation floor too: cryptographic recovery needs enough surviving clients, and a tiny aggregate can expose too much even if individual updates are hidden in transit.

A: Heterogeneity makes that worse.

B: Measured AI scores among post twenty twenty phone processors span roughly four hundredfold. Even recent flagship generations differ by about fourteenfold. One uniform training format trains the capable population and excludes everyone else.

A: Finally, release turns the whole thing into operations.

B: The artifact is no longer just a model binary. It is a versioned bundle: base model, adapters, schemas, resource rules, telemetry policy and rollback plan. Shadow models can flag behavioral change but cannot establish truth without labels. Fleet metrics need reporting coverage because unhealthy or constrained devices are often the least likely to report.

A: So the chapter's core is not "training, but smaller".

B: No. It is admit deliberately, shrink the update deliberately, measure time and population honestly, and operate rollback as a compatibility problem. Edge intelligence succeeds when those constraints shape the design from the start.

A: Next, the quiz will check whether we can apply that envelope rather than just repeat the vocabulary.
