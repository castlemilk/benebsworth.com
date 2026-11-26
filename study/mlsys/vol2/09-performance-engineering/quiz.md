# Fleet Efficiency — self-test

1. Llama 3 405B trained for 54 days on 16,384 dedicated H100s, reporting effective training time above 90 percent and 41 percent BF16 MFU. Roughly what share of the fleet's held capacity became training progress?
   - A. About 90 percent, since effective training time measures the delivered share
   - B. About 37 percent, the product of the runtime and program fractions
   - C. About 41 percent, because MFU already counts every boundary loss
   - D. About 50 percent, the mean of the two published fractions

2. The loss-share decomposition writes the goodput gap as $(1-S) + S(1-R) + SR(1-P)$ even though the product $SRP$ is commutative. Why does the decomposition follow the chronological boundary order?
   - A. Because downstream losses are measured only on capacity that survived upstream boundaries
   - B. Because scheduling losses are always the largest, so they must be charged first
   - C. Because the boundaries are owned by different teams, so the chronological order reflects which organization is charged first for a lost hour
   - D. Because the product is commutative, any order gives the same additive shares

3. A vendor reports an MFU of 55 percent for a training run. What must accompany the number before it can be compared with another run's MFU?
   - A. The accelerator count, since MFU scales with the size of the allocation
   - B. The power draw of the cluster during the measured window
   - C. The named hardware peak the rate is measured against, dense or sparse
   - D. The checkpoint interval, since MFU includes checkpoint write time

4. For the chapter's 128-GPU training example, which runtime-loss term dominates, and what does that imply?
   - A. Failure recovery dominates, so checkpointing investment is the first lever
   - B. Startup dominates, because fixed costs never amortize at this scale
   - C. Preemption tax dominates, since spot instances always interrupt daily
   - D. Input waits dominate, so the data pipeline outranks fault tolerance here

5. Batch-one decode on the 70B serving replica runs at an arithmetic intensity near 1.8 FLOPs per byte. Even at 84 percent of achievable memory bandwidth it delivers well under one percent of peak FP16 compute. What is the root cause?
   - A. Kernel launch overhead, which compilation can fully remove at batch one
   - B. Every weight is read from memory once per token, pinning the intensity
   - C. Tensor parallelism, which serializes the decode step across eight GPUs
   - D. The KV cache, whose reads dominate the weight traffic at batch one

6. The chapter quotes a payback ratio of about 65x for a shared compiled artifact. What does the ratio compare?
   - A. The artifact's build cost against the pool time it repays within about a minute
   - B. Compiled throughput against eager throughput on a single decode kernel, measured end to end across a full serving replica under load
   - C. The artifact's size against the source graph it was compiled from
   - D. Fleet-wide compile cost against the engineering salary it replaces

7. A team charges an input stall against both runtime goodput and program goodput, reasoning that the devices were idle and the step was slow. What breaks?
   - A. Nothing, since the stall genuinely harms both factors at once
   - B. The loss shares stop summing to the total gap, so blame is double-booked
   - C. The measured MFU inverts sign, since the step time now exceeds the ideal step time by more than the stall itself
   - D. Scheduling goodput rises, because the allocation was incomplete

8. For the running example, the marginal value of a one-point goodput improvement ranks P first, then S, then R. Is this a universal law of fleets?
   - A. Yes, because program goodput is always furthest from its ceiling
   - B. Yes, because losses compound multiplicatively in chronological order
   - C. No, it follows from where the example's factors currently sit
   - D. No, because the correct ranking is always S then P then R

9. A 128-GPU job holds its allocation for a week. Scheduling goodput is 0.72, runtime goodput is 0.56, and the retained steps run at an MFU of 0.65. What share of the fleet capacity the job was allocated becomes training progress, and what is the capacity cost multiplier of a unit of useful work?

10. Explain to a junior engineer why 'the GPUs were busy all week' is not evidence the fleet was productive, using the three goodput boundaries.

11. An elastic strategy shrinks a training allocation from 512 to 256 GPUs. Scaling efficiency rises at the smaller allocation, but the job now holds capacity longer. How should the trade be judged?
    - A. By the product of the factors, since scaling efficiency and hold time move oppositely
    - B. By scaling efficiency alone, since it is the hardware-correct metric
    - C. By hold time alone, since longer exposure always means more preemption events and more lost work regardless of efficiency
    - D. By the interruption cost curve, which always decides independently

## Answer key

1. B. The two fractions multiply: effective training time is the runtime share and MFU is the program share, so the product lands near 0.37. Neither fraction alone counts the other's boundary, and a dedicated cluster only removes the scheduling term.

2. A. The product commutes but the attribution does not: a job that never schedules incurs no runtime loss, and a step never completed incurs no program loss. Each term is expressed in units of capacity that survived the boundaries before it, which is what makes the three shares sum to the total gap.

3. C. Program goodput is defined against a named hardware ideal, and the ideal is part of the measurement: dense and sparse FP16 peaks differ by 2x on the same silicon, so an MFU without its peak can be off by a factor of two before any engineering is compared.

4. D. At 128 GPUs failures are rare enough that input stalls outweigh the failure terms by roughly an order of magnitude. The small-cluster intuition that fault tolerance dominates inverts: at this scale the input lever is worth about ten times the failure lever.

5. B. At batch one the arithmetic intensity is architectural, not incidental: each token requires reading every model weight once, so intensity stays near 1.8 regardless of kernel quality. Decode is therefore a bandwidth purchase, not a compute purchase, which is why it sits far below the roofline ridge.

6. A. Compilation is a fixed cost amortized across every replica-hour that reuses the artifact. A shared artifact repays its build within about a minute of pool time and keeps paying back on every deployment after, which is why rebuilding per job throws the payoff away.

7. B. The accounting rule charges every lost device-hour at exactly one boundary. Double-booking the stall makes the loss shares sum to more than the total gap, and the decomposition stops being a partition of blame that owners can act on.

8. C. The ranking is a measurement, not a law: it depends on each factor's current value and remaining ceiling. Llama 3's dedicated cluster has S pinned at one, so its ordering differs entirely. The universal method is pricing each lever by its effect on the product.

9. MPG = S x R x P = 0.72 x 0.56 x 0.65 = 0.262, so about 26 percent of allocated capacity becomes progress. The capacity cost multiplier is the reciprocal: 1/0.262 = 3.8x, matching the chapter's three-to-four-times framing. Each factor multiplies, so a one-point gain in any single factor moves the product by less than a point of the total.

10. Busy means devices were powered and allocated, which is where the accounting starts, not where it ends. Scheduling goodput asks whether the allocation was complete or stranded; runtime goodput asks whether allocated time produced steps a checkpoint retains, or was eaten by stalls, restarts and preemption; program goodput asks whether the retained steps ran anywhere near the hardware's rate. A fleet can pass all three tests poorly at once: fully allocated, always busy, and delivering a quarter of its capacity as progress. The honest question is never how busy the fleet was but which boundary consumed the loss.

11. A. A lever that raises one factor and lowers another is judged by the product, never the lever. The chapter's elastic comparison shows no strategy dominating another at one price: the right choice depends on where the product lands for the job's own interruption cost curve, not on any single factor's improvement.
