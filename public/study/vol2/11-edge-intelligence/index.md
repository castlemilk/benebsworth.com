---
title: "Edge Intelligence — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/11_edge_intelligence/11_edge_intelligence.html"
canonical_url: "https://benebsworth.com/study/vol2/11-edge-intelligence/"
---

# Edge Intelligence: Study Packet

A phone can run a model offline. Why does that not mean it can learn offline, and when does sharing small updates stop being a saving and become another fleet-control problem?
*Machine Learning Systems, vol. 2, chapter 11, Edge Intelligence (mlsysbook.ai)*

## Thesis

Edge learning is an admission-control and population-design problem, not a smaller copy of cloud training. **Running inference locally proves only that the forward pass fits** *(why it matters: Training adds gradients, optimizer state, saved activations, workspace, energy and heat. A model whose weights fit comfortably can still fail its first backward pass inside the memory the operating system grants a background task.)*. The design center is: prove that adaptation beats simpler personalization, fit the update's peak working set inside the device allowance, admit learning only when energy, thermals and foreground latency all have slack, shrink the update rather than the ambition, and measure which population actually gets to participate. Federated learning changes what crosses the device boundary; it does not make coordination, privacy or evaluation free.

## Guided notes

### Local Prediction Is Not Local Learning

- The first question is not "can the device train?" but "must learning happen here?" **Feature-based personalization, cloud fine-tuning, caching and lookup tables are the simpler alternatives** *(why it matters: If user context can be represented as features or retrieved state, the device may need no local gradient update at all. On-device learning earns its place only when a measured distribution gap, privacy constraint, connectivity constraint or latency requirement defeats those simpler options.)*.
- A cloud round trip can violate latency even before privacy enters. The book's mobile-robotics example contrasts a 33 ms frame budget with an 80-150 ms network round trip: inference must be local regardless of where training occurs.
- Three architectures differ by what crosses the device boundary. Local-only learning sends nothing but cannot share discoveries. Centralized learning uploads raw observations and simplifies fleet learning at maximal transfer and exposure. Federated learning downloads a shared model and uploads model updates. **Data locality is not privacy** *(why it matters: A model update can still leak information about the examples that produced it. Secure aggregation and differential privacy protect different boundaries and must be designed explicitly.)*.

![What crosses the device boundary](https://benebsworth.com/study/vol2/11-edge-intelligence/diagrams/boundary-map.svg)

*Local-only learning sends nothing, centralized learning uploads raw observations, and federated learning downloads a shared model then uploads updates. Keeping raw data local reduces one exposure but does not by itself make the update private.*
### Training Is a Different Machine Than Inference

- The book's 10M-parameter FP32 example starts with only 40 MB of weights. Training adds 40 MB of gradients, 80 MB of Adam moments and, under the stated illustrative assumption, 200 MB of saved activations: 360 MB in all, a 9x amplification over the weights.
- The correct ceiling is not installed RAM. **A background task receives a much smaller allowance** *(why it matters: The chapter's keyboard profile uses a 200-300 MB background-memory allowance. A local update needing 50-100 MB of activations and optimizer state can consume a quarter of that allowance before the keyboard's own state is counted.)*. The 360 MB full training stack exceeds even the top of that allowance, although the phone may have 8 GB installed.

**Eq 11.1 · Peak adaptation memory**
$$
M_{\mathrm{peak}}=M_{\mathrm{resident}}+M_{\mathrm{trainable}}+\max_t\left[M_{\mathrm{act}}(t)+M_{\mathrm{workspace}}(t)\right]
$$

- Memory capacity is only the first wall. One Adam update step in the same example moves about 800 MB, 20x the weight bytes read by one inference. At the A17 Pro's 51 GB/s peak memory bandwidth, that traffic alone costs about 16 ms before arithmetic.
- Mobile bandwidth is the hard ceiling. H100 HBM3 provides about 3,350 GB/s; flagship mobile memory sits near 51-77 GB/s, a 44-65x gap. **Low-precision weights attack only part of that traffic** *(why it matters: In the chapter's count, the three weight reads are about 15 percent of update-step traffic. Quantizing the base model leaves most activation, gradient and optimizer traffic untouched.)*.

![Training memory amplifier](https://benebsworth.com/study/vol2/11-edge-intelligence/diagrams/memory-amplifier.svg)

*The chapter's 10M-parameter example: 40 MB weights plus 40 MB gradients, 80 MB Adam state and 200 MB activations make a 360 MB full-update working set, beyond the 200-300 MB background allowance.*
### Background Learning Needs an Admission Envelope

- A training window that fits memory can still be unacceptable. The book's unconstrained voice-assistant job draws 4.5 W for 30 minutes, consuming 2.25 Wh, or 15 percent of a 15 Wh battery.
- Charging changes the energy test, not the whole admission decision. **Adaptation is admitted only when energy, thermal and foreground-latency tests all pass** *(why it matters: The runtime must predict update energy, sustained power including the adaptation increment, and worst-case foreground latency under contention. Revoke admission when the measured envelope changes; a background update may not spend the user's foreground deadline.)*.

**Eq 11.2 · Background adaptation admission**
$$
E_{\mathrm{win}}\le E_{\mathrm{allow}}\quad\land\quad P_{\mathrm{dev}}+\Delta P_{\mathrm{adapt}}\le P_{\mathrm{thermal}}\quad\land\quad L_{\mathrm{fg}}+\Delta L_{\mathrm{adapt}}\le D_{\mathrm{fg}}
$$

- This is more than a local scheduler rule. Passing admission correlates with hardware class, charging habits and connectivity. The devices admitted to learning become the population the fleet can learn from.

### Shrink the Update, Not the Ambition

- Weight freezing removes a parameter's gradients and optimizer state, but it does not by itself remove the frozen weights or every backward dependency. Bias-only updates are cheap and calibration-oriented; structural domain shifts may need richer updates.
- TinyTL's reported image-classification results show why activation memory matters: training-memory savings up to 6.5x, with lite residual modules adding only about 3.8 percent memory overhead in that study. The exact numbers are benchmark-specific, but the target is the right one.
- LoRA and residual adapters make the trainable artifact small enough to store, transmit and roll back. **A low-rank update shrinks trainable parameters, not every training cost** *(why it matters: For a 768 by 768 matrix, full fine-tuning touches 589,824 parameters while rank-4 LoRA touches 6,144, a 99 percent reduction. Backward computation may still traverse the base network, and the adapter's activations and optimizer state remain in the budget.)*.

**Eq 11.3 · Low-rank update parameters**
$$
N_{\mathrm{LoRA}}=r(d_{\mathrm{in}}+d_{\mathrm{out}})\quad\text{versus}\quad N_{\mathrm{full}}=d_{\mathrm{in}}d_{\mathrm{out}}
$$

- Adapter storage changes personalization economics. Ten full 40 MB context models cost 400 MB; one 40 MB backbone plus ten 200 KB adapters costs about 42 MB. That is a 9.5x total storage reduction and a 200x marginal cost reduction per added context.

![Freeze the matrix, train the thin path](https://benebsworth.com/study/vol2/11-edge-intelligence/diagrams/lora-slimming.svg)

*For a 768 by 768 layer, rank-4 LoRA trains 6,144 parameters instead of 589,824. The trainable artifact shrinks by 99 percent, while backward traversal, activations and adapter optimizer state remain in the budget.*

**Adapters make contexts cheap to keep**

| Storage strategy | Stored model bytes |
|---|---|
| Ten full models | 400 |
| Backbone + adapters | 42 |

*The book's personalization example: ten full 40 MB context models cost 400 MB, while one shared 40 MB backbone plus ten 200 KB adapters costs about 42 MB. This is storage only; active training memory is a separate budget.*

### Scarce Local Evidence Is a Budget Too

- Edge data is abundant as sensor volume and scarce as supervision. A 30 fps camera produces about 2.6 million frames per day and a 100 Hz accelerometer about 8.6 million readings, almost none labeled by the user.
- Few-shot support sets, streaming updates, replay buffers and compressed representations allocate different scarce resources. Head-only adaptation is cheap because the backward pass stops at the classifier, but the false-activation rate on negative speech or background noise is a separate acceptance measurement.
- Streaming adaptation usually manufactures supervision from implicit feedback, pseudo-labels or the structure of the sensor stream. Treat those events as proxies: retain a nonadapting control where possible, measure delayed outcomes, and suspend learning when the proxy-to-outcome relationship drifts.
- **An embedding is not anonymized by being small** *(why it matters: Compressed features reduce storage and bandwidth, but they can still encode sensitive input structure. Privacy needs an explicit release boundary, not a dimensionality argument.)*.
- Replay spends storage and repeated backward work to protect earlier behavior. A small ring buffer covers only its retained window and can hold aggregate accuracy while rare classes degrade, so forgetting must be measured per class or cohort. Cached features also carry encoder-version compatibility.
- Elastic weight consolidation trades stored examples for parameter-sized importance statistics; progressive architectures trade interference for added capacity. Neither removes the need to test each admitted window for retained capability against a recoverable baseline.

### Federated Averaging Is a Population Protocol

- FedAvg is simple only after a round completes. Each selected client trains locally, then the server forms an example-weighted average. **The weighting rule is a policy choice** *(why it matters: A client with ten times as many local examples receives ten times the influence under example weighting. User weighting gives each participant equal influence. Neither is universally fair; the deployment must declare whether the unit of interest is an example, user, organization or cohort.)*.

**Eq 11.4 · Federated averaging**
$$
\theta^{t+1}=\sum_{k=1}^{K}\frac{n_k}{n}\theta_k^{t+1},\qquad n=\sum_k n_k
$$

- Local epochs trade communication for drift. More local work can reduce synchronization frequency, but non-IID clients move toward different local optima. FedProx constrains drift with a proximal penalty; SCAFFOLD corrects update direction with control variates at roughly twice the communication volume.
- The comparison is measured time to target, not rounds. **A setting can halve the round count and still finish later** *(why it matters: More local epochs lengthen each round and may increase drift. The book measures the first validated round that reaches the target multiplied by observed round duration, including selection, local work, transfer, aggregation and waiting.)*.

**Eq 11.5 · Measured time to target**
$$
T_{\mathrm{target}}(E)=\sum_{r=1}^{R(E)}T_{\mathrm{round}}(E)
$$

- The uplink cost is concrete. The chapter's 50 MB reference adapter update takes about 6.7 minutes at 1 Mb/s and about 40 seconds at 10 Mb/s. A local-epoch setting that halves the number of rounds removes half of that cumulative upload time only if the extra local work and drift do not cost more.
- Shared-update compatibility is algebraic, not just schema matching. Even equal-rank LoRA clients cannot average their up- and down-projection factors separately: the product of the averages contains cross-terms pairing one client's up-projection with another client's down-projection, a model no device trained. Aggregate multiplied updates, fold or truncate the result deliberately, or keep incompatible tiers in separate groups.


**Slower networks push the local-work optimum right**

| Network condition | Cost-model optimum |
|---|---|
| Fast network | 10 |
| Slow network | 40 |

*The book's illustrative communication-computation cost model places the time-minimizing local-epoch setting near 10 on a fast network and near 40 on a slow network. These are scenario values, not measured convergence results.*

### Federation Moves the Boundary, Not the Cost

- A compressed update can look like a large saving for one round and disappear over a run. In the book's scenario, a 2.5 MB compressed update is 80x smaller than a 200 MB weekly raw-image upload. **After about 80 update rounds, uploads alone equal the raw-data volume** *(why it matters: That comparison still omits global-model downloads, retries and protocol traffic. Federated learning saves communication only when the total round budget stays below the data transfer it replaces or when policy forbids the raw transfer regardless of cost.)*.

**Eq 11.6 · Federated round traffic**
$$
V_{\mathrm{round}}=V_{\mathrm{down}}+V_{\mathrm{up}}+V_{\mathrm{protocol}}+V_{\mathrm{retry}}
$$

- Client scheduling is population selection. Eligibility filters, over-selection and round deadlines remove constrained devices faster than capable ones. Coverage ratio makes the skew measurable: a cohort's share of completed updates divided by its share of the deployed population. One means proportional representation; far below one means the shared model under-learns that cohort.
- **Secure aggregation hides individual updates only under its own assumptions** *(why it matters: Pairwise masks cancel in the sum, but dropout recovery costs another round and requires enough surviving clients to cross a secret-sharing threshold. The participation floor also keeps the aggregate large enough that the sum does not trivially expose each contribution. Secure aggregation does not imply differential privacy, and neither follows from keeping raw data local.)*.
- Secure aggregation creates a robustness boundary. **A system cannot claim arbitrary per-client inspection and conventional secure aggregation over the same messages** *(why it matters: Byzantine filters such as per-client anomaly inspection need access to individual updates, while masking deliberately withholds them. The design must validate clients before masking, use attested execution or bounded local updates, compute aggregation-compatible checks, or adopt a protocol built for robust statistics under encryption.)*.
- Heterogeneity is not a corner case. Peak compute ratings can differ by about 1,200x between flagship phones and IoT microcontrollers; measured AI scores among post-2020 phone processors span about 400x, and even recent flagship generations differ by about 14x. A single update format trains the flagship population and excludes everyone else.

![The aggregate learns the admitted population](https://benebsworth.com/study/vol2/11-edge-intelligence/diagrams/participation-funnel.svg)

*Eligibility, sampling, over-selection, deadlines and dropout filter the deployed fleet into completed updates. Coverage ratio compares each cohort's share of completed updates with its share of the deployed population.*
### Learning After Release Is an Operations Problem

- The release artifact is no longer just a model binary. It is a versioned policy bundle: base model, per-tier adaptation strategy, adapter schema, resource rules, telemetry policy and rollback plan.
- Integration allocates one device budget across adaptation, replay and participation. The book's voice-assistant scenario assigns rank-32 LoRA to flagship phones, rank-16 LoRA to mid-tier phones and bias-only updates to budget phones, with candidate replay buffers of 100 MB and 10 MB across tiers. Those are starting assignments to profile, not demonstrated fits.
- A frozen shadow model can detect behavioral change, not truth. **A shadow comparison is a gate, not a judge** *(why it matters: Prediction and confidence differences can suspend an update for evaluation, but without labels or a validated proxy they do not establish which model is better.)*.
- Fleet health inherits the same participation bias as training. Devices most likely to fail may be least likely to report. Promotion needs reporting coverage by cohort as well as quality signals.
- Poisoned or malformed updates are an operations input, not an afterthought. Validate clients before masking where possible, bound local updates, use aggregation-compatible checks, and record how the privacy protocol constrains inspection.
- Rollback must restore a compatible set: base model, adapter, schemas and policy. Rolling back only one component can strand devices across version skew.

### Fallacies and Pitfalls

- Confusing local inference fit with training fit: backward state, not just weights, decides the first failure.
- Reading installed RAM as the learning budget: background allowance and foreground reserve are the operative ceiling.
- Treating charging as permission: energy is only one of three admission tests.
- Counting trainable parameters while ignoring activations, workspace and backward traffic.
- Calling federated learning inherently private: updates and metadata still leak information.
- Optimizing rounds instead of time to target: fewer rounds can mean longer rounds and more drift.
- Confusing one-round compression with lifetime communication savings.
- Averaging adapter factors because their shapes match: cross-terms make the product of factor averages differ from the average update.
- Measuring only average fleet health: participation and reporting coverage decide whose behavior the evidence describes.

## The physics

| Quantity | Value | Use |
|---|---|---|
| 10M FP32 weights | 40 MB | inference-weight baseline |
| Illustrative training stack | 360 MB | 9x weights; full update working set |
| Training memory range | 4x-12x weights | depends on optimizer and activation schedule |
| Mobile keyboard background allowance | 200-300 MB | operative memory ceiling, not installed RAM |
| Keyboard update working memory | 50-100 MB | one-quarter of allowance at selected point |
| One Adam step traffic | ~800 MB | 20x inference weight reads |
| A17 Pro step traffic floor | ~16 ms | 800 MB at 51 GB/s before arithmetic |
| HBM3 vs mobile bandwidth | 3,350 vs 51-77 GB/s | 44-65x interface gap |
| Battery example | 4.5 W × 0.5 h = 2.25 Wh | 15% of a 15 Wh battery |
| TinyTL memory saving | up to 6.5x | benchmark-specific transfer result |
| Rank-4 LoRA in 768×768 layer | 6,144 vs 589,824 params | 99% trainable-parameter reduction |
| Rank-16 residual adapter | 25,360 params each | about 50.7 KB FP16 before training state |
| Voice-assistant tier scenario | rank 32 / rank 16 / bias-only | candidate adaptation split by device tier |
| Scenario replay buffers | 100 MB / 10 MB | candidate flagship/budget allocations to validate |
| Adapter personalization storage | 42 MB vs 400 MB | 9.5x total; 200x marginal context cost |
| Camera/accelerometer daily volume | ~2.6M / ~8.6M events | abundant sensors, scarce labels |
| Adapter upload at 1-10 Mb/s | ~6.7 min to ~40 s | recurring round cost |
| Compressed-update/raw-data ratio | 80x for one round | parity after about 80 rounds |
| Phone processor measured spread | ~400x post-2020; ~14x recent flagships | heterogeneity shapes participation |

## Glossary

- **Edge intelligence**: inference, adaptation and coordination on or near the devices that observe data.
- **Background allowance**: memory and power budget the operating system leaves for non-foreground work.
- **Peak training working set**: maximum live memory across weights, trainable state, activations and workspace during an update.
- **Opportunistic scheduling**: admitting learning when device state permits it, such as idle, charging, Wi-Fi and thermal headroom.
- **Weight freezing**: training only selected existing parameters while leaving others without gradients or optimizer state.
- **Residual adapter**: small bottleneck module added beside a frozen backbone.
- **LoRA**: low-rank trainable update added to frozen weight matrices.
- **Experience replay**: retaining selected past examples or representations to reduce forgetting under streaming updates.
- **FedAvg**: federated averaging of locally trained client models, conventionally weighted by local sample count.
- **Client drift**: divergence of client models toward local optima under non-IID data and multiple local steps.
- **Coverage ratio**: cohort share of completed updates divided by cohort share of deployed population.
- **Secure aggregation**: cryptographic aggregation that hides individual updates from the coordinator under stated assumptions.
- **Version skew**: coexistence of incompatible model, adapter, schema or policy versions across a fleet.

## → Ben's world

- The shared droplet already teaches background admission. Polling tenants may be co-located for cost, but each must leave foreground latency, memory and thermal or power slack for the others.
- BrandBrain generation jobs have the same hidden working-set problem: a compact request can fan into large intermediate assets, retries and storage. The request's visible size is not its peak footprint.
- Greenveil's edge-like constraint is API cost and latency rather than battery. Server-side rendering can move work away from the client, but only if the upstream fan-out and cache policy admit it.
- The local MLX benchmark harness measures quality-speed tradeoffs that resemble time-to-target. Tokens per second alone is the wrong unit when a thinking configuration changes both answer quality and total elapsed time.
- Federated participation bias has a web analogue in telemetry: fast, modern clients report more often, so product metrics can describe the healthiest population rather than the installed one.

## Open questions

- Which local projects have a hidden background-admission envelope that should be made explicit: memory, energy, latency, cost or user attention?
- How should a benchmark report time-to-target when a slower but better model uses fewer retries or less human intervention?
- Could coverage-ratio instrumentation expose whose traffic is missing from web analytics or product telemetry?
- Where would an adapter-style artifact boundary help BrandBrain: shared base generation capability plus small, versioned brand-specific deltas?


---

## Key equations

**Eq 11.1 · Peak adaptation memory**

$$
M_{\mathrm{peak}}=M_{\mathrm{resident}}+M_{\mathrm{trainable}}+\max_t\left[M_{\mathrm{act}}(t)+M_{\mathrm{workspace}}(t)\right]
$$

*Training fit is a peak live-memory problem across resident weights, trainable state, activations and workspace, not a comparison of weight bytes with installed RAM.*

**Eq 11.2 · Background adaptation admission**

$$
E_{\mathrm{win}}\le E_{\mathrm{allow}}\quad\land\quad P_{\mathrm{dev}}+\Delta P_{\mathrm{adapt}}\le P_{\mathrm{thermal}}\quad\land\quad L_{\mathrm{fg}}+\Delta L_{\mathrm{adapt}}\le D_{\mathrm{fg}}
$$

*A background update is admitted only when predicted energy, sustained power and foreground-latency impact all fit their separate budgets. Charging relaxes only the energy term.*

**Eq 11.3 · Low-rank update parameters**

$$
N_{\mathrm{LoRA}}=r(d_{\mathrm{in}}+d_{\mathrm{out}})\quad\text{versus}\quad N_{\mathrm{full}}=d_{\mathrm{in}}d_{\mathrm{out}}
$$

*LoRA trains two thin matrices rather than the full matrix. The saving applies to trainable parameters; backward traversal, activations and optimizer state still need accounting.*

**Eq 11.4 · Federated averaging**

$$
\theta^{t+1}=\sum_{k=1}^{K}\frac{n_k}{n}\theta_k^{t+1},\qquad n=\sum_k n_k
$$

*FedAvg forms an example-weighted average of returned client models. The weighting rule is a population policy, not a neutral implementation detail.*

**Eq 11.5 · Measured time to target**

$$
T_{\mathrm{target}}(E)=\sum_{r=1}^{R(E)}T_{\mathrm{round}}(E)
$$

*Local epochs are compared by measured time to a validated quality target, including round duration and completion, rather than by communication rounds alone.*

**Eq 11.6 · Federated round traffic**

$$
V_{\mathrm{round}}=V_{\mathrm{down}}+V_{\mathrm{up}}+V_{\mathrm{protocol}}+V_{\mathrm{retry}}
$$

*A round pays download, upload, protocol and retry traffic. Compressed uploads alone do not establish end-to-end communication savings.*

## From the book

- [Learning architectures](https://mlsysbook.ai/vol2/11_edge_intelligence/11_edge_intelligence.html) — The book's comparison of local-only, centralized-cloud and federated learning by what crosses the device boundary. Our boundary-map redraws the same decision in a compact lane form.
- [Training memory amplifier](https://mlsysbook.ai/vol2/11_edge_intelligence/11_edge_intelligence.html) — The book's memory-amplifier figure. Our version keeps the 40/40/80/200 MB composition but places it directly against the 200-300 MB background allowance.
- [Communication-computation trade-off](https://mlsysbook.ai/vol2/11_edge_intelligence/11_edge_intelligence.html) — The book's illustrative local-epoch cost curves. We quote only the fast/slow optimum shift and preserve the warning that the curves are not measured convergence results.
- [Secure aggregation](https://mlsysbook.ai/vol2/11_edge_intelligence/11_edge_intelligence.html) — The book's secure-aggregation mechanism, including mask cancellation, dropout recovery and participation floor. We keep those constraints in prose and cite the original mechanism here.
- [Edge MLOps lifecycle](https://mlsysbook.ai/vol2/11_edge_intelligence/11_edge_intelligence.html) — The book's cloud-to-device lifecycle across pretraining, compression, rollout, adaptation and privacy-controlled telemetry. Our packet compresses the operational lesson into release-bundle, shadow-gate and rollback rules.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. A phone already runs a model offline. Why does that not establish that it can adapt the model offline?
   - A. Offline inference removes communication delay, so any local training that fits flash can run whenever the scheduler has spare time
   - B. Local inference always uses more memory than local training because forward activations dominate every mobile training budget
   - C. Training adds backward state, memory traffic, energy, heat and foreground contention beyond the forward pass
   - D. The operating system permits any background task to use all installed RAM once the device is charging

2. In the chapter's 10M-parameter FP32 example, why does the full update working set reach 360 MB?
   - A. Forty MB weights are joined by forty MB gradients, eighty MB Adam state and two hundred MB saved activations
   - B. The weights are 360 MB before training starts because gradients and optimizer state reuse the same memory in place
   - C. The optimizer stores ten full model copies while activations are released before they consume memory
   - D. The example counts flash storage rather than live working memory

3. A smartphone has 8 GB installed RAM. Why can a 360 MB training working set still be infeasible?
   - A. Installed RAM is never available to machine-learning runtimes because mobile operating systems reserve it for the foreground interface
   - B. Flash memory is always faster than RAM, so the working set must remain in flash
   - C. The model must reserve all memory for federated downloads before training starts
   - D. The operative ceiling is the smaller background allowance after the OS and foreground application reserve memory

4. A device is charging, so its energy allowance increases. Why can the adaptation window still be rejected?
   - A. Charging disables the high-power accelerators adaptation would otherwise use, so the energy test becomes irrelevant
   - B. The update might still violate the thermal power limit or foreground-latency deadline under concurrent adaptation
   - C. Energy, thermal and latency are the same test expressed in three units
   - D. The battery test applies only when the device is already at full charge

5. For a 768 by 768 weight matrix, what does rank-4 LoRA shrink from 589,824 to 6,144?
   - A. The full model's inference latency by ninety-nine percent, because low rank removes most backward computation
   - B. The bytes of the frozen base model stored in flash memory
   - C. The number of trainable parameters, not necessarily the backward path or activation memory
   - D. The number of examples required for federated aggregation to converge

6. Which statement correctly describes weight freezing?
   - A. It removes gradients and optimizer state for frozen parameters while leaving their forward and possible backward roles intact
   - B. It removes frozen weights from memory after the first optimizer step because training no longer needs their forward values during later epochs
   - C. It eliminates the backward path through every frozen layer in all implementations
   - D. It guarantees better personalization than adapters because fewer parameters are trained

7. Under ordinary FedAvg example weighting, what influence does a client with ten times as many local examples receive?
   - A. Exactly the same influence as every other participant, because federated objectives always treat users rather than examples as the unit
   - B. No influence until user weighting is enabled by the coordinator
   - C. Influence proportional only to its network bandwidth and hardware tier
   - D. Ten times the influence, because its update is weighted by its share of examples in the round

8. Why can a larger local-epoch setting reduce communication rounds yet increase total time to target?
   - A. Local epochs reduce computation on every participating device, so the server must wait longer even though fewer communication rounds are required
   - B. More local work lengthens each round and non-IID client drift can increase the number of rounds needed to reach target quality
   - C. The server must retrain the global model from scratch after every additional local epoch
   - D. Communication time is independent of update size and network bandwidth

9. Why is federated learning not inherently private?
   - A. Raw data is always uploaded beside every model update, so secure aggregation only hides the final aggregate from clients rather than the server
   - B. Secure aggregation reveals every client update but hides the final global model
   - C. Returned updates and metadata can leak information; secure aggregation and differential privacy are separate explicit mechanisms
   - D. Privacy is impossible whenever more than one client participates in a round

10. A keyboard model adapts nightly for a year. Each update passes its memory and energy admission tests and improves a metric on recent typing. Why must acceptance also measure retained behavior against a recoverable baseline?
    - A. Individually useful updates can accumulate into forgetting; retained-task evidence and a compatible recovery point remain necessary
    - B. Passing memory and energy admission guarantees that earlier predictions remain unchanged because resource fit and behavior are equivalent budgets
    - C. Freezing the backbone prevents head or adapter updates from changing any earlier-task prediction
    - D. Improving the recent-data metric establishes quality for all past tasks whenever each update is small

11. A 10M-parameter FP32 model has 40 MB weights and 40 MB gradients. Adam stores two moment arrays totaling 80 MB. Under a revised activation schedule, saved activations cost 6x the weight bytes, or 240 MB. Ignoring workspace, what is the total working set and its amplification over the weights?

12. A weekly raw-image upload would cost 200 MB. A compressed federated update costs 2.5 MB per round. Ignoring downloads, retries and protocol bytes, after how many update rounds do cumulative uploads equal the raw-data volume?

13. Design a release and rollback policy for a keyboard model that adapts locally across flagship and budget phones. Explain what artifact is versioned, how evidence is gathered, and what happens when a cohort stops reporting.

## Answer key

1. C. Inference fit only proves that the forward-pass model and its runtime fit. Training introduces gradients, optimizer state, saved activations, workspace and user-facing power and latency costs.

2. A. The illustrated stack is 40 + 40 + 80 + 200 MB, or 360 MB. That is 9x the inference weights under the chapter's stated activation assumption.

3. D. The chapter uses a 200-300 MB background-memory allowance for the keyboard profile. Installed RAM overstates what a background learning task may use.

4. B. The admission rule is a conjunction. Charging can enlarge the energy allowance, but it does not remove heat or foreground contention.

5. C. LoRA trains two thin matrices containing r(d_in + d_out) parameters. The frozen base still exists, and activations, workspace and backward computation remain separate costs.

6. A. Freezing reduces trainable state, but it does not make the frozen base or every backward dependency disappear. That distinction governs peak memory.

7. D. Example weighting uses n_k divided by total samples n. The book emphasizes that this is a population policy choice, not a neutral implementation detail.

8. B. The chapter ranks settings by measured time to target, not communication count. Each round can become longer, and drift can erode the expected reduction in round count.

9. C. Data locality removes one transfer path but does not make the released update harmless. Secure aggregation hides individual contributions under assumptions; differential privacy bounds a different release guarantee.

10. A. Continual adaptation is a trajectory problem. Small, individually admitted updates can overwrite earlier competence, so acceptance needs retained-task evidence and a recovery point as well as new-data improvement.

11. 40 + 40 + 80 + 240 = 400 MB. The amplification over weights is 400 / 40 = 10x.

    Each memory term has a different owner. The activation multiplier applies only to the activation term, not to the already-counted gradients and optimizer state.

12. 200 MB / 2.5 MB per round = 80 rounds. After about 80 rounds, upload bytes alone match the raw-data volume, before counting the rest of the round traffic.

    The one-round compression ratio is 80x, but federation repeats the upload every round. Lifetime communication cost must be compared over the training run.

13. A strong answer treats the release as a compatible policy bundle: base model, adapter schema, per-tier adaptation strategy, resource admission rules, telemetry policy and rollback plan. Validation uses hardware-in-the-loop tests and cohort-level distributed or privacy-preserving metrics. A frozen shadow model can detect behavioral change but not prove accuracy without labels or a validated proxy. Promotion requires sufficient reporting coverage by cohort. If a cohort stops reporting, the fleet should hold rather than treat silence as health. Rollback restores a compatible set of base model, adapters, schemas and policy, accounting for version skew rather than rolling back one artifact in isolation.

    The operational problem is population evidence plus compatibility. Average fleet metrics are insufficient because reporting itself is biased by device capability and connectivity.

## Audio overview

[Listen to the Marcus & Iris read-along (~8 min)](https://benebsworth.com/study-audio/vol2/11-edge-intelligence.m4a) — a generated podcast walking this packet's argument.
