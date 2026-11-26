---
openingQuestion: A model trains once and then answers millions of requests a day. Why can the first year of serving cost more than the training run — and why does simply buying a faster decode kernel leave the system problem untouched?
---

# Serving at Scale: Study Packet
*Machine Learning Systems, vol. 2, chapter 10, Inference (mlsysbook.ai)*

## Thesis

Serving is an admission-control problem disguised as a speed problem. ==The fast path starts before the model runs=={Authentication, validation, routing, queueing and batch scheduling all consume the same latency budget as inference. The chapter calls this overhead the serving tax.}, and it ends only after capacity, memory, routing and overload policy have decided which requests are allowed to use the accelerator at all. Training cost is paid once per model version; serving cost recurs with every admitted token. The design center is therefore not "run the model faster". It is: choose the workload-specific bottleneck, spend the latency budget deliberately, admit only work whose state fits, and make the fleet degrade predictably when demand exceeds capacity.

## Guided notes

### The Serving Tax

- Serving latency is end-to-end: inference, network, serialization, coordination and queueing. ==A model latency improvement is not an SLO improvement until the tax is measured=={A faster kernel can shrink T_inference while network, serialization, coordination or queueing still dominates T_req. Capacity comparisons are meaningful only at a fixed request mix and SLO because both change which component binds.}.

::eq[serving-tax]
$$
T_{\mathrm{req}}=T_{\mathrm{inference}}+T_{\mathrm{network}}+T_{\mathrm{serialization}}+T_{\mathrm{coordination}}+T_{\mathrm{queueing}}
$$

- The budget is split by user-visible phase. ==TTFT is consumed before and during prefill=={Time to first token includes the queue, scheduling and prompt evaluation needed before the first output token appears.}; TPOT is consumed during decode, one output-token step at a time. They are related but separate promises.
- A streaming response changes the operational question: not merely whether a request eventually finishes, but whether the first token arrives promptly and subsequent tokens arrive smoothly enough for the interface.

### Serving Cost Dominance

- Training is a one-time cost for a model version; serving is a rate multiplied by time. ==At high volume, small per-request savings repay the training-scale investment=={The book's illustrative 70B deployment uses roughly 2 million dollars of training cost and about 18.25 million dollars of first-year serving cost, a 9.1x ratio. The exact values are scenario assumptions, but the recurrence is structural.}.

::eq[lifetime-cost]
$$
C_{\mathrm{life}}=C_{\mathrm{train}}+c_{\mathrm{query}}\,D\,\lambda
$$

- A cost per query is meaningful only inside a declared boundary. It must say whether idle replicas, orchestration, networking, storage, redundancy and rejected work are included. Otherwise "cheap inference" is a shifting denominator.
- Efficiency is also demand-facing: lowering cost per token can increase use, so the optimization target is sustainable unit cost at the service's quality and SLO, not minimum cost in a vacuum.

::chart[serving-cost-first-year]

### Workloads Do Not Share One Bottleneck

- Recommendation and ranking systems can dominate inference volume while bottlenecking on embedding lookup, feature assembly and fan-out rather than autoregressive decode. Vision and batch analytics have still another shape.
- ==LLM serving is the chapter's hardest control problem=={Variable-length prompts, variable-length generations, per-request KV state and interactive token deadlines combine queueing, memory admission and phase scheduling in one system. Techniques that help embeddings or vision do not automatically solve it.}.
- The correct order is workload first, mechanism second. Continuous batching, KV paging, disaggregation and prefix-aware routing are answers to specific LLM constraints; embedding locality, cascade design and quantization answer other constraints.

### Batching Trades Waiting for Reuse

- Batching exists because serving work has fixed overhead and marginal per-request cost. ==Waiting a little can buy a lot of reuse=={Model weights and kernel launch costs are shared across the batch. The knee is not universal: it occurs where fixed and variable terms become comparable for the measured model, hardware and request mix, and the SLO decides whether operating there is acceptable.}.

::eq[batch-efficiency]
$$
\mu(B)=\frac{B}{\alpha+B\,\beta}
$$

- Static batching pads completed sequences until the longest member finishes. In the book's simplified fixed-width example, one sequence finishing after 10 tokens while seven others run for 100 leaves its slot idle for 90 of 100 positions; across eight slots that is 11.25 percent attributed waste.
- Generalizing that simplified model gives \(W=1-\mathbb E[L]/L_{\max}\). ==Continuous batching attacks exactly that waste=={It admits replacement work at iteration boundaries rather than waiting for the whole batch membership to drain. The recovery depends on queued requests, KV admission, prefill scheduling and scheduler overhead.}.
- Keep response release separate from slot reuse. A fixed-membership batch can return each response as soon as its useful tokens finish while still leaving the slot idle; doing so improves those requests' latency but does not recover capacity. Only iteration-level admission turns the stranded slot-iterations into throughput, and it does not shorten the longest request already in the batch.

::eq[padding-waste]
$$
W=1-\frac{\mathbb{E}[L]}{L_{\max}}
$$

- The book's illustrative workload table assigns larger gains to mixes with more output-length dispersion: code about 1.2x, chat 1.5x, text 2.0x, creative 2.8x and RAG 3.5x. These are scenario values, not universal measurements, but they explain why the benefit is workload-dependent.

::fig[iteration-admission]

::chart[continuous-batching-recovery]

### KV Cache Is the Real Batch Limit

- Decode is stateful. Every cached token carries keys and values through the layer stack, so memory grows with batch size times sequence length times bytes per token. ==The admission question is not “how many requests are waiting?” but “how much future context can fit?”=={Grouped-query attention lowers the KV-head count, KV quantization lowers bytes per element, shorter admitted contexts lower sequence length, and paging recovers fragmentation. None changes the linear growth with held tokens.}.

::eq[kv-token-bytes]
$$
M_{\mathrm{KV/token}}=2\,L\,N_{\mathrm{KV}}\,d_{\mathrm{head}}\,b
$$

- The book's long-context estimator makes the budget concrete: a 70B-class GQA model on an eight-H100 node leaves about 526 GB for KV after roughly 141.2 GB of FP16 weights and 20 GB of system reserve. At 327,680 bytes per token, one 128K-token request costs about 42.9 GB; ==twelve such requests exhaust the pool=={The exact count changed from older decimal estimates because the node capacity is now accounted in honest bytes. The lesson is the shape: long context turns a handful of admissions into the entire memory budget.}.
- PagedAttention solves allocation waste, not tensor size. Prefix caching reuses shared prompt state, compression reduces representation cost, and eviction or preemption chooses which state loses its place. All are admission-accounting mechanisms.

::fig[kv-admission]

### Prefill and Decode Are Different Machines

- Prefill processes the prompt in parallel. For long prompts its projection arithmetic intensity is high enough to sit near or beyond the accelerator ridge. Decode emits one token per sequence per iteration; at the batch sizes considered here it remains bandwidth-bound because every step streams weights and growing KV state.
- ==This asymmetry decides which optimization helps=={Tiled IO-aware attention primarily helps prefill's prompt-by-prompt work. Fused decode kernels and weight quantization help bandwidth-bound decode. Speculative decoding changes only decode. A single "speed up inference" intervention therefore has a phase-specific effect.}.
- Admitting a 4,096-token prompt onto a worker serving thirty active streams freezes those streams for the prompt's long compute-bound pass. The scheduler has to choose between their TPOT and the new request's TTFT.
- Chunked prefill moves rather than removes cost. With 512-token chunks, a 10,000-token prompt needs at least 20 iterations to finish prefill. The chunk budget is the exchange rate between the long prompt's TTFT and the other streams' time-between-token tail.
- Disaggregation separates the phases into pools. Prefill buys arithmetic throughput; decode buys memory bandwidth and capacity. ==The price is that locality becomes a network transfer=={The KV cache created by prefill is the payload decode needs. The transfer cost has a fixed network term plus bytes divided by effective bandwidth, in addition to queueing at each pool.}.

::eq[kv-handoff]
$$
T_{\mathrm{handoff}}=\alpha_{\mathrm{net}}+\frac{M_{\mathrm{KV}}}{\beta_{\mathrm{net}}}
$$

::fig[phase-lanes]

### Sharding and Routing Are Capacity Decisions

- Weight memory sets the first sharding trigger. A 70B FP16 checkpoint is 140 GB before KV cache and runtime state, so it cannot fit in one 80 GB H100. ==Two-way sharding is a memory floor, not an optimization choice=={Even when a model fits, sharding can reduce latency only if parallel execution repays communication and synchronization. The serving decision uses per-request TTFT and TPOT, not training throughput.}.
- Quantization and sharding solve different problems. Quantization shrinks the representation; sharding keeps the representation intact and divides it. They can combine, but each adds its own cost: format conversion and quality risk on one side, communication and failure coupling on the other.
- Routing must know what state means. A stateless API can send full history each turn and make any replica eligible; a session-cached platform saves repeated prefill but creates replica affinity, eviction policy and recovery complexity. Sticky routing is an optimization for retained cache, not a correctness requirement.
- Capacity-weighted routing matters in heterogeneous fleets. Equal request shares do not produce equal load when H100 and A100 replicas have different service rates; weights should reflect measured capacity, then adapt cautiously because latency observations mix server health with request cost.
- Fan-out makes tails multiply. If a request touches \(N\) independent leaves and each is slow with probability \(q\), request-level slowness is \(1-(1-q)^N\). ==At 100 leaves whose individual p99 is met, about 63 percent of requests still meet a slow leaf=={Holding the assembled request at p99 means each leaf may be slow only about 0.01 percent of the time, roughly p99.99. Fewer shards, queue-aware routing, isolation and deadline-aware partial results are the levers.}.

::fig[fanout-tail]

### Capacity Control Completes the System

- Multi-tenancy is not only fairness. It is an admission contract: tokens, requests, concurrency and memory each expose a different dimension of isolation, and token-denominated budgets fit variable-length generation better than a simple request count.
- Autoscaling is a race between demand and readiness. The book's Llama-70B cold-start scenario is about 6.7 minutes end to end: provisioning, artifact fetch, device load and warmup. ==Reactive scale-up starts after the queue has already formed=={Predictive scaling can pre-warm before forecast ramps, but it does not eliminate forecast error, provisioning variability or the need for overload policy. Warm pools buy readiness with idle cost.}.
- Spot capacity is not ordinary capacity at a discount. Interruption risk, migration cost and cold start must be charged against the lower price before it enters the serving plan.
- Global routing follows the same logic at wider scope: locality reduces network latency and improves cache reuse, but failover, sovereignty, capacity imbalance and cost can override the nearest replica.

### Fallacies and Pitfalls

- Treating model latency as serving latency: the serving tax can dominate, and queueing often grows exactly when traffic is valuable.
- Comparing throughput without fixing request mix and SLO: capacity is a pair of numbers, admitted load and achieved goodput under a deadline.
- Calling continuous batching free capacity: it recovers padding only when replacement work, KV memory and prefill scheduling permit.
- Believing paging shrinks the cache: paging reduces fragmentation; it does not reduce keys and values themselves.
- Assuming sharding reduces latency: communication, synchronization and straggling can consume the parallel gain.
- Confusing stateless interfaces with stateless work: live generation always has request-scoped KV state; only cross-request retention is optional.
- Counting spot or forecast capacity as ready capacity: interruption, cold start and forecast error decide what can actually serve the deadline.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Illustrative 70B first-year cost ratio | ~9.1x serving/training | recurrence dominates at scale |
| Illustrative training / serving cost | ~2M / ~18.25M dollars | first-year serving scenario |
| Static-batch example waste | 11.25% | one 10-token sequence beside seven 100-token sequences in width 8 |
| Continuous-batching scenario speedups | 1.2x–3.5x | workload-dependent illustrative values |
| 70B FP16 weight payload | 140 GB | minimum two 80-GB shards before KV |
| KV bytes/token, 70B GQA example | 327,680 B | 80 layers, 8 KV heads, head dim 128, FP16 |
| KV per 128K request | ~42.9 GB | long-context admission cost |
| KV pool in estimator | ~526 GB | 8×H100 node after weights and reserve |
| Maximum 128K admissions | 12 | floor(526/42.9) |
| Chunked 10k prompt at 512 tokens/chunk | ≥20 iterations | TTFT/TBT exchange |
| Llama-70B replica cold start | ~6.7 min | provisioning + fetch + load/warmup scenario |
| 100-leaf fan-out at leaf p99 | ~63% requests slow | tail inheritance |
| Leaf target for request p99 | ~p99.99 | fan-out budget inversion |
| Serving-cost crossover, scenario | ~6 weeks | recurring spend catches training-scale spend |
| Serving tax components | inference + network + serialization + coordination + queueing | end-to-end latency accounting |

## Glossary

- **Serving tax**: non-model serving latency that consumes the same end-to-end budget as inference.
- **TTFT**: time to first token, dominated by queueing, scheduling and prefill.
- **TPOT**: time per output token, the interactivity cadence of decode.
- **SLO goodput**: admitted work completed within its service-level objective, not raw throughput.
- **Continuous batching**: admission or replacement of sequences at iteration boundaries.
- **KV cache**: per-token key/value state reused by autoregressive decode.
- **PagedAttention**: paged KV allocation that reduces fragmentation without shrinking tensor payload.
- **Chunked prefill**: splitting long prompt evaluation across iterations to trade TTFT against decode disruption.
- **Disaggregation**: separating prefill and decode into independently scaled worker pools.
- **Session affinity**: routing repeated work to state retained on a replica; an optimization, not a correctness requirement.
- **Warm pool**: pre-provisioned or partly initialized capacity held ready for demand.
- **Fan-out tail amplification**: request-level tail inflation caused by waiting for the slowest of many leaves.

## → Ben's world

- The benchmark harness already has a serving-tax analogue: model generation time is only part of a task's wall clock, while browser startup, harness orchestration, retries and artifact writes can dominate a cheap local run. A tok/s number is not task goodput.
- The droplet's four tenants are a multi-tenant serving lesson in miniature. Counting containers or requests would miss the real isolation unit: resident memory, database connections and long-running polling work.
- Greenveil's crawl-cost incident is fan-out economics: a distinct URL crawl multiplied per-render API reads. The system's bottleneck was not page render speed but downstream request amplification and admission policy.
- Local MLX inference makes decode's bandwidth-bound nature tangible. The qwen3.8 thinking configuration trades fewer tokens per second for better answers; that is exactly an SLO/goodput choice, not a universal speed ranking.
- The shared machine's deliberate co-location is lifetime-cost reasoning. A fixed monthly box can beat serverless for continuous polling even though serverless looks cheaper per idle second.

## Open questions

- Which of the chapter's serving layers should be modeled explicitly in the local benchmark harness: queueing, browser orchestration, retries, model execution or artifact writing?
- For a real deployment, how should KV admission expose memory pressure to product policy: maximum context, lower concurrency, eviction, or a paid capacity tier?
- At what context length and traffic mix does prefill-decode disaggregation repay its transfer and queueing cost on current-generation hardware?
- Can fan-out tail budgeting be applied to composite product flows here, especially SSR pages that fan out to APIs and external services?
