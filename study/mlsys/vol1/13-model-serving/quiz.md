# Self-test: Model Serving

1. The serving inversion means the operating objective changes between training and serving. Which change does it describe?
   - A. From minimizing latency variance across a batch to maximizing parameter count per accelerator.
   - B. From static precomputation of all possible answers to dynamic evaluation of requests.
   - C. From maximizing hardware occupancy under a controlled schedule to meeting per-request deadlines under arrivals you do not control.
   - D. From reporting p99 tail latency under live load to reporting mean throughput per device under a fixed schedule.

2. A service targets 1,000 QPS with a 50 ms mean response time. Little's Law says the average in-flight population is:
   - A. 5 requests.
   - B. 50 requests.
   - C. 500 requests.
   - D. 2,000 requests.

3. Under the M/M/1 model, moving a service from 80% to 90% load changes average time in system by about:
   - A. About 10% more, since time in system grows linearly with load.
   - B. About 25% less, since a busier server drains its queue faster.
   - C. Nothing systematic: load changes the throughput a replica sustains, not the latency a request experiences.
   - D. It doubles, from 5× to 10× of service time, while buying ~11% more capacity.

4. A datasheet reports a batch-8 latency of 3.8 ms vs 3.5 ms at batch one. What does the batch-8 number leave out?
   - A. The formation delay: the queueing time spent waiting for eight requests to arrive before execution starts.
   - B. The weight-loading time for the model across the batch.
   - C. The postprocessing and serialization time needed to format eight responses for their clients.
   - D. The network round trip between client and gateway.

5. Two LLM serving stacks report identical total latency for a 750-token response. Why might they still feel completely different to a user?
   - A. Identical totals imply identical experience by definition.
   - B. They may differ in cold-start and model-load time, which dominates how fast the first request feels.
   - C. They may use different tokenizers, changing the token count.
   - D. They may differ in TTFT and TPOT: one streams a first token in 100 ms at reading speed while the other buffers for 10 s then emits instantly.

6. On an LLM serving replica, what resource bounds the number of concurrent long-context conversations?
   - A. Compute throughput, since each decode step is FLOP-bound and conversations serialize on the same accelerator.
   - B. KV-cache memory, which grows with each conversation's context.
   - C. Network bandwidth between gateway and replica.
   - D. CPU cores available for TLS termination and parsing.

7. A user request fans out in parallel to 25 leaf services, each at its p99 (1% chance of exceeding). What is the probability the user sees a response slower than the leaf p99? Give a percentage to one decimal.

8. Each replica serves 250 QPS (service rate μ). Peak traffic is 900 QPS. If the SLO requires running no hotter than 80% load, how many replicas are needed?

9. Explain to a product manager why buying exactly enough capacity for peak traffic still produces missed deadlines, and why the spare capacity is 'headroom', not 'waste'.

10. Explain why LLM serving adds session-affinity (sticky) routing when a stateless image service can spray requests across any healthy replica.

11. Traffic at a serving endpoint drops from 800 QPS to 40 QPS overnight. The dynamic batcher is configured with a large batch window tuned for peak. Overnight, p99 latency gets worse even though load fell. Why?
    - A. The replicas sit idle overnight and must recompile graphs per request.
    - B. Little's Law shrinks the resident population, which raises the tail.
    - C. Formation delay: at 40 QPS the large window takes ~b/40 s to fill, and every request queues behind that wait.
    - D. The tail-at-scale effect grows as fewer requests fan out across the same number of leaf services.

## Answer key

1. C. Training fills accelerators because idle hardware is wasted capital. Serving keeps headroom because arrivals are stochastic and queueing diverges near saturation; the objective becomes completed requests inside a deadline.

2. B. L = λW = 1,000 × 0.05 = 50. Buffers, worker threads and accelerator memory must sustain that resident population before any burst.

3. D. W = t/(1−ρ): 5× service time at ρ=0.8, 10× at ρ=0.9. The knee is why serving treats near-saturation as a hazard rather than an efficiency goal.

4. A. Batch latency counts execution only. At low arrival rates the wait to fill the window (~b/λ) can dwarf the execution saving; the throughput win is spent queueing.

5. D. Token streams split latency into time-to-first-token and time-per-output-token. The same sum decomposes into very different experiences; TTFT and TPOT must be reported separately.

6. B. Decode streams weights per token (bandwidth-bound), and each conversation's KV cache consumes accelerator memory proportional to context; memory, not compute, is the first constraint to run out.

7. P = 1 − (1 − 0.01)^25 = 1 − 0.99^25 ≈ 1 − 0.7778 = 0.222, so about 22.2% of user requests exceed the leaf p99. Fan-out converts a rare leaf tail into a common user tail.

8. At 80% load each replica carries 0.8 × 250 = 200 QPS, so 900/200 = 4.5 → 5 replicas. Provisioned at exactly 4 replicas the fleet runs at 900/1000 = 90%, where the M/M/1 knee already doubles latency vs 80%.

9. Arrivals are stochastic, not smooth. At 100% planned load any burst queues behind a full system and the queue has no drain rate: in the M/M/1 model time in system tends to infinity as ρ→1. Headroom is the deliberately idle capacity that absorbs spikes without violating the tail; like a spare lane on a bridge, it looks wasted on an average-load dashboard and is the only thing standing between a burst and a cascade of missed deadlines.

10. An LLM conversation carries state: a KV cache that grows with the context and lives in one replica's accelerator memory. Route the next turn to a different replica and the cache must be rebuilt or migrated, paying prefill cost again. An image request carries no such state, so any healthy replica serves it identically. Sticky routing trades load-balancing freedom for keeping each conversation on the replica that already holds its cache.

11. C. The window sized for peak waits too long when arrivals are sparse: the batch speedup is spent waiting to start. Traffic pattern, not just volume, decides the window; a timeout cap or smaller overnight window restores the SLO.
