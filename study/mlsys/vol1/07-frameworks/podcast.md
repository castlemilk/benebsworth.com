# hosts: Marcus | Iris

A: Welcome back to the study sessions for Machine Learning Systems. I'm Marcus.
![ML frameworks](/study/vol1/07-frameworks/cover.webp)

B: And I'm Iris. Today is chapter seven, ML Frameworks - PyTorch, TensorFlow, JAX, and what all of them are actually doing underneath the API.

A: The chapter opens with a number that reframes the whole thing. Take one batch-one decode step of GPT-2 XL. The device work is reading about three gigabytes of sixteeen-bit weights - at H100's memory bandwidth, that's about nine-tenths of a millisecond.
::fig[gpt2-decode-tax]

B: That's the bandwidth-bound workload from last chapter. So what's the catch?

A: The catch is issuing the work. That one step is about five hundred seventy-six kernel launches - twelve per transformer block, times forty-eight blocks. At about five microseconds of driver overhead per launch, launching alone costs nearly three milliseconds. Three times the weight read.

B: Before we've paid for a single Python call.

A: Right. Add about ten microseconds of Python dispatch per operation and the host needs almost nine milliseconds to issue a step the device finishes in under one. Roughly ten times the device work. The silicon waits on Python.

B: So whether that step costs one millisecond or ten has nothing to do with the model. It's the framework.

A: That's the thesis: a framework is a compiler wearing a library's clothes. The model fixes the operation count; the framework decides where every other cost lands. And the chapter organizes that into three problems every framework must solve.
::fig[visibility-ladder]

B: Execution - when work runs. Differentiation - what state you keep for gradients. And hardware abstraction - where the program can run at all.

A: Each one owns a term of the iron law. Execution owns latency, differentiation owns memory, abstraction owns which efficiencies are even reachable.

B: The deeper pattern the chapter keeps returning to is visibility. Everything the framework can do is bounded by what the program reveals to it.

A: Exactly. Eager execution shows the runtime one operation at a time - great for debugging, and fusion is impossible by construction. Static graphs show it the whole program, but your Python control flow stops running - an if statement becomes a graph node. Graph-capture JIT sits between: torch.compile traces regions, and pays a graph break wherever capture fails.

B: A traced if-statement silently bakes in whichever branch happened to fire at trace time. That's a nasty bug class.

A: And there's a number for the coverage problem: PyTorch's eager API exposes about twenty-six hundred ATen schemas. The compiler-facing core set has about a hundred ninety-two. XLA runs a hundred twenty-three opcodes, ONNX about two hundred, JAX's lax about a hundred thirty-five. A fourteen-times gap between what you can write and what the compiler can lower.

B: That's why export pipelines break - you write one op outside the small set and the whole artifact doesn't lower.

A: Then the chapter prices the eager boundary with the dispatch overhead law: op count times per-op host cost, over device compute-plus-memory time. Above a ratio of one, you're overhead-bound.
::eq[dispatch-law]

B: And the asymmetry is brutal. A one-microsecond kernel pays the same fifteen microseconds of host cost as a hundred-microsecond GEMM - so the small op is ninety-four percent dispatch, the big one thirteen percent.

A: Same fixed cost, completely different regime. Which is why small models idle big GPUs - the worked training step in the chapter, a tiny MLP, owes well under a microsecond of ideal device time and about ninety-five microseconds of host issue. Dispatch-bound by two orders of magnitude.

B: And the levers all fall out of the equation. Fusion shrinks the op count, replay shrinks the per-op cost, a bigger batch grows the denominator.

A: Fusion's other win is traffic: k elementwise kernels each round-trip the buffer - two-k-N-B of traffic - while one fused kernel does two-N-B. For a three-op chain like layernorm, dropout, activation, that's roughly a three-times traffic cut plus two launches removed.
::eq[fusion-traffic]

B: Then compilation is the purchase decision. The chapter's cost model puts eager-to-JIT breakeven near two million executions, JIT-to-AOT near six point seven million. ResNet-50 serving at about forty-seven percent speedup breaks even around a hundred thirty-five thousand images.
::eq[compile-benefit]

B: So serving wants compilation always; a research loop that recompiles every iteration never wants it.

A: Second half: differentiation. Forward mode computes one derivative direction per sweep - for ten million parameters, ten million sweeps. Reverse mode gets every gradient in one backward sweep, at a small constant multiple of forward cost, never materializing the Jacobian.
::eq[jacobian-memory]

B: Which would be forty gigabytes for a hundred-thousand-wide layer pair - bigger than the model.

A: The bill arrives as saved forward state. Every backward rule reads the values it recorded, so activations pile up linearly in batch and depth, peaking exactly where forward ends. ResNet-50 at batch sixty-four: a hundred megabytes of weights, two hundred of Adam moments, and a training peak of eight to twelve gigabytes. A hundred times the weights.
::fig[tape-and-peak]

B: The mountain is activations, not parameters. Hence checkpointing - recompute a segment during backward instead of holding it, cutting the live peak up to sixty-four times.

A: And the tape is also the hazard surface. An in-place relu mutates a value a backward rule expects to read - autograd's version-counter error is it refusing to hand you a silently wrong gradient.

B: Third problem, hardware abstraction. A tensor is metadata plus a buffer - shape, dtype, strides, device. The metadata picks the kernel. And the link hierarchy prices placement: HBM at three point three five terabytes a second versus PCIe at sixty-four gigabytes is a fifty-two-times gap.

B: So dot-item and print-tensor are sync points that drain the whole pipeline, while pinned memory and streams hide the copy behind compute.

A: Then the training-step anatomy ties it all together: the three-GEMM backward at about two times forward dense work, an Adam step that moves twenty-eight bytes per parameter - more traffic than the whole modeled step for a small net - and a ReLU a hundred sixty times below the roofline ridge.
::fig[visibility-ladder]

B: And the frameworks themselves: TensorFlow organized around SavedModel as the dev-to-serving boundary, PyTorch around the eager module with compile as opt-in capture, JAX around pure functions - the constraint that annoys people is exactly what lets XLA see the whole program.

A: Which feeds the selection rule: eliminate by deployment target first - can this stack export every op to a runtime that fits the device - then rank survivors by team pipeline and migration cost. The deployment runtime check comes before the training-framework choice.

B: Because a framework is a multi-year commitment. Checkpoints, loaders, serving formats, expertise - changing it is a migration, not a library swap.

A: And the fallacy that ties the bow: same model, same performance. The decode step refutes it - nine-tenths of a millisecond of device work against almost nine milliseconds of eager issue. The framework is the difference between a model that's fast in principle and a step that's slow in fact.

B: One thing I keep circling: every layer of this is about what you choose to see. The eager runtime sees one op, the tracer sees a region, the exporter sees a program. The abstraction isn't hiding complexity - it's deciding who's allowed to see it.

A: That's the chapter in one line. The framework mediates algorithm-machine co-design: your model text is source code for a lowering pipeline, and the engineering question is which trade-offs your workload, team, and target can afford to make fixed.

B: Next time: training - where these mechanics meet scale. The mixed-precision and checkpointing machinery this chapter introduced gets a full chapter to itself.

A: See you then.
