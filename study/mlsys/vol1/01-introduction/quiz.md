# Self-test: Vol I, Ch 1: Introduction

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
