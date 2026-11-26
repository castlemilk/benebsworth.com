# hosts: Marcus | Iris

A: I'm Marcus, and this is Iris. Today's chapter opens with a planning puzzle. Your image service answers a request in three and a half milliseconds at batch one. Traffic averages eight hundred queries per second and peaks at a thousand. Each replica sustains two eighty-five. How many replicas do you buy?
::fig[serving-decision-map]

B: The naive answer is four : a thousand divided by two eighty-five is three and a half, round up. That answer provisions for average load and misses the whole point of the chapter. Serving is a different optimization than everything we have studied so far.

A: Different how? A forward pass is a forward pass.
::fig[arrival-to-answer]

B: The compute is the same; the scheduler is no longer yours. In training you decide when work arrives, so you fill every accelerator; idle hardware is wasted capital. In serving, requests arrive whenever users feel like it, and each one carries a deadline. The book calls this the serving inversion. The objective flips from throughput to completed requests inside a service-level objective.

A: And that changes what efficient means.

B: Completely. Fleet load stops being the goal and becomes the hazard. Headroom, capacity you deliberately leave idle, becomes the design parameter, because the next arrival queues behind whatever is already in the system. A prediction that lands after the client's deadline is worthless no matter how cheap it was to compute.

A: The chapter also splits workloads into static and dynamic. Walk me through that.

B: Static inference answers a fixed set of inputs once and stores the results, like a photo library preclassified overnight. You are buying storage for zero serving latency. Dynamic inference must evaluate arbitrary inputs live, under stochastic concurrent traffic, and pays queueing, scheduling and energy per request. Production systems usually tier the two.

A: Inside the server, the request travels more stages than the model.

B: Seven of them in the book's walkthrough: network ingress and TLS, protocol deserialization, preprocessing, the dynamic batcher, accelerator execution, postprocessing, and response dispatch. The forward pass is one stage among serial ones; and each stage has its own queue.

A: The chapter's favorite overhead example is absurdly small and absurdly large at once.

B: Forty-five microseconds. Deserializing a text payload instead of a binary one costs about fifty minus five microseconds per request. At ten thousand requests per second that is forty-five hundredths of a second of CPU burned every wall-clock second; nearly half a core, gone to serialization format. They call it the killer microseconds problem: per-request overhead is a capacity line item, not a detail.

A: Now the queueing theory. Little's Law first.
::eq[littles-law]

B: L equals lambda W. The average number of requests inside the system equals the arrival rate times the mean time each request spends there. At a thousand queries per second and a fifty millisecond mean response time, the service holds about fifty requests at any moment. That number sizes your buffers, your worker threads, and the slice of accelerator memory the resident population needs, before you have even thought about bursts.
::fig[queue-lanes]

A: And then the equation that explains why just-enough-replicas fails: the M/M/1 model.
::eq[mm1-wait]

B: With Poisson arrivals and exponential service, average time in system is the service time divided by one minus the load fraction. At half load you pay twice the service time. At eighty percent, five times. At ninety, ten times. At ninety-five, twenty times. For our three and a half millisecond service that is seven point one milliseconds at fifty percent load, and seventy point six at ninety-five percent.
::fig[headroom-knee]

A: So going from eighty to ninety percent buys about eleven percent more capacity and doubles the latency.

B: That is the knee, and it is the whole argument for headroom. Serving systems deliberately run left of it. Which is why four replicas for the peak is wrong: four replicas at a thousand queries per second run at eighty-eight percent load, right on the steep part of the curve, while five replicas run at seventy percent, where the knee has not started to bite.

A: The tail gets worse in a specific way at scale: fan-out.
::eq[fan-out-tail]

B: Right. One user request might fan out to fifty leaf services in parallel, and the user waits on the slowest of them. Even if every leaf sits at its p99; a one-in-a-hundred chance of being slow, the probability at least one leaf is slow is one minus zero point nine nine to the fiftieth: about thirty-nine percent. A rare leaf tail becomes a common user tail. That is why tail-tolerant tricks like hedged requests and straggler-aware routing matter more at scale than shaving another millisecond off the median.

A: Switching to throughput: batching is the classic serving trick. What does it actually buy?
::fig[formation-window]

B: It amortizes the per-inference fixed cost. Weight streaming, kernel launch, memory setup: at batch one you pay them per request; a batch pays them once. The book's example: ResNet-50 at three and a half milliseconds batch-one takes thirty-five seconds to classify ten thousand photos one at a time. A compiled INT8 engine at large batch sustains about eighty-nine thousand five hundred images per second, so the library takes about a tenth of a second. Three hundred twenty times faster.

A: But the batch-8 latency they quote hides something.
::eq[formation-delay]

B: Formation delay. The three point eight millisecond batch-8 number is execution only; it omits the time the server spent waiting for eight requests to arrive. Roughly b over lambda: at ten queries per second, filling a batch of sixteen takes about a second and a half of pure queueing before anything executes. The batch speedup is spent waiting to start.

A: So the batch window is a bet on traffic staying high.

B: Exactly, and the traffic pattern decides the window. Poisson arrivals suit short dynamic windows; correlated streams tolerate bigger ones; a single user may not batch at all. And on cost; the book's comparison found a batch-8 option that shaved latency from three point eight to three point five milliseconds while multiplying hardware cost seven and a half times. The question is never which number is bigger: it is whether the speedup is worth its cost increase.

A: The back half of the chapter is LLM serving, which reframes all of this.
::eq[decode-floor]

B: Two reframings. First, latency splits: time to first token measures responsiveness, time per output token measures sustained delivery. Same total, completely different feel. Second, decode is bandwidth-bound per token: each generated token streams the whole weight set once. GPT-2 XL in sixteen-bit is about three gigabytes, roughly nine-tenths of a millisecond per token on the reference H100. That is the floor no scheduler can beat.

A: And the concurrency bound moves too, from compute to KV cache.

B: Each conversation's cache grows with its context and lives in accelerator memory, so memory, not floating-point throughput, bounds how many conversations a replica can hold. That is also why LLM serving needs session affinity. Route the next turn to a replica without the cache and you pay prefill again. Continuous batching keeps the batch full as sequences finish at different lengths: the throughput trick that made LLM serving economical.

A: Close it out: back to the planning puzzle. Five replicas or four?
::fig[serving-decision-map]

B: Five, and here is the composition: Little's Law sizes the population you must hold. The knee says run left of roughly eighty percent, so plan each replica at two hundred effective queries per second: nine hundred peak divided by two hundred is four and a half, round up to five. Then the batch window, the cold-start budget, the KV memory and the formation delay each get their own line in the plan. That is the chapter's real thesis: the model is one term of the request, and every other term has its own number.

A: Load is the hazard, headroom is the plan, and the tail is the product. Next chapter: ML operations.
