# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two chapter two: compute infrastructure, the silicon, packages, nodes, racks and pods the fleet from last chapter is actually made of. It opens with a procurement puzzle.

B: Your serving fleet has to decode a two-terabyte model with a per-token latency floor of a hundred fifty milliseconds. Two options: option A advertises over four thousand teraflops of FP8 with HBM-three around eight terabytes per second. Option B is a next-gen part, half the FLOPs but HBM-four around sixteen terabytes per second.

A: Every instinct says the four-thousand-teraflop part. But the floor is set by weight bytes divided by bandwidth, two terabytes over eight terabytes a second is two hundred fifty milliseconds. Over budget. The HBM-four part hits a hundred twenty-five. The FLOP column never enters the arithmetic.

B: Because at batch one, decode reads every weight once per token, an arithmetic intensity of one FLOP per byte, roughly three hundred times below what the chip needs to be fed. That's the chapter in one case: the nameplate is a promise the hierarchy won't keep.

A: Let's walk the hierarchy the book walks. The running scenario is a one-thousand-twenty-four-GPU cluster, a hundred twenty-eight nodes of eight, training GPT-three's hundred seventy-five billion parameters at FP16.

B: Three walls frame it. The memory wall: compute per device grew about eighteen times across the recent generations while memory bandwidth grew about nine times and power about three, the arithmetic intensity required to keep a chip fed roughly doubles each generation.

A: The power wall: a DGX H-hundred rack draws thirty-three point five kilowatts where a traditional enterprise rack draws twelve. And the scale wall we met last chapter: at twenty-five thousand GPUs, a failure every couple of hours.

B: Down at the silicon, the H-hundred SXM has a hundred thirty-two SMs and advertises over nine hundred teraflops dense FP16, over a thousand in FP8. The B-two-hundred pushes past four thousand teraflops FP8 at a kilowatt TDP.

A: Two structural tricks inside the nameplate. First, B-two-hundred is already two dies, a single reticle exposure tops out around eight hundred fifty-eight square millimeters, so the package stitches dies with a die-to-die link faster than the chip's own NVLink.

B: Second, precision is a throughput dial. The same silicon advertises different peaks per format, and the weights fit differently too, three hundred fifty gigabytes of FP16 weights needs five eighty-gig devices, INT8 needs three, INT4 needs two.

A: At the exotic end: Cerebras' WSE-three has nine hundred thousand cores and forty-four gigabytes of on-wafer SRAM, it trades the network problem for a capacity wall, since forty-four gigs can't hold the model. TPU pods go the other way, aggregating past a hundred petaflops.

B: Now the wall that makes the opening case work, memory. The roofline says a kernel's time is bounded by the bigger of two terms: FLOPs over peak rate, or bytes over bandwidth.
::eq[roofline-bound]

A: And the crossover is the ridge point: peak rate divided by bandwidth. On H-hundred at FP16 that's about two hundred ninety-five FLOPs per byte.
::eq[ridge-intensity]

B: Decode at batch one sits at one FLOP per byte, about a third of a percent of the advertised peak. Prefill at five hundred twelve tokens and training sit above the ridge. Same model, different batch, different wall.
::fig[ridge-map]

A: Which is why the per-token floor is literally bytes over bandwidth, the decode-floor equation.
::eq[decode-floor]

B: And it's an energy wall too: an HBM operand fetch costs thirty to sixty times the MAC that consumes it. That's why bandwidth is baked into the package, HBM stacks on an interposer centimeters from the logic, about six hundred seventy gigabytes a second per stack.

A: Between peak and practice sits sustained throughput, model FLOPs usage. A run quoted at a thousand GPU-hours from the nameplate needs twenty-five hundred real hours at MFU point four. Plans priced at peak under-book by one over MFU.
::eq[sustained-hours]

B: Now the node: and this is my favorite figure, the bandwidth staircase. HBM at three point three five terabytes a second, then NVLink at nine hundred gigabytes, a seven-point-four-times drop, then InfiniBand at fifty, nine times down, then storage at seven, another seven times.
::fig[bandwidth-staircase]

A: And each step raises latency too. That's what decides where parallelism can live: tensor parallelism's frequent sub-millisecond exchanges stay inside the node, the same pattern over PCIe puts almost half the step in communication, pipeline stages can cross nodes, and data-parallel all-reduce tolerates the fabric.

B: The node's own memory is the other half of the story. Eight eighty-gig devices is six hundred forty gigabytes of HBM, but the static training state for the reference model is about two point one terabytes, twelve bytes per parameter.
::eq[state-budget]

A: Weights and gradients are seven hundred gigs between them, the optimizer state, FP32 moments and master weights, is one point four terabytes alone. The optimizer term is the one that breaks the budget.
::fig[state-budget]

B: The reference layout answers with TP-eight inside the node, PP-eight across stages, DP-sixteen across replicas, about forty-two gigs of headroom per GPU. And reliability is composite at every level: the node's failure rate is the sum of its parts.
::eq[node-mtbf]

A: Up a level: the rack. Thirty-three point five kilowatts versus twelve for a traditional rack. Eight InfiniBand cables per node, one per GPU. Heat flux on the die is about eighty-six watts per square centimeter, past air's practical range.

B: The heat-transfer arithmetic is clean: water's specific heat is over four times air's, so a hundred seventy liters a minute of coolant carries what tens of liters a second of air would. Thousands-fold difference. Liquid stops being optional at kilowatt packages.

A: And power is dynamic: synchronized steps swing the cluster's draw by hundreds of kilowatts, ramps measured in gigawatts per second. Provisioning for the five-hundred-watt average instead of the seven-hundred-watt TDP is how you trip breakers on the first all-reduce.
::fig[power-ladder]

B: Then the pod: a thousand twenty-four nodes, over a hundred thirty metric tons, seven to ten megawatts, nine point nine exaflops of FP16, and a job-level interruption about every five hours. A twenty-four-hour compute-only baseline becomes fifty-one hours once failure recovery and maintenance are priced in.

A: Which lands us at selection, the chapter's payoff. The rule is simple: match the workload's intensity to the part's ridge. Batch-one decode buys bandwidth. Prefill and training buy FLOPs. And eight times the GPUs buys less than eight times the speed, measured efficiency falls as fleets grow.

B: Comparisons need a common currency too: equivalent H-hundred-hours, since an hour on a B-two-hundred isn't an hour on an A-one-hundred.

A: My takeaway: every level of the stack is a different job. The transistor-level fix is chiplets, the chassis-level fix is NVSwitch, the rack-level fix is liquid, the facility-level fix is the warehouse-scale computer itself.

B: Mine is the staircase. Once you see bandwidth as steps that fall an order of magnitude each, every parallelism decision, tensor here, pipeline there, data across the fabric, stops being a policy and starts being physics.

A: And the opening case closes itself: at batch one, buy the part with more bandwidth, not more FLOPs. The nameplate is a promise; the ridge decides who can collect.
