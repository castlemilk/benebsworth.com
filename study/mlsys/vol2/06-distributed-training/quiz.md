# Distributed Training: check your mental model

1. A synchronous job spans 1,024 GPUs whose mean time between failures is 50,000 hours each. Roughly how often should the run expect a worker failure?
   - A. About once every 49 hours: fleet MTBF divides the per-device MTBF by the worker count, so the training loop must absorb failures as a routine event.
   - B. About once every 49 days: per-device MTBF scales with calendar time rather than fleet size, because each GPU in the fleet fails independently of all the others.
   - C. About once every 4.9 hours: the per-device MTBF is already a fleet-adjusted figure, and synchronous stepping divides it once more by the global batch size.
   - D. About once every 49 minutes: the failure rate compounds superlinearly with fleet size, since stragglers and degraded links also count as failures for the step.

2. A 175B-parameter model trains in mixed precision with Adam: 2-byte weights, 2-byte gradients, a 4-byte master copy, and two 4-byte moments. How many gigabytes of resumable training state does the full state consume (1 GB = 10^9 bytes)?

3. A 16,384-GPU cluster runs a layout of TP=8, PP=16, DP=128. How many GPUs hold one complete logical replica of the model?

4. Under the chapter's decision framework, which condition indicates that plain DDP alone is sufficient, with no tensor or pipeline parallelism needed?
   - A. The interconnect provides enough bisection bandwidth that the per-step gradient AllReduce finishes in under 5 percent of step time at the target worker count and fabric tier.
   - B. The full training state (weights, gradients, optimizer, activations, and buffers) fits in one GPU's memory with enough headroom for the framework's working allocations.
   - C. The global batch divides evenly by the worker count, because an indivisible remainder would force at least one idle replica, at which point pipeline staging becomes necessary.
   - D. The model's layers are numerically independent enough that an eight-way tensor split produces bit-identical gradients to replicated training on the same hardware and seed.

5. A 7B model trains under DDP across a 64-GPU group, replicating 112 GB of static state per GPU (14 GB weights, 14 GB gradients, 84 GB optimizer). How many GB remain on each GPU after ZeRO-1 shards only the optimizer state across the 64 GPUs?

6. A synchronous 1F1B pipeline runs p=8 stages with m=32 microbatches per update. What percentage of the schedule's slots are bubble (idle), to the nearest percent?

7. A feasibility check for one GPT-3 layer split eight ways finds ~1.9 ms of local compute against the required collective traffic. What does the check actually establish about tensor parallelism's placement?
   - A. TP requires optical interconnects specifically: copper and DAC links introduce serialization latency that breaks the 1.9 ms budget, so TP is restricted to racks wired with all-optical fabrics.
   - B. TP can span the cluster freely: the 1.9 ms compute window is large enough that even inter-node links hide it, so the TP degree is bounded only by divisibility of the weight matrices.
   - C. TP should never be used: the 2(t−1)/t ring factor means every wider split strictly increases bytes moved, so any TP degree above 2 wastes bandwidth that DP would not.
   - D. TP must stay inside the node: the per-layer collective only fits under compute at NVLink-class bandwidth, and crossing to InfiniBand would expose the exchange as step time.

8. A team measures 45 percent MFU on a single node, scales to 1,024 GPUs at 83 percent scaling efficiency, and reports fleet MFU of 45 × 0.83 = 37 percent. A reviewer says the report understates or double-counts a term. What is the catch?
   - A. Nothing. The arithmetic is right: per-device MFU times scaling efficiency is exactly the fleet's MFU, and the lower figure the reviewer implies is a units error on their side of the review.
   - B. The 45 percent already contains communication exposed inside the node, and eta charges fleet communication again, so part of the comm bill is paid twice unless the single-node MFU was measured comm-free.
   - C. MFU cannot be multiplied by eta at all: MFU is a ratio of achieved to peak FLOP/s and eta is a ratio of step times, and mixing a time-ratio with a work-ratio is dimensionally invalid regardless of fleet size.
   - D. The reviewer is wrong only in magnitude: the correct combination is 45 + 83 = 128 percent capped at 100, since efficiency terms add over the parallel dimensions rather than multiply together.

9. B* ≈ tr(Σ)/‖∇L‖² is called the critical batch size. What does it bound?
   - A. The largest batch the memory system can feed: beyond B*, stored activations exceed HBM capacity and the layout is forced to add pipeline stages just to hold the larger microbatch stream.
   - B. The batch at which the AllReduce becomes latency-bound: beyond B*, per-worker gradients shrink enough that startup rounds dominate transfer time and further scale-out stalls hard against the alpha term.
   - C. The largest global batch that still buys proportional optimization progress: beyond it, extra samples yield diminishing reductions in steps-to-target, so data parallelism stops paying statistically.
   - D. The smallest batch that keeps every pipeline stage busy: below B*, fewer microbatches than stages exist in the schedule and the bubble fraction exceeds the useful-work fraction of every step.

10. In capacity-limited MoE with top-1 routing, what happens to a token whose assigned expert's buffer is already full?
    - A. It waits in the AllToAll send buffer for the next step's dispatch round, delaying its gradient contribution by one microbatch without changing the output it eventually produces.
    - B. It is rerouted to its second-choice expert automatically, at the cost of one extra routing decision and a slightly different learned function than top-1 gating implies.
    - C. It is dropped: it skips expert computation this step and passes through with only the residual connection: a silent quality tax that scales with routing skew.
    - D. It forces a rebalance: the router recomputes gating scores for every token in the batch so the overflow is redistributed evenly across all experts on that rank.

11. Why does PPO-style RLHF create an infrastructure asymmetry that ordinary fine-tuning does not?
    - A. The reward model must run on different silicon than the policy: reward inference requires inference-optimized accelerators while the policy needs training-optimized ones, forcing a two-pool cluster split.
    - B. PPO's KL penalty must be evaluated on the CPU host, because the divergence term is computed in FP64 and no accelerator in the fleet keeps enough native FP64 throughput to keep pace with the continuous rollout stream between updates.
    - C. The actor and critic must never share memory: PPO correctness requires physically separate device pools so on-policy samples cannot contaminate the value function's replay buffer during updates.
    - D. One training step is four jobs with different memory and traffic patterns: the policy generates autoregressively while the reference, reward, and value models score, so a single layout must serve generation and training at once.

## Answer key

1. A. 1,024 GPUs × (1 failure / 50,000 GPU-hours) ≈ one failure per 49 hours of wall-clock time. At fleet scale, fault tolerance is not a rare contingency: it is a property the schedule must have every other day, which is why checkpointing cadence and elastic restart exist in the stack.

2. 2,800 GB. Each parameter prices 16 bytes: 175e9 × 16 = 2.8e12 bytes = 2,800 GB. That is ~35 H100s of HBM before counting activations: the capacity number that forces partitioning in the first place.

   The 16-bytes-per-parameter contract (2+2+4+4+4) is what makes the memory wall concrete: 2.8 TB of state against 80 GB per device. Everything else in the chapter (ZeRO, tensor slicing, pipeline staging) is a strategy for dividing this number.

3. 128 GPUs. A replica spans the model-parallel partition TP × PP = 8 × 16 = 128 devices; the DP=128 dimension counts how many such replicas exist. Check: 128 × 128 = 16,384.

   The cube reads DP × PP × TP = N in either direction: given the total and two axes, the third is determined, and the TP×PP product is the 'size' of one replica. Confusing the replica's device count (128) with the replica count (128) is the classic misread of 3D layouts.

4. B. The framework is capacity-first: if the whole footprint fits one device, replicate and shard the batch. DDP has the cheapest communication of any strategy. Tensor, pipeline, and sharded strategies exist to solve a memory problem (or an activation-traffic problem), not to buy FLOPs.

5. ≈29.3 GB: weights 14 + gradients 14 stay replicated; the optimizer's 84 GB divides by 64 to ~1.31 GB. ZeRO-2 then shards the gradients (~15.5 GB/GPU); ZeRO-3 shards the weights too (~1.75 GB/GPU).

   The optimizer is 12 of the 16 bytes per parameter: the fat target. Sharding it alone drops the footprint from 112 GB to under 30 GB while keeping DDP's communication volume, which is why ZeRO-1 is nearly free throughput-wise.

6. ≈18%. The bubble fraction is (p−1)/(m+p−1) = 7/39 ≈ 0.179. The same 32 microbatches under PP-16 would idle 15/47 ≈ 32%; under PP-4 only 3/35 ≈ 9%.

   Every stage sits idle for p−1 of the m+p−1 slots while the pipe fills and drains. Microbatches are the fill, but they grow the global batch, which runs into the critical batch size on the statistical side.

7. D. Tensor parallelism is the chatty axis: GPT-3 at TP-8 moves ~68 GB of forward collectives per step. The bandwidth feasibility check is precisely the intra-node/inter-node boundary: NVLink hides the exchange under the layer's compute; a node-crossing link cannot. That is why TP degree typically equals the NVLink domain size (8).

8. B. MFU measured on a live step already has intra-node collectives in its denominator. If eta's numerator charges T_comm for the whole fleet, the TP collectives that live inside the node get billed twice. The fix is to measure local MFU with communication removed (or keep the terms in disjoint budgets): the chapter's worked example lands ~37% vs a naive figure that misleads by several points.

9. C. B* is a statistical ceiling, not a hardware one: it is the point where gradient noise stops being the limiter and bigger batches buy less per FLOP. It bounds how far the DP axis (and the microbatch count feeding a pipeline) can grow usefully: a separate budget from the memory-limited batch entirely.

10. C. Capacity-limited routing hard-caps each expert's allocation; overflow tokens are dropped rather than queued or rerouted, so the model loses their expert contribution for the step. Skewed gates (chapter 5's AllToAll skew) turn into a silent quality loss: one reason auxiliary load-balancing losses exist.

11. D. For the 70B example: policy ~1,120 GB, total four-model footprint ~1,494 GB, plus a growing KV cache (~86 GB GQA vs ~687 GB dense). Generation and training are different workload shapes (memory-bound decode vs FLOP-bound updates), and the fleet alternates between them, which is exactly the kind of heterogeneity DPO removes.
