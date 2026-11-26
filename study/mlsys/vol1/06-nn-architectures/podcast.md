# hosts: Marcus | Iris

A: Welcome back to the study sessions for Machine Learning Systems. I'm Marcus.
::fig[cost-signatures]

B: And I'm Iris. Today is chapter six, Neural Network Architectures - the big one. MLPs, CNNs, RNNs, attention, transformers, recommendation systems, all in one chapter.

A: It reads like a survey, but the book insists it's a systems chapter. The claim is that an architecture is a cost signature before it's a model. Every family answers the same three counts: how many weights it stores, how many multiply-accumulates it performs, and what bytes have to move or stay resident. Those three numbers predict which term of the iron law saturates first - before you run a single benchmark.

B: So the families aren't really competing on accuracy. They're competing on which bottleneck they volunteer for.

A: Exactly. And the mechanism behind each signature is inductive bias - the structural assumption baked in at design time. The chapter's headline number: a shared three-by-three filter on a two-twenty-four-by-two-twenty-four image uses about five and a half thousand times fewer weights than one dense detector covering the same pixels. Locality isn't an optimization; it's a four-order-of-magnitude change in where parameters come from.

B: And the same bias buys data efficiency, not just parameter efficiency - which is the flip side of the bitter lesson. Weak priors only win once you can afford the data and compute to overcome them. Vision transformers needed much bigger datasets before they matched convnet accuracy.

A: Right. So order the families by assumption strength: convolution assumes the most - locality plus equivariance. Recurrence assumes order but not which past positions matter. Attention assumes only that relevance is content-based. And the dense layer assumes nothing at all.

B: The MLP is the null hypothesis of architectures.

A: It is. And its signature explains itself: a weight for every input-output pair, and at batch one each weight is read for exactly one multiply-accumulate. That's half a FLOP per byte in thirty-two-bit precision - the floor of the whole intensity spectrum. Everything else in the chapter is a scheme to get more work per byte read.

B: Which is where convolution comes in - few weights, enormous reuse. Each filter applies at tens of thousands of positions, the bytes that move are feature maps rather than filters, and the arithmetic lands on the compute side of the roofline. ResNet-fifty: twenty-five million parameters, eight point two gigaflops an image, half its MACs in three-by-three convs, and comfortably compute-bound when batched.
::eq[conv-layer]

A: And even convolution pays a toll to lower onto the matrix engine - im2col unfolds each receptive-field patch into a matrix row, so interior pixels appear in up to nine rows. Memory for simplicity. Phones skip it and run direct convolution.

B: Then depthwise-separable convolution asks: what if we pay the toll differently? Factor the kernel into a per-channel spatial filter plus a one-by-one channel mix, and you cut parameters and MACs by eight or nine times for three-by-three kernels.

::eq[dw-reduction]

A: MobileNetV2: three and a half million parameters, roughly an order of magnitude fewer FLOPs than ResNet. But here's the catch - the depthwise stage can't form wide matrix multiplies, so its arithmetic intensity drops. Nine times fewer FLOPs does not buy nine times the speed on a datacenter GPU. The saving shines where the constraint is parameters and energy: edge devices, always-on audio.

B: That's a pattern in this chapter - the FLOP count and the wall-clock answer keep disagreeing, and intensity is the reconciliation.

A: Skip the RNN quickly then - its signature is the serial floor. Shared weights across time steps, constant-size state measured in kilobytes, but the time loop can't parallelize, so batching can't rescue it. Except - and I like this counterpoint - for streaming inference under a fixed state budget, that constant-size state is exactly the win. Keyword spotters, always-on sensors.

B: Then attention and the transformer. The routing is content-based: softmax over query-key dot products, applied to values. And the signature cost is right there in the formula - one score per position pair. Quadratic.

::eq[attention]

A: Double the context, quadruple the score work. If you materialize the score matrix, five hundred twelve tokens to four thousand is a sixty-four-times blowup. Which is why tiled kernels like FlashAttention never write the scores out - they stream them through registers. The arithmetic stays quadratic; only the storage was optional.

B: But here's the number I didn't expect. Inside a block, the dense projections plus the feed-forward cost twelve S d-squared MACs, while the two attention products cost two S-squared d. Setting them equal gives a crossover at six times the hidden width.

::eq[attention-crossover]

A: For a sixteen-hundred-wide model, attention arithmetic only overtakes the boring GEMMs past about nine and a half thousand tokens. Below that, the quadratic isn't your problem. Long context is where it bites - which is exactly where everyone wants to go.

B: And the transformer gets two rows in the workload profile, because generation has two phases. Prefill runs the whole prompt as matrix-matrix work - compute-bound, like training. Decode emits one token per step as matrix-vector work, rereading every weight at about one FLOP per byte.

::eq[decode-intensity]

A: A seventy-billion-parameter model in half precision streams over a hundred gigabytes of weights per generated token. The weight read alone is a millisecond at memory speeds. That's why decode is where the serving bill lives - and why your local model's tokens-per-second is basically a bandwidth measurement.
::fig[prefill-decode]

B: Plus the KV cache: every layer stores a key and a value per past token, so memory grows linearly with context. GPT-2 XL burns about three hundred kilobytes per token per request. The cache crosses the model's own weight footprint near ten thousand tokens, and a seven-billion-parameter model spends over a gigabyte per request.

::eq[kv-cache]

A: Meanwhile the recommender lives in a different universe entirely. An embedding lookup is a gather at a data-dependent address - a copy, not a computation. Intensity isn't low; it's not applicable.
::fig[capacity-wall]

B: And the tables are sized before they're run. A hundred million items at a hundred twenty-eight thirty-two-bit values is fifty-one gigabytes - two-thirds of an eighty-gigabyte accelerator. A second table and you're over the wall. Production tables reach terabytes.

A: Three escapes: shrink the table with hashing or quantization, move it to host memory and pay interconnect bandwidth per lookup, or partition it across devices and pay all-to-all communication. Every escape relocates the cost. The signature is capacity first, bandwidth second, and arithmetic barely registers.

B: Which sets up the selection framework: not "which family is best" but "which family's signature can my machine afford." Data structure nominates candidates - grid, sequence, tabular, high-cardinality - then memory, compute, latency, and power eliminate them. And the chapter's quiet warning: a mismatch chosen here can't be rescued by kernel tuning later.
::fig[cost-signatures]

A: The Netflix Prize is the cautionary tale. The million-dollar-winning ensemble never shipped - the integration cost and a shifting objective ate the accuracy gain. Metric wins that don't survive contact with the deployment are free papers, not systems.

B: So the takeaway, in one line?

A: When someone asks which architecture to use, the chapter wants you to answer with a signature, not a name: here's the data pattern, here's what that buys in weights and reuse, here's which iron-law term you'll hit first - and here's the machine that makes it cheap. The architecture is the answer to a question about hardware that the model happens to embody.

B: Next up: training at scale - where these signatures meet the collective-communication costs the DLRM section teased. Until then, I'm Iris.

A: And I'm Marcus. See you in chapter seven.
