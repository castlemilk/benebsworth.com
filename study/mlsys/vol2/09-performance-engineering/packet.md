---
openingQuestion: Llama 3 405B trained on 16,384 dedicated GPUs with no preemption, no sharing and a world-class team. What fraction of that fleet's held capacity became training progress?
---

# Fleet Efficiency: Study Packet
*Machine Learning Systems, vol. 2, chapter 9, Performance Engineering (mlsysbook.ai)*

## Thesis

The deciding condition is the accounting boundary: every lost device-hour is charged to exactly one of three factors, in the order the workload meets them. ==Useful fleet output is capacity times scheduling goodput times runtime goodput times program goodput=={This is the chapter's Fleet Law equivalent. Scheduling counts capacity only while held by a complete allocation; runtime counts allocated time only while it produces steps a checkpoint would retain; program goodput measures retained step time against a named hardware ideal, reported as MFU. The product is what the fleet actually delivered.}, and the decomposition is what turns a vague sense of waste into an owned, measurable loss. Llama 3 405B, one of the best-run training jobs ever published, converted roughly a third of its held capacity into progress. The rest was lost in places most dashboards never separate.

## Guided notes

### Where Fleet Capacity Goes

- Opening case: ==Llama 3 405B ran 54 days on 16,384 dedicated H100s=={Dubey 2024, Table 4. Because the cluster was dedicated, scheduling goodput is one and the first loss term vanishes, the decomposition isolates runtime and program losses cleanly.} and reported effective training time above 90 percent and 41 percent BF16 MFU. The product of the two fractions is the share of held capacity that became progress: about 37 percent.
- Split by boundary: roughly ==a tenth of held capacity was lost at the runtime boundary=={Failures, checkpoint waste, startup, input stalls, time the job held the devices but produced no steps a checkpoint retained.} while more than half was lost at the program boundary, retained steps ran far below the hardware's peak rate. The program loss is several times the runtime loss, even though failures get the war stories.
- The running example for the rest of the chapter: a 128-GPU job (16 nodes, 8-way tensor parallelism per node) training a 70B model, deliberately smaller than the 175B reference job of earlier chapters. Its serving twin: one 8-GPU node running a replica.
- A serving replica teaches the boundary test: its losses remain even with requests switched off, because startup and idle residency are charged regardless of demand.

::fig[capacity-waterfall]

### The Goodput Product

- The accounting rule: ==every lost device-hour is charged at exactly one boundary=={Without this rule the same hour gets blamed twice, a stall counted against both runtime and program goodput, and the shares stop summing to the total gap. The chronological order matters: although the product is commutative, the additive share attributed to each stage depends on the order capacity passes through the boundaries.}.

::eq[goodput-product]
$$
\mathrm{MPG} = S \times R \times P
$$

- The loss-share decomposition rewrites the gap as a sum of three owned terms: $(1-S) + S(1-R) + SR(1-P)$. Each term is the capacity that boundary consumed, measured in the units of capacity that survived the boundaries before it.
- This is why the ordering is chronological, not alphabetical: a job that never schedules never incurs runtime loss; a step that never completes never incurs program loss. ==Losses downstream are measured only on the capacity that survived upstream=={Consequence: a one-point improvement in P is worth more retained progress than a one-point improvement in R when both start near the same value, because P acts on capacity that already survived two boundaries. The Trading section makes this precise.}.

::eq[loss-shares]
$$
1 - SRP = (1-S) + S(1-R) + SR(1-P)
$$

- Program goodput is defined against a named hardware ideal: useful model FLOPs divided by device count times peak rate, divided by distributed step time. That quotient is exactly MFU, ==the definition ties a business number to a hardware number=={MFU is what the accelerator vendor's marketing measures; goodput is what the fleet owner pays for. Pinning P = MFU means the profiling literature carries over directly, but it also means P is only as honest as the named peak.}.

::eq[program-mfu]
$$
P = \frac{\mathrm{useful\ FLOPs}/(N \cdot R_{\mathrm{peak}})}{T_{\mathrm{step}}} = \mathrm{MFU}
$$

### Measuring Goodput

- A goodput or optimization claim is valid only against a fixed contract: same model, same data, same hyperparameters, same convergence target. Speeding up the wrong thing is the chapter's first fallacy.
- Measured software-only gains: ==GPT-J rose about 2.7x across MLPerf rounds=={MLPerf training rounds v1.x to v2.x, same hardware generation. Llama 2 rose about 1.4x and Stable Diffusion XL about 1.2x, all from software, since the accelerators did not change. Offline throughput per benchmark across rounds is the cleanest evidence that program goodput is a moving target.}, hardware identical, software alone.
- The measurement contract has a hierarchy problem: trace volume grows with device count, so a fleet localizes loss by sampling, not by exhaustive capture. Profile the node, then the replica, then the job, then the fleet, each level blames a boundary.
- MFU more than doubled from GPT-3's generation to PaLM's, on comparable hardware, evidence that most of the headroom was always software.

::chart[software-gains]

### Scheduling Goodput

- Scheduling goodput counts capacity only while held by a complete allocation. Partial gangs, fragmentation and queueing are charged here, this is where the orchestration chapter's allocated/active/productive snapshot enters the decomposition.
- For the 128-GPU example the input waits dominate: ==input stalls outweigh the failure terms by an order of magnitude=={At 128 GPUs failures are rare enough that preemption lost-work and checkpoint waste are small; the data pipeline's input waits are the largest scheduling-adjacent loss. The chapter's point: at this scale the input lever is worth roughly ten times the failure lever, which inverts the small-cluster intuition that fault tolerance dominates.}.
- Startup is negligible over a week-long job but material for a short one: the same fixed cost is under 0.2 percent of a week and over 5 percent of an hour-scale run.
- Counting preemptions as interruptions shortens the effective interval by more than half, the taxonomy chosen in the fault-tolerance chapter changes the measured rate here.

### Runtime Goodput

- Runtime goodput counts allocated time only while it produces steps a checkpoint retains at the job's fault-free rate. The loss decomposition is additive: startup over allocated wall time, plus the data-stall fraction, plus checkpoint waste at the checkpoint interval, plus failure recovery over MTBF, plus preemption rate times preemption tax.

::eq[runtime-loss]
$$
1 - R \approx \frac{T_{\mathrm{start}}}{T_{\mathrm{alloc}}} + f_{\mathrm{stall}} + f_{\mathrm{ckpt}} + \frac{T_{\mathrm{recover}}}{\mathrm{MTBF}} + \lambda_{\mathrm{preempt}} T_{\mathrm{tax}}
$$

- Composing the 128-GPU example's runtime loss from the owners' terms: input waits exceed the preemption term, which exceeds the failure terms. ==The productive share reads as a runtime goodput near 0.56=={Just over half of allocated device-time becomes retained steps at the fault-free rate, before the program goodput of the steps themselves is even considered. The two factors multiply, so fleet-wide the example delivers roughly a quarter of held capacity as progress.}.
- The five terms divide by owner: data pipeline, checkpointing, fault tolerance, scheduler and platform. The decomposition is the org chart of who can fix what.
- A production throughput shortfall lengthens the run nonlinearly: the example's step-time slip stretches delivery from about 33.3 to about 37.5 days.

::fig[runtime-loss-split]

### Program Goodput

- Program goodput falls with device count inside one run, the same job at more GPUs keeps a smaller share of each step, because communication grows relative to computation.
- The bandwidth floor of one batch-one decode step on the 70B serving replica: arithmetic intensity about ==1.8 FLOPs per byte, far below the ridge=={At batch one, decode reads every weight once per token, arithmetic intensity is pinned near 1.8 regardless of hardware. Even at 84 percent of achievable bandwidth the kernel runs at well under one percent of peak FP16 compute. This is why decode is a bandwidth purchase, not a compute purchase.}, running at well under one percent of peak even at 84 percent bandwidth usage.
- The data-axis gradient reduction of the example cannot hide: ==the sharded ReduceScatter still exceeds the microbatch step, at about 2.7 times its length=={The bandwidth floor of the data-axis reduction is around 656 milliseconds against a much shorter microbatch step, so even perfect overlap leaves most of the collective exposed. This is why program goodput falls as device count grows: communication grows relative to computation inside the same step.}. 51 microbatches per step, about 1.8 million tokens per update.
- The model-axis exchanges inside one node: each tensor-parallel AllReduce moves a ==~36 MB activation, 320 of them per step=={Each GPU holds an eighth of the parameters and reduces through its own NIC. The per-layer activation AllReduces under contention are the chapter's central profiling example: small frequent collectives that serialize against the node.}.
- The serving replica shows the flip side: at batch one each AllReduce moves only tens of kilobytes, about ==73 nanoseconds of NVLink time, while launch latency exceeds the transfer by roughly 70x=={This is the eager-dispatch problem in miniature. The transfer itself is nearly free at NVLink bandwidth; the cost of issuing the work dominates. Graph compilation attacks exactly this term.}.
- A simplified naive-attention traffic estimate versus a fused kernel: the full-traffic ratio fusion removes for two FP16 intermediates is the quantitative case for kernel fusion.

::fig[roofline-decode]

### Recovering Program Goodput

- Graph compilation amortization: ==a shared compiled artifact repays its build cost within a minute of pool time=={The compiled artifact, including compiler-derived partitioning of collectives, costs a fixed build and pays it back on every replica-hour. The ratio quoted is about 65x: compile once, and the fleet recovers the investment dozens of times over within the first hour of deployment.}.
- Eager dispatch alone exceeds the decode floor several times over, kernel launch overhead at batch one is a first-order loss, not a detail.
- A compiled artifact is about a quarter of a burst-hour replica's cost, cheap insurance that most fleets still rebuild per-job.
- Fusion, compilation and kernel selection are levers on P alone. They touch neither S nor R, which is exactly why the product decomposition tells you what they can and cannot recover.

### The Whole Fleet

- Composing the example: ==a little over a quarter of fleet capacity becomes progress=={MPG lands between 0.25 and 0.30 for the 128-GPU job, worse in absolute terms than Llama 3's third, though the example's R times P actually exceeds Llama 3's on its dedicated cluster. The difference is scheduling: the example shares a fleet and pays for it.}.
- The loss shares rank S, then P, then R for the example, the reverse of the Llama 3 ordering, because Llama 3's dedicated cluster makes S vanish.
- Cost framing: the example pays ==three to four times the capacity price=={The ratio of fleet cost to the cost of useful work delivered. Every goodput point recovered cuts this price directly, the program ceiling alone cuts it by about a quarter.} for each unit of useful work.
- MFU fell slightly from 8K to 16K GPUs in published runs, scaling the same job costs program goodput, which is the fleet-law echo of the scaling-efficiency curve.

::chart[fleet-loss-shares]

### Trading Between Factors

- A lever that raises one factor and lowers another is judged by the product, never the lever. ==A point of P is worth most, then S, then R=={For the running example the marginal values rank P > S > R, and the owners' ceilings recover in the same order. This is not a universal law, it follows from where each factor currently sits, but the method is universal: price the levers by their effect on the product.}.
- Affordable trade: about a quarter of runtime goodput is what a P lever can afford to give up and still come out ahead, R's remaining relative gain is far smaller.
- The elastic strategies from the orchestration chapter reappear as goodput trades: the smaller allocation runs at higher scaling efficiency, strategy three leaves half the full allocation to the pool, and none of the three strategies dominates another at one price, the choice depends on the job's interruption cost curve.
- The frontier objective: pick the operating point where the product is maximized, not where any single factor looks best.

::fig[goodput-frontier]

### Fallacies and Pitfalls

- Counting the same loss twice: a stall charged to both runtime and program goodput double-books the hour and the shares stop summing.
- Reporting MFU without naming the peak: ==the ideal is part of the measurement=={A dense-FLOP peak and a sparse-FLOP peak differ by 2x on the same silicon. MFU against the wrong peak is a marketing number, not an engineering one.}.
- Optimizing the visible factor: failures are dramatic and input stalls are boring, but at 128 GPUs the input lever is worth an order of magnitude more.
- Assuming the decomposition is commutative in practice: the product commutes, but the loss attribution does not, reorder the boundaries and you reassign the blame.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Llama 3 held-to-progress | ~0.37 | dedicated-cluster ceiling benchmark |
| Llama 3 runtime loss share | ~0.10 | what >90% effective time means |
| Llama 3 program loss share | ~0.5+ | several times the runtime loss |
| GPT-J software-only gain | ~2.7x | MLPerf rounds, same hardware |
| Llama 2 / SDXL software gains | ~1.4x / ~1.2x | program goodput is a moving target |
| Runtime goodput, 128-GPU example | ~0.56 | productive share of allocated time |
| Example fleet MPG | ~0.25–0.30 | a quarter of capacity becomes progress |
| Batch-1 decode arithmetic intensity | ~1.8 FLOP/B | far below any ridge |
| Decode FP16 peak fraction | <1% | even at 84% bandwidth usage |
| Tokens per update, example | ~1.8M | 51 microbatches per step |
| Compilation payback ratio | ~65x | shared artifact vs per-job rebuild |
| Example cost multiplier | ~3–4x | capacity price per unit of useful work |
| P-ceiling price cut | ~25% | program lever alone |
| Input-vs-failure lever ratio | ~10x | at 128 GPUs |
| ReduceScatter bandwidth floor | ~656 ms, ~2.7x microbatch step | why data-axis reduction cannot hide |
| TP activation AllReduce | ~36 MB x 320 per step | model-axis exchange volume in one node |
| Batch-1 replica AllReduce | ~33 KB, ~73 ns | transfer is nearly free at NVLink bandwidth |
| Launch-to-transfer ratio | ~70x | eager dispatch is the batch-one loss |

## Glossary

- **ML goodput**: useful fleet output as capacity times the three boundary factors.
- **Scheduling goodput**: share of fleet capacity held by complete allocations.
- **Runtime goodput**: share of allocated time producing checkpoint-retained steps at fault-free rate.
- **Program goodput**: retained step time measured against a named hardware ideal; MFU.
- **MFU**: model FLOPs usage, useful model FLOPs per device per second over peak.
- **Loss share**: capacity consumed at one boundary, in units surviving prior boundaries.
- **Frontier objective**: maximize the product, not any single factor.
- **Measurement contract**: fixed model, data, hyperparameters and convergence target for any goodput claim.

## → Ben's world

- The LLM benchmark harness measures quality per dollar; the same decomposition applies, a failed structured-parse run is scheduling loss, a truncated generation is runtime loss, and a weak model is program loss. Scoring them separately instead of as one average would change which models look cheap.
- The shared droplet runs four polling services on one box: a busy-looking box is exactly the fallacy this chapter attacks, the question is never how busy the box is but which boundary eats the capacity.
- Decode at arithmetic intensity 1.8 is why local inference on the M5 Max is bandwidth-bound: the 27B MLX model's tok/s is a memory-bandwidth meter, not a compute meter, the same floor the chapter derives for H100s applies to Apple silicon.
- Compilation amortization at 65x is the build-cache argument in systems language: CI rebuilds per job are the per-job compile the chapter warns against.

## Open questions

- The example's S/P/R ranking inverts Llama 3's, at what fleet size does the crossover happen, and can the chapter's scenarios produce it?
- The input-wait dominance at 128 GPUs rests on the owners' scenario numbers; how sensitive is the ranking to the assumed data-stall fraction?
- MFU "fell slightly" 8K→16K, is the drop monotone in device count for fixed model, and does it saturate?
