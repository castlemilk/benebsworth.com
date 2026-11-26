# Sustainable AI — self-test

1. A hyperscaler plans a 500 MW campus for a new foundation model cluster, but the local utility interconnect approval is capped at 320 MW for the next three years. The organization's capital reserves could cover the electricity cost multiple times over. Which framing best captures why sustainable AI treats energy as a first-class engineering constraint rather than a financial or reporting concern?
   - A. Carbon accounting frameworks mandate disclosing total planned capacity upfront, creating an administrative filing hurdle before training can start.
   - B. Electricity price fluctuations create budget volatility over the run, so the primary engineering intervention is financial hedging of contracts.
   - C. Corporate sustainability reporting requires purchasing voluntary offsets for the unapproved megawatts of capacity, adding a recurring financial cost to the project without altering any physical infrastructure or delivery timeline.
   - D. Power delivery and grid interconnect capacity impose a hard physical ceiling that capital cannot bypass on deployment timescales, making power an operational constraint that model architectures and cluster sizing must fit within.

2. A 2,000 MWh training run can be placed at a site whose annual-average grid factor is 400 g CO2 per kWh or at one whose factor is 20 g CO2 per kWh, with facility electricity held equal. Which conclusion follows?
   - A. The cleaner site also cuts the run's total energy twentyfold, because low-carbon grids deliver electricity more efficiently to the facility.
   - B. Attributed emissions fall from about 800 tonnes to about 40 tonnes, a twentyfold difference that isolates the grid factor at equal facility energy.
   - C. This comparison alone ranks placement against an algorithmic change, because both interventions reduce measured emissions.
   - D. Waiting for cleaner hours at the cleaner site would multiply the saving by a further twentyfold on top of the spatial gain.

3. An inference optimization cuts energy per task by a factor of 4, and the lower cost raises task volume by a factor of 20, with the workload mix unchanged. What happens to fleet energy?
   - A. It falls by a factor of 4, because per-task efficiency alone sets the fleet's total energy consumption.
   - B. It stays the same, because the efficiency improvement and the demand growth cancel each other exactly.
   - C. It rises by a factor of 5, because fleet energy is energy per task multiplied by the number of tasks.
   - D. It rises by a factor of 80, because the efficiency gain and the demand growth compound multiplicatively.

4. A team plans a three-day run that needs 120 MW of accelerator power at once in a facility with an 80 MW grid feed. They argue the run fits because its total energy is less than the facility uses in a month. What is wrong with the argument?
   - A. The power limit is instantaneous, so the feed caps how many servers can be active at once regardless of run length; the plan must lower concurrency and accept a longer run, or secure more deliverable power.
   - B. Nothing is wrong, because over the span of a month an energy budget and a power cap are fully interchangeable quantities.
   - C. The run fails only on cost grounds, because energy drawn above the feed level is billed at a punitive peak tariff rate.
   - D. The only error is omitting PUE from the calculation; adding the facility overhead multiplier to the estimate would show that the run's total energy consumption exceeds what the monthly budget allows.

5. An attention kernel has an arithmetic intensity of 3 FLOP/byte. An illustrative chip-and-memory energy model assigns 10 pJ per FLOP and 160 pJ per byte moved from DRAM, excluding static and facility energy. Which intervention directly targets the larger modeled energy contribution?
   - A. Replacing the accelerator with one offering double the peak TFLOP/s while retaining the same memory bandwidth and memory technology.
   - B. Increasing arithmetic precision from FP16 to FP32 so that more FLOPs execute per memory transaction on the kernel.
   - C. Fusing normalization and attention operators and tiling intermediate activations to keep data in on-chip SRAM, reducing DRAM traffic.
   - D. Lowering facility PUE from 1.5 to 1.1 so that memory stall cycles are eliminated from the critical path of the kernel.

6. An engineering team is auditing greenhouse gas emissions of an AI platform. Which option correctly maps these sources to GHG Protocol scopes: S1 diesel burned by backup generators at an owned facility; S2 grid electricity purchased to power an owned GPU cluster; S3 grid electricity consumed by cooling chillers in the same owned facility; S4 embodied carbon from manufacturing GPUs at an external foundry; S5 electrical energy consumed by end-user smartphones running the deployed app?
   - A. S1: Scope 1; S2: Scope 2; S3: Scope 2; S4: Scope 3; S5: Scope 3.
   - B. S1: Scope 2; S2: Scope 1; S3: Scope 2; S4: Scope 3; S5: Scope 3.
   - C. S1: Scope 1; S2: Scope 2; S3: Scope 1; S4: Scope 2; S5: Scope 3.
   - D. S1: Scope 3; S2: Scope 2; S3: Scope 2; S4: Scope 1; S5: Scope 1.

7. A production language model consumed 1,200 MWh during its one-time training run. In production it serves 8 million requests per day, consuming 0.0005 kWh per request. After how many days of continuous serving will cumulative inference energy reach the one-time training energy?
   - A. 120 days.
   - B. 300 days.
   - C. 600 days.
   - D. 1,200 days.

8. A facility audit lists conversion losses in five places: the utility transformer, the online UPS, the facility power distribution units, the server power supplies, and the baseboard voltage regulators. Which losses raise the facility's PUE?
   - A. All five losses raise PUE in equal measure, because every conversion loss turns delivered electrical power into heat that the facility's cooling system must ultimately remove from the building envelope.
   - B. Only the server power supplies and voltage regulators raise PUE, because they sit closest to the accelerators performing the useful computational work.
   - C. None of them raise PUE, because PUE measures cooling overhead and conversion losses are electrical in nature rather than thermal.
   - D. The transformer, UPS, and facility distribution losses, because they lie upstream of the IT boundary; server power supplies and voltage regulators sit inside the measured IT load.

9. Which systems analogy and operational reality best explains why inference often dominates total lifecycle energy for widely deployed foundation models?
   - A. Inference requires far higher instantaneous wattage per accelerator than training ever does at scale, because real-time serving constraints completely disable dynamic voltage and frequency scaling on production accelerator parts across the fleet.
   - B. Training is like a one-time rocket launch that burns concentrated energy over several weeks, whereas inference is like operating a commercial airline fleet that burns energy continuously across billions of recurring user interactions over years.
   - C. Inference models must perform a full backward pass on every user query to maintain prediction accuracy over time, doubling their computational cost relative to the forward-only training phase.
   - D. Inference cannot run on specialized accelerators, which forces cloud operators to serve production traffic on energy-inefficient legacy CPUs.

10. Profiling an autoregressive LLM serving pipeline shows the prefill phase achieves 55 percent MFU, while the decode phase achieves only 6 percent MFU with high HBM bandwidth occupancy. What is the physical mechanism causing decode energy inefficiency?
   - A. Decode executes in FP32 precision while prefill executes in INT4 precision on the same hardware generation, so each generated decode token costs roughly sixteen times the arithmetic energy of a prefill token in the pipeline.
   - B. Prefill bypasses high-bandwidth memory entirely by storing all model weights in CPU host RAM during the prompt processing phase.
   - C. Decode requires running a partial backpropagation step to generate the key-value cache embeddings for each new token in the sequence, which triples its arithmetic workload relative to prefill.
   - D. Decode is memory-bandwidth bound: each generated token requires reading all model weights from HBM with low arithmetic intensity, leaving tensor execution units idling while drawing static leakage and clock distribution power.

11. For a fixed inventoried manufacturing footprint, what happens to annualized embodied carbon when useful hardware life extends from three years to five years, before considering changes in operational energy?
   - A. Older accelerators automatically consume 40 percent less electrical power per FLOP as their silicon pathways break in over years of operation.
   - B. Extending accelerator lifespans from three to five years eliminates the electronic waste problem almost entirely, because modern server hardware decomposes harmlessly in conventional recycling streams after five years.
   - C. The fixed manufacturing footprint is amortized over five years rather than three, reducing its annualized allocation by 40 percent; total lifecycle savings still depend on operational energy and the inventory boundary.
   - D. Data center PUE automatically drops toward 1.0 after servers have operated for more than four years within the same facility envelope.

12. An AI company deploys quantization and knowledge distillation, reducing the energy cost per user query by 50 percent. Over the following year, total data center electricity consumption increases by 75 percent as lower per-query costs enable new product features and attract 3.5 times more queries. Which phenomenon explains this outcome?
   - A. Amdahl's law, which states that sequential execution fractions limit achievable parallel speedup on fixed problem sizes.
   - B. Dennard scaling breakdown, where transistor power density increases as process scaling continues below the voltage floor.
   - C. Jevons paradox, where technological efficiency improvements lower the effective cost of a resource, stimulating increased demand that outweighs per-unit efficiency gains.
   - D. The memory wall, where DRAM bandwidth fails to keep pace with arithmetic throughput improvements across successive hardware generations, forcing accelerators to idle while they wait for data.

13. *(numeric)* A model's one-time training run consumed 600 MWh of facility electricity. In production it serves 10 million requests per day at 0.0004 kWh per request. After how many days does cumulative serving energy equal the training energy?

14. *(explain)* A colleague celebrates cutting training FLOPs by 60 percent with unstructured pruning, and plans to serve the sparse model on custom-fabricated accelerators that need double the serving iterations to reach quality parity. Explain in plain language why this can be a lifecycle loss rather than a win, and walk through what a proper evaluation would compare.

---

**Answer key:** 1-D, 2-B, 3-C, 4-A, 5-C, 6-A, 7-B, 8-D, 9-B, 10-D, 11-C, 12-C, 13-150 days, 14-see modelAnswer in quiz.json
 