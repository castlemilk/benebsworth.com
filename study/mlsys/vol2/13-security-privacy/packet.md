---
openingQuestion: Your fleet dashboard is all green — latency inside target, availability at five nines, aggregate accuracy steady. Can an adversary still steal the model, poison it, or lift its training data through the same interfaces that make it useful? What does each defense actually cost?
---

# Security and Privacy: Study Packet
*Machine Learning Systems, vol. 2, chapter 13, Security and Privacy (mlsysbook.ai)*

## Thesis

==A correctly functioning ML service can still be stolen, poisoned, or made to disclose its training data=={Operational health measures whether the system does its job. Security and privacy measure what an adversary can make it do through the interfaces it exposes on purpose. Green dashboards answer a different question.}. Attacks arrive through the query API, the training pipeline, the shared fabric and the hardware itself, so a threat model writes down the asset, the trust boundary, the adversary's capability and the control, and keeps model visibility separate from write capability. ==Every defense is priced on the Fleet Law's C3 axes=={Encryption that slows bandwidth-bound collectives spends CommunicationTime. Partitioning that strands capacity spends the occupancy invariant. Attestation that delays re-admission spends SynchronizationTime and the checkpoint interval. There is no free isolation.}. Privacy is the sharper case: ==a correctly executing model leaks through authorized outputs=={Storage encryption and access control protect records at rest and in transit. They say nothing about what a released model reveals to a caller who is fully allowed to ask it questions. That is a property of the release, and only differential privacy bounds it.}.

> [!note] How to read the marks
> Amber dotted phrases carry "why it matters" cards. Hover, tap or tab to each one for the reasoning that did not fit the sentence.

## Guided notes

### Green Dashboards, Open Doors

- The chapter's opening claim is that ML systems have an ==algorithmic attack surface=={Attacks that work through the model's own learned behavior on legitimate-looking inputs. A firewall sees authenticated requests carrying valid payloads; nothing at the perimeter looks wrong.} orthogonal to the infrastructure perimeter. Traditional controls (firewalls, mTLS, rate limits, encryption) protect the network boundary. They do not protect what an authorized caller can make the model reveal.
- The attack surface decomposes along the lifecycle the fleet already owns: data ingestion, distributed training, the model registry and artifact store, the serving API, and edge or federated adaptation. Each stage has its own threat class and its first control.
- Two failure modes the book insists on separating: ==security protects against intentional adversaries=={CIA properties: confidentiality of weights and data, integrity of training and serving behavior, availability of the service. The adversary is assumed to act deliberately.} while ==privacy protects against inference, authorized or not=={The question is what a release discloses about a protected contribution, whether or not anyone attacks. An honest deployment can leak; an attacked one can also fail integrity. The two problems share infrastructure but not guarantees.}.
- Serving adds two threats with no infrastructure analog. ==Prompt injection crosses the boundary between instructions and data=={Content the model reads is untrusted input that can attempt to act as commands. The fix is architectural: separate the control plane (instructions, policy) from the data plane (retrieved content, user text), and enforce policy outside the model.} and ==denial of wallet spends the cost budget while the endpoint stays available=={An attacker maximizes generated tokens, retrieved documents or cache misses. Autoscaling preserves apparent availability while spend and tail latency breach their budgets. Meter work and cost per authenticated principal, not request counts.}.

::fig[attack-surface]

### Security and Privacy Are Different Problems

- Security asks whether an adversary can make the system misbehave. Privacy asks how much a release reveals about the people in its training data. A membership-inference attack illustrates the gap: the caller is authorized, the model behaves correctly, and yet one bit of information about a record's inclusion leaks through confidence scores.
- ==De-identification is not privacy=={Removing names and IDs from a table constrains only the shape of the release. Auxiliary data re-identifies: the Netflix Prize dataset was deanonymized from 8 ratings plus dates at 99 percent success. Neural networks are correlation engines; they can memorize what a cleaned table still contains.}.
- The chapter's four breach cases each teach one boundary failure. ==The Strava heatmap showed aggregation alone is not protection=={In 2018 a published aggregate activity map exposed military-base routines because sparse regions retained distinctive structure. Dense regions hid; sparse regions singled out. Aggregation protects privacy only when the protected unit is stated and the release is bounded.}.
- ==Stuxnet is the template for silent integrity attacks=={The 2010 worm used four zero-day exploits, altered centrifuge control frequencies between 807 and 1,410 Hz while telemetry reported normal, and destroyed roughly a thousand rotors. The ML analog is exact: a poisoned dataset or backdoored model preserves aggregate validation accuracy while changing targeted behavior, and health monitoring has nothing to see.}.
- The Jeep Cherokee hack (2015) reached brakes and steering through the infotainment system's cellular link. The lesson is authority across a trust boundary: a perception model's output is evidence, not actuator authority, and controllers need fail-safe validation. ==Mirai (2016) showed endpoints are weapons=={Weak IoT credentials built a botnet that peaked near 600,000 infections. In ML fleets the same compromised edge device can inject poisoned federated updates, exfiltrate local telemetry and mask the attacker's identity behind the device's own credentials.}.

### Write the Threat Model Before the Defense

- An operational threat model has four fields: ==the asset=={What must stay confidential, intact or available: weights, training records, decision boundaries, serving capacity.}, ==the boundary=={Where trust changes: external prompt to system instruction, raw data to registry, shared tenant processes on one accelerator.}, ==the adversary=={Permitted capabilities, auxiliary knowledge and goal, stated separately from model visibility.}, and ==the control=={The permission, mechanism or observable signal that constrains the attack or supports a response.}.
- Visibility and write capability are different axes. ==Black-box query access supports extraction and membership inference=={The adversary sees inputs and outputs only. It can train a surrogate or probe for memorized records, but cannot touch gradients or weights directly.} ==White-box access adds parameters and architecture=={Gradient inversion, targeted poisoning and fine-grained extraction become possible. Gray-box sits between: partial architecture knowledge improves surrogate fidelity without full access.}.
- Timing is the third axis: training-time attacks need write access to data or updates; inference-time attacks need only query access; post-deployment attacks target configuration, logs and dependencies.
- ==Prioritize by likelihood times impact, then let deployments move threats between quadrants=={The book's matrix puts untrusted pickles and data poisoning in the critical quadrant (high likelihood, high impact), laser fault injection and silicon Trojans in prepare (low likelihood, high impact), and API extraction in mitigate (high likelihood, moderate impact). The placement is deployment-specific: sensitive data or greater copying harm promotes a threat.}.
- Two design principles do most of the work. ==Defense in depth assumes one layer fails=={No single control is trusted alone; the stack in the defenses section is the same idea applied to ML.} ==Fail-safe defaults deny what cannot be authorized=={A request whose authority cannot be established gets no additional privileges. A behavioral anomaly is different: it calls for a response chosen by evidence and consequence, not by the anomaly score alone.}.

### Five Ways In at Five Lifecycle Gates

- ==Theft, leakage, poisoning, adversarial inputs and availability abuse are five objectives=={Each enters at a different lifecycle gate and needs a different control. Collapsing them into "security" produces controls that miss their target: output truncation does nothing for checkpoint theft, and air gaps do nothing for API extraction.}.
- Model theft splits in two. ==Exact artifact theft takes the file=={Serialized checkpoints in a bucket or registry. The thief gets identical weights with zero training cost, so the controls are storage encryption, signed artifacts, strict IAM and SafeTensors packaging, which removes the pickle deserialization path to arbitrary code execution.} ==Approximate behavioral theft takes the queries=={Millions of synthetic inputs distill a surrogate with different weights but similar outputs. Rate limits, quota accounting, output shaping and behavioral monitoring are the controls, priced in the next section.}.
- ==Leakage through authorized outputs needs only query access=={Membership inference returns one bit per probe, model inversion reconstructs class properties from confidence scores, and memorization returns verbatim training records. All three grow with overfitting, and storage controls cannot see any of them.}.
- ==Poisoning is a bilevel attack=={The poisoner needs write access to something the model learns from and solves an optimization over the defender's training: choose the poisoned set that maximizes damage after the inner training loop runs.}:

::eq[poisoning-bilevel]
$$
\max_{\mathcal{S}_{\mathrm{poison}}}\ \mathcal{L}\!\left(f_{\mathcal{S}\cup\mathcal{S}_{\mathrm{poison}}},\ \mathcal{S}_{\mathrm{test}}\right)
\qquad\text{inner: }\ \theta^{*}=\arg\min_{\theta}\ \mathcal{L}\!\left(\theta;\ \mathcal{S}\cup\mathcal{S}_{\mathrm{poison}}\right)
$$

- The untargeted outer objective degrades the test distribution broadly; the targeted form instead minimizes loss on one chosen example, and backdoors associate a rare trigger with an attacker-chosen outcome while clean accuracy stays flat. ==Clean-label poisoning keeps every label correct=={Nightshade poisons a text-to-image concept with a few hundred images whose captions still describe their content; validation audits that check labels find nothing. The dose-response grid in the book shows outputs morphing toward the destination concept at doses of 50 to 300 samples across eight prompt concepts.}.
- ==Adversarial examples are the inference-time sibling=={A perturbation bounded by $\lVert\delta\rVert$ in input space flips a deployed decision while staying invisible to humans. White, gray and black-box variants differ in gradient access, and surrogate-plus-transfer attacks carry perturbations across models, which is why secrecy of architecture is not a defense. The mechanics and defenses belong to the robustness chapter.}.
- LLM serving adds its own vectors. ==Prompt injection, training-data extraction and jailbreaking all exploit the entanglement of instructions and data=={The control plane (system instructions, policy) and the data plane (user text, retrieved documents) must be separate objects with policy enforced outside the model. Model output is untrusted input; high-impact operations need a separate approval point.}.

### Theft Is Priced in Queries

- ==A daily rate limit slows extraction without capping its lifetime total=={Ten thousand queries per day still collects 3.65 million per year per principal. The bound that matters is cumulative per-principal budget across accounts, tiers and time, plus the output contract that decides how much each response teaches.}.
- The book's OpenAI extraction table makes the economics concrete. Recovering the output projection of `ada` took under 2 million queries at root-mean-square error near $5 \times 10^{-4}$ for about 1 dollar of API spend; `babbage` needed under 4 million for about 2 dollars; the instruct models needed under 40 million for hundreds to thousands of dollars. ==Extraction is cheap relative to training=={Which is why the defense question is not "can it be stolen" but "what does the thief's bill look like versus the defender's".}.
- Four levers shape that bill: output precision reduction, query quotas, pricing and behavioral monitoring. ==Rounding and truncation remove information per response=={Rounding ImageNet's 1,000-class softmax from 6 to 2 decimals removes about 13.3 bits per class and retains about 6.7; returning only the top 5 classes eliminates over 99 percent of the distribution entries. Neither is a privacy guarantee; both raise the query cost of a fixed-fidelity surrogate.}.

::eq[output-shaping]
$$
\text{bits removed}\approx\Delta d\cdot\log_{2}10\approx3.32\,\Delta d
\qquad
\text{entries kept}=\frac{K}{N}
$$

- The economics have a clean break-even. ==Extraction beats training only below a per-query price=={With 100 million queries needed and 5 million dollars of training cost, the break-even price is 5 cents per query. Pay-as-you-go pricing at or above that makes the full extraction set cost about what training did; a lifetime per-principal budget bills the same set the same way.}:

::eq[extraction-economics]
$$
N_{q}\,p_{q} \;<\; C_{\mathrm{train}}
\qquad\Longrightarrow\qquad
p^{*}=\frac{C_{\mathrm{train}}}{N_{q}}=\frac{\$5\mathrm{M}}{100\mathrm{M}}=\$0.05/\mathrm{query}
$$

- The ResNet-50 scenario prices the regimes end to end. Training costs about 5 thousand dollars; a surrogate at 90 percent fidelity needs about 5 million queries, roughly 1 million per class. On a free tier of 100 queries per day the attacker's 25,000 daily queries would need about 200 days; on the paid tier about 500 days; pay-as-you-go pricing makes the full set cost about the training bill; and a lifetime budget allowance well below 5 million billed at the pay-as-you-go rate lands within 5 percent of it. ==The defenses cost almost nothing to run=={Monitoring at 2.0 ms plus perturbation at 0.5 ms adds 2.5 ms to a 100 ms inference baseline, about 2.5 percent overhead, while cutting surrogate accuracy from 90 to 72 percent in the scenario.}.
- ==Behavioral monitoring catches what quotas cannot=={A KL-divergence detector compares an account's query distribution against the expected population; an adaptive quota multiplies the base limit by $\exp(-\gamma\,\mathrm{score})$, so an anomaly score of 0.8 at sensitivity 1 keeps about 45 percent of the base quota, a 55 percent rate reduction. The score drives a response policy; it is not proof of attack.}.

::fig[extraction-budget]

### Authorized Callers Still Leak

- ==Membership inference, model inversion and memorization are three escalating leaks=={Membership returns one bit: was this record in training. Inversion reconstructs class properties or representative inputs from confidence scores. Memorization returns verbatim records, as the diffusion-model example reproduced a training photo almost exactly and the GPT-2 extraction confirmed 604 unique memorized examples from 600,000 generated samples ranked by perplexity.}.
- All three grow with overfitting, small datasets and rare records. ==Adversarial training can make membership inference worse=={Robustness and privacy pull in opposite directions here: the same confidence sharpening that resists perturbations can sharpen the membership signal. A control that helps one threat class can feed another.}.
- ==An empirical audit is a lower bound on leakage; differential privacy is the upper bound=={A shadow-model audit measures what one attack under stated access assumptions could extract. A stronger attack, released parameters or auxiliary information could still succeed, and rare records can leak even when average accuracy sits near chance. The gap between the audit result and the accounted DP bound is the honest uncertainty in the privacy claim.}:

::eq[mia-dp-ceiling]
$$
\mathrm{TPR}\;\leq\;\min\!\left(e^{\epsilon}\,\mathrm{FPR},\;1-e^{-\epsilon}\,(1-\mathrm{FPR})\right)
$$

- The ceiling bends near FPR of 0.27 at $\epsilon=1$: beyond that point even the optimal membership test cannot beat the bound no matter how clever the shadow models are.

### Poisoning Is a Bilevel Problem

- ==A few hundred poisoned examples can plant a backdoor while validation accuracy stays flat=={Targeted attacks preserve aggregate metrics by construction; backdoors activate only on a trigger; subpopulation attacks harm a shared-feature group. "More clean data washes out poison" is false for targeted triggers, because the poisoner's objective is not the average loss.}.
- Entry paths match write access: label modification flips labels outright; clean-label poisoning corrupts features while keeping labels correct and passes label audits; generative injection adds synthetic poisoned samples; and in federated settings a single malicious client tilts the weighted aggregate $w_{t+1}=w_t+\sum_k (n_k/n)\,\Delta w_k$.
- ==Retraining does not automatically cleanse poison=={If the next run reuses the compromised data or an affected checkpoint, the poison persists. Provenance tracking and dataset auditing locate the inputs; they do not by themselves verify the repaired path.}.

### Inside the Fleet the Boundary Moves

- ==The mean gradient's breakdown point is zero=={In synchronous data parallelism one compromised worker contributes to every replica's update, and an unbounded malicious gradient corrupts the mean regardless of how many honest workers voted. Robust aggregation rules (Krum, trimmed mean, coordinate-wise median) restore a positive breakdown point under their assumptions.}:

::eq[robust-agg-traffic]
$$
\frac{(N-1)\,M}{\,2(N-1)M/N\,}=\frac{N}{2}=32
\qquad (N=64)
$$

- The price is traffic. A gather-based median receives $(N-1)M$ bytes per worker where ring AllReduce moves about $2(N-1)M/N$; at $N=64$ that is roughly 32 times the per-worker gradient traffic, which lands directly in the CommunicationTime term of the Fleet Law unless overlapped. ==Integrity inside the fleet is a capacity decision=={The chapter's reference cluster of 1,024 GPUs moving 350 GB of FP16 gradients per step makes the multiplier expensive in dollars, not just milliseconds.}.

::chart[aggregation-traffic]

- ==RDMA moves bytes; it does not encrypt them=={Plaintext collective traffic on the fabric is observable to anyone who can reach the links, switches or endpoints. Line-rate encryption halves effective bandwidth on bandwidth-bound collectives, so the confidentiality control spends the same axis it protects.}.
- Shared accelerators leak through state, not just data. ==A shared prefix cache is a cross-tenant timing channel=={A cache hit returns the first token measurably sooner than a miss, so a probing tenant gets evidence that a prefix was recently processed, without identifying who processed it. Per-tenant cache scoping removes the reuse path at the price of the hit rate; MPS gives address spaces without fault isolation, and MIG partitions hardware at a capacity cost the chapter prices at about 15 percent throughput in its matched-budget scenario.}.
- ==Attestation and key custody sit on the coordination axis=={A 128-node job restarting from a 2.45 TB checkpoint cannot resume until fresh attestation evidence is checked and release keys are delivered. That delay is admission and recovery time, priced in SynchronizationTime and the checkpoint interval, distinct from steady-state protected-execution overhead, which must be measured separately.}.

### Hardware Is Four Decisions

- ==Fleet procurement correlates hardware failures=={One weakness in a part number fails on every copy at once, which is why the chapter organizes hardware security as four deployment decisions: processor isolation, physical access and fault injection, side-channel observability, and provenance and lifecycle trust.}.
- Processor isolation fails through speculative execution: ==Meltdown and Spectre turn transient microarchitectural state into an observation channel=={Instructions whose architectural effects are discarded can still leave cache residue that a co-tenant measures. SMT restriction trades throughput on data-loading paths for isolation.}.
- ==Fault injection skips instructions, not weights=={Laser and voltage faults on microcontrollers have skipped the `jmp` that guards ReLU's zeroing block, forcing activations to zero and corrupting downstream classification while stored weights stay intact. Remote analogs exist: FPGA co-tenant voltage droop and the silent data corruption of the fault-tolerance chapter.}.
- ==Power analysis turns physics into a key-recovery oracle=={Current draw correlates with operand values and activation signs. The classic byte-at-a-time attack collapses a $256^5$ password search to $5 \times 256$ guesses by reading which prefix byte comparison takes longer; learned side-channel analysis extends the same idea, with convolutional networks recovering a full 128-bit AES key from power traces on an unprotected implementation.}.
- ==Leaky interfaces bypass every software control=={An unauthenticated JTAG or SWD port on a production edge device reads plaintext weights from flash independently of host permissions. Baby monitors, pacemakers and smart bulbs carry the same lesson at consumer scale.}.
- ==The supply chain has five stages and a threat at each=={Design (RTL backdoors), fabrication (mask Trojans), assembly (substituted parts), distribution (tampering in transit) and deployment (counterfeit manifesting as field failures). X-ray and functional tests give partial evidence; the 2018 Bloomberg Supermicro report remains an allegation-versus-evidence lesson rather than settled fact.}.

### Defenses Are a Stack, Not a Product

- ==Controls layer from silicon to data, and each tier owns a different boundary=={Hardware roots establish what is genuine; platform controls bound what runs beside what; model-level shaping bounds what responses teach; data-level privacy bounds what the release reveals. Removing any tier leaves its boundary open.}:

::fig[defense-stack]

- The hardware tier has four primitives matched to the four decisions: TEEs for runtime isolation (TrustZone, SGX enclaves, confidential VMs), secure boot for the chain of trust from immutable ROM through signed bootloader, kernel and model manifest, HSMs for key custody at roughly 20 to 100 thousand dollars per unit, and PUFs for device-unique challenge-response identity that drifts with temperature and needs helper data.
- ==The TEE memory budget is a real constraint=={Older SGX enclaves cap resident protected pages at 128 MiB of EPC; ResNet-50 FP32 weights alone are 102.2 MB, about 76 percent of it before activations. INT8 quantization shrinks the same model to about a tenth, and a 175B model's 350 GB of FP16 weights is orders beyond any enclave, which is why fleet-scale confidential computing uses VMs rather than enclaves.}.
- Secure deployment is unglamorous and load-bearing: ==authenticated encryption, signed manifests, hash verification and tested rollback=={SafeTensors removes the pickle code-execution path; secrets in environment variables leak through logs and process inspection; a release gate verifies the served checkpoint against the approved artifact before traffic moves, and preserves evidence before rollback destroys it.}.
- Runtime monitoring splits into input validation (contract plus statistical checks, which cannot catch contract-satisfying adversarial inputs), output monitoring (confidence, entropy and class-distribution anomalies), integrity checks (hash against manifest, dependency lockfiles, attestation) and response policy (quarantine is not canary; per-principal throttling; post-incident review adds the boundary that failed to the record). ==The defenses cost almost nothing=={The extraction scenario's 2.5 percent overhead is the pattern: shape outputs, meter work, verify artifacts, and spend the C3 budget where the threat model says it matters.}.

### Differential Privacy Is an Account, Not a Label

- ==Differential privacy bounds how much one protected contribution can change a release=={A randomized mechanism satisfies $(\epsilon,\delta)$-DP when, for adjacent datasets $D$ and $D'$ differing in the protected unit and every measurable output set $S$, the probability bound below holds. $\epsilon$ is the privacy budget and $\delta$ the additive slack, typically chosen below $1/n$ for $n$ records. The guarantee is a property of the algorithm: it holds against any adversary with arbitrary side information, which de-identification cannot claim.}:

::eq[dp-approx]
$$
\Pr[\mathcal{M}(D)\in S]\;\leq\;e^{\epsilon}\,\Pr[\mathcal{M}(D')\in S]\;+\;\delta
\qquad(\text{pure DP: }\delta=0)
$$

- ==The budget belongs to the history of releases, not the model=={Ten models each trained at $\epsilon=1$ on the same population compose to a basic bound of $\epsilon=10$; rotating keys does not reset the loss. Querying a fixed released DP model is post-processing and adds nothing, because the computation never touches protected data again.}:

::eq[composition-basic]
$$
\epsilon_{\mathrm{total}}\;\leq\;\sum_{i=1}^{k}\epsilon_i
\qquad\qquad
\delta_{\mathrm{total}}\;\leq\;\sum_{i=1}^{k}\delta_i
$$

::fig[privacy-budget-account]

- The Laplace mechanism adds noise scaled to sensitivity over budget: the scale is $\Delta_1 f/\epsilon$, so ==tightening epsilon from 1.0 to 0.1 multiplies the noise by ten=={For the salary-mean example, one person can move the sum by the salary range, the noise scale lands near 200 thousand dollars at $\epsilon=1$, and the published mean of 1,000 employees carries an expected absolute error near 200 dollars; the same release over a 100-person group carries about 2,000. Small groups pay the largest relative cost because the signal grows with $n$ while the noise does not.}:

::eq[laplace-mechanism]
$$
\widetilde{f}(D)=f(D)+\mathrm{Lap}\!\left(\frac{\Delta_1 f}{\epsilon}\right)
\qquad
b=\frac{\Delta_1 f}{\epsilon}
$$

- The Gaussian mechanism fits clipped gradients because clipping bounds the $\ell_2$ sensitivity explicitly. ==Its tails force approximate DP=={A sufficient one-shot calibration for $0<\epsilon<1$ requires $\sigma$ above the bound below; at $\Delta_2 f=1$, $\epsilon=0.5$, $\delta=10^{-5}$ that minimum lands near 9.7. This bound applies to one release; DP-SGD composes thousands of steps and needs a sampled-Gaussian accountant instead.}:

::eq[gaussian-sigma]
$$
\sigma\;\geq\;\frac{\Delta_2 f}{\epsilon}\sqrt{2\ln\!\left(\frac{1.25}{\delta}\right)}
$$

- ==Composition is where accountants earn their keep=={The moments accountant tracks the privacy loss random variable, the log-likelihood ratio between adjacent datasets, accumulates its exponential moments across steps, and applies the tail bound once at the end. In the Abadi et al. experiment at sampling rate 0.01, noise multiplier 4 and $\delta=10^{-5}$, it certifies $\epsilon=1.26$ after 100 epochs and 2.55 after 400, where advanced composition would report 9.34 and 24.22. These are that experiment's numbers, not reusable constants.}:

::eq[moments-accountant]
$$
L=\ln\frac{\Pr[\mathcal{M}(D)=o]}{\Pr[\mathcal{M}(D')=o]}
\qquad
\epsilon(\delta)=\min_{\lambda>0}\frac{k\,M(\lambda)+\ln(1/\delta)}{\lambda}
$$

- Rényi DP composes by addition: each mechanism's $D_\alpha$ bound sums across steps, and conversion back to $(\epsilon,\delta)$ optimizes over the order $\alpha$. ==No accountant is uniformly tightest=={The release record must pin the protected unit and adjacency, clipping and noise conventions, sampling scheme and rate, step count, accountant library and version, because a budget label without them is meaningless.}:

::eq[rdp-bound]
$$
\epsilon=\epsilon_{\mathrm{RDP}}+\frac{\ln(1/\delta)}{\alpha-1}
\qquad
D_\alpha\!\left(\mathcal{M}(D)\,\|\,\mathcal{M}(D')\right)\leq\epsilon_{\mathrm{RDP}}
$$

- ==DP-SGD is a per-step protocol, not a training flag=={Each step checks the accountant prospectively, Poisson-samples records at rate $q$, clips each per-example gradient to norm $C$, sums, adds $\mathcal{N}(0,\sigma^2C^2I)$, divides by the fixed public normalizer $B$, and records the step. The CIFAR-10 worked example uses 50,000 images, expected lot 4,000 ($q=0.08$), 750 steps for the target budget; changing epochs or lot size changes the sampling probability and requires rerunning the accountant. Record-level adjacency does not protect a person with many records; person-level adjacency does.}.
- ==The privacy-utility frontier is task-dependent, not a curve=={At single-digit budgets MNIST stays within about 8 points of its 98.3 percent baseline, while CIFAR-10 trained from scratch at $\epsilon=8$ lands at 73.0 percent (Abadi) or 81.4 percent (De et al.), roughly 14 to 22 points below the 95 percent reference, at a budget four times looser. Pretraining changes the problem again: De et al. report 86.7 percent ImageNet accuracy at $(8,\,8\times10^{-7})$-DP. Epsilon alone predicts nothing; the mechanism, adjacency, accountant, training regime and subgroup errors decide.}.

::chart[accuracy-cost-at-epsilon]

- The decision framework sequences the choice: regulatory driver first, then threat-model match, dataset characteristics (effective sample size, class imbalance, rare subgroups), an explicit utility budget and a compute budget, since per-example clipping lowers throughput on its own. ==A mandatory bound is a feasibility constraint=={An accuracy improvement does not justify exceeding it; where the bound cannot be met at acceptable utility, the deployment changes, not the bound.}.

### Sequence by Maturity, Not by Hype

- ==Defense selection follows deployment context=={Healthcare prioritizes accounted DP, federated learning, TEEs and audit; financial services adds HSMs and adversarial training; edge devices lead with secure boot and PUFs; public LLM APIs separate instruction from data planes and meter per-principal budgets; critical infrastructure pairs attestation with fail-safe fallback. DP, federated learning, HE and secure computation each exclude a different observer and none bounds what the released model reveals.}.
- ==The maturity model is a dependency structure, not a calendar=={Five cumulative layers: access and configuration (least privilege, RBAC), data and privacy, model integrity (signing, hashing, release gates), adversarial and abuse resistance, then governance and evidence. Red-teaming and DP accounting on top of an unauthenticated registry and cleartext channels is structurally flawed: the lower layers are still open.}.

### Fallacies and Pitfalls

- ==Security through obscurity fails under Kerckhoffs's principle=={Hidden architecture does not stop black-box extraction or transferable adversarial examples; security must survive disclosure of the design.}.
- ==An epsilon label without adjacency, delta, composition and accountant is meaningless=={Ten releases at $\epsilon=1$ are $\epsilon=10$, not $\epsilon=1$.}.
- ==Federated learning is not private by itself=={Gradient inversion reconstructs inputs from updates; secure aggregation hides individual messages under its collusion assumptions but says nothing about the aggregate; DP noise applied after aggregation does not protect the server that saw it.}.
- ==Poisoning is not proportional to dataset size=={A targeted backdoor needs a trigger and a few hundred well-placed examples, not a million corrupted records.}.
- ==Hardening the endpoint does not harden the system=={Rate limits and mTLS on the API leave unencrypted query logs, an open registry or a shared cache as alternate observation paths. Every control must name the boundary it actually covers.}.
- ==Distributed topologies multiply the attack surface=={A ring has $\mathcal{O}(N)$ logical channels; all-to-all has $\mathcal{O}(N^2)$. A 10,000-client federated deployment is 10,000 endpoints, and the threat model must inventory each one's credentials and transport.}.

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
