---
title: "Model Serving — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html"
canonical_url: "https://benebsworth.com/study/vol1/13-model-serving/"
---

# Model Serving: Study Packet

Your image service serves 3.5 ms per request at batch one. Traffic averages 800 QPS and peaks at 1,000. Each replica sustains 285 QPS. How many replicas keep the p99 deadline, and why is 'just enough' the wrong answer?

*Working through [Model Serving](https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html), chapter 13 of Machine Learning Systems by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

Training optimizes throughput under a schedule you control; serving must answer every request inside a deadline under **arrivals you don't control** *(why it matters: The scheduler stops being yours. Traffic swings between daily peaks and troughs, so capacity provisioned for the average collapses at the peak, and capacity provisioned for the peak idles the rest of the day.)*. That inversion rewires the whole chapter: load stops being the goal and becomes **the hazard** *(why it matters: Online serving treats near-saturation as risk, not efficiency. Stochastic arrivals make queue lengths diverge nonlinearly as load approaches 100%: the tail explodes before the mean moves.)*. The image service below shows why: [headroom is the plan, not the slack](#fig-headroom-knee).

> **note: Reading the marks**
> Amber dotted marks carry why-it-matters cards. Hover, tap or tab to read them.

## Guided notes

### The Serving Inversion

- Training fills accelerators because idle hardware is wasted capital; serving keeps **headroom** *(why it matters: The spare capacity that absorbs a traffic spike without violating the tail. An idle replica is insurance, not waste.)* because an arrival at peak load queues behind everything in front of it.
- The workloads split two ways: **static inference** *(why it matters: Fixed input, computed once, read many times: precompute and store the answer, buying storage for zero query latency. A photo library preclassified overnight is static.)* trades storage for zero serving latency; dynamic inference answers arbitrary inputs live and pays queueing, scheduling and marginal energy per request.
- Deployment points span a spectrum (pooled cloud accelerators behind HTTP, shared multi-tenant serving, dedicated edge, on-device microcontrollers), each moving which term dominates: the network hop, the cold start, the scheduler, or the model itself.

### Inside the Server

- A request travels **more stages than the model** *(why it matters: Network ingress and TLS, protocol deserialization, preprocessing, the dynamic batcher, accelerator execution, postprocessing and response dispatch. The model is one stage among serial ones.)*; each stage adds latency and each adds a queue.
- Small per-request costs compound at request rates. **45 µs of parse time** *(why it matters: Deserializing a text payload instead of a binary one costs ~50 − 5 = 45 µs per request. At 10,000 QPS that is 0.45 s of CPU per wall-clock second: 45% of a core spent on serialization alone.)* per request is 45% of a core at 10k QPS: "killer microseconds."
- Protocol choices carry the same math: serialization format, connection reuse and compression trade CPU overhead against payload size and development cost.

![The model is one stage of the request](https://benebsworth.com/study/vol1/13-model-serving/diagrams/arrival-to-answer.svg)

*A request travels ingress, parse, preprocess, batch, execute, postprocess and dispatch — each stage adds latency and a queue. The forward pass is one term of the budget.*
### Queuing Theory: Why the Tail Moves First

- Little's Law sizes the in-flight population the server must hold: $L=\lambda W$. At 1,000 QPS and a 50 ms mean response time, the system holds **50 requests on average** *(why it matters: Buffers, threads and accelerator memory must sustain that population; underestimate it and arrivals drop or queue unboundedly.)*, before any burst.

**Eq undefined · Little's Law: resident population**
$$
L=\lambda W
$$

- The M/M/1 model prices headroom. With load factor $\rho=\lambda/\mu$, average time in system is service time divided by $1-\rho$: 2× at 50% load, 3.3× at 70%, 5× at 80%, 10× at 90%, 20× at 95%. **The knee is the lesson** *(why it matters: Moving from 80% to 90% load doubles latency again while adding only ~11% more useful capacity. Serving runs left of the knee on purpose.)*.

**Eq undefined · M/M/1 time in system**
$$
W_{\mathrm{sys}}=\frac{t_{\mathrm{service}}}{1-\rho}
$$

![Waiting near saturation](https://benebsworth.com/study/vol1/13-model-serving/diagrams/headroom-knee.svg)

*In a single-server M/M/1 queue, mean time in system divided by mean service time is 1/(1 − utilization). Moving from 80% to 90% load doubles the multiplier from 5× to 10×. The next five percentage points double it again. At a balanced peak of 1,000 requests/s and 285 requests/s per replica, four replicas run at 88% and five at 70%. Five is the candidate to load-test. Measure request p99 on peak traffic to verify the deadline.*
- At a mean service time of 3.5 ms, the corresponding mean response times are 7.0, 11.7, 17.5, 35.0 and 70.0 ms. A 100 ms **mean** target is reached at 96.5% load in this model. A p99 service objective needs its own tail estimate.
- Tail-tolerant design cuts the number of leaves a request waits on: fan-out across $n$ backends means the user sees the slowest leaf: **a p99 leaf still gives ~39% of users a worse-than-p99 experience at 50 leaves** *(why it matters: The probability that at least one of n parallel leaves exceeds its p99 latency is $1-(0.99)^n$: 1% at n=1, 9.6% at n=10, 39.5% at n=50. Fan-out converts leaf-tail probability into user-tail certainty.)*, so hedged requests, tied requests and straggler-aware routing matter more than shaving the median.

**Eq undefined · Fan-out converts leaf tail into user tail**
$$
P_{\mathrm{user}}(t>t_{99})=1-(1-p_{99})^{n}
$$

### Throughput: What Batching Buys and Costs

- Batching amortizes **the per-inference fixed cost** *(why it matters: Weight streaming, kernel launch and memory setup repeat per request at batch one. A batch pays them once. ResNet-50 at 3.5 ms batch-one takes 35 s for 10,000 photos; a compiled INT8 engine at large batch sustains ~89,500 images/s (about 0.11 s, ~320×).)*: the same weight read serves every item in the batch.
- The batch-8 latency omits **formation delay** *(why it matters: The wait for enough requests to fill the batch. At low arrival rates a large window adds seconds of queueing before execution even starts; the batch "speedup" is spent waiting to start.)*, the queueing time spent waiting for eight requests to arrive, which at low traffic can dwarf the execution saving.
- Per-request cost falls with batch size because **the fixed charge is divided** *(why it matters: Cost per request = fixed charge ÷ batch + marginal per-item work. The fixed term dominates at batch one; marginal work dominates as batch grows, which is why throughput saturates rather than scaling forever.)*: $c_{\mathrm{req}}=C_{\mathrm{fixed}}/b+c_{\mathrm{marg}}$.
- Traffic decides the window: Poisson arrivals suit dynamic batching with a short timeout; correlated or streaming arrivals suit larger windows; single-user traffic may not batch at all. The latency-throughput frontier is set by window × max batch × timeout, inside the latency budget.

![A batch window is spent waiting before it executes](https://benebsworth.com/study/vol1/13-model-serving/diagrams/formation-window.svg)

*Requests trickle in over the formation window; the batch latency everyone quotes starts only after the window fills. Early arrivals pay the whole formation delay.*
**Eq undefined · Formation delay of a batch window**
$$
t_{\mathrm{form}}\approx\frac{b}{\lambda}
$$

**Eq undefined · Batching divides the fixed charge**
$$
c_{\mathrm{req}}=\frac{C_{\mathrm{fixed}}}{b}+c_{\mathrm{marg}}
$$

### Inference Runtime and Cold Start

- The runtime is part of the result: operator coverage, graph compilation, quantization path and batching policy differ across runtimes, so **the same model is a different server** *(why it matters: A compiled INT8 engine at large batch delivered the ~320× over batch-one FP32 in the book's example; most of that is compilation and batching, not silicon.)* under a different stack.
- Cold start reappears at the replica level: weight transfer, runtime initialization, graph compilation and warmup each add to time-to-first-request, the same 14 GB / 25 GB/s bound Benchmarking measured, now multiplied across every replica that spins up.
- Multi-model serving adds swapping and memory pressure; **training-serving skew** *(why it matters: The served model must compute what training computed. Different preprocessing, feature code, or precision between the two pipelines silently changes predictions even when latency looks healthy.)* is the failure that shows up as accuracy regressions, not latency ones.

### LLM Serving

- Token generation is a stream, so latency splits: **TTFT and TPOT** *(why it matters: Time to first token measures responsiveness; time per output token measures sustained delivery. Two services with the same total latency feel completely different (30 s vs 7.5 s for 750 tokens at 25 vs 100 tokens/s).)* capture different user experiences.
- Decode is **bandwidth-bound per token** *(why it matters: Each generated token streams all weights once: GPT-2 XL's ~3 GB FP16 read takes ~0.9 ms on the reference H100. Longer contexts add KV traffic on top.)*, not compute-bound; per-token floor = bytes moved ÷ bandwidth.

**Eq undefined · Decode floor: bandwidth per token**
$$
t_{\mathrm{token}}\ge\frac{D_{\mathrm{weights}}}{B}
$$

- **Continuous batching** *(why it matters: Requests join and leave the batch at each decode step instead of waiting for a static batch to finish. The batch stays full across different response lengths: the throughput gain that made LLM serving economical.)* keeps the batch full as sequences finish at different lengths; PagedAttention and prefix caching manage the KV cache that bounds concurrent conversations.
- KV memory sets concurrency, not compute: each conversation's cache grows with context, and session-affinity (sticky) routing keeps a request on the replica holding its cache.

![Little's Law sizes the resident population](https://benebsworth.com/study/vol1/13-model-serving/diagrams/queue-lanes.svg)

*At 1,000 arrivals per second and a 50 ms mean time in system, ~50 requests live inside the service at once. Buffers, threads and accelerator memory are sized by that population.*
### Economics and the Case Study

- Cost per inference composes **precision, fleet load, replicas and runtime** *(why it matters: A cheaper unit cost can come from precision or a larger batch; the batch-8 saving of 3.8 vs 3.5 ms multiplied hardware cost 7.5× in the book's comparison. The question is whether the speedup is worth the cost increase, not which number is bigger.)*; the cheapest hardware per query isn't the cheapest per SLO-meeting query.
- Fan-out prices the tail in replicas: at 50 leaves a p99 leaf is a ~39% user tail, so meeting the SLO under width means more headroom per replica, not more median-shaving.


**Fan-out turns leaf tail into user tail**

| Leaves per user request (n) | Probability |
|---|---|
| 1 | 0.01 |
| 10 | 0.096 |
| 50 | 0.395 |
| 100 | 0.634 |

*When one user request waits on n parallel leaves each at p99, the user-level probability of a >p99 wait is 1 − 0.99ⁿ: ~10% at 10 leaves, ~39% at 50, ~63% at 100. Shaving the median cannot fix a tail built by width.*

- Capacity planning puts it together: the Llama 3 8B case reads token rate from bandwidth, concurrency from KV memory, replica count from peak traffic plus headroom, each constraint answered by a different measurement.

### Fallacies and Pitfalls

- **Mean latency as the service** *(why it matters: The p50 can clear the SLO while p99 breaches it; the user contract lives in the tail.)*.
- **Fleet load as the objective** *(why it matters: Near-saturation looks efficient on an occupancy dashboard and melts the tail in production; headroom is the design parameter.)*.
- **Batch latency as request latency** *(why it matters: The batch-8 number omits formation delay; the user waits for the window plus the execution.)*.
- **Isolated model time as request time** *(why it matters: Serialization, preprocessing, batching and dispatch share the request; the model is one stage.)*.
- **Static benchmark traffic as production traffic** *(why it matters: Poisson assumptions flatter the tail; correlated bursts arrive together.)*.

### Summary

- Serving inverts the optimization: per-request deadlines under uncontrolled arrivals replace throughput under a controlled schedule.
- Queueing theory is the planning tool: Little's Law sizes the in-flight population, the knee at high load prices headroom, and fan-out makes the tail of the slowest leaf the user's tail.
- Batching buys throughput by spending formation delay and memory; the traffic pattern decides how much window the budget can afford.
- Every stage and every constraint has its own number: serialization µs, cold-start seconds, KV bytes per token, decode-floor bandwidth; the model is one term of the request.

![The serving plan, end to end](https://benebsworth.com/study/vol1/13-model-serving/diagrams/serving-decision-map.svg)

*Traffic sets the resident population (Little's Law), utilization sets the tail (the knee), the window trades formation delay for batch throughput, and replicas plus headroom carry the peak.*
## The physics

| Quantity | Value | Use |
|---|---|---|
| Little's Law | $L=\lambda W$; 1,000 QPS × 50 ms = 50 in flight | Size buffers, threads and memory for the resident population. |
| M/M/1 time in system | $t/(1-\rho)$: 2× at 50%, 10× at 90%, 20× at 95% | The knee prices headroom; the tail moves before the mean. |
| Killer microseconds | 45 µs parse × 10k QPS = 0.45 s CPU per second | Per-request overhead is a capacity line item, not a detail. |
| Batch amortization | 35 s serial vs ~0.11 s at ~89,500 img/s (~320×) | Weights, launch and setup are paid once per batch. |
| Formation delay | ~$b/\lambda$ wait for a full batch | A batch window is spent queueing before executing. |
| Decode floor | bytes ÷ bandwidth; ~3 GB FP16 → ~0.9 ms/token | Per-token latency is set by memory bandwidth. |
| Fan-out tail | 50 leaves → user sees the slowest | Tail tolerance beats median tuning at scale. |
| Cost per inference | precision × load × replicas × runtime | Compare cost per SLO-meeting request, not per query. |

## Glossary

- **Serving inversion**: the shift from throughput-first scheduling to deadline-first scheduling under uncontrolled arrivals.
- **Headroom**: deliberately idle capacity held against traffic bursts; the design parameter of serving.
- **Little's Law**: $L=\lambda W$: average in-flight population equals arrival rate times mean time in system.
- **M/M/1 queue**: Poisson arrivals, exponential service, one server; its $t/(1-\rho)$ knee prices headroom.
- **SLO**: the percentile deadline a request may miss only rarely.
- **Tail latency**: the high-percentile end (p95/p99) of the latency distribution; the user-facing cost of queueing.
- **Formation delay**: time spent waiting for enough requests to fill a batch window.
- **Dynamic batching**: aggregating live requests up to a max batch or timeout.
- **TTFT / TPOT**: time to first token / time per output token.
- **Continuous batching**: admitting and releasing requests each decode step so the batch stays full across uneven lengths.
- **KV cache**: per-conversation stored attention state; sets concurrency on the accelerator.
- **Session affinity**: sticky routing that keeps a request on the replica holding its KV cache.
- **Training-serving skew**: prediction drift between the training and serving pipelines' preprocessing or precision.

## → Ben's world

- On the shared droplet, Little's Law is the queue-length check: measure arrival rate and mean time-in-system per service before assuming a slow p99 is the model; four tenants share the same box.
- In the LLM harness, report TTFT and TPOT separately per model, and record batch/window settings with the tok/s number; a rate without its window is a different benchmark.
- For Greenveil, the decode-floor math frames the capacity question: count concurrent sessions by KV memory, not by GPU occupancy.

## Open questions

- At what arrival burstiness does the M/M/1 estimate stop being conservative enough for the p99 plan?
- Which stage of a real Greenveil request (decode, model, or queue) owns the p99 today?
- Does the harness's published tok/s include formation delay at its stated concurrency?


---

## Key equations

**Eq undefined · Little's Law: resident population**

$$
L=\lambda W
$$

*Average in-flight requests equal arrival rate times mean time in system. At 1,000 QPS and 50 ms, the server must hold ~50 requests of buffers, threads and accelerator memory.*

**Eq undefined · M/M/1 time in system**

$$
W_{\mathrm{sys}}=\frac{t_{\mathrm{service}}}{1-\rho}
$$

*With Poisson arrivals and exponential service, average latency is service time divided by 1 − utilization: 2× at 50%, 10× at 90%, 20× at 95%. The knee prices headroom.*

**Eq undefined · Fan-out converts leaf tail into user tail**

$$
P_{\mathrm{user}}(t>t_{99})=1-(1-p_{99})^{n}
$$

*When one user request fans out to n parallel leaves, the user waits on the slowest. A p99 leaf still hands ~39% of users a >p99 experience at n=50.*

**Eq undefined · Formation delay of a batch window**

$$
t_{\mathrm{form}}\approx\frac{b}{\lambda}
$$

*Filling a batch of b requests takes roughly b/λ seconds at arrival rate λ — queueing time the published batch latency omits. At 10 QPS, batch-16 waits ~1.6 s before executing.*

**Eq undefined · Batching divides the fixed charge**

$$
c_{\mathrm{req}}=\frac{C_{\mathrm{fixed}}}{b}+c_{\mathrm{marg}}
$$

*Cost per request is the per-batch fixed work (weight streaming, launch, setup) divided by batch plus marginal per-item work. Fixed cost dominates at batch one; marginal work sets the floor.*

**Eq undefined · Decode floor: bandwidth per token**

$$
t_{\mathrm{token}}\ge\frac{D_{\mathrm{weights}}}{B}
$$

*Each generated token streams all weights once. GPT-2 XL's ~3 GB FP16 read takes ~0.9 ms on the reference H100 — token latency is set by memory bandwidth, not compute.*

## From the book

- [ResNet-50 latency budget](https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html) — Per-phase breakdown of a single serving request on the reference H100: host preprocessing alone takes longer than the modeled forward pass — the model is one stage of the request.
- [Blast radius of a shared serving failure](https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html) — One failed serving dependency fans out across every downstream request — the queueing and isolation argument for replicas and headroom.
- [Margin stack](https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html) — Serving margins layered per stage: queueing, execution and dispatch each carry their own headroom before the request meets the SLO.
- [Serving margin study I](https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html) — Margin study from the chapter's margins — where utilization, queuing and tail headroom intersect.
- [Serving margin study II](https://mlsysbook.ai/vol1/13_model_serving/13_model_serving.html) — Margin study from the chapter's margins — batching and runtime trade-offs in the serving loop.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

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

## Audio overview

[Listen to the Marcus & Iris read-along (~8 min)](https://benebsworth.com/study-audio/vol1/13-model-serving.m4a) — a generated podcast walking this packet's argument.
