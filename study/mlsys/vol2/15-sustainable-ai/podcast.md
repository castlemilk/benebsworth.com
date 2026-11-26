# hosts: Marcus | Iris

A: Today we are studying volume two, chapter fifteen: sustainable AI. I'm Marcus, and with me is Iris. The chapter opens with a planning meeting that goes nowhere. A hyperscaler wants a five hundred megawatt campus. The utility caps the interconnection at three hundred twenty megawatts for the next three years. The company has the capital to buy the electricity several times over. Why doesn't that matter?

B: Because power delivery is a physical ceiling, not a budget line. Money cannot accelerate transmission reinforcement or substation construction on deployment timescales. Power becomes an operational constraint exactly like memory or bandwidth: the architecture and the cluster size have to fit inside what the grid can actually deliver.

A: And this is not hypothetical. Ireland in twenty twenty two.

B: Dublin needed significant transmission reinforcement before it could host new data-center load. Substation permitting and construction run multiples longer than accelerator procurement, so silicon can sit electrically stranded in a warehouse while the facility waits for its connection. The binding constraint has moved from the chip to the substation.

A: The chapter's second fact is quieter, and I think more important. Efficiency per task is not fleet energy.

::eq[fleet-energy-identity]

B: Fleet energy is energy per completed task times the number of completed tasks. Cut per-task energy fourfold while volume rises twentyfold and the fleet burns five times more than before. Efficiency creates room inside a resource budget; demand decides how much of the room gets consumed. That tension runs through the entire chapter.

A: Before the accounting, one distinction that trips up even experienced planners: power versus energy.

::fig[power-vs-energy-wall]

B: The power limit is instantaneous. A facility cannot draw more than its grid feed at any moment, and that caps the number of servers active at once regardless of run length. The energy account is cumulative, average power integrated over time. A three-day burst needing one hundred twenty megawatts in an eighty megawatt facility is infeasible even though its total energy is modest. A month-long job at forty megawatts is fine and uses more total energy. Neither arithmetic substitutes for the other.

A: And synchronized training makes the instantaneous problem worse?

B: Thousands of accelerators entering a collective barrier and resuming arithmetic in lockstep swing their power draw in unison. Independent web requests smooth out across racks; synchronized training correlates. Energy buffering at rack or facility level, sized to the measured energy deficit of the ramp, lets the utility connection see a smoother load.

A: Now the growth side. How fast is demand compounding?

B: Training compute for frontier models doubled roughly every six months after twenty ten, against a two-year cadence for transistor scaling. From AlexNet to GPT-four-class systems is about nine orders of magnitude. And the free lunch ended: Dennard scaling, where smaller transistors held power density constant through lower voltage, died around two thousand five when leakage made further voltage reduction impractical. Efficiency now comes from architecture, not transistor physics.

A: Two mechanisms make demand outrun efficiency. Scaling is the first.

B: Scaling laws price each further loss reduction in more compute, data, and parameters. The second is rebound: cheaper jobs raise the job count. Per-task energy down tenfold with volume up a hundredfold means fleet energy up tenfold. The IEA projects data centers approaching three percent of world electricity by twenty thirty, up from about one and a half percent in twenty twenty four. Efficiency gains held demand nearly flat through the twenty tens; AI is eroding that offset.

A: Let's do the accounting discipline, because this is where the chapter gets really sharp. Two published carbon estimates for the same architecture search differ by orders of magnitude. How?

B: One assumes older GPUs, average facility overhead, and a fossil-heavy grid. The other measures specialized accelerators in an efficient low-carbon facility. Neither is wrong within its boundary; they are incommensurable across boundaries. The measurement contract fixes it: the functional unit being charged, the system boundary, an attribution rule for shared infrastructure, a declared carbon signal, time and location, and a statistical report. Missing any field, you can diagnose a component but not compare end to end.

::fig[boundary-ladder]

A: The Gemini measurement makes the boundary choice concrete.

B: Google instrumented the serving fleet and attributed energy to the median text prompt across the full stack: about a quarter of a watt-hour. Active accelerators are only part of it. Host processors and memory feed them, and idle machines held for latency plus facility overhead add the rest. Counting only active accelerators on the best-utilized machines, the boundary many published estimates use, understates the same workload roughly tenfold. The boundary alone can multiply or divide the reported footprint of identical work.

A: And the number carries a date.

B: The same study reports the median prompt's energy fell about thirty-three-fold in a single year through software and occupancy improvements. A per-query figure is a measurement of a specific system on a specific day, not a constant of nature.

A: Attributional versus consequential accounting: why does the distinction matter for scheduling?

B: Attributional accounting allocates observed emissions using average grid intensity, fine for the annual inventory. Consequential accounting asks whether a decision changes emissions, and that requires the marginal generator, the plant whose output actually rises when you move a megawatt-hour of demand. That plant can burn fossil fuel even on a grid whose average mix looks clean. Carbon-aware scheduling needs the consequential signal even when the corporate report uses averages.

A: Inside the machine, where does a watt actually go?

::eq[cmos-power]

B: The CMOS equation has two terms. Dynamic power scales with the square of supply voltage, which is why voltage was the strongest lever and why losing Dennard scaling hurt so much. Static leakage flows even when nothing switches, and it can rise with temperature, so cooling and leakage feed back on each other. Quantization shrinks arithmetic units and bytes moved but does not by itself permit lower voltage. Pruning saves energy only when execution actually skips work; unstructured sparsity can spend the saving on indexing overhead.

A: At rack scale the same lesson repeats. GPUs are not the whole rack.

B: In a four-node H100 rack the GPUs sum to roughly two-thirds of the total. Host processors, memory, the fabric, network adapters, and conversion losses push the IT subtotal about forty percent above the GPU subtotal, and facility overhead goes on top of that. Planners who size a facility on accelerator TDP alone underestimate the real load. Along the delivery chain, the transformer, UPS, distribution units, and server supplies each dissipate a few percent; compounded, a tenth or more of grid power becomes heat before reaching a transistor.

::eq[pue]

A: PUE is everywhere in the marketing. What does it actually measure?

B: Facility power divided by IT power. The industry average sat near one point five five in twenty twenty two; hyperscale leaders reach one point one or so. DeepMind's cooling control cut cooling energy forty percent at the tested site, entirely by operating existing equipment better. But a coal-powered data center can beat a solar-powered one on PUE while emitting far more carbon. The ratio is silent on grid, water, and manufacturing.

A: Carbon, then. The placement arithmetic is stark.

::eq[operational-carbon]

B: Hold facility energy fixed at two thousand megawatt-hours. On a grid averaging four hundred grams per kilowatt-hour you attribute about eight hundred tonnes of CO2. On a hydro grid at twenty grams, about forty tonnes. Twentyfold from placement alone, before any algorithmic improvement. But the comparison isolates the grid factor only; it does not rank placement against algorithmic change, and the temporal saving from cleaner hours cannot simply multiply onto it.

A: And scopes versus lifecycle phases?

B: Scopes organize corporate reporting: backup-generator diesel is scope one, purchased electricity scope two, manufacturing and end-user devices scope three. Lifecycle phases organize the same emissions by time: design, manufacture, use, disposal. Never add a phase total to a scope total. They are different views of one inventory.

A: Training versus inference. The shapes are opposite.

B: Training is a spike: concentrated, visible, weeks or months of thousands of accelerators. Serving is a river: energy spent continuously, query by query, year after year. The crossover arithmetic makes it concrete.

B: A one-time twelve hundred megawatt-hour training run against a service answering eight million requests a day at half a watt-hour each. Serving burns four megawatt-hours daily and matches the entire training outlay around day three hundred. Meta's production data shows the split is workload-specific: roughly even for recommendation models, inference-dominated for the language-model account. For high-traffic services the priority inverts: optimize serving for widely deployed models, training efficiency for models retrained often.

A: Distributed training has its own energy anatomy.

::eq[step-energy]

B: The Fleet Law with a power meter attached. Every exposed second of communication or synchronization is a block of joules, because accelerators stalled at a collective still draw power. Perseus cut training energy up to thirty percent attacking energy bloat, the waste of running accelerators at full speed on work that must then wait for a straggler. Parallelism choices are sustainability choices.

A: Decode is where serving energy hides. Why?

B: Prefill amortizes each weight load across all prompt positions and can reach high occupancy. Decode emits one token per iteration while reading every weight plus an expanding KV cache. At batch size one, each parameter costs two bytes of memory traffic for two units of arithmetic: one unit per byte against an energy crossover around sixteen. Movement dominates. High memory bandwidth occupancy with single-digit compute occupancy is the signature: the arithmetic units idle while drawing static and clock power. Batching is the first lever, because it reuses each weight load across sequences.

A: The edge. Moving inference onto a billion phones sounds free.

B: It relocates the cost into batteries, thermals, and handset manufacturing. A transmitted bit costs orders of magnitude more energy than one arithmetic operation, which motivates local processing. But the full comparison includes memory, radio startup, idle power, and the remote computation avoided.

::eq[cascade-energy]

B: The cascade prices it exactly: local inference always, plus the escalation probability times transmission and cloud cost. The escalation rate is the lever. And federated training replaces one raw-data upload with repeated model downloads and update uploads every round, so it wins on energy only when repeated communication beats the centralized transfer. Privacy and energy benefits each need separate evidence.

A: Embodied carbon is the term most teams never count.

::eq[embodied-amortization]

B: Manufacturing emissions precede the first computation. A fleet of a few thousand accelerators carries a manufacturing debt comparable to the operational emissions of a GPT-three-scale training run. On clean grids or at low occupancy, embodied carbon can rival the operational term; for consumer devices manufacturing can dominate the lifecycle entirely. Extending service life from three years to five cuts the annualized allocation forty percent, but extends the operating energy account too. The break-even depends on occupancy and grid intensity.

A: Which brings us to mitigation. The chapter organizes it as a chain.

::fig[carbon-multiplier-chain]

B: Work reduction and execution efficiency shrink IT energy. PUE scales that to the facility. The grid factor converts to operational carbon. And embodied carbon adds at its own boundary rather than multiplying. The catch: tier savings compound only when measured in the combined configuration on fixed useful work, because cutting IT energy can itself change the overhead ratio. Isolated percentages from different workloads cannot be multiplied into one composite saving.

A: And the closing warning is the Jevons paradox.

::fig[jevons-rebound]

B: Halve the energy cost per query, pass the saving through as a price cut, watch volume rise three and a half fold: total energy grows one point seven five fold. On elastic demand, the green strip of savings on baseline volume is smaller than the red area of new consumption. The paradox does not invalidate efficiency; it makes governance part of the result. Rate efficiency needs an absolute budget companion, because renewable sourcing changes emissions per kilowatt-hour but does not cap consumption.

A: Favorite fallacy?

B: TDP is actual power consumption. Thermal design power is a design specification. Actual draw depends on occupancy, memory traffic, clocks, and idle intervals. Every TDP-based estimate is a capacity scenario, not a measurement.

A: One-line summary of the chapter?

B: Power is a ceiling that capital cannot bypass, efficiency per task is not fleet energy, and a footprint means nothing until its boundary is named.
