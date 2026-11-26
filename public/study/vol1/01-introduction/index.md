---
title: "Study packet: Vol I, Ch 1: Introduction — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol1/01_introduction/01_introduction.html"
canonical_url: "https://benebsworth.com/study/vol1/01-introduction/"
---
# Study packet: Vol I, Ch 1: Introduction

Book: *Machine Learning Systems*, Vijay Janapa Reddi (mlsysbook.ai, CC-BY-NC-SA 4.0)
Source: `study/cs249r_book/books/vol1/01_introduction/01_introduction.qmd`
Produced: 2026-11-11

## Thesis

Machine learning systems have a physics. A voice-assistant answer crosses a
phone, a network, and a datacentre, each stage under its own memory, latency,
and energy budget, and the prediction only matters if it arrives inside them.
That gives every ML system a ****dual mandate** *(why it matters: Two constraints, not one: the model must be statistically right and the machine must physically deliver it. Every failure later in the chapter is one side or the other breaking.)***: learned behaviour must be
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
  ILSVRC validation images. **Evaluation is statistical evidence over a sampled
  population, never proof.** *(why it matters: This is the verification gap: a benchmark score bounds performance on the sampled distribution, not on your traffic. See the [silent degradation chart](#charts) for what happens when the distributions drift apart.)*

> **connection: Same sampling shape as our eval suites**
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

> [Book figure] [AI development timeline](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Publication-attention curve with the two AI winters shaded and milestone callouts. The curve tracks attention, not capability; the winters are attention crashes, not capability crashes.
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

> [Book figure] [The D·A·M axis triad](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Each vertex is a diagnostic axis and every edge points both ways: relax one bottleneck and it migrates to a neighbor. Our dam-loop.svg distils the loop instead of the triangle.
![D·A·M: the diagnosis is a loop](https://benebsworth.com/study/vol1/01-introduction/diagrams/dam-loop.svg)

*Three constraint axes: Data, Algorithm, Machine. Relax one and the limit reappears on a neighbour: symptom → attribute → intervene → re-measure, forever.*
### When ML systems fail silently
- Silent degradation: **runtime healthy, predictions wrong** *(why it matters: The failure mode dashboards cannot see. All health metrics green while the model quietly goes stale. Quantified in the [degradation chart](#charts); the essay angle lives on this line.)*. Pedestrian
  recall drops 95% to 85% under winter conditions while frame rate and health
  checks stay green; misses go from 1-in-20 to 3-in-20.
- **Degradation equation**: accuracy falls with distribution divergence,
  scaled by a locally-fitted sensitivity $\lambda$. A warning signal (drift),
  not a proof of loss; labelled outcomes decide.

**Eq 4 · Silent degradation under drift**
$$
\mathrm{Acc}(t) \approx \mathrm{Acc}_0 - \lambda\, D\!\left(P_t \,\|\, P_0\right)
$$
- Two routes in: external **data drift** (population shifts) and internal
  **training-serving skew** (different transform code in the two paths, a
  software defect whose symptom is statistical).
- Consequence: host metrics (CPU, memory, HTTP 200s) are necessary but can't
  measure prediction quality. Monitoring must span ingestion to inference.

> **observation: The health check answers the wrong question**
> A 10-point recall drop tripled the miss rate while every infra metric stayed
> green. 'Is the process alive?' is a different question from 'is the model
> right?', and only the second one notices this failure.


**Silent degradation: green alerts, falling quality**

| days since deploy | Predictive quality | Infra health (alert metric) |
|---|---|---|
| 2026-01-05 | 92 | 99.9 |
| 2026-01-12 | 91.8 | 99.9 |
| 2026-01-19 | 91.9 | 99.8 |
| 2026-01-26 | 91.5 | 99.9 |
| 2026-02-02 | 90.2 | 99.9 |
| 2026-02-09 | 88.1 | 99.8 |
| 2026-02-16 | 85.4 | 99.9 |
| 2026-02-23 | 82 | 99.9 |
| 2026-03-02 | 78.9 | 99.8 |
| 2026-03-09 | 76.5 | 99.9 |
| 2026-03-16 | 75.1 | 99.9 |
| 2026-03-23 | 74.2 | 99.8 |
| 2026-03-30 | 73.8 | 99.9 |

*Illustrative deployment: infrastructure health stays flat and green while predictive quality decays after the data drifts (~day 28). Nothing pages. The gap between the two lines is what monitoring misses.*

![Silent degradation](https://benebsworth.com/study/vol1/01-introduction/diagrams/silent-degradation.svg)

*Infra health stays green while predictive quality decays after drift; the gap nobody alerts on. Drift metrics warn; labelled outcomes convict.*
> [Book figure] [Health vs recall divergence](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Runtime health flat while recall slides 95% to 85%: the silent-degradation gap in one margin sketch. Our silent-degradation.svg adds the equation annotation and the monitoring window.
### Iron law of ML systems
- Product form (dimensional cancellation over D·A·M): the first two factors
  multiply to total operations $O$.

**Eq 1 · Iron law of ML systems: product form**
$$
T = \frac{\mathrm{samples}}{\mathrm{task}} \times \frac{\mathrm{FLOPs}}{\mathrm{sample}} \times \frac{s}{\mathrm{FLOP}}
$$

- Unpacked form (sequential):
  **memory time + compute time + fixed overhead** *(why it matters: Three terms you can name, measure, and optimize independently. The [iron-law explorer](#charts) below lets you move the compute rate and watch the binding term switch.)*.

**Eq 2 · Iron law of ML systems: sequential bound**
$$
T_{\mathrm{seq}} \approx \frac{D_{\mathrm{vol}}}{BW} + \frac{O}{R_{\mathrm{peak}}\,\eta_{\mathrm{hw}}} + L_{\mathrm{lat}}
$$

- Overlapped lower bound:

**Eq 3 · Iron law: overlapped lower bound**
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
  $\approx 800\times$ an INT8 op (Horowitz 2014); **movement is the energy
  tax** *(why it matters: Why arithmetic intensity is the metric that matters: a DRAM byte costs ~145x an FP16 FLOP. Numbers table and [energy equation](#key-equations) further down.)*.

**Eq 5 · Energy counterpart of the iron law**
$$
E \approx D_{\mathrm{vol}} \cdot E_{\mathrm{move}} + O \cdot E_{\mathrm{compute}}
$$
- Worked anchors: memory-bound job 30 GB @ 600 GB/s + 10 GFLOP @ 200 GFLOP/s
  + 5 ms gives 35 ms sequential, 25 ms overlapped; doubling bandwidth gives
  25 ms seq / 15 ms bound (balances the stages). GPT-3 $\approx 3.1 \times 10^{23}$ FLOPs on 1,000 A100s at
  $\eta \approx 45\%$ takes ~28 days; raising $\eta$ to 60% saves ~6-7 days.

> [Book figure] [Amdahl latency bars](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Model time shrinks 3x, pre- and post-processing unchanged: the Amdahl tax on the 30 ms win. Our iron-law-budget.svg generalises the same accounting to the three-term budget.
![The iron-law timing budget](https://benebsworth.com/study/vol1/01-introduction/diagrams/iron-law-budget.svg)

*Sequential vs overlapped bounds, then a 2× arithmetic upgrade. You only ever gain through the term that dominates: upgrade the 100, not the 25.*

**Iron-law budget explorer**

> [Interactive chart] An iron-law explorer: baseline movement/compute/overhead terms with a rate slider — see the rendered page.

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

**Eq 6 · Return on compute**
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

> **caution: Deploy-and-forget is the composite fallacy**
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

> **method: Answer before you look**
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


---

## Key equations

**Eq 1 · Iron law of ML systems: product form**

$$
T = \frac{\mathrm{samples}}{\mathrm{task}} \times \frac{\mathrm{FLOPs}}{\mathrm{sample}} \times \frac{s}{\mathrm{FLOP}}
$$

*Dimensional cancellation over the D-A-M axes: the first two factors multiply to total operations $O$.*

**Eq 2 · Iron law of ML systems: sequential bound**

$$
T_{\mathrm{seq}} = T_{\mathrm{mem}} + T_{\mathrm{comp}} + T_{\mathrm{ovh}}
$$

*Total latency is the *sum* of data movement, compute, and overheads when the stages run in series.*

**Eq 3 · Iron law: overlapped lower bound**

$$
T_{\mathrm{ovl}} = \max\!\left(T_{\mathrm{mem}},\, T_{\mathrm{comp}}\right) + T_{\mathrm{ovh}}
$$

*Perfect prefetch/compute overlap can hide the smaller of the two dominant terms, but never both, and never the overhead.*

**Eq 4 · Silent degradation under drift**

$$
\mathrm{Acc}(t) \approx \mathrm{Acc}_0 - \lambda\, D\!\left(P_t \,\|\, P_0\right)
$$

*Accuracy decays roughly in proportion to divergence $D$ between the serving-time distribution $P_t$ and the training-time distribution $P_0$, while every infra metric stays green.*

**Eq 5 · Energy counterpart of the iron law**

$$
E \approx D_{\mathrm{vol}} \cdot E_{\mathrm{move}} + O \cdot E_{\mathrm{compute}}
$$

*The same two work terms priced in joules instead of seconds. A DRAM byte costs ~145x an FP16 FLOP, so movement dominates.*

**Eq 6 · Return on compute**

$$
\mathrm{RoC} = \frac{\Delta \mathrm{Accuracy}}{\Delta \mathrm{Compute}}
$$

*Accuracy gained per unit of additional compute. The chapter's efficiency lens: spending compute on the wrong term buys nothing.*

## From the book

- [AI development timeline](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Publication-attention curve with the two AI winters shaded and milestone callouts. The curve tracks attention, not capability; the winters are attention crashes, not capability crashes.
- [The D·A·M axis triad](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Each vertex is a diagnostic axis and every edge points both ways: relax one bottleneck and it migrates to a neighbor. Our dam-loop.svg distils the loop instead of the triangle.
- [Health vs recall divergence](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Runtime health flat while recall slides 95% to 85%: the silent-degradation gap in one margin sketch. Our silent-degradation.svg adds the equation annotation and the monitoring window.
- [Amdahl latency bars](https://mlsysbook.ai/vol1/01_introduction/01_introduction.html) — Model time shrinks 3x, pre- and post-processing unchanged: the Amdahl tax on the 30 ms win. Our iron-law-budget.svg generalises the same accounting to the three-term budget.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

Mix of the book's own quiz bank (`introduction_quizzes.json`), Feynman prompts,
and one numeric exercise. Write your answers before opening the key.

Pass bar: ≥ 80% and no missed core claim (dual mandate, D·A·M, silent
degradation, iron law, RoC).

## Section A: from the book's quiz bank

**A1 (MCQ).** A production autonomous vehicle perception model reliably detects
obstacles under clear daytime conditions, but fails to identify a pedestrian at
dusk even though all code executes without exceptions and strictly within its
50 ms latency window. Which core challenge does this failure show?

- a) Latency added by serial interconnect communication across accelerators
- b) A hardware execution failure caused by GPU thermal throttling
- c) The dual mandate: learned behaviour must stay statistically trustworthy
     while executing within physical budgets
- d) The failure of CI pipelines to compile SGD operations

**A2 (MCQ).** Which historical transition correctly pairs an AI era with the
systems bottleneck that limited its scale?

- a) Symbolic AI: knowledge-acquisition bottleneck
- b) Expert systems: logic bottleneck
- c) Statistical learning: feature-engineering bottleneck
- d) Deep learning: data-availability bottleneck

**A3 (SHORT).** Google Flu Trends had access to hundreds of billions of
real-time search queries and still failed. Why, and what does the failure say
about data volume as a substitute for ground truth?

**A4 (MCQ).** In the degradation equation $\mathrm{Acc}(t) \approx \mathrm{Acc}_0 - \lambda\, D(P_t \,\|\, P_0)$, what
does the term $\lambda$ represent?

- a) The learning rate used during model training
- b) The sensitivity of accuracy to distribution divergence, fitted locally
- c) The fraction of the dataset reserved for validation
- d) The decay constant of the hardware's thermal envelope

**A5 (MCQ).** When data transfers and arithmetic overlap in a pipelined
runtime, which expression gives the lower bound on execution time?

- a) $T = D_{\mathrm{vol}}/BW + O/(R\,\eta) + L$
- b) $T = \max(D_{\mathrm{vol}}/BW,\ O/(R\,\eta)) + L$
- c) $T = O/(R\,\eta) \times L$
- d) $T = (D_{\mathrm{vol}}/BW) \times (O/(R\,\eta))$

**A6 (TF).** Improving initial training accuracy $\mathrm{Acc}_0$, with drift sensitivity
$\lambda$ held fixed, is sufficient to guarantee the model resists production
distribution shift. True or false, and say why.

## Section B: Feynman prompts (explain in ≤ 5 sentences each, no jargon)

**B1.** Explain the iron law of ML systems to a junior engineer who knows
Python but has never profiled hardware. Use the three factors by name.

**B2.** "The model is not the system." Explain what that means using the spam
filter that has to keep working while spammers change tactics.

**B3.** Why is a benchmark score statistical evidence rather than proof of
production readiness? Bring in the verification gap.

## Section C: numeric exercise

**C1.** A sequential job on one accelerator moves 20 GB at 800 GB/s, performs
40 GFLOP at an effective rate of 400 GFLOP/s, and pays 5 ms of fixed overhead.

a) What is the predicted sequential execution time? Which term dominates?

b) With ideal overlap of movement and compute (overhead stays outside),
   what is the lower bound?

c) You double bandwidth to 1600 GB/s. Recompute both numbers. What did the
   upgrade actually buy, and what binds now?

d) The vendor offers a 2× arithmetic rate instead of the bandwidth upgrade.
   Same total spend. Which do you pick and why?

---
---

## Answer key

**A1: c.** Everything executed correctly; the learned behaviour itself was
untrustworthy under shifted conditions. The dual mandate requires *both*
statistical trustworthiness and physical delivery. (a) and (b) are machine
faults that monitoring would catch; (d) is a category error.

**A2: c.** Statistical ML (SVMs over SIFT/HOG features) was limited by
hand-engineered features. Symbolic AI hit the *logic* bottleneck, expert
systems the *knowledge-acquisition* bottleneck, deep learning the
*infrastructure* bottleneck; the options swap the first two on purpose.

**A3.** The proxy drifted: query volume measured public attention and product
behaviour (autocomplete, news coverage), not influenza incidence: 2× the CDC
rate in 2012–13, overestimating 100 of 108 weeks from Aug 2011. Data volume is
not ground truth: a behavioural proxy needs a feedback loop to a trusted
measurement and continual re-validation.

**A4: b.** $\lambda$ is a locally-fitted sensitivity: how much accuracy drops
per unit of observed divergence. It is estimated from observed shifts/outcomes,
not a universal constant, which is also why the equation is a local trend, not
a law.

**A5: b.** Ideal overlap hides the faster stage behind the slower: the bound
is max of the two plus non-overlapped overhead. (a) is the sequential model.

**A6: False.** A better baseline doesn't establish robustness to drift:
$\mathrm{Acc}_0$ and $\lambda$ are separate quantities in the equation. Better
data/objectives can lower $\lambda$, but only evaluating under the shifted
conditions establishes it. (Holding $\lambda$ fixed, a higher $\mathrm{Acc}_0$
just decays from a higher floor.)

**B1: sample answer.** Every ML task takes wall-clock time equal to three
multiplied factors: how many samples the task processes (Data), how much
arithmetic each sample needs (Algorithm), and how fast the machine really
executes each operation (Machine). The last factor isn't the datasheet peak:
it unpacks into bytes moved over bandwidth, operations over realised rate,
plus fixed overhead. So "make it faster" means: fewer samples, fewer FLOPs per
sample, or a higher realised rate, and the right lever is whichever term
currently dominates.

**B2: sample answer.** The classifier's learned weights are maybe a few
percent of the production system. Around them sit ingestion, labelling,
feature pipelines, training, deployment, serving, and monitoring, each
carrying assumptions no model test exercises. When a new phishing template
appears, the data layer must capture it, training must absorb it, and
serving must ship the update inside the latency budget. Any of those can fail
while the model code is untouched; the failures live at the interfaces.

**B3: sample answer.** A test set is a sample of the input space, and the
space is unenumerable: ImageNet's 50,000 validation images against
256^150,528 possible inputs. A score is statistical evidence about the
population the sample represents, and production populations drift. So a
score supports a deployment claim only for the stated population and
protocol, and needs monitoring to keep holding.

**C1.** a) Movement = 20 GB / 800 GB/s = 25 ms; compute = 40 / 400 = 100 ms;
overhead 5 ms, so **T ≈ 130 ms, compute-dominated.**
b) `max(25, 100) + 5 = ` **105 ms**.
c) Movement = 12.5 ms, sequential = 117.5 ms; overlap bound = 105 ms
   (compute still binds). The bandwidth upgrade bought ~12.5 ms sequential
   and **nothing** on the ideal bound; arithmetic now sets the ceiling.
d) Take the 2× arithmetic: compute drops to 50 ms, sequential 80 ms,
   overlap bound 55 ms. Compute was the dominant term; improving the smaller
   term (memory) is the classic Amdahl mistake, since you only ever gain
   through the share of time the upgraded part occupies.

## Score yourself

- A (6): ___ /6 · B (3): ___ /3 · C (4 parts): ___ /4 — total ___ /13
- Weak spots: revisit the matching packet section; log the score in
  `study/mlsys/progress.md` when run interactively.

## Audio overview

[Listen to the Marcus & Iris read-along (~6 min)](https://benebsworth.com/study-audio/vol1/01-introduction.m4a) — a generated podcast walking this packet's argument.
