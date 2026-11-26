# Serving at Scale — self-test

1. A serving team halves model execution time but sees little improvement in end-to-end p99. Which explanation best follows from the serving-tax model?
   - A. The measurement must be wrong because model time is the whole request budget
   - B. Queueing, ingress, scheduling or egress dominate the end-to-end budget
   - C. Decode must now be compute-bound, so the accelerator roofline moved
   - D. The model became memory-resident, removing all fixed request overheads

2. Why can serving dominate training cost for a successful model even when each request is inexpensive?
   - A. Training cost is always small compared with any cloud expense
   - B. Serving hardware is intrinsically less efficient than training hardware regardless of workload or use
   - C. Requests are unpredictable, so cost accounting is impossible
   - D. Training is paid once per version while serving cost recurs with traffic and deployment duration

3. Two teams disagree about which replica fleet has more capacity. What must be fixed before their measurements are comparable?
   - A. Only the accelerator SKU, because identical hardware makes every workload equivalent
   - B. The model precision and nothing else, since memory footprint determines all serving behavior
   - C. Request mix and service-level objective, along with the measurement boundary
   - D. The number of replicas, regardless of offered load

4. In a fixed-width static batch of eight, one sequence finishes after 10 tokens while the other seven need 100 tokens. Under the chapter’s simplified model, why is 11.25 percent of the batch compute attributed to waste?
   - A. The finished sequence idles for 90 of 100 positions, one eighth of the batch width
   - B. All eight sequences idle for exactly ten percent of their positions regardless of their output lengths
   - C. The scheduler reserves eleven percent of memory for batch metadata
   - D. The longest sequence consumes an extra 11.25 percent of KV cache

5. Continuous batching can recover static-batch padding only when which conditions cooperate?
   - A. The accelerator has spare compute units, because padding is a compute-shape problem only
   - B. Waiting requests exist, KV admission permits them, and prefill scheduling can place them
   - C. All responses have equal output length, since equal length maximizes replacement opportunities
   - D. The router uses round-robin assignment across replicas

6. Why does PagedAttention not raise the fundamental twelve-request 128K-context admission limit by itself?
   - A. Paging cannot be used with grouped-query attention because paged blocks require full attention heads
   - B. Paging increases bytes per token because blocks require metadata
   - C. Paging reduces fragmentation but does not shrink the keys and values each token stores
   - D. Paging applies only to model weights, not activations

7. Why do tiled IO-aware attention and low-bit weight quantization tend to help different phases?
   - A. Long-prompt prefill forms large parallel attention work, while decode repeatedly streams weights and KV bytes
   - B. Prefill never uses attention, while decode never uses model weights, so the phases have identical resource demands
   - C. Quantization changes only the API contract, and tiling changes only routing
   - D. Both techniques help only the scheduling layer, because attention shape and memory traffic are irrelevant to phase cost

8. What new cost does prefill-decode disaggregation introduce even when it removes interference?
   - A. A second training run for the decode pool, because disaggregated workers must learn a separate output distribution
   - B. A fixed network/queueing term plus transfer time proportional to the KV payload
   - C. A requirement to abandon continuous batching
   - D. Loss of the first token because prefill no longer runs, forcing decode workers to reconstruct the prompt themselves

9. A request fans out to 100 independent leaves. Each leaf is slow one percent of the time. About what fraction of requests encounter at least one slow leaf?
   - A. One percent, because leaf probabilities do not compose even when every leaf is independently slow
   - B. Ten percent, because the probabilities average across leaves
   - C. Sixty-three percent, because the request waits for the slowest leaf
   - D. Ninety-nine percent, because the leaf percentiles add directly across every independent backend in the fan-out

10. A serving node has 480 GB of memory available for KV after weights and runtime reserve. Each admitted 128K-token request requires 42.9 GB of KV state. Ignoring fragmentation, how many such requests can the node admit, and how much of the KV pool remains unused?

11. A request fans out to 100 independent leaves. Each leaf is slow 0.5 percent of the time. What fraction of requests encounter at least one slow leaf?

12. Your service expects a diurnal traffic ramp and a large-model replica takes several minutes to become ready. Design the scaling and admission policy. Explain what predictive scaling can and cannot guarantee, and how you would measure whether the policy worked.

## Answer key

1. B. The serving tax treats non-model components as part of the same latency budget. A kernel improvement helps only the component it shrinks; if queueing or routing dominates, end-to-end tail latency barely moves.

2. D. The lifetime expression multiplies unit serving cost by duration and served query rate. High volume makes small recurring costs large even when the individual request is cheap.

3. C. Capacity is not a universal throughput number. It depends on the requests being served and the deadline they must meet, and the cost or latency boundary must count the same components.

4. A. The completed row contributes no useful work for 90 of 100 steps, so its waste is 0.9 batch-row equivalents. Dividing by eight rows gives 0.1125, or 11.25 percent.

5. B. Iteration-level admission is necessary but not sufficient. Replacement work must exist, its KV state must fit, and long-prefill scheduling must not prevent timely insertion.

6. C. Paged allocation recovers memory lost to unused reservations and gaps. The 42.9 GB per 128K request is the tensor payload implied by the per-token formula, so another mechanism must reduce representation, context or placement cost.

7. A. The phase asymmetry comes from arithmetic intensity. Prefill processes many prompt tokens in parallel; decode advances one token per sequence and repeatedly streams memory.

8. B. The cache built by prefill must cross to decode workers. The handoff is modeled as a fixed network term plus bytes divided by effective bandwidth, alongside queueing at each pool.

9. C. The probability is 1-(1-0.01)^100, about 0.634. This is why a request-level p99 target forces much stricter leaf-level tails.

10. floor(480 / 42.9) = floor(11.19) = 11 requests. The unused pool is 480 - 11 x 42.9 = 480 - 471.9 = 8.1 GB. Paging can reduce allocation gaps, but it cannot admit a twelfth request whose tensor payload does not fit.

11. P(at least one slow leaf) = 1 - (1 - 0.005)^100 = 1 - 0.995^100 ≈ 0.394, or 39.4 percent. The leaf probability is small, but the request waits for the maximum across all 100 leaves.

12. A strong answer separates forecasting, readiness and overload. Predictive scaling uses the demand forecast to start provisioning early enough that the high percentile of cold start fits before the ramp; it cannot guarantee demand, provisioning time or capacity availability. Reactive correction remains necessary. Admission should protect the SLO when readiness lags: queue within explicit budgets, shed or degrade lower-priority work, and avoid admitting requests whose KV state cannot fit. Measure forecast error, time-to-ready distribution, admitted-versus-offered load, queueing delay, cold-start overlap with ramps, SLO goodput and replica-hours spent warming or idling. Success is not merely a higher replica count; it is more admitted work inside deadline at acceptable capacity cost.

    A strong answer separates forecasting, readiness and overload. Predictive scaling uses the demand forecast to start provisioning early enough that the high percentile of cold start fits before the ramp; it cannot guarantee demand, provisioning time or capacity availability. Reactive correction remains necessary. Admission should protect the SLO when readiness lags: queue within explicit budgets, shed or degrade lower-priority work, and avoid admitting requests whose KV state cannot fit. Measure forecast error, time-to-ready distribution, admitted-versus-offered load, queueing delay, cold-start overlap with ramps, SLO goodput and replica-hours spent warming or idling. Success is not merely a higher replica count; it is more admitted work inside deadline at acceptable capacity cost.
