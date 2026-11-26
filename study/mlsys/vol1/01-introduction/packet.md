# Study packet: Vol I, Ch 1: Introduction

Book: *Machine Learning Systems*, Vijay Janapa Reddi (mlsysbook.ai, CC-BY-NC-SA 4.0)
Source: `study/cs249r_book/books/vol1/01_introduction/01_introduction.qmd`
Produced: 2026-11-11

## Thesis

Machine learning systems have a physics. A voice-assistant answer crosses a
phone, a network, and a datacentre, each stage under its own memory, latency,
and energy budget, and the prediction only matters if it arrives inside them.
That gives every ML system a **==dual mandate=={Two constraints, not one: the model must be statistically right and the machine must physically deliver it. Every failure later in the chapter is one side or the other breaking.}**: learned behaviour must be
statistically trustworthy *and* physically deliverable, and you can't
discharge one without the other. The chapter arms you with three quantitative
tools for that mandate (the degradation equation: is it still right? the iron
law: where does the time go? return on compute: is more compute worth it?)
and one diagnostic loop, D·A·M (Data · Algorithm · Machine), for finding
which constraint actually binds.

## Guided notes

### The AI systems moment
- Three forces converged: big datasets from digital services, learning
  algorithms that extract structure from them, and parallel hardware that made
  the arithmetic feasible. The deeper change is conceptual: data became a
  mechanism that defines program behaviour.
- Dual mandate: an accurate model that's too slow is unusable; a fast model
  trained on unrepresentative data is wrong at machine speed.

### From code-defined to data-defined behaviour
- Karpathy's Software 1.0 to 2.0: in 2.0 the "source code" is learned weights
  and the "compiler" is SGD. Imperfect analogy, since training is stochastic
  and the same data can produce different weights, but it relocates the
  debugging surface onto the dataset.
- **Data-as-code principle**: changing the dataset changes system behaviour as
  surely as changing source code. Versioning, review, and debugging must
  extend to data.
- Sculley et al. 2015: model code is a small box inside the production
  system. The surrounding collection/verification/serving/monitoring
  machinery carries most of the maintenance debt.
- War story: Google Flu Trends and proxy drift. Search volume measured
  *attention*, not illness; fixed by re-anchoring to CDC ground truth, not by
  more data. A behavioural proxy needs a feedback loop to a trusted
  measurement.
- **Verification gap**: test coverage / total input space ≈ 0. For a
  224×224 RGB image: 256^150,528 configurations (300k+ digits) vs 50,000
  ILSVRC validation images. ==Evaluation is statistical evidence over a sampled
  population, never proof.=={This is the verification gap: a benchmark score bounds performance on the sampled distribution, not on your traffic. See the [silent degradation chart](#charts) for what happens when the distributions drift apart.}

> [!connection] Same sampling shape as our eval suites
> A golden regression set has the same anatomy: sampled evidence about an
> unbounded input space. The chapter's gap is why coverage arguments for a
> suite need to be stated as population claims, not test counts.

### The evolution of AI bottlenecks
- Each era relaxed one constraint and exposed the next. **Bottleneck
  migration**:
  | Era | Binding constraint |
  |---|---|
  | Symbolic AI (1950s-70s) | logic bottleneck: hand-written rules can't cover open-ended input variety |
  | Expert systems (1970s-80s) | knowledge-acquisition bottleneck: tacit expertise can't be extracted/maintained at scale (MYCIN) |
  | Statistical ML (1990s-2000s) | feature-engineering bottleneck: SIFT/HOG-style hand-designed features; the classifier learned the boundary, engineers chose what it could see |
  | Deep learning (2012-) | infrastructure bottleneck: memory capacity, bandwidth, orchestration (AlexNet) |
- First two bottlenecks are human-effort limits; the last is physical. The
  AI winters (1974-80, 1987-93) were gaps between promised generality and
  what algorithms, data, and hardware could sustain, plus economics.
- Moravec's paradox: what's easy for humans (perception, movement) is hardest
  to encode in rules.

::fig[ai-timeline]

### The bitter lesson
- Sutton 2019: general methods that harness computation (search + learning)
  beat encoded knowledge, by a large margin. "Bitter" because hand-crafting
  expertise feels like the direct path.
- Deep Blue (1997): custom chess hardware + encoded knowledge. AlphaGo Zero
  (2017): self-play, no human games, no hand features, beat AlphaGo Lee 100-0
  after 3 days. Same lesson at two maturity levels.
- Scale currency: **accelerator-days**. GPT-4-class ≈ ~25,000 A100-class GPUs
  × ~100 days ≈ ~2.5M GPU-days (public estimate, not disclosure).
- The lesson's corollary for systems: once computation turns into capability,
  the constraint moves onto the machine: memory bandwidth, interconnect,
  thermals, pipeline throughput.

### Defining ML systems
- ML system = learned model + the software and hardware that trains, deploys,
  and maintains it. The model is not the system; the costliest failures live
  at interfaces no component test exercises.
- **D·A·M taxonomy**: every symptom originates on one of three axes: Data
  (what examples/bytes), Algorithm (model structure and work), Machine
  (hardware capacity). The **limiting constraint** is the one whose
  relaxation improves the end-to-end result.
- D·A·M is a loop: attribute, intervene, re-measure, because relieving one
  constraint migrates the bottleneck to a neighbouring axis (a faster GPU
  starves on storage I/O; more data overwhelms the model).

::fig[dam-axis-triad]

::fig[dam-loop]

### When ML systems fail silently
- Silent degradation: ==runtime healthy, predictions wrong=={The failure mode dashboards cannot see. All health metrics green while the model quietly goes stale. Quantified in the [degradation chart](#charts); the essay angle lives on this line.}. Pedestrian
  recall drops 95% to 85% under winter conditions while frame rate and health
  checks stay green; misses go from 1-in-20 to 3-in-20.
- **Degradation equation**: accuracy falls with distribution divergence,
  scaled by a locally-fitted sensitivity $\lambda$. A warning signal (drift),
  not a proof of loss; labelled outcomes decide.

::eq[silent-degradation]
$$
\mathrm{Acc}(t) \approx \mathrm{Acc}_0 - \lambda\, D\!\left(P_t \,\|\, P_0\right)
$$
- Two routes in: external **data drift** (population shifts) and internal
  **training-serving skew** (different transform code in the two paths, a
  software defect whose symptom is statistical).
- Consequence: host metrics (CPU, memory, HTTP 200s) are necessary but can't
  measure prediction quality. Monitoring must span ingestion to inference.

> [!observation] The health check answers the wrong question
> A 10-point recall drop tripled the miss rate while every infra metric stayed
> green. 'Is the process alive?' is a different question from 'is the model
> right?', and only the second one notices this failure.

::chart[degradation-curve]

::fig[silent-degradation]

::fig[health-vs-recall]

### Iron law of ML systems
- Product form (dimensional cancellation over D·A·M): the first two factors
  multiply to total operations $O$.

::eq[iron-law-product]
$$
T = \frac{\mathrm{samples}}{\mathrm{task}} \times \frac{\mathrm{FLOPs}}{\mathrm{sample}} \times \frac{s}{\mathrm{FLOP}}
$$

- Unpacked form (sequential):
  ==memory time + compute time + fixed overhead=={Three terms you can name, measure, and optimize independently. The [iron-law explorer](#charts) below lets you move the compute rate and watch the binding term switch.}.

::eq[iron-law-sequential]
$$
T_{\mathrm{seq}} \approx \frac{D_{\mathrm{vol}}}{BW} + \frac{O}{R_{\mathrm{peak}}\,\eta_{\mathrm{hw}}} + L_{\mathrm{lat}}
$$

- Overlapped lower bound:

::eq[iron-law-overlapped]
$$
T_{\mathrm{ovl}} \ge \max\!\left(\frac{D_{\mathrm{vol}}}{BW},\ \frac{O}{R_{\mathrm{peak}}\,\eta_{\mathrm{hw}}}\right) + L_{\mathrm{lat}}
$$
- Same law for training and inference; what changes is the factors:
  training $\approx 6P$ FLOPs/token and big batches (amortised weight reads, high
  $\eta$), inference $\approx 2P$ FLOPs/token and tiny batches (weight reads dominate,
  memory-bound).
- Data enters twice, differently: *samples* (logical count, sets $O$) vs
  *bytes moved* ($D_{\mathrm{vol}}$, which includes weights + intermediates).
  An LLM generating one token processes 1 sample but reads gigabytes of weights.
- Amdahl consequence: accelerating a component helps only through the share
  of time it occupies (45 ms to 15 ms inference in a 130 ms path = ~23%
  end-to-end, not 3×).
- Energy counterpart: a DRAM byte costs $\approx 145\times$ an FP16 FLOP and
  $\approx 800\times$ an INT8 op (Horowitz 2014); ==movement is the energy
  tax=={Why arithmetic intensity is the metric that matters: a DRAM byte costs ~145x an FP16 FLOP. Numbers table and [energy equation](#key-equations) further down.}.

::eq[energy-budget]
$$
E \approx D_{\mathrm{vol}} \cdot E_{\mathrm{move}} + O \cdot E_{\mathrm{compute}}
$$
- Worked anchors: memory-bound job 30 GB @ 600 GB/s + 10 GFLOP @ 200 GFLOP/s
  + 5 ms gives 35 ms sequential, 25 ms overlapped; doubling bandwidth gives
  25 ms seq / 15 ms bound (balances the stages). GPT-3 $\approx 3.1 \times 10^{23}$ FLOPs on 1,000 A100s at
  $\eta \approx 45\%$ takes ~28 days; raising $\eta$ to 60% saves ~6-7 days.

::fig[amdahl-bars]

::fig[iron-law-budget]

::chart[iron-law]

### Three dimensions of ML efficiency
- One lever per iron-law factor: **data selection** (cuts Samples/Task),
  **algorithmic efficiency** (cuts FLOPs/Sample), **compute efficiency**
  (cuts s/FLOP via η, less stalling).
- Efficiency paradox / Jevons: EfficientNet needs $44\times$ less compute than
  AlexNet for equal accuracy, but savings can be reinvested into scale rather
  than banked. Algorithmic-efficiency halving ~16 months vs Moore's 24; AI
  training-compute doubling ~3.4 months (2012-18): demand outruns silicon
  $\sim\!7\times$.
- **Return on compute**: compare each option
  to the same baseline and to the break-even (what one accuracy point is
  worth). +2 pts for \$20k clears a \$15k/point bar; +3 pts for \$120k doesn't.
  Biggest gain ≠ best spend.

::eq[return-on-compute]
$$
\mathrm{RoC} = \frac{\Delta\,\mathrm{Accuracy}}{\Delta\,\mathrm{ComputeCost}}
$$

### AI engineering as a discipline
- Definition: designing, deploying, and maintaining ML systems whose
  predictive quality *and* execution meet stated requirements, integrating
  D·A·M decisions with statistical evidence for behaviour and measurement for
  resources.
- Fixed target ≠ certain evidence: "≥95% recall over a stated population" is
  estimated from samples with uncertainty; latency claims likewise.
- Not "software engineering for ML": code tests can't establish statistical
  claims, so continuous evaluation is part of the design.
- Deployment paradigms (cloud / edge / mobile / TinyML) span orders of
  magnitude in power and compute; same lifecycle, different binding
  constraint. Book's scope: the **single-node** regime (1 host, 1-8
  accelerators).
- Five **lighthouse models** recur all book: ResNet-50, GPT-2/Llama, DLRM,
  MobileNetV2, keyword spotting. Each probes a different regime of the iron
  law.

### Book organization + fallacies
- "Context before theory": Parts I-IV follow constraint order, not the org
  chart: envelopes/data first, then models, then optimization, then
  production.
- Fallacies worth internalising: better algorithm ≠ better system; benchmark
  score ≠ production readiness; deploy-and-forget; component speedup ≠ system
  speedup; ML expertise alone insufficient.

> [!caution] Deploy-and-forget is the composite fallacy
> Ship a model, alert on host metrics, and you have built a green dashboard
> over a decaying model. The other four fallacies are the paths that get you
> there.

## The physics: numbers to keep

| Quantity | Value | Use |
|---|---|---|
| Iron law (product) | $T = \frac{\text{samples}}{\text{task}} \cdot \frac{\text{FLOPs}}{\text{sample}} \cdot \frac{s}{\text{FLOP}}$ | factor the work by D·A·M |
| Iron law (unpacked) | $T \approx D_{\mathrm{vol}}/BW + O/(R_{\mathrm{peak}}\,\eta) + L$ | diagnose the binding term |
| Overlapped bound | $T \ge \max(T_{\mathrm{mem}}, T_{\mathrm{comp}}) + L$ | ideal pipelining |
| Degradation | $\mathrm{Acc}(t) \approx \mathrm{Acc}_0 - \lambda\,D(P_t \,\Vert\, P_0)$ | drift costs quality (local fit) |
| Energy | $E \approx D_{\mathrm{vol}} \cdot E_{\mathrm{move}} + O \cdot E_{\mathrm{compute}}$ | movement tax dominates |
| RoC | $\mathrm{RoC} = \Delta\mathrm{Acc}\,/\,\Delta\mathrm{cost}$ | is more compute worth it |
| 6P / 2P | FLOPs per token, training / inference | dense-transformer estimate |
| DRAM byte : FLOP | $\approx 145\times$ FP16, $\approx 800\times$ INT8 | why memory-bound is the norm |
| Verification gap | $256^{150{,}528}$ inputs vs 50k val images | eval is statistical, not proof |
| GPT-3 | $\sim 3.1 \times 10^{23}$ FLOPs, ~1,287 MWh, ~552 tCO₂e | training at scale |
| AlexNet | 2 GPUs, 6 days, 1.2M images, 84.7% top-5 | 2012 inflection |
| GPT-4-class | ~2.5M accelerator-days (est.) | frontier scale |
| Compute growth | $\sim 10^{8}\times$ AlexNet to GPT-4; ~3.4-mo doubling | demand vs Moore's ~7× |
| Algo efficiency | $44\times$ AlexNet to EfficientNet; ~16-mo halving | the other lever |

## Glossary

- **Dual mandate**: trustworthy learned behaviour + execution inside time/memory/energy/cost budgets
- **Data-as-code**: data changes behaviour like code does; treat it with the same discipline
- **D·A·M**: Data/Algorithm/Machine diagnostic triad; find the limiting constraint
- **Silent degradation**: quality loss while runtime stays green
- **Training-serving skew**: divergent transform implementations between the two paths
- **Verification gap**: total input space minus test coverage ≈ total input space
- **Arithmetic intensity**: $O/D_{\mathrm{vol}}$, FLOPs per byte moved; sets memory- vs compute-bound
- **Accelerator-day**: one reference accelerator for 24h; the currency of scale
- **Lighthouse model**: recurring archetype workload that probes one iron-law regime
- **RoC**: return on compute, Δaccuracy per added dollar

## Ben's world

- **The LLM benchmark harness *is* the D·A·M story.** "The system is the
  model" appeared literally: early Ollama runs scored `100 EMPTY` through a
  structural fallback, because the harness (no `sandboxPolicy`, so no
  behavioural checks) was part of the measured capability. And `qwen3.8:27b-mlx` scoring
  94.7 vs 69.1 by flipping `think:true`/`num_predict` is the compute-efficiency
  lever in miniature: same model, different realized s/FLOP regime (31 vs 50
  tok/s). Benchmarking *is* measuring a system, not a model, which is why
  `BUST=1` was needed for an honest read.
- **The droplet RoC argument is the chapter's economics.** Four polling
  products on one ~\$24/mo box beat per-request serverless for that workload.
  That's RoC reasoning: cost of the increment vs value of the increment. Same
  move as the \$20k-data vs \$120k-model example.
- **Silent degradation is the uptime/greenveil problem shape.** Health checks
  green while predictions decay is why `origin.telesis.dev` exists, and why
  greenveil's product-page SSR fan-out needed bot-gating: the runtime was
  fine, the *economics* were degrading.
- **Verification gap maps to crawl/eval coverage.** BrandBrain's golden
  regression set vs the open web; enum-capped search's covering-query
  completeness argument. Same shape: sampled evidence about an unbounded
  space.

## Open questions for review

> [!method] Answer before you look
> Take each question out loud before re-reading the section. If the answer
> stalls, that's the section to revisit, not the question to skip.

1. The degradation equation's $\lambda$ is fitted *locally*: how do you bound how
   local before the linear model itself lies? (Ch 4/14 own the drift
   statistics; worth tracking when we get there.)
2. $\eta_{\mathrm{hw}}$ as an "end-to-end factor" (GPT-3 estimate) vs compute-only utilisation
   (iron-law term): the chapter flags the overloading. When estimating our
   own runs, which convention does our harness effectively use?
3. Book is single-node scoped; our bench runs are also single-node (M5 Max /
   Ollama). Vol II covers fleets. Do we defer distributed thinking entirely?
4. Which lighthouse regime does `qwen3.8:27b-mlx` inference sit in? Decode is
   memory-bound by the chapter's account; is the +25.6-pt thinking gain
   really a latency/quality trade, or a scheduling one?


## Essay candidates (for the POST phase)

The chapter's strongest counter-intuitive claims, ranked for a first post:

1. **"A green dashboard is not evidence the model works"**: silent
   degradation + the degradation equation. Strong: inverts the usual ops
   intuition, maps to real war stories (GFT, the benchmark `100 EMPTY` run).
2. **"Execution time is a product of three factors you can name"**: the iron
   law as the ML analogue of the processor performance equation. Strong for
   the numbers-driven house style; natural interactive (sliders on D_vol/BW/O/η).
3. **"Data is code"**: Software 2.0 + verification gap + GFT. Most essayistic;
   overlaps existing `how-python-dicts-really-work` style CS posts.
