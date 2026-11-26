# Collective Communication

1. A dense-model training run triples its fleet from 64 to 192 GPUs while holding the global work per update fixed. Step time drops by only 30%, and per-GPU compute occupancy falls. Which mechanism best explains the shortfall?
   - A. The dataset becomes the bottleneck because per-GPU sample throughput must triple and the storage tier cannot deliver three times the batch bytes per step.
   - B. The collective-communication term grows relative to compute: synchronization, startup rounds, and exposed transfer time eat what the added accelerators were meant to buy.
   - C. Gradient noise scales with the worker count, so the optimizer rejects more updates and effective occupancy falls even though every device reports healthy busy cycles.
   - D. The scheduler is leaving GPUs unassigned: at this scale the orchestrator fragments the placement across racks and a third of the fleet sits outside the communication group entirely.

2. A parameter server (star) reduces gradients from N workers, each holding an M-byte buffer. A ring performs the same AllReduce. What is the asymptotic relationship between their per-endpoint byte loads?
   - A. The ring rank sends N x M bytes spread across rounds while the server sends 2M once, so the star is asymptotically cheaper per endpoint for large clusters.
   - B. Both move the same bytes per endpoint because the server's sharded parameter tier distributes the aggregation across multiple servers exactly as the ring's neighbor exchange does across ranks.
   - C. The star server's port carries N x M bytes while each ring rank sends about 2M, so the server's byte time is roughly N/2 times the ring rank's before contention is counted.
   - D. The ratio is log2 N: the server's serialized transfers grow logarithmically while the ring's chunk pipeline keeps every rank's volume proportional to the group count.

3. A logical Ring AllReduce runs on 64 ranks with alpha = 1.5 us startup and beta = 50 GB/s per link, over a 140 GB gradient (70B in BF16). Compute the bandwidth term and explain which term dominates at this N.

4. On the same fabric, one collective exchanges a hundred small routing messages per step while another moves a single fused buffer well above n* = alpha x beta. Why does fusing the small messages pay?
   - A. The hundred messages cost roughly 100 x alpha in startup; fused above n* they pay one startup plus a bandwidth term, trading a hundred latencies for a single pipeline.
   - B. Small messages bypass the switch queue entirely while fused buffers must serialize, so fusing shifts cost from queue depth into a single predictable DMA burst.
   - C. Fusion compresses the payload itself: a hundred small messages carry redundant headers and routing metadata that the fused buffer deduplicates down to one envelope for the whole exchange.
   - D. The fused buffer can use a different algorithm entirely, so the exchange drops from O(N) rounds to O(log N) once the messages share one envelope.

5. An infrastructure engineer sizes AllReduce algorithms for a 256-GPU group on 200 Gbps links with effective alpha = 1 us. A batch of small ~64 KB collectives and one ~4 GB collective must both run. What does the crossover model prescribe?
   - A. Double binary tree for the 4 GB collective and parameter-server star for the small ones, since the star's dedicated port amortizes the small-message startup best.
   - B. Ring for both: it is the schedule that reaches the bandwidth lower bound under the endpoint model, and bandwidth optimality dominates the cost at every message size once the group grows this large.
   - C. Tree for both: its O(log N) rounds are strictly better than the ring's O(N) at any message size, since startups outnumber transfers.
   - D. Below M* ~ 1 MB a tree or recursive-halving schedule wins on startup rounds; the 64 KB collectives should take the log-depth path while the 4 GB gradient takes the ring.

6. On an 8-node cluster with 8 GPUs per node, fast NVLink inside each node, and eight independent 50 GB/s NDR ports per node, how does hierarchical AllReduce beat a flat ring?
   - A. It assigns every node's gradient to a single port so the seven remaining ports stay free for prefetch traffic, cutting the fabric's total bytes eightfold.
   - B. Intra-node reduce at NVLink rates, then one inter-node ring per shard across all eight ports at once, then intra-node broadcast: each port's inter-node payload falls 8x and the flat ring's slowest-edge serialization is avoided.
   - C. It replaces the ring's 2(N-1) sequential rounds with log-depth rounds across the node hierarchy, so the measured saving comes almost entirely from cutting startup latency rather than from the eight independent ports moving shards in parallel.
   - D. It deduplicates gradients that are identical across replicas, so each node transmits only the delta from the previous step to the inter-node ring.

7. MoE token routing with AllToAll hits contention and tail latency even though each worker's payload is smaller than the gradient AllReduce. What is the mechanism?
   - A. The transpose forces every chunk through the spine twice, doubling the bisection load relative to a ring on the same topology.
   - B. AllToAll inserts a global barrier before any chunk may route through the fabric, so the collective waits on the slowest rank's entire buffer to arrive and be acknowledged at every stage boundary before the transpose can start routing.
   - C. Each rank sends distinct chunks to every other rank, and expert demand is skewed: a hot expert's ingress link carries 672 remote tokens where uniform routing would carry 448, so one link stretches the step while others idle.
   - D. AllToAll cannot use NVLink inside the node, so every intra-node chunk pays the inter-node NDR rate and the payload penalty multiplies by the cliff ratio.

8. Top-k sparsification retains 0.1% of a gradient's d elements (k = 0.001d). Values ship in FP32 with INT32 indices. What is the effective compression ratio, and why does it differ from the 1,000x headline?

9. A team applies gradient compression and reports a large per-step communication speedup. When does that speedup actually improve the training run?
   - A. Only when saved communication time exceeds the compression overhead plus any extra iterations the distorted gradients require: a 100x transfer gain that doubles the step count is a net loss.
   - B. Whenever communication is more than a fifth of step time: once the fabric share passes 20% any compression ratio above 4x is guaranteed to pay back in wall-clock.
   - C. Whenever the compressed collective stays above the fabric's n* crossover threshold, because below that point the removed bytes were only costing startup latency rather than actual transfer time on the wire.
   - D. When compression runs on the same GPU as the backward pass, since host-side compression is what turns the saved wire time into exposed CPU work.

10. A PyTorch job sets async_op=True on every collective call but step time barely improves. Under the LogP model, what is the most accurate diagnosis?
    - A. The improvement is real but masked: the saved communication time is exactly offset by the additional synchronization the asynchronous API inserts at each gradient hook.
    - B. async_op quietly serializes the collectives behind the scenes: the flag queues all communication work onto one runtime progress stream, so the concurrent AllReduces still execute sequentially under the hood.
    - C. The flag only hides latency when NCCL selects a kernel-bypass protocol; on the default path the runtime falls back to synchronous progress after the first call.
    - D. async_op returns control to the CPU but only the network-transit portion of a transfer is overlappable; the 2o processor overhead and the last bucket's unhidden transfer still land in the step.

11. nccl-tests reports roughly half of the fabric's rated bandwidth for a healthy ring AllReduce. What is the correct interpretation?
    - A. NCCL is choosing a tree schedule whose byte term is log N times worse, so the correct fix is to force the ring algorithm in the environment.
    - B. The fabric is degraded: reporting half of rated bandwidth is the signature of a link that trained down a speed class at bring-up, matching the half-rate pathology the fabric chapter profiles on the day-three step regression.
    - C. The naive alpha + M/beta omits the ring's ~2 traffic factor; bus bandwidth normalizes by the schedule's factor, so half-spec is expected, and calibrated alpha/beta must be fit from the same collective, group, and topology.
    - D. The benchmark measures unidirectional traffic while the collective is duplex, so the observed half reflects counting one direction of a two-way transfer.

12. Explain to a teammate why a flat ring AllReduce across 1,024 GPUs in 128 nodes is slower than the hierarchical schedule even though both move the same gradient bytes in aggregate.

## Answer key

1. B. Holding global work fixed means each GPU's compute share shrinks while the synchronization cost does not shrink with it. Communication is global and scales differently from arithmetic; the exposed remainder of the collective lands directly in step time.

2. C. The bottleneck is concentration: the star funnels all N buffers through one endpoint, the ring spreads the same aggregate work so each rank sends about 2(N-1)/N x M. At 1,024 workers the gap is ~512x per port.

3. Bandwidth term = 2 x (63/64) x 140 GB / 50 GB/s ~ 5.5 s. The startup term is 2 x 63 x 1.5 us ~ 189 us, four orders below the byte term: at 64 ranks the ring is deep in the bandwidth-bound regime, and it is the startup term, not the byte term, that O(N) growth attacks first.

   The bandwidth term approximates 2M/beta. The latency term 2(N-1)alpha is what scales with N; at 1,024 ranks it reaches ~3 ms, still far under the byte term, which is why the ring stays the default at large payloads.

4. A. Below n* each message is nearly pure startup cost, so a hundred messages is ~100 alpha. Bucket fusion exists to push the per-round message above the crossover where the bandwidth term, not startup, dominates.

5. D. The crossover M* ~ N alpha beta / log2 N sits near 1 MB for this group. Under it the log-rounds schedules win on latency; over it the ring's optimal byte term wins. Runtime selection evaluates both regimes with the actual placement.

6. B. A flat ring runs at its slowest edge, one cross-node port. The hierarchical schedule keeps the fast hop (NVLink) dense and fans the slow hop across eight independent ports, so each port moves an eighth of the payload in parallel. The modeled gain is ~4-5x.

7. C. AllToAll is a routing contract, not a reduction. Its cost is governed by injection bandwidth, bisection capacity, and skew: when one expert attracts disproportionate tokens, that ingress link becomes the step's tail.

8. Each kept element ships value + index = 8 bytes against the original 4, so the ratio is 4d / 8k = d/(2k) = 500x, not 1,000x. Index overhead halves the headline, and the collective adds a second cost: different workers keep different coordinates, so the union of selections exceeds any single worker's k.

   The kept-fraction is not the compression ratio. Metadata (indices, scales) and aggregation semantics both take a cut before the advertised number reaches the wire.

9. A. The book's worked condition: on a slow network the compressed run went 50,000 to 38,500 total steps (gain); on a fast network the same method went to 33,825 and lost. Evaluate time-to-quality, not microbenchmark speedup.

10. D. Hiding requires three things beyond the flag: independent work long enough to cover the interval, a runtime that progresses the transfer, and consumers that do not wait early. The o term can never be hidden, and the last bucket has no compute left to cover it.

11. C. Half-of-spec is the ring's ~2 traffic factor showing through the naive formula, not a fault. Calibration records operation, datatype, ranks, algorithm, protocol, topology, placement, and achieved bus bandwidth, then fits effective alpha and beta to that same configuration.

12. The flat ring is one cycle through all 1,024 ranks, and its throughput is set by the slowest edge: an NDR port at 50 GB/s, nine times slower than the NVLink inside a node. Its 2(N-1) rounds also charge 2,046 startups. The hierarchical schedule does three phases: reduce inside each of the 128 nodes at NVLink rates, run one inter-node ring per shard group so the eight ports per node each carry an eighth of the payload in parallel, then broadcast the result inside each node. Same contract, same aggregate bytes; the win is exploiting the bandwidth cliff, keeping the slow hop few and parallel instead of serialized through every rank.

    The schedule, not the payload, is the cost. Same bytes, different placement of the slow hops.
