# Self-test: Neural Computation

Answer in writing before checking. The MCQs adapt the chapter's self-check
items; the Feynman prompts are oral-exam style, the numerics are
back-of-envelope.

## Book-check MCQs

**Q1.** A team stacks 20 linear layers and no activations, arguing depth will
add capacity. What does the math actually give them?

- a) A network 20x as expensive to train but equivalently expressive to one layer
- b) A single linear map: composing linear maps is a linear map, so the extra
  layers add cost without adding expressiveness
- c) A network that cannot be trained because gradients vanish without activations
- d) A valid deep network as long as the layers are wide enough

**Q2.** Why does the backward pass through a dense layer cost roughly twice
the forward pass?

- a) Gradients require second derivatives, which double the work
- b) The backward pass runs two matrix products of forward size: $A^T\,dZ$ for
  the weight gradient and $dZ\,W^T$ for the input gradient
- c) Every weight must be updated twice per step by the optimizer
- d) The loss must be evaluated once per parameter

**Q3.** Compared to a training step on the same machine, what does inference
memory retain?

- a) Weights, gradients, and a rolling activation buffer
- b) Weights plus all saved activations, but no optimizer state
- c) The weights plus the largest adjacent pair of activation buffers
- d) Exactly one-quarter of the training footprint by definition

**Q4.** The fused softmax + cross-entropy gradient at a logit simplifies to
what?

- a) $p_j \cdot y_j$, the product of prediction and target
- b) $-\log p_j$, the negative log of the predicted mass
- c) $p_j - y_j$, predicted mass minus the one-hot target
- d) $y_j / p_j$, the importance-weighted error

**Q5.** ReLU displaced sigmoid in most hidden layers partly for a hardware
reason. Which?

- a) ReLU needs no exponent datapath: a comparator is ~50x cheaper in
  transistor area, and its positive-branch gradient is exactly 1 (no saturation)
- b) ReLU uses half the memory of sigmoid activations
- c) ReLU can be fused into the matmul kernel, sigmoid cannot
- d) Sigmoid requires FP64 to avoid underflow

**Q6.** The 1989 USPS digit reader reported 1% classification error. What
made that number achievable?

- a) A convolutional architecture larger than any network trained before it
- b) Doubling the training set with synthetic distortions
- c) Running the classifier three times and voting
- d) Rejecting 12.1% of digits for human review: the error was measured only
  on the accepted fraction

## Feynman prompts

**Q7.** Explain to a skeptical firmware engineer why "the network is a budget
before it is a program." Use the running MNIST network: show that parameter
count, per-example FLOPs, and activation memory are all decided by layer
shapes alone, and explain why the first layer holds 91.9% of the arithmetic.

**Q8.** A colleague says "backpropagation is how the network learns."
Correct the statement: separate the gradient-computation algorithm from the
update rule, and explain which one creates the saved-activation memory term
and which creates the optimizer-state term.

## Numerics

**Q9.** A fully connected network for a different task is 512-256-10.
Compute the parameter count, MACs per example, and FLOPs per example.
Then: at FP32, what is the persistent weight footprint?

<details><summary>Answer</summary>

- Params: $(512+1)\cdot256 + (256+1)\cdot10 = 131,328 + 2,570 = 133,898$
- MACs: $512\cdot256 + 256\cdot10 = 131,072 + 2,560 = 133,632$
- FLOPs: $2 \times 133,632 = 267,264$
- Weights: $133,898 \times 4\text{B} \approx 535.6\text{ KB}$

</details>

**Q10.** A model has 110M parameters trained with Adam (two moment buffers)
in FP32. Estimate the static training memory before activations, then state
the smallest batch-activation term that would push total memory past 2 GB.

<details><summary>Answer</summary>

- Weights: $110\text{M} \times 4\text{B} = 440$ MB
- Gradients: 440 MB
- Optimizer state (2 moments): 880 MB
- Static total: $440 + 440 + 880 = 1,760$ MB $\approx 1.72$ GB
- Any activation-plus-workspace term above ~270 MB crosses 2 GB. With
  activations scaling as $B \cdot \sum_l n_l \cdot 4\text{B}$, that bound is
  reached quickly, which is why large-model training checkpoints or shards
  activations rather than holding them.

</details>
