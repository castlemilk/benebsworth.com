# hosts: Marcus | Iris

A: I'm Marcus. Today Iris and I are studying Kolibri, a bilingual language model from Aleph Alpha. Its technical report asks a systems question: how much model capacity can you make available without using all of it for every token?
![A token through Kolibri](/study-research/kolibri/token-path.svg)

B: I'm Iris. The headline is seventy eight point one billion total parameters, but around three point four six billion active for each token. The distinction is a route through the model, not a magic reduction in everything the system must store.

A: Kolibri uses a mixture of experts. A router chooses six routed experts for each token from a much larger pool, alongside a shared expert. Each selected expert processes the token, and their outputs are combined.
![Six routed experts and a shared expert](/study-research/kolibri/sparse-path.svg)

B: There are three hundred and eighty four routed experts per mixture layer. The narrow path reduces work per token compared with executing all of those experts. But the serving system still has to make the wider set of weights available.

A: The model card estimates about seventy eight gigabytes for the eight bit weights alone. A deployment also needs room for the runtime, the attention cache, activations, and whatever concurrency it wants to support.

B: You could distribute or offload weights, but moving them has a cost. So a small active parameter count does not mean this model has the memory requirements of a dense model with the same active count.

A: Routing introduces another familiar systems problem: imbalance. If a lot of tokens choose experts on the same device, other devices may wait for that overloaded participant.

B: The report combines one balancing method for global load with another for local load. A healthy average across a whole batch can still hide a slow microbatch or a hot device. It resembles a distributed queue where the busiest worker determines the tail.

A: Attention is the next trade-off. Full attention lets a token access all earlier tokens, but long sequences increase both processing work and the key-value cache.
![The five-layer attention cycle](/study-research/kolibri/attention-cycle.svg)

B: Kolibri uses sliding-window attention in forty of its fifty layers. Every fifth layer uses full attention. The local layers focus on a bounded neighbourhood, while periodic global layers retain a route to distant information.

A: Those global layers also retain sequence-dependent costs. In an experiment with smaller proxy models at matched training compute, the hybrid model could train on sequences four times as long as the full-attention comparator.

B: That is a useful result under those experimental conditions. It is not a promise that every production deployment will be four times faster. Hardware, batching, sequence length and the serving runtime all matter.

A: The training sequence length grows across stages, from roughly sixteen thousand tokens, to sixty five thousand, and finally two hundred and sixty two thousand. The model card says the team validated up to about one million tokens.
![Context length across training stages](/study-research/kolibri/training-stages.svg)

B: It recommends the shorter, two hundred and sixty two thousand token limit for complex tasks or latency-sensitive serving. A maximum supported context does not mean recall is equally good at every position or that the cost remains flat.

A: The model is designed for German and English. Its pre-training mix includes substantial German text, and the team also makes language-specific decisions in tokenisation and post-training.

B: That affects how we compare speed. Different tokenisers can split the same passage into different numbers of tokens. The report uses decoded bytes per second per GPU in its quality-throughput figure, which makes the quantity of output text more comparable.
![The same text under two tokenisers](/study-research/kolibri/bytes-vs-tokens.svg)

A: The authors plot benchmark aggregates against throughput on eight B two hundred GPUs, using selected configurations. They report a Pareto frontier among the models and workloads in that comparison.
![Quality and throughput on the same workload](/study-research/kolibri/throughput-frontier.svg)

B: A frontier depends on what you compare. Change the hardware, sequence lengths, batch sizes, language mix or quality target, and the ordering can change. The graph does not provide a cost guarantee for a specific service.

A: The data behind a benchmark matters too. The authors say their pre-training pool was not decontaminated against the evaluation suite, even though later training stages were.

B: Their follow-up found that the model recited reference solutions for HumanEval. That can inflate scores as evidence of general coding ability. Filtering later data does not undo exposure during pre-training, and exact matching misses some paraphrases.

A: So for a deployment, measure the workload you actually care about. Use held-out tasks where possible, record the serving configuration, and test long documents at different positions.
![Comparing decode throughput](/study-research/kolibri/decode-throughput-kpi.svg)

B: Include missing-evidence questions, tool failures and both languages if those are part of the service. Measure task success with latency and memory, rather than choosing a model from one headline number.

A: The lesson from Kolibri is that capacity, computation, memory and quality are separate budgets. The design connects them, but the right balance belongs to the application you are trying to run.
