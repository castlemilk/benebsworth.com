# hosts: Marcus | Iris

A: Welcome back to the study series. Today Iris and I are working through chapter nine of volume two, the performance engineering chapter, which the book calls fleet efficiency.

B: And it opens with a number I did not expect. Llama 3 405B, one of the most carefully run training jobs ever published, sixteen thousand three hundred eighty four dedicated H100s for fifty four days. What fraction of that fleet's capacity became training progress?

A: I'll guess high because it is a flagship run. Eighty percent?

B: About thirty seven percent. And that is with no preemption, no sharing, no queueing, because the cluster was fully dedicated.

A: So two thirds of the best-run fleet in the world was lost. Lost where?

B: That is exactly the chapter's question, and the answer is an accounting system. The chapter decomposes useful output into three factors that multiply.

A: Let's get the equation up for that.

::eq[goodput-product]

B: ML goodput equals S times R times P. Scheduling goodput, runtime goodput, program goodput. Each one is measured at its own boundary, and every lost device hour is charged to exactly one of them.

A: Why does the one boundary rule matter so much?

B: Because without it the same hour gets blamed twice. A stall charged to both runtime and program goodput makes the loss shares sum to more than the total gap. The decomposition stops being a partition the owners can act on.

A: Okay, so walk me through the three boundaries in the order a job meets them.

B: Scheduling first. Capacity only counts while it is held by a complete allocation. Then runtime. Allocated time only counts while it produces steps a checkpoint would retain. Then program. The retained steps are measured against a named hardware ideal, and that quotient is exactly MFU.

A: MFU is the program goodput. That ties the business number to the hardware number.

::eq[program-mfu]

B: Right. Useful model FLOPs divided by device count times peak rate, divided by distributed step time. And the peak you name is part of the measurement. Dense and sparse FP16 peaks differ by a factor of two on the same silicon.

A: So an MFU number without its named peak is meaningless?

B: It is a marketing number, not an engineering one. Now back to Llama 3. Dedicated cluster, so scheduling goodput is one, that loss term vanishes. Effective training time above ninety percent is the runtime share. Forty one percent MFU is the program share. Multiply and you get the thirty seven percent.

A: And the loss split?

B: Roughly a tenth of held capacity was lost at the runtime boundary. Failures, checkpoint waste, stalls. But more than half was lost at the program boundary. The retained steps ran far below peak rate.

A: Wait, so the program loss is several times the runtime loss? But failures are what everyone talks about.

B: Failures get the war stories. The slow steps eat the fleet. Here is the waterfall picture.

::fig[capacity-waterfall]

A: Looking at this, the program boundary bar is enormous compared to the runtime one. But hold on, is that specific to Llama 3? They were pushing a frontier model at sixteen thousand GPUs.

B: Partly. The chapter's running example is smaller, a hundred twenty eight GPU job training a seventy B model, sixteen nodes with eight way tensor parallelism per node. And there the ordering changes completely.

A: How so?

B: For the example, the loss shares rank scheduling first, then program, then runtime. Because the example shares a fleet, it pays scheduling costs Llama 3 never saw. The composition is situational. The method is universal.

A: Before we get to the example, I want to pin the measurement contract idea. You said claims need a fixed contract.

B: Right. A goodput or optimization claim is only valid against fixed model, data, hyperparameters and convergence target. And the evidence the contract matters: across MLPerf training rounds, on unchanged hardware, GPT-J throughput rose about two point seven times. Llama 2 about one point four times. SDXL about one point two times.

A: Same hardware, more than double the throughput, purely from software. So program goodput is a moving target even with frozen silicon.

B: Exactly. Now the runtime boundary. The chapter decomposes runtime loss into five additive terms, and there is an equation for it.

::eq[runtime-loss]

A: Startup over allocated wall time, plus the data stall fraction, plus checkpoint waste, plus failure recovery over MTBF, plus preemption rate times tax. Five terms, five owners.

B: And for the hundred twenty eight GPU example the ranking is surprising. Input waits dominate. Then the preemption term. Then the failure terms. The input lever is worth roughly ten times the failure lever at that scale.

A: That inverts the small cluster intuition completely. On a small box, fault tolerance is everything.

B: Here is the ranked picture.

::fig[runtime-loss-split]

A: Startup is basically invisible on that bar chart. But you said it matters for short jobs?

B: Startup is under zero point two percent of a week long job but over five percent of an hour scale run. Same fixed cost, different denominator. The example's runtime goodput lands near zero point five six. Just over half of allocated time becomes checkpoint retained steps.

A: And then program goodput multiplies on top of that?

B: Right. And program goodput falls as device count grows inside one run, because communication grows relative to computation. Published runs show MFU falling slightly from eight thousand to sixteen thousand GPUs.

A: Now the part I found most striking in the chapter. Batch one decode.

B: Yes. Take the seventy B model's serving replica. At batch one, every token requires reading every weight from memory once. Arithmetic intensity is pinned near one point eight FLOPs per byte, no matter how good your kernel is.

::eq[roofline-ai]

A: And the ridge point of a modern accelerator is way above that.

B: Orders of magnitude above. Even at eighty four percent of achievable memory bandwidth, batch one decode runs at well under one percent of peak FP16 compute. Here is the roofline picture.

::fig[roofline-decode]

A: The decode point is so far left it is basically on the bandwidth roof. So decode is a bandwidth purchase, not a compute purchase.

B: That is the lesson. And it explains why kernel fusion matters so much for the serving path. The chapter estimates the traffic ratio fusion removes for two FP16 intermediates, and it is large.

A: What about compilation? The chapter makes a big deal of graph compilation.

B: A shared compiled artifact repays its build cost within about a minute of pool time. The payback ratio is about sixty five to one. Compile once, every replica hour after that is cheaper.

A: Sixty five to one. And yet most fleets rebuild per job?

B: Which is throwing the payoff away. There is one more wrinkle: eager kernel dispatch alone exceeds the decode floor several times over. Launch overhead is a first order loss at batch one, not a detail.

A: Okay, zoom out to the whole fleet. Where does the example land?

B: A little over a quarter of held capacity becomes progress. The example actually beats Llama 3 on runtime times program, but scheduling drags it below, because it shares a fleet.

A: And the cost framing?

B: The example pays three to four times the capacity price for each unit of useful work. Every goodput point you recover cuts that price directly. Recovering to the program ceiling alone cuts it by about a quarter.

A: Now the trading part. If a lever raises one factor but lowers another?

B: Judge it by the product, never the lever. For the running example a point of P is worth most, then S, then R. And a P lever can afford to give up about a quarter of runtime goodput and still come out ahead.

A: Is that ranking a law?

B: No, and the chapter is careful about that. It is a measurement of where the example currently sits. Llama 3's ranking differs entirely because its scheduling is pinned at one. The universal part is the method: price every lever by its effect on the product.

::fig[goodput-frontier]

A: The elastic strategies from the orchestration chapter show up here too, right?

B: They reappear as goodput trades. Shrink the allocation and scaling efficiency rises, but the job holds capacity longer. None of the three strategies dominates another at one price. The right choice depends on the job's interruption cost curve.

A: Let's do fallacies. What is the biggest one?

B: Counting the same loss twice. Then: reporting MFU without naming the peak. Then optimizing the visible factor, failures are dramatic and input stalls are boring, but the boring one is worth ten times more. And finally assuming the decomposition commutes. The product commutes; the blame does not.

A: So the takeaway for someone running any fleet, even a small one?

B: Stop asking how busy the fleet is. Ask which boundary is eating it. Measure the three factors separately, charge every lost hour to exactly one of them, and price your levers by the product.

A: The busiest fleet in the world might be the most wasteful one.

B: And the best published run in history still lost two thirds of its capacity. There is a lot of headroom, and most of it is software.

A: Next time we move to inference at scale, where the batch one decode floor becomes the whole game.
