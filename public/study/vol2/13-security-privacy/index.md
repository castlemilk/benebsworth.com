---
title: "Security and Privacy — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html"
canonical_url: "https://benebsworth.com/study/vol2/13-security-privacy/"
---

# Security and Privacy: Study Packet

Your fleet dashboard is all green — latency inside target, availability at five nines, aggregate accuracy steady. Can an adversary still steal the model, poison it, or lift its training data through the same interfaces that make it useful? What does each defense actually cost?
*Machine Learning Systems, vol. 2, chapter 13, Security and Privacy (mlsysbook.ai)*

## Thesis

**A correctly functioning ML service can still be stolen, poisoned, or made to disclose its training data** *(why it matters: Operational health measures whether the system does its job. Security and privacy measure what an adversary can make it do through the interfaces it exposes on purpose. Green dashboards answer a different question.)*. Attacks arrive through the query API, the training pipeline, the shared fabric and the hardware itself, so a threat model writes down the asset, the trust boundary, the adversary's capability and the control, and keeps model visibility separate from write capability. **Every defense is priced on the Fleet Law's C3 axes** *(why it matters: Encryption that slows bandwidth-bound collectives spends CommunicationTime. Partitioning that strands capacity spends the occupancy invariant. Attestation that delays re-admission spends SynchronizationTime and the checkpoint interval. There is no free isolation.)*. Privacy is the sharper case: **a correctly executing model leaks through authorized outputs** *(why it matters: Storage encryption and access control protect records at rest and in transit. They say nothing about what a released model reveals to a caller who is fully allowed to ask it questions. That is a property of the release, and only differential privacy bounds it.)*.

> **note: How to read the marks**
> Amber dotted phrases carry "why it matters" cards. Hover, tap or tab to each one for the reasoning that did not fit the sentence.

## Guided notes

### Green Dashboards, Open Doors

- The chapter's opening claim is that ML systems have an **algorithmic attack surface** *(why it matters: Attacks that work through the model's own learned behavior on legitimate-looking inputs. A firewall sees authenticated requests carrying valid payloads; nothing at the perimeter looks wrong.)* orthogonal to the infrastructure perimeter. Traditional controls (firewalls, mTLS, rate limits, encryption) protect the network boundary. They do not protect what an authorized caller can make the model reveal.
- The attack surface decomposes along the lifecycle the fleet already owns: data ingestion, distributed training, the model registry and artifact store, the serving API, and edge or federated adaptation. Each stage has its own threat class and its first control.
- Two failure modes the book insists on separating: **security protects against intentional adversaries** *(why it matters: CIA properties: confidentiality of weights and data, integrity of training and serving behavior, availability of the service. The adversary is assumed to act deliberately.)* while **privacy protects against inference, authorized or not** *(why it matters: The question is what a release discloses about a protected contribution, whether or not anyone attacks. An honest deployment can leak; an attacked one can also fail integrity. The two problems share infrastructure but not guarantees.)*.
- Serving adds two threats with no infrastructure analog. **Prompt injection crosses the boundary between instructions and data** *(why it matters: Content the model reads is untrusted input that can attempt to act as commands. The fix is architectural: separate the control plane (instructions, policy) from the data plane (retrieved content, user text), and enforce policy outside the model.)* and **denial of wallet spends the cost budget while the endpoint stays available** *(why it matters: An attacker maximizes generated tokens, retrieved documents or cache misses. Autoscaling preserves apparent availability while spend and tail latency breach their budgets. Meter work and cost per authenticated principal, not request counts.)*.

![The attack surface is the lifecycle](https://benebsworth.com/study/vol2/13-security-privacy/diagrams/attack-surface.svg)

*Each lifecycle stage exposes a different objective and a first control: ingestion takes poisoning, training takes update attacks, the registry takes artifact theft, serving takes extraction and injection, and the edge takes compromised endpoints. No availability or accuracy signal moves when one succeeds.*
### Security and Privacy Are Different Problems

- Security asks whether an adversary can make the system misbehave. Privacy asks how much a release reveals about the people in its training data. A membership-inference attack illustrates the gap: the caller is authorized, the model behaves correctly, and yet one bit of information about a record's inclusion leaks through confidence scores.
- **De-identification is not privacy** *(why it matters: Removing names and IDs from a table constrains only the shape of the release. Auxiliary data re-identifies: the Netflix Prize dataset was deanonymized from 8 ratings plus dates at 99 percent success. Neural networks are correlation engines; they can memorize what a cleaned table still contains.)*.
- The chapter's four breach cases each teach one boundary failure. **The Strava heatmap showed aggregation alone is not protection** *(why it matters: In 2018 a published aggregate activity map exposed military-base routines because sparse regions retained distinctive structure. Dense regions hid; sparse regions singled out. Aggregation protects privacy only when the protected unit is stated and the release is bounded.)*.
- **Stuxnet is the template for silent integrity attacks** *(why it matters: The 2010 worm used four zero-day exploits, altered centrifuge control frequencies between 807 and 1,410 Hz while telemetry reported normal, and destroyed roughly a thousand rotors. The ML analog is exact: a poisoned dataset or backdoored model preserves aggregate validation accuracy while changing targeted behavior, and health monitoring has nothing to see.)*.
- The Jeep Cherokee hack (2015) reached brakes and steering through the infotainment system's cellular link. The lesson is authority across a trust boundary: a perception model's output is evidence, not actuator authority, and controllers need fail-safe validation. **Mirai (2016) showed endpoints are weapons** *(why it matters: Weak IoT credentials built a botnet that peaked near 600,000 infections. In ML fleets the same compromised edge device can inject poisoned federated updates, exfiltrate local telemetry and mask the attacker's identity behind the device's own credentials.)*.

### Write the Threat Model Before the Defense

- An operational threat model has four fields: **the asset** *(why it matters: What must stay confidential, intact or available: weights, training records, decision boundaries, serving capacity.)*, **the boundary** *(why it matters: Where trust changes: external prompt to system instruction, raw data to registry, shared tenant processes on one accelerator.)*, **the adversary** *(why it matters: Permitted capabilities, auxiliary knowledge and goal, stated separately from model visibility.)*, and **the control** *(why it matters: The permission, mechanism or observable signal that constrains the attack or supports a response.)*.
- Visibility and write capability are different axes. **Black-box query access supports extraction and membership inference** *(why it matters: The adversary sees inputs and outputs only. It can train a surrogate or probe for memorized records, but cannot touch gradients or weights directly.)* **White-box access adds parameters and architecture** *(why it matters: Gradient inversion, targeted poisoning and fine-grained extraction become possible. Gray-box sits between: partial architecture knowledge improves surrogate fidelity without full access.)*.
- Timing is the third axis: training-time attacks need write access to data or updates; inference-time attacks need only query access; post-deployment attacks target configuration, logs and dependencies.
- **Prioritize by likelihood times impact, then let deployments move threats between quadrants** *(why it matters: The book's matrix puts untrusted pickles and data poisoning in the critical quadrant (high likelihood, high impact), laser fault injection and silicon Trojans in prepare (low likelihood, high impact), and API extraction in mitigate (high likelihood, moderate impact). The placement is deployment-specific: sensitive data or greater copying harm promotes a threat.)*.
- Two design principles do most of the work. **Defense in depth assumes one layer fails** *(why it matters: No single control is trusted alone; the stack in the defenses section is the same idea applied to ML.)* **Fail-safe defaults deny what cannot be authorized** *(why it matters: A request whose authority cannot be established gets no additional privileges. A behavioral anomaly is different: it calls for a response chosen by evidence and consequence, not by the anomaly score alone.)*.

### Five Ways In at Five Lifecycle Gates

- **Theft, leakage, poisoning, adversarial inputs and availability abuse are five objectives** *(why it matters: Each enters at a different lifecycle gate and needs a different control. Collapsing them into "security" produces controls that miss their target: output truncation does nothing for checkpoint theft, and air gaps do nothing for API extraction.)*.
- Model theft splits in two. **Exact artifact theft takes the file** *(why it matters: Serialized checkpoints in a bucket or registry. The thief gets identical weights with zero training cost, so the controls are storage encryption, signed artifacts, strict IAM and SafeTensors packaging, which removes the pickle deserialization path to arbitrary code execution.)* **Approximate behavioral theft takes the queries** *(why it matters: Millions of synthetic inputs distill a surrogate with different weights but similar outputs. Rate limits, quota accounting, output shaping and behavioral monitoring are the controls, priced in the next section.)*.
- **Leakage through authorized outputs needs only query access** *(why it matters: Membership inference returns one bit per probe, model inversion reconstructs class properties from confidence scores, and memorization returns verbatim training records. All three grow with overfitting, and storage controls cannot see any of them.)*.
- **Poisoning is a bilevel attack** *(why it matters: The poisoner needs write access to something the model learns from and solves an optimization over the defender's training: choose the poisoned set that maximizes damage after the inner training loop runs.)*:

**Eq 13.1 · Data poisoning as a bilevel problem**
$$
\max_{\mathcal{S}_{\mathrm{poison}}}\ \mathcal{L}\!\left(f_{\mathcal{S}\cup\mathcal{S}_{\mathrm{poison}}},\ \mathcal{S}_{\mathrm{test}}\right)
\qquad\text{inner: }\ \theta^{*}=\arg\min_{\theta}\ \mathcal{L}\!\left(\theta;\ \mathcal{S}\cup\mathcal{S}_{\mathrm{poison}}\right)
$$

- The untargeted outer objective degrades the test distribution broadly; the targeted form instead minimizes loss on one chosen example, and backdoors associate a rare trigger with an attacker-chosen outcome while clean accuracy stays flat. **Clean-label poisoning keeps every label correct** *(why it matters: Nightshade poisons a text-to-image concept with a few hundred images whose captions still describe their content; validation audits that check labels find nothing. The dose-response grid in the book shows outputs morphing toward the destination concept at doses of 50 to 300 samples across eight prompt concepts.)*.
- **Adversarial examples are the inference-time sibling** *(why it matters: A perturbation bounded by $\lVert\delta\rVert$ in input space flips a deployed decision while staying invisible to humans. White, gray and black-box variants differ in gradient access, and surrogate-plus-transfer attacks carry perturbations across models, which is why secrecy of architecture is not a defense. The mechanics and defenses belong to the robustness chapter.)*.
- LLM serving adds its own vectors. **Prompt injection, training-data extraction and jailbreaking all exploit the entanglement of instructions and data** *(why it matters: The control plane (system instructions, policy) and the data plane (user text, retrieved documents) must be separate objects with policy enforced outside the model. Model output is untrusted input; high-impact operations need a separate approval point.)*.

### Theft Is Priced in Queries

- **A daily rate limit slows extraction without capping its lifetime total** *(why it matters: Ten thousand queries per day still collects 3.65 million per year per principal. The bound that matters is cumulative per-principal budget across accounts, tiers and time, plus the output contract that decides how much each response teaches.)*.
- The book's OpenAI extraction table makes the economics concrete. Recovering the output projection of `ada` took under 2 million queries at root-mean-square error near $5 \times 10^{-4}$ for about 1 dollar of API spend; `babbage` needed under 4 million for about 2 dollars; the instruct models needed under 40 million for hundreds to thousands of dollars. **Extraction is cheap relative to training** *(why it matters: Which is why the defense question is not "can it be stolen" but "what does the thief's bill look like versus the defender's".)*.
- Four levers shape that bill: output precision reduction, query quotas, pricing and behavioral monitoring. **Rounding and truncation remove information per response** *(why it matters: Rounding ImageNet's 1,000-class softmax from 6 to 2 decimals removes about 13.3 bits per class and retains about 6.7; returning only the top 5 classes eliminates over 99 percent of the distribution entries. Neither is a privacy guarantee; both raise the query cost of a fixed-fidelity surrogate.)*.

**Eq 13.11 · Output-contract information budget**
$$
\text{bits removed}\approx\Delta d\cdot\log_{2}10\approx3.32\,\Delta d
\qquad
\text{entries kept}=\frac{K}{N}
$$

- The economics have a clean break-even. **Extraction beats training only below a per-query price** *(why it matters: With 100 million queries needed and 5 million dollars of training cost, the break-even price is 5 cents per query. Pay-as-you-go pricing at or above that makes the full extraction set cost about what training did; a lifetime per-principal budget bills the same set the same way.)*:

**Eq 13.2 · Extraction break-even price**
$$
N_{q}\,p_{q} \;<\; C_{\mathrm{train}}
\qquad\Longrightarrow\qquad
p^{*}=\frac{C_{\mathrm{train}}}{N_{q}}=\frac{\$5\mathrm{M}}{100\mathrm{M}}=\$0.05/\mathrm{query}
$$

- The ResNet-50 scenario prices the regimes end to end. Training costs about 5 thousand dollars; a surrogate at 90 percent fidelity needs about 5 million queries, roughly 1 million per class. On a free tier of 100 queries per day the attacker's 25,000 daily queries would need about 200 days; on the paid tier about 500 days; pay-as-you-go pricing makes the full set cost about the training bill; and a lifetime budget allowance well below 5 million billed at the pay-as-you-go rate lands within 5 percent of it. **The defenses cost almost nothing to run** *(why it matters: Monitoring at 2.0 ms plus perturbation at 0.5 ms adds 2.5 ms to a 100 ms inference baseline, about 2.5 percent overhead, while cutting surrogate accuracy from 90 to 72 percent in the scenario.)*.
- **Behavioral monitoring catches what quotas cannot** *(why it matters: A KL-divergence detector compares an account's query distribution against the expected population; an adaptive quota multiplies the base limit by $\exp(-\gamma\,\mathrm{score)*)$, so an anomaly score of 0.8 at sensitivity 1 keeps about 45 percent of the base quota, a 55 percent rate reduction. The score drives a response policy; it is not proof of attack.}.

![Two thefts, two budgets](https://benebsworth.com/study/vol2/13-security-privacy/diagrams/extraction-budget.svg)

*Exact artifact theft needs a storage or registry compromise and is stopped by encryption, signing and access control. Behavioral theft needs only query access and is bounded by cumulative per-principal budgets and the output contract, because a daily rate limit slows collection without capping its total.*
### Authorized Callers Still Leak

- **Membership inference, model inversion and memorization are three escalating leaks** *(why it matters: Membership returns one bit: was this record in training. Inversion reconstructs class properties or representative inputs from confidence scores. Memorization returns verbatim records, as the diffusion-model example reproduced a training photo almost exactly and the GPT-2 extraction confirmed 604 unique memorized examples from 600,000 generated samples ranked by perplexity.)*.
- All three grow with overfitting, small datasets and rare records. **Adversarial training can make membership inference worse** *(why it matters: Robustness and privacy pull in opposite directions here: the same confidence sharpening that resists perturbations can sharpen the membership signal. A control that helps one threat class can feed another.)*.
- **An empirical audit is a lower bound on leakage; differential privacy is the upper bound** *(why it matters: A shadow-model audit measures what one attack under stated access assumptions could extract. A stronger attack, released parameters or auxiliary information could still succeed, and rare records can leak even when average accuracy sits near chance. The gap between the audit result and the accounted DP bound is the honest uncertainty in the privacy claim.)*:

**Eq 13.3 · Membership-inference ceiling under DP**
$$
\mathrm{TPR}\;\leq\;\min\!\left(e^{\epsilon}\,\mathrm{FPR},\;1-e^{-\epsilon}\,(1-\mathrm{FPR})\right)
$$

- The ceiling bends near FPR of 0.27 at $\epsilon=1$: beyond that point even the optimal membership test cannot beat the bound no matter how clever the shadow models are.

### Poisoning Is a Bilevel Problem

- **A few hundred poisoned examples can plant a backdoor while validation accuracy stays flat** *(why it matters: Targeted attacks preserve aggregate metrics by construction; backdoors activate only on a trigger; subpopulation attacks harm a shared-feature group. "More clean data washes out poison" is false for targeted triggers, because the poisoner's objective is not the average loss.)*.
- Entry paths match write access: label modification flips labels outright; clean-label poisoning corrupts features while keeping labels correct and passes label audits; generative injection adds synthetic poisoned samples; and in federated settings a single malicious client tilts the weighted aggregate $w_{t+1}=w_t+\sum_k (n_k/n)\,\Delta w_k$.
- **Retraining does not automatically cleanse poison** *(why it matters: If the next run reuses the compromised data or an affected checkpoint, the poison persists. Provenance tracking and dataset auditing locate the inputs; they do not by themselves verify the repaired path.)*.

### Inside the Fleet the Boundary Moves

- **The mean gradient's breakdown point is zero** *(why it matters: In synchronous data parallelism one compromised worker contributes to every replica's update, and an unbounded malicious gradient corrupts the mean regardless of how many honest workers voted. Robust aggregation rules (Krum, trimmed mean, coordinate-wise median) restore a positive breakdown point under their assumptions.)*:

**Eq 13.4 · Robust aggregation traffic multiplier**
$$
\frac{(N-1)\,M}{\,2(N-1)M/N\,}=\frac{N}{2}=32
\qquad (N=64)
$$

- The price is traffic. A gather-based median receives $(N-1)M$ bytes per worker where ring AllReduce moves about $2(N-1)M/N$; at $N=64$ that is roughly 32 times the per-worker gradient traffic, which lands directly in the CommunicationTime term of the Fleet Law unless overlapped. **Integrity inside the fleet is a capacity decision** *(why it matters: The chapter's reference cluster of 1,024 GPUs moving 350 GB of FP16 gradients per step makes the multiplier expensive in dollars, not just milliseconds.)*.


**Per-worker gradient traffic, N = 64**

| aggregation schedule | per-worker bytes, units of M |
|---|---|
| ring AllReduce | 2 |
| gather + coordinate-wise median | 63 |

*Bytes each worker moves per step for one gradient payload M. Ring AllReduce circulates about 2M; a gather-based coordinate-wise median receives all 63 peer gradients, about 63M, a 32x multiplier that lands in the CommunicationTime term of the Fleet Law.*

- **RDMA moves bytes; it does not encrypt them** *(why it matters: Plaintext collective traffic on the fabric is observable to anyone who can reach the links, switches or endpoints. Line-rate encryption halves effective bandwidth on bandwidth-bound collectives, so the confidentiality control spends the same axis it protects.)*.
- Shared accelerators leak through state, not just data. **A shared prefix cache is a cross-tenant timing channel** *(why it matters: A cache hit returns the first token measurably sooner than a miss, so a probing tenant gets evidence that a prefix was recently processed, without identifying who processed it. Per-tenant cache scoping removes the reuse path at the price of the hit rate; MPS gives address spaces without fault isolation, and MIG partitions hardware at a capacity cost the chapter prices at about 15 percent throughput in its matched-budget scenario.)*.
- **Attestation and key custody sit on the coordination axis** *(why it matters: A 128-node job restarting from a 2.45 TB checkpoint cannot resume until fresh attestation evidence is checked and release keys are delivered. That delay is admission and recovery time, priced in SynchronizationTime and the checkpoint interval, distinct from steady-state protected-execution overhead, which must be measured separately.)*.

### Hardware Is Four Decisions

- **Fleet procurement correlates hardware failures** *(why it matters: One weakness in a part number fails on every copy at once, which is why the chapter organizes hardware security as four deployment decisions: processor isolation, physical access and fault injection, side-channel observability, and provenance and lifecycle trust.)*.
- Processor isolation fails through speculative execution: **Meltdown and Spectre turn transient microarchitectural state into an observation channel** *(why it matters: Instructions whose architectural effects are discarded can still leave cache residue that a co-tenant measures. SMT restriction trades throughput on data-loading paths for isolation.)*.
- **Fault injection skips instructions, not weights** *(why it matters: Laser and voltage faults on microcontrollers have skipped the `jmp` that guards ReLU's zeroing block, forcing activations to zero and corrupting downstream classification while stored weights stay intact. Remote analogs exist: FPGA co-tenant voltage droop and the silent data corruption of the fault-tolerance chapter.)*.
- **Power analysis turns physics into a key-recovery oracle** *(why it matters: Current draw correlates with operand values and activation signs. The classic byte-at-a-time attack collapses a $256^5$ password search to $5 \times 256$ guesses by reading which prefix byte comparison takes longer; learned side-channel analysis extends the same idea, with convolutional networks recovering a full 128-bit AES key from power traces on an unprotected implementation.)*.
- **Leaky interfaces bypass every software control** *(why it matters: An unauthenticated JTAG or SWD port on a production edge device reads plaintext weights from flash independently of host permissions. Baby monitors, pacemakers and smart bulbs carry the same lesson at consumer scale.)*.
- **The supply chain has five stages and a threat at each** *(why it matters: Design (RTL backdoors), fabrication (mask Trojans), assembly (substituted parts), distribution (tampering in transit) and deployment (counterfeit manifesting as field failures). X-ray and functional tests give partial evidence; the 2018 Bloomberg Supermicro report remains an allegation-versus-evidence lesson rather than settled fact.)*.

### Defenses Are a Stack, Not a Product

- **Controls layer from silicon to data, and each tier owns a different boundary** *(why it matters: Hardware roots establish what is genuine; platform controls bound what runs beside what; model-level shaping bounds what responses teach; data-level privacy bounds what the release reveals. Removing any tier leaves its boundary open.)*:

![Defenses are a stack](https://benebsworth.com/study/vol2/13-security-privacy/diagrams/defense-stack.svg)

*Four tiers own four boundaries: hardware roots prove what is genuine, platform controls bound what runs beside what, model-level shaping bounds what responses teach, and data-level privacy bounds what the release reveals. Each tier spends a different axis of the Fleet Law.*
- The hardware tier has four primitives matched to the four decisions: TEEs for runtime isolation (TrustZone, SGX enclaves, confidential VMs), secure boot for the chain of trust from immutable ROM through signed bootloader, kernel and model manifest, HSMs for key custody at roughly 20 to 100 thousand dollars per unit, and PUFs for device-unique challenge-response identity that drifts with temperature and needs helper data.
- **The TEE memory budget is a real constraint** *(why it matters: Older SGX enclaves cap resident protected pages at 128 MiB of EPC; ResNet-50 FP32 weights alone are 102.2 MB, about 76 percent of it before activations. INT8 quantization shrinks the same model to about a tenth, and a 175B model's 350 GB of FP16 weights is orders beyond any enclave, which is why fleet-scale confidential computing uses VMs rather than enclaves.)*.
- Secure deployment is unglamorous and load-bearing: **authenticated encryption, signed manifests, hash verification and tested rollback** *(why it matters: SafeTensors removes the pickle code-execution path; secrets in environment variables leak through logs and process inspection; a release gate verifies the served checkpoint against the approved artifact before traffic moves, and preserves evidence before rollback destroys it.)*.
- Runtime monitoring splits into input validation (contract plus statistical checks, which cannot catch contract-satisfying adversarial inputs), output monitoring (confidence, entropy and class-distribution anomalies), integrity checks (hash against manifest, dependency lockfiles, attestation) and response policy (quarantine is not canary; per-principal throttling; post-incident review adds the boundary that failed to the record). **The defenses cost almost nothing** *(why it matters: The extraction scenario's 2.5 percent overhead is the pattern: shape outputs, meter work, verify artifacts, and spend the C3 budget where the threat model says it matters.)*.

### Differential Privacy Is an Account, Not a Label

- **Differential privacy bounds how much one protected contribution can change a release** *(why it matters: A randomized mechanism satisfies $(\epsilon,\delta)$-DP when, for adjacent datasets $D$ and $D'$ differing in the protected unit and every measurable output set $S$, the probability bound below holds. $\epsilon$ is the privacy budget and $\delta$ the additive slack, typically chosen below $1/n$ for $n$ records. The guarantee is a property of the algorithm: it holds against any adversary with arbitrary side information, which de-identification cannot claim.)*:

**Eq 13.5 · Approximate differential privacy**
$$
\Pr[\mathcal{M}(D)\in S]\;\leq\;e^{\epsilon}\,\Pr[\mathcal{M}(D')\in S]\;+\;\delta
\qquad(\text{pure DP: }\delta=0)
$$

- **The budget belongs to the history of releases, not the model** *(why it matters: Ten models each trained at $\epsilon=1$ on the same population compose to a basic bound of $\epsilon=10$; rotating keys does not reset the loss. Querying a fixed released DP model is post-processing and adds nothing, because the computation never touches protected data again.)*:

**Eq 13.6 · Basic composition of privacy loss**
$$
\epsilon_{\mathrm{total}}\;\leq\;\sum_{i=1}^{k}\epsilon_i
\qquad\qquad
\delta_{\mathrm{total}}\;\leq\;\sum_{i=1}^{k}\delta_i
$$

![The privacy budget is an account](https://benebsworth.com/study/vol2/13-security-privacy/diagrams/privacy-budget-account.svg)

*Ten releases at epsilon = 1 each compose to a basic bound of epsilon = 10. A mechanism-specific accountant tightens the bound below the naive sum, and post-processing a fixed release adds nothing because it never touches protected data again.*
- The Laplace mechanism adds noise scaled to sensitivity over budget: the scale is $\Delta_1 f/\epsilon$, so **tightening epsilon from 1.0 to 0.1 multiplies the noise by ten** *(why it matters: For the salary-mean example, one person can move the sum by the salary range, the noise scale lands near 200 thousand dollars at $\epsilon=1$, and the published mean of 1,000 employees carries an expected absolute error near 200 dollars; the same release over a 100-person group carries about 2,000. Small groups pay the largest relative cost because the signal grows with $n$ while the noise does not.)*:

**Eq 13.7 · Laplace mechanism**
$$
\widetilde{f}(D)=f(D)+\mathrm{Lap}\!\left(\frac{\Delta_1 f}{\epsilon}\right)
\qquad
b=\frac{\Delta_1 f}{\epsilon}
$$

- The Gaussian mechanism fits clipped gradients because clipping bounds the $\ell_2$ sensitivity explicitly. **Its tails force approximate DP** *(why it matters: A sufficient one-shot calibration for $0<\epsilon<1$ requires $\sigma$ above the bound below; at $\Delta_2 f=1$, $\epsilon=0.5$, $\delta=10^{-5)*$ that minimum lands near 9.7. This bound applies to one release; DP-SGD composes thousands of steps and needs a sampled-Gaussian accountant instead.}:

**Eq 13.8 · Gaussian mechanism calibration**
$$
\sigma\;\geq\;\frac{\Delta_2 f}{\epsilon}\sqrt{2\ln\!\left(\frac{1.25}{\delta}\right)}
$$

- **Composition is where accountants earn their keep** *(why it matters: The moments accountant tracks the privacy loss random variable, the log-likelihood ratio between adjacent datasets, accumulates its exponential moments across steps, and applies the tail bound once at the end. In the Abadi et al. experiment at sampling rate 0.01, noise multiplier 4 and $\delta=10^{-5)*$, it certifies $\epsilon=1.26$ after 100 epochs and 2.55 after 400, where advanced composition would report 9.34 and 24.22. These are that experiment's numbers, not reusable constants.}:

**Eq 13.9 · Moments accountant composition**
$$
L=\ln\frac{\Pr[\mathcal{M}(D)=o]}{\Pr[\mathcal{M}(D')=o]}
\qquad
\epsilon(\delta)=\min_{\lambda>0}\frac{k\,M(\lambda)+\ln(1/\delta)}{\lambda}
$$

- Rényi DP composes by addition: each mechanism's $D_\alpha$ bound sums across steps, and conversion back to $(\epsilon,\delta)$ optimizes over the order $\alpha$. **No accountant is uniformly tightest** *(why it matters: The release record must pin the protected unit and adjacency, clipping and noise conventions, sampling scheme and rate, step count, accountant library and version, because a budget label without them is meaningless.)*:

**Eq 13.10 · RDP composition and conversion**
$$
\epsilon=\epsilon_{\mathrm{RDP}}+\frac{\ln(1/\delta)}{\alpha-1}
\qquad
D_\alpha\!\left(\mathcal{M}(D)\,\|\,\mathcal{M}(D')\right)\leq\epsilon_{\mathrm{RDP}}
$$

- **DP-SGD is a per-step protocol, not a training flag** *(why it matters: Each step checks the accountant prospectively, Poisson-samples records at rate $q$, clips each per-example gradient to norm $C$, sums, adds $\mathcal{N)*(0,\sigma^2C^2I)$, divides by the fixed public normalizer $B$, and records the step. The CIFAR-10 worked example uses 50,000 images, expected lot 4,000 ($q=0.08$), 750 steps for the target budget; changing epochs or lot size changes the sampling probability and requires rerunning the accountant. Record-level adjacency does not protect a person with many records; person-level adjacency does.}.
- **The privacy-utility frontier is task-dependent, not a curve** *(why it matters: At single-digit budgets MNIST stays within about 8 points of its 98.3 percent baseline, while CIFAR-10 trained from scratch at $\epsilon=8$ lands at 73.0 percent (Abadi) or 81.4 percent (De et al.), roughly 14 to 22 points below the 95 percent reference, at a budget four times looser. Pretraining changes the problem again: De et al. report 86.7 percent ImageNet accuracy at $(8,\,8\times10^{-7)*)$-DP. Epsilon alone predicts nothing; the mechanism, adjacency, accountant, training regime and subgroup errors decide.}.


**Accuracy cost of the privacy budget**

| dataset and privacy budget | accuracy below nonprivate baseline |
|---|---|
| MNIST, single-digit ε | 8.3 |
| CIFAR-10, ε = 8 (Abadi 2016) | 22 |
| CIFAR-10, ε = 8 (De 2022) | 13.6 |

*Test accuracy below the nonprivate reference at selected privacy budgets, from published DP-SGD results (Abadi 2016, Bu 2020, De 2022). MNIST stays within about 8 points at single-digit epsilon; CIFAR-10 trained from scratch at epsilon = 8 sits 14 to 22 points below its baseline. The cost is task-dependent, not a property of epsilon alone.*

- The decision framework sequences the choice: regulatory driver first, then threat-model match, dataset characteristics (effective sample size, class imbalance, rare subgroups), an explicit utility budget and a compute budget, since per-example clipping lowers throughput on its own. **A mandatory bound is a feasibility constraint** *(why it matters: An accuracy improvement does not justify exceeding it; where the bound cannot be met at acceptable utility, the deployment changes, not the bound.)*.

### Sequence by Maturity, Not by Hype

- **Defense selection follows deployment context** *(why it matters: Healthcare prioritizes accounted DP, federated learning, TEEs and audit; financial services adds HSMs and adversarial training; edge devices lead with secure boot and PUFs; public LLM APIs separate instruction from data planes and meter per-principal budgets; critical infrastructure pairs attestation with fail-safe fallback. DP, federated learning, HE and secure computation each exclude a different observer and none bounds what the released model reveals.)*.
- **The maturity model is a dependency structure, not a calendar** *(why it matters: Five cumulative layers: access and configuration (least privilege, RBAC), data and privacy, model integrity (signing, hashing, release gates), adversarial and abuse resistance, then governance and evidence. Red-teaming and DP accounting on top of an unauthenticated registry and cleartext channels is structurally flawed: the lower layers are still open.)*.

### Fallacies and Pitfalls

- **Security through obscurity fails under Kerckhoffs's principle** *(why it matters: Hidden architecture does not stop black-box extraction or transferable adversarial examples; security must survive disclosure of the design.)*.
- **An epsilon label without adjacency, delta, composition and accountant is meaningless** *(why it matters: Ten releases at $\epsilon=1$ are $\epsilon=10$, not $\epsilon=1$.)*.
- **Federated learning is not private by itself** *(why it matters: Gradient inversion reconstructs inputs from updates; secure aggregation hides individual messages under its collusion assumptions but says nothing about the aggregate; DP noise applied after aggregation does not protect the server that saw it.)*.
- **Poisoning is not proportional to dataset size** *(why it matters: A targeted backdoor needs a trigger and a few hundred well-placed examples, not a million corrupted records.)*.
- **Hardening the endpoint does not harden the system** *(why it matters: Rate limits and mTLS on the API leave unencrypted query logs, an open registry or a shared cache as alternate observation paths. Every control must name the boundary it actually covers.)*.
- **Distributed topologies multiply the attack surface** *(why it matters: A ring has $\mathcal{O)*(N)$ logical channels; all-to-all has $\mathcal{O}(N^2)$. A 10,000-client federated deployment is 10,000 endpoints, and the threat model must inventory each one's credentials and transport.}.

## The physics

| Quantity | Value | Use |
|---|---|---|
| Pure DP guarantee | $\Pr[\mathcal{M}(D)\in S]\leq e^{\epsilon}\Pr[\mathcal{M}(D')\in S]$ | one protected contribution's max influence on any output event |
| Approximate DP | $+\delta$ slack, typically $<1/n$ | Gaussian mechanisms; $\delta=10^{-12}$ illustrative at 1M records |
| Laplace noise scale | $b=\Delta_1 f/\epsilon$ | salary example: $\sim$\$200K scale, \$200 mean error at $n=1{,}000$, \$2{,}000 at $n=100$ |
| Gaussian one-shot bound | $\sigma\geq(\Delta_2 f/\epsilon)\sqrt{2\ln(1.25/\delta)}$ | $\sigma_{\min}\approx9.7$ at $\Delta_2=1,\epsilon=0.5,\delta=10^{-5}$; not for DP-SGD |
| Basic composition | $\epsilon_{\mathrm{tot}}\leq\sum\epsilon_i$ | 10 releases at $\epsilon=1$ bound to $\epsilon=10$ |
| Moments accountant (Abadi) | $q{=}0.01$, mult 4, $\delta{=}10^{-5}$ | $\epsilon{=}1.26$ @100 epochs, 2.55 @400 (advanced comp: 9.34, 24.22) |
| DP-SGD worked inputs | $n{=}50{,}000$, lot 4,000, $q{=}0.08$, 750 steps | CIFAR-10 target $(\epsilon,\delta)$; alt: 25 epochs → 312 steps, lot 2,000 → $q{=}0.04$ |
| Privacy-utility cost | MNIST $\sim$8 pts at single-digit $\epsilon$; CIFAR-10 14–22 pts at $\epsilon{=}8$ | task-dependent; De et al. 86.7% ImageNet at $(8,8{\times}10^{-7})$ |
| Extraction economics | $p^{*}=C_{\mathrm{train}}/N_q$ | \$5M training / 100M queries → \$0.05 per query break-even |
| OpenAI extraction | ada $<2$M queries ~\$1; babbage $<4$M ~\$2; instruct $<40$M ~\$200–\$8,000 | output-projection recovery, RMS $\sim10^{-4}$ |
| Output shaping | rounding 6→2 decimals ≈ 13.3 bits/class removed; top-5 of 1,000 ≈ 99% entries cut | raises query cost, no DP guarantee |
| Defense overhead | 2.5 ms on 100 ms baseline ≈ 2.5% | monitoring + perturbation in ResNet-50 scenario |
| Robust aggregation traffic | gather $(N{-}1)M$ vs ring $2(N{-}1)M/N$ → $N/2{=}32\times$ at $N{=}64$ | coordinate-wise median on 1,024-GPU cluster, 350 GB grads/step |
| TEE memory | SGX EPC 128 MiB; ResNet-50 FP32 102.2 MB ≈ 76% | INT8 ≈ 11.7 MB; 175B FP16 350 GB → confidential VMs |
| HSM cost | \$20K–\$100K per unit | key custody before integration/certification |
| Side-channel collapse | $256^5 \to 5\times256$ guesses | byte-at-a-time password compare; SCAAML CNNs recover 128-bit AES |
| Supply chain | 5 stages: design, fabrication, assembly, distribution, deployment | one compromised part number hits all 128 nodes |
| Stuxnet | 4 zero-days; 807↔1,410 Hz; $\sim$1,000 rotors | silent integrity attack while telemetry reads normal |
| Mirai | $\sim$600,000 peak infections | compromised endpoints as federated poisoners and exfil paths |
| MIA DP ceiling | $\mathrm{TPR}\leq\min(e^{\epsilon}\mathrm{FPR},1-e^{-\epsilon}(1-\mathrm{FPR}))$ | bends near FPR 0.27 at $\epsilon=1$ |
| Memorization audit | GPT-2: 600K samples → 1,800 verified → 604 confirmed | verbatim records via perplexity-ranked extraction |

## Glossary

- **Threat model**: the four-field record (asset, boundary, adversary, control) that makes a security claim actionable.
- **Attack surface**: the set of interfaces through which an adversary can reach the system, including the ones the fleet exposes on purpose.
- **Black-box / gray-box / white-box access**: visibility levels from query-response only, through partial architecture knowledge, to full parameters and code.
- **Model extraction**: stealing model behavior through queries; *distillation* names the training step that produces the surrogate.
- **Exact artifact theft**: copying serialized weights directly; defeated by storage controls, not output shaping.
- **Approximate behavioral theft**: distilling a surrogate from API responses; bounded by cumulative query budgets and output contracts.
- **Membership inference**: deciding whether a record was in the training set; returns one bit per probe and grows with overfitting.
- **Model inversion**: reconstructing class properties or representative inputs from model outputs.
- **Memorization**: verbatim reproduction of training records by generative models.
- **Data poisoning**: adversarial manipulation of training data or updates, formulated as a bilevel problem over the defender's training.
- **Clean-label poisoning**: poisoned features with correct labels, evading label audits; Nightshade applies it defensively to text-to-image concepts.
- **Backdoor**: a trigger-activated behavior that preserves clean validation accuracy.
- **Breakdown point**: the fraction of malicious inputs an aggregator tolerates; the mean's is zero, robust rules restore a positive one at a traffic cost.
- **Prompt injection**: untrusted content attempting to act as instructions; mitigated by separating control and data planes.
- **Denial of wallet**: availability attack on the cost budget; autoscaling keeps the endpoint up while spend breaches.
- **Differential privacy**: a bound on how much one protected contribution can change the output distribution of a randomized release.
- **Privacy budget ($\epsilon$)**: the multiplicative bound on output-probability ratios; accumulates across data-dependent releases.
- **Additive slack ($\delta$)**: the additive term in approximate DP, typically below $1/n$.
- **Sensitivity ($\Delta f$)**: the maximum change a query output can undergo when one protected unit changes; noise scales to it.
- **Laplace / Gaussian mechanism**: noise calibrated to $\ell_1$ or $\ell_2$ sensitivity for pure or approximate DP.
- **Composition**: how privacy loss accumulates across releases; basic composition sums bounds, accountants tighten them.
- **Moments accountant / RDP**: iterative accounting that tracks privacy-loss moments or Rényi divergence across steps.
- **DP-SGD**: per-step clip, noise, account; the privacy guarantee lives in the accountant record, not the flag.
- **Post-processing**: computation on a fixed DP release that adds no privacy loss.
- **TEE / secure boot / HSM / PUF**: hardware primitives for runtime isolation, chain-of-trust verification, key custody and device-unique identity.
- **SafeTensors**: tensor-only serialization that removes pickle's arbitrary-code-execution path.
- **k-anonymity**: a table-shape constraint, not a privacy guarantee; auxiliary data defeats it.
- **Secure aggregation**: hides individual client updates, revealing only an aggregate under stated collusion assumptions.
- **Provenance**: the verifiable record of data, code, weights and hardware an artifact depends on; trust extends only as far as that record.

## → Ben's world

- **The benchmark harness is an extraction target.** `lib/lab/llm-benchmark/` publishes results and demos; the harness-eval pages expose model outputs through APIs. The chapter's extraction economics apply directly: what does a competitor pay to distill the benchmark's behavior, and does the output contract (top-k, rounding, per-principal budgets) make that bill exceed the training cost?
- **The shared droplet runs four products on one box.** Cuttlefish, telesis, brandbrain and flaggr share a host, a Caddy edge and one failure domain. The fleet-internal boundary section is the same problem at smaller scale: which tenant can observe which state, and what does per-tenant isolation cost in capacity?
- **Model registries and release gates exist in embryo.** The study pipeline itself versions packets, quizzes and audio; the chapter's registry-as-dependency-graph and evaluation-contract material (vol2/12) is the integrity half of this chapter's security half. A poisoned `charts.json` or a swapped `cover.webp` is a supply-chain event.
- **Podcast transcripts are authorized-output leakage too.** The study audio is generated from `podcast.md`; anything sensitive spoken into a packet ships in the transcript. The leakage section's question — what does this release reveal to an authorized caller — applies to every artifact the site publishes.

## Open questions

- The book's likelihood-impact matrix places threats per deployment, but gives no procedure for estimating likelihood. How should a team assign likelihood to a backdoor versus an extraction campaign when neither has a base rate?
- DP's utility cost is measured on MNIST and CIFAR-10-class tasks. For a 70B-class production model, is there any published accountant-backed epsilon that survives a real utility bar, or does DP remain a compliance artifact rather than a deployed mechanism at frontier scale?
- Secure aggregation hides individual updates but not the aggregate. At what cohort size and participation pattern does the aggregate itself become a membership oracle, and does any accountant bound that residual channel?
- The chapter prices isolation in throughput (15 percent scenario) and traffic (32x gather), but not in engineering headcount. Who owns the threat model on a platform team that is also the fleet's busiest on-call rotation?


---

## Key equations

**Eq 13.1 · Data poisoning as a bilevel problem**

$$
\max_{\mathcal{S}_{\mathrm{poison}}}\ \mathcal{L}\!\left(f_{\mathcal{S}\cup\mathcal{S}_{\mathrm{poison}}},\ \mathcal{S}_{\mathrm{test}}\right)\qquad\theta^{*}=\arg\min_{\theta}\ \mathcal{L}\!\left(\theta;\ \mathcal{S}\cup\mathcal{S}_{\mathrm{poison}}\right)
$$

*The poisoner picks the poisoned set that maximizes damage *after* the defender's inner training loop runs on clean plus poisoned data. The untargeted form maximizes test loss; the targeted form instead minimizes loss on one chosen example, and backdoors hide inside either.*

**Eq 13.2 · Extraction break-even price**

$$
N_{q}\,p_{q} \;<\; C_{\mathrm{train}}\qquad\Longrightarrow\qquad p^{*}=\frac{C_{\mathrm{train}}}{N_{q}}
$$

*Query-based extraction is worthwhile to the attacker only while the total bill for the query set stays below the cost of training the model itself. In the chapter's worked case, \$5M of training against 100M extraction queries puts the break-even at \$0.05 per query; pricing at or above that makes the full set cost about what training did.*

**Eq 13.3 · Membership-inference ceiling under DP**

$$
\mathrm{TPR}\;\leq\;\min\!\left(e^{\epsilon}\,\mathrm{FPR},\;1-e^{-\epsilon}\,(1-\mathrm{FPR})\right)
$$

*For a pure epsilon-DP release, no membership test, however clever, can push the true-positive rate above this ceiling at a given false-positive rate. At epsilon = 1 the bound bends near FPR 0.27: past that point the curve flattens and extra attack sophistication buys nothing.*

**Eq 13.4 · Robust aggregation traffic multiplier**

$$
\frac{(N-1)\,M}{\,2(N-1)M/N\,}=\frac{N}{2}
$$

*A gather-based coordinate-wise median receives every peer's gradient: $(N-1)M$ bytes per worker. Ring AllReduce moves about $2(N-1)M/N$. The ratio is $N/2$, so at $N=64$ robust aggregation costs roughly 32 times the per-worker gradient traffic of the ring, landing in the CommunicationTime term of the Fleet Law.*

**Eq 13.5 · Approximate differential privacy**

$$
\Pr[\mathcal{M}(D)\in S]\;\leq\;e^{\epsilon}\,\Pr[\mathcal{M}(D')\in S]\;+\;\delta
$$

*For adjacent datasets $D$ and $D'$ differing only in the protected unit, and every measurable output set $S$, the release's probability of landing in $S$ can grow by at most the factor $e^\epsilon$ plus additive slack $\delta$. Pure DP sets $\delta=0$; Gaussian mechanisms need the slack because their tails have unbounded likelihood ratios.*

**Eq 13.6 · Basic composition of privacy loss**

$$
\epsilon_{\mathrm{total}}\;\leq\;\sum_{i=1}^{k}\epsilon_i\qquad\qquad\delta_{\mathrm{total}}\;\leq\;\sum_{i=1}^{k}\delta_i
$$

*Ten models each released at epsilon = 1 on the same population compose to a basic bound of epsilon = 10, not epsilon = 1. The budget belongs to the history of data-dependent releases about the same protected population; mechanism-specific accountants tighten this sum.*

**Eq 13.7 · Laplace mechanism**

$$
\widetilde{f}(D)=f(D)+\mathrm{Lap}\!\left(\frac{\Delta_1 f}{\epsilon}\right)\qquad b=\frac{\Delta_1 f}{\epsilon}
$$

*Pure-DP noise whose scale is the $\ell_1$ sensitivity divided by the privacy budget. In the salary-mean example the scale lands near \$200K at $\epsilon=1$, giving about a \$200 expected error on the mean of 1,000 employees and about \$2,000 on a 100-person group: small groups pay the largest relative cost.*

**Eq 13.8 · Gaussian mechanism calibration**

$$
\sigma\;\geq\;\frac{\Delta_2 f}{\epsilon}\sqrt{2\ln\!\left(\frac{1.25}{\delta}\right)}
$$

*A classic sufficient bound for one application of the Gaussian mechanism with $0<\epsilon<1$. At $\Delta_2 f=1$, $\epsilon=0.5$, $\delta=10^{-5}$ the minimum sigma is about 9.7. This calibrates a single release; DP-SGD composes thousands of steps and needs a sampled-Gaussian accountant instead.*

**Eq 13.9 · Moments accountant composition**

$$
L=\ln\frac{\Pr[\mathcal{M}(D)=o]}{\Pr[\mathcal{M}(D')=o]}\qquad \epsilon(\delta)=\min_{\lambda>0}\frac{k\,M(\lambda)+\ln(1/\delta)}{\lambda}
$$

*The privacy loss random variable is the log-likelihood ratio between adjacent datasets. The moments accountant accumulates its exponential moments across steps and applies the tail bound once at the end, certifying tighter budgets than summing per-step bounds. In the Abadi experiment it reports epsilon 1.26 at 100 epochs and 2.55 at 400 where advanced composition reports 9.34 and 24.22.*

**Eq 13.10 · RDP composition and conversion**

$$
\epsilon=\epsilon_{\mathrm{RDP}}+\frac{\ln(1/\delta)}{\alpha-1}\qquad D_\alpha\!\left(\mathcal{M}(D)\,\|\,\mathcal{M}(D')\right)\leq\epsilon_{\mathrm{RDP}}
$$

*Rényi DP bounds the alpha-divergence between output distributions on adjacent datasets, and per-step bounds add across composition. Converting the composed RDP guarantee back to $(\epsilon,\delta)$-DP adds the slack term and optimizes over the order alpha. Subsampled mechanisms need a tested accountant; the leading-order shortcut does not certify a run.*

**Eq 13.11 · Output-contract information budget**

$$
\text{bits removed}\approx\Delta d\cdot\log_{2}10\approx3.32\,\Delta d\qquad\text{entries kept}=\frac{K}{N}
$$

*Rounding a probability from 6 to 2 decimals removes about 3.32 bits per dropped decimal digit per class; returning only the top K of N classes keeps the fraction K/N of distribution entries. Both raise the query cost of a fixed-fidelity surrogate without constituting a privacy guarantee.*

## From the book

- [Book attack-surface taxonomy](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's four-layer map of data, model, interface and infrastructure threats with their defenses. Our attack-surface sketch reorganizes the same material along the lifecycle stages the fleet already operates.
- [Book likelihood-impact matrix](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's 2x2 placing untrusted pickles and poisoning in the critical quadrant, fault injection in prepare, API extraction in mitigate. Our packet keeps the placement rule and drops the matrix itself.
- [Book model-theft split](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's two-panel comparison of exact artifact theft versus approximate behavioral theft. Our extraction-budget sketch adds the lifetime-budget gate that the book's cost-regime figure illustrates separately.
- [Book extraction cost regimes](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's generated figure plotting cumulative attacker bill against queries collected for pay-as-you-go, paid-tier and lifetime-budget regimes against the training-cost line. Our packet carries the same break-even arithmetic in the extraction-economics equation.
- [Book audit versus DP bound](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's ROC-plane figure showing an empirical membership-inference audit curve beneath the epsilon = 1 DP ceiling. Our packet states the same lower-bound/upper-bound relationship in prose with the ceiling equation.
- [Book diffusion memorization](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's side-by-side of an original image and a near-identical diffusion output reproducing a training photo. Verbatim memorization is the strongest form of authorized-output leakage.
- [Book Nightshade dose-response](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's 4-by-8 grid of Stable Diffusion outputs across poison doses and prompt concepts, morphing toward destination concepts at a few hundred samples. Clean labels keep every caption correct.
- [Book federated poisoning](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's diagram of a malicious client tilting the weighted federated aggregate. Our packet carries the same weighted-mean update inline in the poisoning section.
- [Book privacy-utility frontier](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's log-epsilon plot of published MNIST and CIFAR-10 accuracy points against nonprivate baselines. Our accuracy-cost chart plots the same gaps as bar heights in points below baseline.
- [Book hardware supply chain](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's five-stage lifecycle from design through deployment with a threat and assurance gate per stage. Our hardware section compresses the same sequence into prose.
- [Book defense stack](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's four-tier control stack from hardware foundations through platform, model and data techniques. Our defense-stack sketch keeps the tiers and names the trust boundary each owns.
- [Book Stuxnet chain](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's diagram of the Stuxnet infection chain and its ML supply-chain analog. Our breach section keeps the 807 to 1410 Hz and thousand-rotor numbers in prose.
- [Book ReLU fault injection](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's assembly listing where a laser fault skips the jump guarding ReLU's zeroing block. Our packet describes the mechanism in prose and defers the listing to this reference.
- [Book power-analysis trace](https://mlsysbook.ai/vol2/13_security_privacy/13_security_privacy.html) — The book's power trace showing byte-at-a-time leakage from a partially wrong password. Our side-channel section carries the 256-to-the-5 collapse arithmetic in prose.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. An ML platform engineer must classify two failure modes: (1) a malicious actor submits crafted audio noise so an emergency-dispatch classifier misses distress calls, and (2) an observer examines a public salary-prediction model and infers whether a specific executive was in the training set. How should these be categorized by threat model and objective?
   - A. (1) is a privacy violation targeting confidentiality of the dispatch audio stream; (2) is a security breach targeting the availability of the salary service.
   - B. Both are pure infrastructure security incidents that the network layer resolves with updated firewall rule sets and stricter ingress filtering.
   - C. (1) is a stochastic robustness failure caused by sensor noise rather than intent; (2) is an unauthorized access-control violation that credential rotation would resolve.
   - D. (1) is an adversarial security attack targeting model integrity; (2) is a privacy leakage issue targeting participation inference.

2. In 2018, an aggregated activity heatmap revealed sensitive military locations through distinctive activity patterns in sparsely populated areas. What fundamental systems-privacy vulnerability did this incident illustrate?
   - A. The platform suffered an unencrypted database breach that exposed user account names together with plaintext GPS coordinate columns stored at rest.
   - B. An adversary ran a physical side-channel power analysis attack directly against the GPS receiver hardware chips embedded inside users' mobile devices.
   - C. Aggregation can expose sensitive locations in sparse environments where high-dimensional behavioral traces retain distinct structural patterns.
   - D. The web application's TLS termination layer failed to validate certificate chains on incoming client telemetry upload streams, exposing raw location fixes.

3. An adversary queries an open prediction endpoint, records confidence scores, and trains a surrogate. The actor knows the task and output format but has no weights, source code, architecture details, or training records. How should access, auxiliary knowledge, and timing be classified?
   - A. Black-box access, limited task-and-interface knowledge, inference-time attack.
   - B. White-box access, full architectural knowledge, training-time attack on the served checkpoint.
   - C. Gray-box access, full knowledge of internals, deployment-time attack on the release pipeline.
   - D. Black-box access, limited task-and-interface knowledge, post-deployment configuration attack.

4. A security architect must deploy defenses against two model-theft vectors: (1) an unauthorized party copying serialized checkpoints from a cloud bucket, and (2) a competitor sending millions of synthetic queries to a public endpoint to distill a student model. Which combination targets each vector correctly?
   - A. Vector (1) requires output rounding and top-k truncation of every API response; vector (2) requires hardware security modules protecting model weights at rest inside the cloud bucket.
   - B. Vector (1) requires encrypted storage, signed model artifacts, and strict IAM/RBAC permissions; vector (2) requires rate limiting, query-anomaly monitoring, and confidence-score truncation.
   - C. Vector (1) requires differential privacy applied retroactively during the original training run; vector (2) requires physically air-gapping the inference server away from the public internet.
   - D. Both vectors are mitigated exclusively by converting every serialized checkpoint into the Python pickle format with embedded cryptographic signatures for distribution.

5. A 64-worker data-parallel job replaces ring AllReduce with a gather-based coordinate-wise median: every worker gathers every individual gradient before computing the median. Approximately how does per-worker gradient traffic change?
   - A. It is unchanged, because the coordinate-wise median consumes only the single summed gradient tensor that the ring AllReduce already returns to every worker each step.
   - B. It roughly doubles, because gathering all individual gradients costs approximately one extra full pass around the communication ring per training step.
   - C. It falls, because the median rule discards statistical outlier gradients before they finish traversing the network fabric between workers.
   - D. It rises by about 32 times, because the gather receives the 63 peer gradients per worker instead of moving about twice the gradient size around the ring.

6. A multi-tenant LLM service shares one prefix cache across all tenants, and cache hits are distinguishable in time-to-first-token measurements. What can a probing tenant infer, and which control removes this cross-tenant cache-reuse path?
   - A. Evidence that a probed prefix was recently processed outside the probing tenant; per-tenant cache scoping removes the shared-reuse path at the cost of a lower hit rate.
   - B. The model weights of the serving replica; encrypting the weights at rest inside the trusted execution environment closes this cross-tenant timing side channel completely.
   - C. Another tenant's API credentials and request history; mutual TLS authentication between client and gateway closes the channel at the transport layer.
   - D. The exact output tokens produced for other tenants' prompts; rounding the returned output probability distributions before serialization closes the channel.

7. Vulnerabilities like Meltdown and Spectre exploit transient execution in modern processors. What microarchitectural mechanism lets an attacker infer protected data across an intended isolation boundary?
   - A. Speculative execution permanently overwrites physical DRAM cells with ciphertext key material without raising any fault or notifying the operating system kernel.
   - B. The CPU floating-point unit truncates all FP32 tensor activations down to INT8 precision during branch-prediction windows, corrupting enclave memory.
   - C. Transient instructions can encode protected data in cache state that remains measurable after the processor discards their architectural effects.
   - D. Speculative branch predictors disable the hardware AES encryption engines on the PCIe accelerator interconnect fabric during misprediction recovery.

8. A production ML platform is replacing legacy PyTorch .pth checkpoint files with the SafeTensors format for its public model repository. What primary security vulnerability does this change eliminate?
   - A. It prevents black-box model-extraction queries against the deployed HTTP API endpoint by binding every served response to a cryptographically signed tensor manifest.
   - B. It eliminates arbitrary code execution during model deserialization by storing only tensor data buffers without executable Python object serialization.
   - C. It guarantees (epsilon, delta)-differential privacy for whatever training dataset was originally encoded into the stored weight tensors at publication time.
   - D. It reduces steady-state inference latency by replacing floating-point matrix operations with optical computing primitives along the production serving path.

9. An aggregate query has l1 sensitivity Delta_1 f = 2.0 and l2 sensitivity Delta_2 f = 2.0. For pure epsilon-DP with epsilon = 0.5, what is the Laplace scale parameter b, and why is the Gaussian mechanism preferred in deep-learning DP-SGD?
   - A. b = 0.25; the Laplace mechanism is preferred for deep learning because it eliminates the need for per-sample gradient clipping during training.
   - B. b = 1.0; the Gaussian mechanism is preferred because it guarantees delta = 0 for any arbitrary query function and composes without budget loss.
   - C. b = 4.0; Gaussian noise matches an l2 clipped-gradient mechanism and supports mechanism-specific composition accounting such as Renyi DP.
   - D. b = 10.0; the Gaussian mechanism is preferred because it adds zero noise to gradients whose norms already fall below the clipping threshold.

10. A startup keeps its proprietary vision model's architecture and hyperparameters secret, assuming this prevents adversarial attacks and model theft. Under Kerckhoffs's principle and empirical ML security findings, why does this defense fail?
    - A. Black-box queries can reveal model behavior, and adversarial examples can transfer between models; secrecy alone therefore does not establish a tested security boundary.
    - B. Adversarial attacks are physically impossible unless the attacker first recovers the exact PyTorch random seed used during the original distributed training run.
    - C. Neural networks automatically publish their full learned weight tensors over standard DNS broadcast protocols immediately upon process initialization in production.
    - D. Security through obscurity remains a valid defense for deep learning systems because gradient descent provably produces non-invertible mathematical functions by construction.

11. A healthcare startup builds an ECG arrhythmia detector on 5,000 patients; the model is safety-critical, requiring under 2 percent accuracy loss. When evaluating DP-SGD under epsilon <= 3, what does the DP decision framework indicate?
    - A. DP-SGD should ship immediately: at 5,000 patients the privacy-utility trade-off is favorable at epsilon below 1, the clinical acceptance test can be deferred to post-deployment monitoring, and secure aggregation can substitute for the accountant.
    - B. DP-SGD will accelerate training throughput roughly fivefold by eliminating cross-worker gradient synchronization entirely, so the epsilon budget can be spent wholly on utility and the accountant becomes advisory.
    - C. The team must measure private-model utility under the stated budget and clinical acceptance criteria; dataset size alone does not establish feasibility, and secure aggregation is no substitute for a DP guarantee.
    - D. The startup should raise epsilon to one million: pure privacy then requires no noise at all, and the DP accountant can be replaced by conventional access logging and rate limits.

12. A surrogate attack needs 5 million queries to reach 90 percent fidelity. The attacker sustains 25,000 queries per day through allowed tiers. How many days does the extraction take, and which single control most directly extends that time without changing per-query cost?

13. A teammate says: 'We ran a membership-inference audit and attack accuracy was barely above chance, so the model has no privacy leakage.' Explain what the audit actually establishes, what it cannot rule out, and how a DP accountant changes the claim.

## Answer key

1. D. Failure (1) is an active adversary compromising integrity through crafted inputs (evasion). Failure (2) infers sensitive individual participation from model outputs without touching availability or software vulnerabilities. Confusing confidentiality with operational integrity, or treating both as network incidents, misses the algorithmic nature of each attack.

2. C. Dense regions hid individuals in the crowd; sparse regions kept enough structure to single them out. Aggregation protects privacy only when the protected unit is stated and the release is bounded — it is not a privacy guarantee by itself.

3. A. Prediction queries give black-box access; the known task and output format count as limited auxiliary knowledge; extraction happens against a deployed model at inference time. Calling it a configuration attack misplaces when in the lifecycle the leakage occurs.

4. B. Exact artifact theft is a storage/registry failure bounded by encryption, signing, and access control. Behavioral theft needs only query access and is bounded by cumulative per-principal budgets plus the output contract. Swapping the control sets leaves each vector open.

5. D. Gather-based median moves (N-1)M bytes per worker versus about 2(N-1)M/N for ring AllReduce; at N=64 that ratio is N/2 = 32. The integrity control lands directly in the CommunicationTime term of the fleet law unless overlapped.

6. A. A cache hit returns the first token measurably sooner than a miss, so probing yields evidence that a prefix was recently processed — without identifying who processed it. Per-tenant scoping removes the reuse path at the price of the hit rate.

7. C. Transient execution can leave measurable cache effects even when its architectural results are discarded. The side channel is microarchitectural state, not a software or transport-layer failure — which is why it crosses enclave and VM boundaries.

8. B. PyTorch's default .pth format uses Python pickle, which can execute arbitrary code at deserialization. SafeTensors stores only tensor buffers, removing the code-execution path. It says nothing about extraction, privacy, or latency.

9. C. Laplace scale is b = Delta_1 f / epsilon = 2/0.5 = 4. Gradient clipping supplies an l2 sensitivity bound, Gaussian noise matches that geometry, and approximate DP admits tighter accountants like Renyi DP or the moments accountant — none of which Laplace's pure-epsilon composition gives for free.

10. A. Kerckhoffs's principle requires security to survive disclosure of the design apart from protected keys. Black-box queries reveal behavior and adversarial examples transfer across models, so secrecy without a tested boundary defends nothing.

11. C. Small datasets can make the privacy-utility trade-off hard, but no universal sample-count rule decides it. Utility must be measured against the acceptance criteria under the stated budget; secure aggregation hides individual updates, not the aggregate, so it cannot stand in for DP.

12. 5,000,000 / 25,000 = 200 days. The control that most directly extends the time is a cumulative per-principal query budget (or equivalent quota accounting across accounts and tiers): a daily rate limit alone still collects 3.65 million queries per year at 10,000 per day, so only a lifetime bound changes the total the attacker can accumulate. Output-contract changes (rounding, top-k truncation) raise the query cost per unit of fidelity instead of extending the calendar time directly.

    The arithmetic is 5M / 25k = 200 days. The packet's point is that the lifetime budget, not the daily limit, is the bound that matters; shaping the output contract attacks fidelity per query rather than the schedule.

13. The audit is a lower bound on leakage: it measures what one attack under stated access assumptions could extract. Barely-above-chance accuracy rules out that particular attack succeeding at that access level, nothing more. It cannot rule out a stronger attack, released parameters, auxiliary information, or rare records that leak even when average accuracy sits near chance. A DP mechanism plus its accountant supplies the complementary upper bound: epsilon bounds the worst-case divergence for any attacker, which is why the honest claim is 'audited leakage is X, accounted bound is epsilon'; the gap between them is the residual uncertainty.

    Audit = lower bound on what was shown; DP accountant = upper bound on what is possible. Confusing the two turns an empirical result into a guarantee it never made.

## Audio overview

[Listen to the Marcus & Iris read-along (~13 min)](https://benebsworth.com/study-audio/vol2/13-security-privacy.m4a) — a generated podcast walking this packet's argument.
