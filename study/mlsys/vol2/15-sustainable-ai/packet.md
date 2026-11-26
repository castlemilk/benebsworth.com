---
title: "Sustainable AI"
chapter: "vol2/15"
description: "Power is a hard physical ceiling that capital cannot bypass, and efficiency per task is not fleet energy. Sustainable AI is the accounting discipline that makes both facts measurable: fixed boundaries, lifecycle carbon, and an absolute budget that rebound cannot erode."
---

## Thesis

A hyperscaler plans a 500 MW campus and the utility caps the interconnection at 320 MW for three years. The capital to buy the electricity exists several times over, and it does not matter. Power delivery and grid capacity impose a physical ceiling that money cannot bypass on deployment timescales, which makes sustainability an existence constraint on what can be built rather than a reporting category applied afterward.

The second fact is quieter. ==Efficiency per task is not fleet energy.== Cut the energy of one query fourfold and watch volume rise twentyfold, and the fleet burns five times more than before. This chapter is the accounting discipline that keeps both facts measurable: a measurement contract that fixes what a footprint covers, a lifecycle account that starts before the first boot, and mitigation tiers whose savings must survive contact with demand.

## Power Is a Ceiling, Energy Is an Integral

The two limits obey different arithmetic, and confusing them is a planning error with a corporate cost. The power limit is instantaneous: a facility cannot draw more than its grid feed, and because IT power is facility power divided by PUE, that feed caps the number of servers active at once regardless of how long the job runs. The energy account is cumulative, integrating average power over wall-clock time.

::fig[power-vs-energy-wall]

A team planning a three-day run needing 120 MW of accelerator power in a facility with an 80 MW feed cannot fit it by pointing at the monthly energy budget. The plan must lower concurrency and accept a longer run, or secure more deliverable power. ==A short training burst can trip substation breakers with a modest megawatt-hour budget, while a month-long job on a smaller cluster consumes more total energy inside a safe envelope.==

The constraint reaches outside the building. In July 2022 Ireland's government reported that Dublin needed significant transmission reinforcement before it could host new data-center load. Substation permitting, engineering, and construction run multiples longer than GPU procurement, so delivered silicon can sit electrically stranded while the facility waits for its connection. The binding constraint has moved from the chip to the substation.

Synchronized training adds a dynamic twist. Thousands of accelerators entering a collective barrier and resuming arithmetic in lockstep swing power draw in unison, unlike independent web requests that smooth out across racks. Energy buffering at rack or facility level, sized to the measured energy deficit of the ramp rather than a fixed allowance, lets the utility connection see a smoother load.

## The Fleet Compounds Faster Than Silicon

The training compute of frontier models doubled roughly every six months after 2010, far faster than the two-year cadence of transistor scaling. From AlexNet to GPT-4-class systems the span covers about nine orders of magnitude. Moore's law described transistor count; Dennard scaling explained why smaller transistors could hold power density constant by reducing voltage proportionally. That scaling ended around 2005 when leakage made further voltage reduction impractical, and with it ended the era when each process node delivered proportional power savings for free. Efficiency work moved to architecture: specialized accelerators that exploit parallelism rather than transistor physics.

Demand outruns efficiency through two distinct mechanisms. Scaling-driven growth prices each further loss reduction in additional compute, data, and parameters. Rebound is the second: cheaper jobs raise the job count. ==If energy per task falls tenfold while task volume rises a hundredfold, fleet energy rises tenfold.==

::eq[fleet-energy-identity]
$$
E_{\mathrm{fleet}}=e_{\mathrm{task}}\times Q
$$

::chart[rebound-arithmetic]

The IEA projects global data-center electricity approaching three percent of world demand by 2030, up from roughly one and a half percent in 2024, with AI-accelerated servers driving much of the growth. US data centers more than tripled their consumption from 2014 to 2024, reaching about 4.4 percent of national supply. Efficiency gains held demand nearly flat through the 2010s; AI growth is eroding that offset.

## A Footprint Is Only as Good as Its Boundary

Two published carbon estimates for the same neural architecture search differ by orders of magnitude because one assumes older GPUs, average PUE, and a fossil-heavy grid while the other measures specialized accelerators in an efficient low-carbon facility. Neither is wrong within its boundary; they are incommensurable across boundaries. The chapter's answer is a measurement contract extending the performance-engineering one: the functional unit being charged, the system boundary stating which terms enter, an attribution rule for shared infrastructure, a declared average or marginal carbon signal, the time and location of operation, and a statistical report sensitive to those assumptions. A figure missing any field can diagnose one component but cannot support an end-to-end comparison.

::fig[boundary-ladder]

The boundary choice is not pedantry. Google instrumented the fleet serving Gemini and attributed energy to the median text prompt in May 2025 across the full serving stack: about 0.24 watt-hours per prompt. Active accelerators account for only part of it; host processors and memory feed them, and idle machines held for latency plus facility overhead add the rest. Counting only active accelerators on the best-utilized machines, the boundary many published estimates use, understates the same workload roughly tenfold. ==The boundary alone can multiply or divide the reported footprint of identical work.== The same study reports the median prompt's energy fell about 33-fold in a single year through software and occupancy improvements, so a per-query figure also carries a date.

The contract also separates two questions that get conflated. Attributional accounting allocates observed emissions using average grid intensity. Consequential accounting asks whether a decision changes emissions, which requires the marginal generator, the plant whose output actually rises when a scheduler moves a megawatt-hour. That plant can burn fossil fuel even on a grid whose average mix is clean. Carbon-aware scheduling needs the consequential signal even when the corporate inventory uses attributional averages.

## Where a Watt Goes

A cluster drawing five megawatts directs only a fraction into matrix multiplication. The CMOS power equation explains the chip-level terms:

::eq[cmos-power]
$$
P=\alpha C V^{2}f+V\,I_{\mathrm{leak}}
$$

Voltage enters the dynamic term quadratically, which is why voltage scaling was the free lunch and why its end matters. Leakage flows while transistors sit idle, and it can rise with temperature, so cooling and leakage feed back on each other. Quantization and pruning act on this equation indirectly: quantization shrinks arithmetic units and bytes moved, but lower precision does not by itself permit lower voltage; pruning saves energy only when execution actually skips arithmetic or data movement, and unstructured sparsity can spend the saving on indexing overhead.

At rack scale the same lesson repeats. A four-node DGX H100 rack's GPUs at their thermal design power sum to roughly two-thirds of the rack total. Host processors, memory, the NVSwitch fabric, InfiniBand adapters, and equipment-side conversion losses raise the IT subtotal about 40 percent above the GPU subtotal, and applying PUE brings the facility total higher still. Planners who size a facility on GPU TDP alone underestimate the real load. Along the delivery chain, the utility transformer, UPS, power distribution units, and server supplies each dissipate a few percent; compounded, roughly a tenth or more of grid power becomes heat before reaching a transistor. The boundary decides where each loss appears: transformer, UPS, and facility distribution losses raise PUE because they sit upstream of the IT boundary, while server power supplies and voltage regulators sit inside the measured IT load. A modern GB200-class cabinet draws on the order of 120 kilowatts, which is why distribution at 48 volts matters: resistive losses fall with the square of current.

::eq[pue]
$$
\mathrm{PUE}=\frac{P_{\mathrm{facility}}}{P_{\mathrm{IT}}}
$$

PUE measures overhead, nothing more. The 2022 industry survey average sat near 1.55, meaning roughly 55 percent additional energy beyond IT consumption, while leading hyperscale facilities achieve 1.1 to 1.2. DeepMind's cooling control reduced cooling energy 40 percent and PUE overhead 15 percent at the tested site by operating existing equipment better, a lever available to facilities that cannot be rebuilt. But ==a coal-powered data center can beat a solar-powered one on PUE while emitting far more carbon.== The ratio says nothing about the grid, the water, or the hardware.

## Carbon Is Energy Times a Grid

::eq[operational-carbon]
$$
C_{\mathrm{op}}=E_{\mathrm{facility}}\times \mathrm{CI}_{\mathrm{grid}}
$$

Hold facility energy fixed at 2,000 MWh and vary only the grid factor: a 400 g/kWh grid attributes about 800 tonnes of CO2 while a 20 g/kWh hydro grid attributes about 40. Twentyfold from placement alone, before any algorithmic improvement. The comparison isolates the grid factor; it does not rank placement against algorithmic change, and the temporal saving from waiting for cleaner hours cannot simply be multiplied onto the spatial one because the joint schedule is one decision. Water is its own account: evaporative cooling saves facility energy by consuming local water, dry cooling saves that water by spending electricity whose generation consumes water elsewhere, and honest reporting weights each by the stress of its watershed.

Scopes organize corporate reporting: backup-generator diesel is Scope 1, purchased grid electricity is Scope 2 for the operator, manufacturing emissions and end-user device energy are Scope 3. The lifecycle phases organize the same emissions by time: design, manufacture, use, disposal. ==A phase total must never be added to a scope total; they are different views of the same inventory.==

## Training Is a Spike, Serving Is a River

Training is a concentrated visible event: Microsoft built OpenAI's 2020 supercomputer with 285,000 CPU cores and 10,000 GPUs running continuously for months, and frontier clusters have multiplied that severalfold since. Serving is the opposite shape: energy spent continuously, query by query, year after year.

::chart[inference-crossover]

The crossover arithmetic: a one-time 1,200 MWh training run against a service answering 8 million requests per day at 0.0005 kWh each. Serving burns 4 MWh daily and matches the entire training outlay around day 300. Meta's production measurements make it concrete: recommendation workloads split operational emissions roughly evenly between training and inference, while inference dominates their language-model account. ==For high-traffic services the larger term is often the deployment, and the priority inverts: optimize inference for widely deployed models, training efficiency for models retrained often.== Development multiplies the training side too: sweeps, failed experiments, and architecture search precede every published run, and periodic retraining repeats part of it.

Distributed training adds its own energy anatomy:

::eq[step-energy]
$$
E_{\mathrm{step}}\approx \bar{P}\,\Big(\tfrac{T_{\mathrm{comp}}}{N}+T_{\mathrm{comm}}(N)+T_{\mathrm{sync}}(N)-T_{\mathrm{overlap}}\Big)
$$

Every exposed second of communication or synchronization is a block of joules, because accelerators stalled at a collective still draw power. The parallelism choices of distributed training are therefore sustainability choices. Perseus cut large-model training energy up to 30 percent by attacking energy bloat, the waste of running accelerators at full speed on work that must then wait for a straggler. Zeus improved training energy efficiency 15 to 76 percent across evaluated workloads by tuning the energy-performance trade-off automatically.

## Decode Is a Memory Problem

Prefill and decode are different workloads wearing one name. Prefill amortizes each weight load across all prompt positions and can reach high compute occupancy. Decode emits one token per iteration while reading every weight and an expanding KV cache. At batch size one, each FP16 parameter costs two bytes of memory traffic for two FLOPs of arithmetic: one FLOP per byte against an energy crossover around 16 FLOPs per byte in the chapter's illustrative model. Moving the bytes costs far more than the arithmetic on them, the bulk of dynamic energy per generated token before KV-cache traffic enters. High memory bandwidth occupancy with single-digit MFU is the signature: tensor units idle while drawing static and clock power. ==Batching is the first energy lever for decode, because it reuses each weight load across sequences, bounded by KV-cache memory and the latency target.==

## The Edge Moves the Account, Not Away

Moving inference onto a billion phones does not erase energy cost; it relocates it into batteries, thermals, and handset manufacturing. The energy hierarchy motivates local processing: a transmitted bit costs orders of magnitude more energy than one arithmetic operation. But the full comparison must include memory, radio startup, idle power, and remote computation. The cascade architecture prices it exactly:

::eq[cascade-energy]
$$
E_{\mathrm{cascade}}=E_{\mathrm{local}}+p\,(E_{\mathrm{tx}}+E_{\mathrm{cloud}})
$$

Duty cycling governs the smallest devices: a keyword spotter on a microcontroller alternates microamp sleep with millisecond inference bursts, and a coin cell's lifetime falls out of the ratio. Ambient harvesting delivers microwatts to milliwatts depending on source, viable only when the complete budget fits inside it. Federated training keeps raw data local but replaces one upload with repeated model downloads and update uploads every round:

::eq[federated-energy]
$$
E_{\mathrm{fed}}=R\big[K(E_{\mathrm{train}}+E_{\mathrm{dl}}+E_{\mathrm{ul}})+E_{\mathrm{agg}}\big]\quad\mathrm{vs}\quad E_{\mathrm{cent}}=K\,E_{\mathrm{raw}}+E_{\mathrm{cloud}}
$$

Privacy and energy benefits each require separate evidence; keeping raw data local does not by itself prevent updates from leaking information, and protection mechanisms add their own energy.

## Embodied Carbon Starts Before Boot

Manufacturing emissions precede the first FLOP. NVIDIA's product carbon footprint for an eight-H100 baseboard allocates a substantial embodied burden per accelerator, and a training fleet of a few thousand accelerators carries a manufacturing debt comparable to the operational emissions of a GPT-3-scale run on the US-average grid. The first published lifecycle assessment of an AI accelerator, covering five TPU generations across all four phases, introduced compute carbon intensity, lifecycle emissions per unit of computation, charging each chip for its own manufacture. On clean grids or at low occupancy, embodied carbon can rival the operational term; for battery-powered consumer devices manufacturing can dominate the lifecycle entirely.

::eq[embodied-amortization]
$$
c_{\mathrm{annual}}=\frac{C_{\mathrm{mfg}}}{Y}
$$

Extending useful life spreads the burden over more work but extends the operating energy account too. The break-even for replacement depends on occupancy and grid intensity: on a clean grid, a modestly more efficient replacement may never repay its manufacturing, while on a dirty grid at high occupancy it can repay quickly. Design-phase energy belongs in the account as well: public training figures report the winning run and omit months of failed experiments, and efficient architecture search with weight sharing exists precisely because unoptimized search once cost hundreds of thousands of kilograms of CO2.

## Every Mitigation Tier Multiplies, Except One

::fig[carbon-multiplier-chain]

The intervention chain runs from algorithmic work to lifecycle carbon. Work reduction and execution efficiency shrink IT energy. PUE scales IT energy to the facility total. The grid factor converts facility energy to operational carbon. Embodied carbon adds at its own boundary rather than multiplying. Reductions at the multiplicative tiers compound only when measured in the combined configuration on the same fixed useful work, because cutting IT energy can itself change PUE. Isolated percentages measured on different workloads cannot be multiplied into one composite saving. Mitigation levers at the cluster level each have their verification: workload consolidation must be verified at the facility meter, multi-tenant sharing can lengthen execution and raise energy per job, and carbon-aware scheduling must account for transfer, restart, deadline, and data-access costs against the marginal signal.

## The Red Area Swallows the Green

The Jevons paradox is the chapter's closing warning, and its arithmetic is unforgiving. Halve the energy cost per query, pass the saving through as a price cut, and watch query volume rise 3.5-fold: total energy grows 1.75-fold. The mechanism is that cheaper computation enables applications that were previously infeasible.

::fig[jevons-rebound]

The geometric version: on elastic demand, the green strip of savings on baseline volume is smaller than the red area of new consumption at the lower price. Those areas measure expenditure; they represent energy only when unit cost tracks energy per operation, and emissions only after the grid factor. ==The Jevons paradox does not invalidate efficiency; it makes governance part of the result.== Efficiency creates room inside a resource budget while demand determines how much of the room gets consumed, which is why rate efficiency (FLOPs per watt) must be paired with absolute carbon budgets that renewable sourcing alone cannot provide. Offsets do not change the electricity consumed; report physical reductions separately from compensation claims.

## Fallacies and Pitfalls

*Cloud computing automatically makes AI sustainable.* Cloud improves occupancy and facility efficiency, but it transfers neither the physical footprint nor the accounting responsibility out of existence. Comparisons must disclose region, boundary, occupancy, and scope.

*TDP is actual power consumption.* Thermal design power is a design specification. Actual draw depends on occupancy, memory traffic, clocks, and idle intervals. Placement decisions need measured power over the workload interval.

*PUE is a complete environmental metric.* PUE measures facility overhead only: no grid intensity, no manufacturing, no water. A low-PUE coal site can out-emit a higher-PUE solar one.

*Efficiency improvements automatically reduce total impact.* The Jevons rebound can erase or exceed the saving. Any implementation lowering per-query energy can raise total energy when volume grows by a larger factor.

*Component-level optimization guarantees lifecycle improvement.* A pruning win that requires custom silicon and double the serving iterations is a lifecycle loss. Every change needs the full account: manufacturing, deployment scale, serving energy, grid boundary, lifetime.

*Operational energy is the whole footprint.* On clean grids or at low occupancy, embodied carbon can dominate. Comparing the entire manufacturing burden against one short job's electricity is a boundary error in the other direction; amortize consistently.

## The physics

| Quantity | Value | Use |
|---|---|---|
| GPT-3 training energy | ~1,287 MWh | Roughly 120 US household-years at 10.7 MWh each |
| GPT-3 training FLOPs | 3.14 × 10^23 | 175B parameters at frontier scale |
| Compute growth cadence | doubling ~6 months | Versus two-year transistor scaling; nine orders since AlexNet |
| Grid intensity spread | ~20x | 400 vs 20 g CO2/kWh: 800 t vs 40 t for the same 2,000 MWh |
| Industry average PUE (2022) | ~1.55 | Hyperscale leaders reach 1.1 to 1.2 |
| DeepMind cooling control | -40% cooling energy | -15% PUE overhead at the tested site, software only |
| Gemini median prompt | ~0.24 Wh full-stack | Narrow accelerator-only boundary understates it ~10x |
| Prompt energy trend | ~33x reduction in one year | Per-query figures carry a date |
| Inference crossover | ~300 days | 1,200 MWh training vs 8M queries/day at 0.0005 kWh |
| Decode arithmetic intensity | 1 FLOP/byte at batch 1 | Versus ~16 FLOP/byte energy crossover |
| GPU share of rack power | ~two-thirds | IT subtotal ~40% above GPU TDP subtotal |
| US data-center share 2024 | ~4.4% of supply | More than tripled since 2014 |
| Lifespan extension 3→5 yr | -40% amortized embodied | Before counting operational energy changes |
| Zeus / Perseus savings | 15-76% / up to 30% | Training energy efficiency in evaluated workloads |
| Rebound arithmetic | 4x eff + 20x volume = 5x | Fleet energy is per-task energy times volume |

## Glossary

- **attributional accounting**: allocation of observed emissions to workloads for reporting, typically using average grid intensity.
- **carbon-aware scheduling**: shifting flexible workloads toward cleaner grid windows or regions; requires the consequential marginal signal and must net out transfer, restart, and deadline costs.
- **cascade architecture**: edge-cloud pattern where a small local model filters inputs and escalates a fraction to cloud inference.
- **compute carbon intensity**: lifecycle emissions per unit of computation, charging each chip for its own manufacture.
- **consequential accounting**: estimation of how a decision changes emissions, using the marginal generator rather than the grid average.
- **Dennard scaling**: the ended era when shrinking transistors held power density constant through proportional voltage reduction, finishing around 2005.
- **embodied carbon**: emissions from manufacturing hardware before it ever runs, amortized over service life.
- **energy bloat**: energy wasted running accelerators at full speed on work that must then wait for a slower stage or straggler.
- **energy buffering**: storage that absorbs or supplies energy during synchronized load steps, smoothing what the utility connection sees.
- **functional unit**: the work being charged in a measurement contract, such as one training run or 1,000 served requests at stated quality.
- **Jevons paradox**: efficiency lowering the effective cost of a resource enough to stimulate demand that outweighs the per-unit saving.
- **life cycle assessment**: standardized ISO 14040/14044 accounting of environmental impact across design, manufacture, use, and disposal.
- **marginal emissions factor**: the carbon intensity of the generator whose output actually changes when demand changes; can be fossil even on a clean-average grid.
- **power usage effectiveness**: facility power divided by IT power; an overhead ratio silent on grid carbon, water, and manufacturing.
- **rebound effect**: demand growth consuming the room that efficiency creates, measured as volume response against unit-cost reduction.
- **sustainability measurement contract**: the five-field extension of the measurement contract fixing functional unit, system boundary, attribution rule, carbon signal, and time-location.
- **synchronous transients**: correlated power swings when thousands of accelerators enter and leave collective operations in lockstep.
- **water usage effectiveness**: liters of water consumed per kilowatt-hour of IT energy, varying with climate and cooling technology.

## → Ben's world

- The boundary discipline is the same one the benchmark harness already enforces for performance: a benchmark number without its measurement contract is not comparable, whether the quantity is latency or joules. Seeded records and disclosure boundaries are the same instinct.
- The fleet energy identity has a direct analog in site operations: per-page weight times crawl volume. Cutting per-page cost while page count and crawler traffic grow is the Jevons shape in miniature, visible in the Greenveil product-page SSR fan-out pattern.
- The crossover arithmetic reframes build-versus-serve for this site: the build is a concentrated spike, crawling and serving are the river. Postbuild checks are cheap insurance precisely because they run once per build rather than per request.
- Carbon-aware scheduling's constraint list (deadlines, data access, transfer cost, marginal signal) is the right template for any batch-work placement decision, including where benchmark harness runs execute.

## Open questions

- The measurement contract demands marginal carbon signals for consequential scheduling, but marginal factors are often unavailable at workload resolution. What does a fleet do when the honest signal is missing: proxy with averages and disclose, or refuse to schedule carbon-aware at all?
- The chapter prices rebound at the fleet level but not the organizational level: does any team inside a hyperscaler actually carry an absolute carbon budget, or does governance exist only at the reporting layer?
- Decode's memory-bound energy profile suggests memory-proximate architectures as the sustainability lever, yet the manufacturing account penalizes rapid hardware turnover. Where is the occupancy threshold below which even a large efficiency gain cannot justify replacement?
