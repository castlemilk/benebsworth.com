# hosts: Marcus | Iris

A: Welcome back. Today we are studying volume two, chapter ten: inference, or more honestly, serving at scale. Iris, the opening question is simple. A model trains once, then answers millions of requests a day. Why can serving cost more than training?

B: Because training is a lump sum and serving is a metered annuity. The book's illustrative seventy billion parameter deployment spends about two million dollars training and about eighteen million dollars serving in the first year. Exact assumptions aside, the shape is the point.

A: So the optimization target is not just faster inference.

B: Right. The target is admitted work completed inside a service objective at sustainable cost. Before the model even runs, the request pays authentication, validation, routing, queueing and scheduling. That is the serving tax.

A: Let's put the latency equation up.

::eq[serving-tax]

B: End to end latency is inference plus network plus serialization plus coordination plus queueing. If the non-model terms dominate, halving kernel time barely moves the user's p ninety nine.

A: That explains why capacity comparisons are slippery.

B: Exactly. Capacity is only meaningful at a fixed request mix and service objective. A chatty workload, a retrieval workload and a batch summarization workload do not stress the same bottleneck.

A: The chapter spends most of its energy on large language model serving. Why is that the hard case?

B: Because it combines variable prompt lengths, variable output lengths, interactive token deadlines and per-request memory state. That memory state is the KV cache. Each token leaves keys and values behind for future decode steps.

A: Here is the memory admission picture.

::fig[kv-admission]

B: In the book's long-context estimator, a seventy billion class GQA model on an eight H100 node leaves about five hundred twenty six gigabytes for KV after weights and reserve. Each one hundred twenty eight thousand token request costs about forty three gigabytes. Twelve such requests exhaust the pool.

A: Twelve. Not twelve hundred.

B: Twelve. And paged attention does not magically change that. Paging reduces fragmentation. It does not shrink the keys and values themselves.

A: So admission control is memory control.

B: Yes. The scheduler is not just counting requests. It is deciding how much future context the replica can afford to hold.

A: Where does batching fit?

B: Batching amortizes fixed serving cost across requests. But static batching creates padding when sequences finish at different times. If one row finishes after ten tokens while seven others run for one hundred, that row is idle for ninety positions. Across eight rows, the simplified waste is eleven point two five percent.

A: Continuous batching is the fix people usually name.

::fig[iteration-admission]

B: It is the mechanism, not a free win. At an iteration boundary, a finished sequence can be replaced by waiting work. But the replacement has to exist, its KV state has to fit, and prefill scheduling has to admit it without wrecking everyone else's token cadence.

A: That brings us to prefill and decode, which the chapter treats almost as two different machines.

B: They are. Prefill processes the whole prompt in parallel and is compute-oriented for long prompts. Decode emits one token per sequence per step and is bandwidth-oriented. They sit on opposite sides of the roofline story.

A: And optimizations are phase-specific.

B: Exactly. Tiled attention is mainly a prefill intervention. Weight quantization helps decode by shrinking bytes streamed. Speculative decoding targets decode. There is no generic speedup that erases the asymmetry.

A: What happens when a huge prompt arrives while many users are decoding?

B: If the worker runs the whole prefill in one piece, every active stream waits. Chunked prefill divides the prompt across iterations. It moves the cost rather than removing it, trading the long prompt's time to first token against the other streams' time between tokens.

A: And disaggregation goes further.

::fig[phase-lanes]

B: Yes. Give prefill and decode separate pools. Then each pool can be sized for its own bottleneck. But the KV cache built by prefill must cross to decode, so locality becomes a network transfer with a fixed term and a bytes-over-bandwidth term.

A: Let's look at that transfer equation.

::eq[kv-handoff]

B: The key judgment is whether independent scaling and reduced interference repay the queueing and handoff cost. It is an architecture decision, not a slogan.

A: Once a model is too large for one accelerator, sharding enters. Is that also a latency optimization?

B: Sometimes, but first it is a memory necessity. A seventy billion parameter FP16 checkpoint is one hundred forty gigabytes before KV and runtime state. It cannot fit on one eighty gigabyte H100. Two-way sharding is a floor. Whether wider sharding helps latency depends on communication and synchronization.

A: Then routing decides which replica gets the work.

B: And routing has to understand state. A stateless API can resend history and let any replica rebuild the cache. A session-cached platform saves repeated prefill but creates affinity, eviction and recovery problems. Sticky routing is an optimization for retained state, not a correctness requirement.

A: The tail-latency arithmetic was the part that surprised me.

::fig[fanout-tail]

B: It is brutal. If one hundred independent leaves each meet their own p ninety nine, meaning each is slow one percent of the time, then about sixty three percent of fanned-out requests meet at least one slow leaf.

A: Because the request waits for the slowest component.

B: Yes. To hold the assembled request at p ninety nine, each leaf has to be slow only about one hundredth of one percent of the time, roughly p ninety nine point nine nine.

A: So fewer shards, better routing and partial-deadline behavior are architectural tail levers.

B: Exactly. And then capacity control completes the system. Autoscaling is a race between demand and readiness. The book's large-replica cold start is minutes, not seconds. Reactive scaling starts after the queue has formed. Predictive scaling can help, but only within forecast error and provisioning uncertainty.

A: So the big idea is not “serve faster”.

B: No. It is admit deliberately. Know the workload, know which phase and resource bind, account for memory before accepting work, route with state in mind, and design the degradation path before the overload arrives.

A: That is a good place to close. Next we will test whether those ideas survive the quiz.
