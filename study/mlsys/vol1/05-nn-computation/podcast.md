# hosts: Marcus | Iris

A: Welcome back to the study room, I'm Marcus.
::fig[layer-ledger]

B: And I'm Iris. Chapter five: neural computation. And the frame this time is that a neural network is a budget before it is a program.

A: Meaning the shapes decide the bill before any code runs. A dense layer is one matrix product plus a bias, then an element-wise nonlinearity. Count the weights and you have the parameters. One multiply-accumulate per weight per example, so you have the FLOPs. And every layer's output has to be remembered for the backward pass, so you have the memory.

B: All from layer widths alone. And the asymmetry is the part to keep: width costs quadratically because every weight sits inside a product. Depth costs linearly, but each layer adds a sequential step and one more set of activations to hold.

A: The chapter's running example makes it concrete. A fully connected MNIST network, seven eight four down to one twenty eight to sixty four to ten. One hundred nine thousand three hundred eighty six parameters, about four hundred thirty eight kilobytes in FP32. And the first layer alone holds almost ninety two percent of the arithmetic, because it joins the widest pair of widths.

::eq[layer-map]

B: Which is why input resolution is a cost axis, not just a fidelity axis. A fifty six by fifty six input would roughly quadruple the dominant term.

A: Now the nonlinearity. It's the cheapest operation in the layer, and it's the only part that matters for expressiveness. A stack of linear layers collapses to a single linear map at any depth.

B: And activations have a hardware price list. Sigmoid and tanh need an exponential datapath and they saturate, gradient near zero past magnitude five. ReLU is a comparator, about fifty times cheaper in transistor area, and it passes a gradient of exactly one on the positive branch. The cost is dead neurons.

A: Then the training step. Backpropagation is not learning, it's the gradient algorithm. It applies the chain rule in reverse, and at each dense layer it runs two matrix products of forward size: one for the weight gradient, one to carry the signal to the previous layer.

::eq[backprop-cost]

B: Hence the rule of thumb: a full step costs about three times the forward arithmetic. The running network lands lower, about two point one, because the first layer skips its input gradient and that layer holds most of the math.

A: And the state budget follows. Training memory is four kinds: weights, gradients, optimizer state, and saved activations. The activations stay live until the backward pass reaches their layer, memory peaks at the turnaround between the passes.

::eq[training-memory]

B: Inference keeps exactly one of the four. The weights, plus a rolling pair of activation buffers, because a layer's buffer dies the moment the next layer finishes. Same weights, same forward arithmetic, about three times less memory. For the running network, about four hundred sixty two kilobytes versus one point three megabytes.
::fig[four-states]

A: There's a numerical contract too. The chain rule multiplies one local factor per layer. Slightly below one, and twenty sigmoid layers shrink the signal to about nine times ten to the minus thirteen. Slightly above, and it explodes to Inf, then NaN.

B: And small gradients don't just get small, they flush below the format's smallest normal and become exactly zero. A zeroed gradient stops updating its weight entirely. That's why initialization schemes like Xavier and He exist: keep the product near one.

::eq[chain-rule]

A: Then my favorite number in the chapter: batch size is a systems knob, not just a training hyperparameter. At batch one, a dense layer is a matrix-vector product. Every weight is read from memory to be used exactly once. Arithmetic intensity about half a FLOP per byte.

B: Batch thirty two turns it into a matrix-matrix product. Each weight read now serves thirty two examples, intensity about twelve FLOP per byte. On the book's roofline that's twenty five to nearly six hundred gigaflops a second on the CPU, and two to forty teraflops on the accelerator. Both still below the ridge point, so it's the bandwidth doing the winning, not the multipliers.

::eq[arithmetic-intensity]

A: And once the network itself is fast, the stages around it dominate. Preprocessing, postprocessing, Amdahl's law caps the end-to-end speedup at one over the unaccelerated fraction.

B: Which sets up the case study: the nineteen eighty nine USPS zip code readers. An early LeNet variant, about ten thousand parameters, forty kilobytes. Six stages: scan, preprocess, score, threshold, decide, review.
::fig[reject-gate]

A: And the key insight is that the network's output is a score, not a decision. A confidence threshold decides which digits the machine accepts and which go to a human. Chow's rule prices it: minimize the review fraction times review cost plus the error fraction times error cost.

::eq[reject-cost]

B: The measured point: one percent error on accepted digits, achieved only by rejecting twelve point one percent. An error rate on accepted items means nothing without the rejection fraction. And throughput fell from over thirty classifications a second to ten or twelve once image acquisition was counted.
::fig[reject-gate]

A: That's the whole chapter in one number pair. The pipeline around the network is the system. Fallacies next time. Chapter six is neural network architectures.

B: Same room.
