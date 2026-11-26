# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two chapter six: distributed training, the chapter that asks why adding accelerators can make a training run slower.

B: The opening contradiction is memory, not speed. The reference model needs two point eight terabytes of training state, and one accelerator holds eighty gigabytes. You distribute because nothing else fits, and then you discover what the distribution costs.

A: The two point eight terabytes is a contract, not a guess. Mixed-precision Adam prices sixteen bytes per parameter: two for weights, two for gradients, twelve for the optimizer. A hundred seventy-five billion parameters times sixteen is twenty-eight hundred gigabytes.
::eq[training-state]

B: Thirty-five H100s of state before a single FLOP. And the wall keeps moving: accelerator memory grew fifteen times from K-eighties to B-two-hundreds, while training state grew four orders of magnitude. G-P-T-three was the first plotted model over one device, around thirty-five times the largest GPU of its year.

A: Reliability is the second wall, and it is also arithmetic. A thousand twenty-four GPUs at fifty-thousand-hour mean time to failure see a failure every forty-nine hours. At fleet scale fault tolerance is routine, not rare.

B: The design space is three axes: data parallelism over the batch, pipeline over the layers, tensor inside each layer's matmuls. Device count is the product, D times P times T. Sixteen, eight, and eight make the reference cluster's thousand twenty-four.
::eq[grid-decomposition]

A: And the worked example holds everything else fixed: same model, same batch, same thousand twenty-four GPUs. Only the partition changes, so the four layouts isolate exactly what the axes cost.
::fig[config-abcd]

B: Layout A replicates everything: twenty-eight hundred gigabytes per GPU, impossible at any efficiency. B shards tensors eight ways, still three-fifty. C adds a four-stage pipeline and reaches eighty-seven point five, which crosses under the line only with ZeRO-one.

A: D, the reference, uses the deepest pipeline of the four and lands at forty-three point eight gigabytes unsharded. And the punch line: B, C, and D model within three efficiency points of each other. Communication barely separates them. Memory disqualifies three of the four.

B: Data parallelism is the baseline either way: replicate the model, partition the batch, AllReduce gradients once per step. Its problem is the replicated footprint, and the sharding ladder is a sequence of fixes for it.
::fig[zero-ladder]

A: The optimizer is the fat target: twelve of the sixteen bytes. On a seven-B model across sixty-four GPUs, replicated D-D-P holds a hundred twelve gigabytes. ZeRO-one shards just the optimizer, down to twenty-nine point three. ZeRO-two adds gradients, fifteen point five. ZeRO-three adds the parameters, one point seven five.

B: And the pricing stays honest: stages one and two keep D-D-P's byte volume; stage three pays one point five times for a gather before every layer. Near-linear memory scaling, bought with a collective in the critical path of each layer.

A: What does scale-out actually buy? The chapter's efficiency equation is Amdahl with communication: every worker's exposed exchange and synchronization, scaled by N against one device's compute.
::eq[scaling-efficiency]

B: A one-percent residual per worker is eighty-four percent of the step at five hundred twelve. And stragglers are the hidden multiplier: the chance of a clean step is rarer than one in ten thousand at fleet scale. The measured runs land at seventy-one to eighty-four percent and never reach ideal.

A: The statistical side has its own ceiling. The critical batch size, B-star, is the point where extra samples stop buying proportional progress. It bounds how far the D axis can grow, and it is a separate budget from the memory-limited batch.
::eq[critical-batch]

B: Then model parallelism's menu, where each option charges a different toll. Pipeline first: split the layers into stages, stream microbatches through, and pay the bubble while the pipe fills and drains. The fraction is p-minus-one over m plus p-minus-one.
::eq[pipeline-bubble]

A: Sixteen stages at thirty-two microbatches idles a third of the slot grid. Four stages at the same count wastes nine percent. And the fill is not free either: more microbatches means a bigger global batch, which runs into B-star.
::fig[bubble-grid]

B: Tensor parallelism is the chatty axis. Split every matmul eight ways and the layer owes a collective: about sixty-eight gigabytes of forward collectives per G-P-T-three step, against four point two gigabytes of pipeline boundary traffic. Sixteen to one.
::fig[tp-traffic]

A: And the ring factor prices the split itself: two times t-minus-one over t is one point seven five at t equals eight. The exchange only fits under compute at NVLink rates, which is why T-P degree equals the size of the node's high-speed domain and never crosses the fabric.

B: Sequence parallelism is the newer axis: shard the token dimension where activations, not weights, are the footprint. Linear in sequence length for ordinary layers, quadratic for un-tiled attention.
::eq[activation-memory]

A: G-P-T-three's unoptimized activations exceed a terabyte; full checkpointing fits them under twenty-five gigabytes by recompute. Same trade as ZeRO: memory relief, paid in accelerator work.

B: MoE is the fifth toll: top-one or top-two gating routes each token to the rank hosting its expert, two AllToAll collectives per layer, dispatch and return. Capacity-limited routing drops overflow tokens outright, a silent quality tax that scales with skew.

A: The four-configuration comparison closes the loop: C needs ZeRO-one to cross the eighty-gigabyte line; D pays about point-zero-four seconds more per step than C-with-ZeRO for the privilege of fitting unsharded. And the sixteen-K layout, T-P-eight times P-P-sixteen times D-P-a-hundred-twenty-eight, gets state down to twenty-one point nine gigabytes per device at a thirty-two-percent bubble.

B: Then the chapter's other world: alignment training. P-P-O runs four models in one step: the policy generates autoregressively, reward scores, reference constrains, value estimates. On the seventy-B scenario the policy alone is eleven hundred twenty gigabytes; the working set nears fifteen hundred.

A: The phases are asymmetric: generation is memory-bandwidth-bound on the K-V cache, eighty-six gigabytes with G-Q-A against six hundred eighty-seven dense, while the update is compute-bound. Over half a generation batch can be padding. D-P-O cuts it to two models and no online generation.

B: The decision framework is the whole argument compressed: capacity first. D-D-P where it fits, ZeRO stages as the footprint overflows, model parallelism where weights alone exceed the device, hybrids where both bind.

A: And one forecasting warning worth keeping: forty-five percent local M-F-U times eighty-three percent scaling efficiency is thirty-seven percent fleet M-F-U. Multiplying the efficiency in twice predicts thirty-one. M-F-U already contains intra-node collectives; charge them again in eta and the bill is paid twice.

B: The fallacies collect around that: batch scaling is not free throughput past B-star; efficiency on one axis can be negative on the whole; and a framework flag changes the partition, not the physics. One G-P-T-two moved from a single NVLink node to four Ethernet nodes, quadrupled the GPUs, and got slower.

A: The chapter's summary is the systems lesson: the axes are a compiler's repartitioning of one program, memory picks the layout, and the schedule owns the cost. Adding accelerators buys compute by selling synchronization; whether it is worth it is arithmetic, not magic.
