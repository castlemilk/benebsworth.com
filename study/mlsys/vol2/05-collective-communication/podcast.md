# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two chapter five: collective communication, the exchanges that turn a pile of accelerators into one computer.

B: A thousand twenty-four GPUs each hold a one-gigabyte gradient, and every one of them has to end up holding the same reduced sum. There are two ways to move that data, and the per-port load differs by five hundred twelve times.

A: The naive way is a parameter server: every worker sends its gradient to one port, the server sums and sends it back. That port carries N times M, a terabyte at a thousand twenty-four ranks with a one-G buffer.

B: The ring way: each rank talks only to its neighbors, and each rank's send volume approaches two M. Same aggregate traffic, the bottleneck was concentration, not volume.

A: That is the thesis of the chapter: the operation is a contract, the cost is the schedule. AllReduce specifies the result. Which algorithm delivers it decides what you pay.
::eq[bandwidth-lower-bound]

B: The contract vocabulary comes from MPI. AllReduce leaves the same sum everywhere. AllGather concatenates shards. ReduceScatter leaves each rank one reduced shard. AllToAll transposes chunks between ranks.

A: And Broadcast plus Reduce are the building blocks. Every one is just a statement of who holds what afterward. None of them say how.
::fig[primitive-contracts]

B: The physics first, though. Moving a bit costs energy by distance: half a picojoule inside SRAM, twenty to HBM, a hundred on NVLink, a thousand on InfiniBand NDR. A single ring AllReduce of a one-G buffer across ten thousand ranks prices in the kilojoules.

A: And within the fabric the alpha-beta model prices each step's chunk, not the tensor. A one-G bucket on a thousand-rank ring travels in one-M chunks. On NDR, n-star is alpha times beta, about seventy-five K, so the chunks stay bandwidth-bound. On NVLink, n-star is above five hundred K.

B: Which is why message fusion matters. A hundred small messages cost a hundred alpha. Fuse them above n-star and you pay one startup plus a bandwidth term. That is why DDP buckets gradients at all.

A: Then the schedule itself. The lower bound: reducing N contributions and returning the result needs at least two N-minus-one transfers, so the per-rank byte floor is two N-minus-one over N times M.
::fig[ring-trace]

B: The ring hits that floor: scatter-reduce then all-gather, two N-minus-one rounds of M-over-N chunks. On sixty-four GPUs with a one-G buffer the byte term is about thirty-nine milliseconds.
::eq[ring-allreduce]

A: The tree pays log-depth rounds but full-message hops, so at sixty-four GPUs its byte term is two-forty milliseconds. The crossover is where ring's extra startup equals tree's extra bytes: M-star is roughly N alpha beta over log-two-N.
::eq[algorithm-crossover]

B: At two-fifty-six GPUs on two-hundred gigabit links with one-microsecond alpha, that crossover lands near one megabyte. Below it, log-rounds schedules win. Above it, the ring's byte floor wins.

A: The worked comparison is stark: ring pays twelve-sixty microseconds of latency against tree's one-twenty, but tree pays twelve-hundred microseconds of byte time against ring's two hundred. Which side of M-star you are on is the whole question.
::fig[crossover-map]

B: And a flat ring across nodes runs at its slowest edge. One cross-node port at fifty gigabytes a second, not the four-fifty per direction NVLink gives inside the node. The nine-x cliff from chapter three returns as a schedule constraint.

A: Hierarchical AllReduce exploits the cliff: reduce inside the node over NVLink, run one inter-node ring per shard group across independent ports, broadcast back inside the node. Per-port payload falls eight-x.

B: The worked example: a hundred twenty-eight nodes of eight GPUs, a three-fifty-G gradient for a one-seventy-five-B model in BF16. The modeled gain is four to five times over flat, and the inter-node phase alone runs four point four milliseconds.
::eq[hierarchical-allreduce]

A: Torus-aware schedules go further. On a four-by-four grid, reducing along each dimension takes twelve rounds against a flat ring's thirty. TPU pods run that on three-D tori, each dimension on independent links.

B: And rail-optimized routing keeps same-indexed GPUs on one fabric rail, so an eight-way collective stays off the spine entirely. SHARP pushes reduction arithmetic into the switch silicon on supported paths.

A: Then the exchange that is not a reduction at all. Expert parallelism routes: each token's embedding goes to whichever GPU hosts its expert. Five hundred twelve tokens per GPU, four K each, two-sixty-two-K transfers at six point five microseconds.

B: The injection-bound floor is thirty-eight microseconds if every port runs in parallel, but skew wrecks it: a hot expert pulls six-seventy-two remote tokens where uniform routing would pull four-forty-eight. One link stretches the step while the others idle.

A: When the link cannot be widened, shrink the payload. INT8 with per-block scales gives three point eight eight times. One-bit gives thirty-two over FP32, sixteen over BF16. Top-k one-percent plus error feedback, at most fifty.

B: Top-k at zero-point-one percent advertises a thousand times and delivers five hundred: values plus INT32 indices cost eight bytes a kept element, so the ratio is d over two-k. And different workers keep different coordinates, so the union exceeds any single k.
::eq[error-feedback]

A: Naive top-k converges nowhere. Five sub-threshold gradients transmit zero without feedback. With a residual accumulator, the same sequence transmits two, holds minus point four in residual, and conserves the true one point six.

B: One-bit Adam compresses momentum, not gradients. Run full-precision Adam through warmup, freeze the variance as a fixed preconditioner, then ship sign-only momentum with a scale factor. Five times end-to-end reduction across two-fifty-six GPUs, three point three times BERT throughput.

A: But the payback condition is the whole decision. On a slow network the compressed run went fifty thousand steps to thirty-eight five hundred. On a fast network the same method went to thirty-three eight-twenty-five and lost.

B: Then the hiding. LogP splits the transfer: L, network transit, hides beneath independent compute; o, processor overhead, never does. In the toy: a hundred microseconds of L hides under five hundred of compute, but a hundred of two-o stays exposed.
::eq[logp-overlap]

A: Effective time six hundred microseconds. DDP exploits this with gradient hooks and bucket fusion: each layer's AllReduce launches the moment its backward finishes. Only the last bucket's transfer is exposed, it has nothing left to hide behind.
::fig[overlap-lanes]

B: And async-op-true returns control, not hidden latency. The CPU continues, but you still need independent work long enough, a runtime that progresses the transfer, and consumers that don't wait early.

A: Finally, calibration before diagnosis. nccl-tests reports about half the link's rated bandwidth for a healthy ring, and that is not a fault: the naive alpha plus M-over-beta omits the ring's two-x traffic factor.

B: Bus bandwidth normalizes by the schedule's factor, so it only matches what actually ran. Fit effective alpha and beta to the same collective, group, algorithm, protocol, and topology, or the model is wrong, not the fabric.

A: The fallacies cluster around that pattern: bandwidth is not the only metric, AllReduce does not fit routing workloads, ring is not the default at every size, compression without error feedback can diverge, and async is not hidden.

B: The chapter's summary line is the whole systems lesson: the operation names the result, the algorithm owns the cost, and the topology decides which terms you actually pay.
