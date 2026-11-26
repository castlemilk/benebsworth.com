# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two chapter three: network fabrics, the wiring that turns a pile of GPUs into one training computer. It opens with a buffer that dies in microseconds.

B: During an AllGather on a SuperPOD scalable unit, two hundred fifty-six senders converge on one egress port. The switch buffer is thirty-two megabytes, which sounds generous. How long does it hold?

A: Microseconds. Each sender pushes fifty gigabytes a second, that's twelve point eight terabytes a second offered into a port draining at fifty. Two hundred fifty-six to one. The buffer nominally holds six hundred forty microseconds of backlog, but at that fill rate it overflows in under five.

B: And the congestion signal can't help, the feedback round trip is itself about five microseconds, and the bandwidth-delay product is only two hundred fifty kilobytes. Buffers buy microseconds; scheduling buys safety. That's the chapter in one case.

A: Let's walk the five levels the book walks. Level zero concept first, the cliff. Inside the node, each GPU talks NVLink, four hundred fifty gigabytes a second per direction. The first hop off the node is a four-hundred-gigabit NDR port, fifty gigabytes a second.

B: A nine-times drop at the node boundary, and it's held since twenty-sixteen when NVLink first shipped. Everything the fabric does is downstream of that ratio, placement decides what may cross.
::fig[bandwidth-cliff]

A: What crosses is collectives. AllReduce sums a gradient across workers, AllGather concatenates shards, AllToAll exchanges slices. A hundred-seventy-five-billion-parameter model at FP16 makes a three-hundred-fifty-gigabyte gradient every step, and the step ends when the last piece lands.

B: And this is where generic data-center intuition inverts. Web fleets assume many small independent requests and drop-tolerant TCP. Training offers few, fat, synchronized elephant flows that all start at once, and a hash collision in ECMP pins them together for the whole run.

A: Level one, the wire. PAM4 moved signaling to four levels, two bits per symbol instead of NRZ's one. That spent the noise margin, so forward error correction became mandatory, costing a few hundred nanoseconds per hop direction, inside every message's startup cost.

B: Reach shrinks too: passive copper dies around one to three meters, active optical cables reach thirty, optics own everything past that. And the modules aren't free: a four-hundred-gig pluggable draws about twenty watts, and ten thousand GPUs need roughly twenty thousand spine-side modules, four hundred kilowatts just to move light.

A: Level two, transport and the model. RDMA cuts the kernel out of the data path; GPUDirect extends that straight into HBM. And the performance model is one line: message time equals alpha plus size over beta, a fixed startup plus a per-byte rate.
::eq[alpha-beta]

B: With the chapter's anchors, alpha is one and a half microseconds on NDR, five on RoCE. The crossover, alpha times beta, lands near seventy-five kilobytes. Below it, the rate is nearly irrelevant.
::eq[crossover]

A: The numbers prove it: a four-kilobyte control message takes one point five eight microseconds on NDR versus five point three two on hundred-gig RoCE, a three point four times gap that's almost all alpha. A three-hundred-fifty-megabyte shard takes seven milliseconds versus twenty-eight, a four-times gap that's almost all beta.
::fig[alpha-beta-map]

B: And the measured floor is worse than the model: real NCCL AllReduce bottoms out around seventeen microseconds, an order above alpha, converging only past a few megabytes. The model ranks paths and sizes correctly; it doesn't predict the floor.

A: Level three, topology. With radix-k switches, a fat-tree reaches k-squared over two hosts in two tiers, k-cubed over four in three. At sixty-four ports that's two thousand forty-eight and sixty-five thousand five hundred thirty-six.
::eq[fattree-hosts]

B: Oversubscription prices the cut exactly: a four-to-one spine quarters bisection, twenty-five point six down to six point four terabytes a second, and a worst-placed ring AllReduce goes zero point two seconds to zero point eight. On a three-hundred-million-dollar cluster that waste is priced at a hundred forty-two million.
::eq[oversubscription]

A: Alternatives trade differently: a sixteen-cubed torus holds the same four thousand ninety-six endpoints with five hundred twelve links crossing the cut versus the fat-tree's two thousand forty-eight, at a twenty-four-hop diameter. Rail-optimized fabrics collapse same-rail traffic from three hops to one.
::fig[fattree-cut]

B: Level four, behavior. Lossless Ethernet needs PFC, and a pause frame stops a whole priority class, storms propagate upstream, buffer dependencies deadlock. DCQCN and HPCC mark rates before queues build, and adaptive routing avoids hash collisions. Then incast, the opening case.
::fig[incast-cascade]

A: Level five, the cluster. SuperPOD builds a thousand-twenty-four GPUs as four two-hundred-fifty-six-GPU scalable units. Meta's Grand Teton runs two equal clusters side by side, one InfiniBand, one RoCE, an A/B test at fleet scale.
::eq[incast-overflow]

B: Virtualization meters but doesn't isolate: SR-IOV gives eight virtual functions with rate caps, yet a neighbor's hundred-gigabyte checkpoint still owns the port for two seconds.

A: Monitoring is where it gets quiet. Day three, step time moves four point two to four point eight seconds, fourteen percent, GPU busy drops to eighty-five percent. A pairwise bisect finds one link negotiated at half rate, nothing fired.
::eq[silent-tax]

B: The silent version never fires at all: ten percent link loss becomes a two to three percent step tax across seven hundred thirty-seven thousand GPU-hours, tens of thousands of dollars, invisible to every dashboard. In a four-thousand-GPU fabric there are twelve thousand links and twenty-four thousand transceivers; at point-zero-zero-one percent per module per day, something is degrading today with twenty-two percent probability.

A: What moves the ceiling: XDR doubles the port to eight hundred gigabits, Ethernet roadmaps one point six terabit, and a hundred-two-point-four-terabit ASIC can spend capacity on radix instead of rate and collapse a whole tier. Co-packaged optics pulls the engine onto the package, saving about one point three kilowatts per switch.

B: The fallacies audit the same numbers: doubling link rate doesn't halve time because alpha is untouched, end-to-end gains land under twenty-five percent. Header bandwidth isn't achieved bandwidth. Oversubscription isn't free. Buffers don't absorb incast. And busy GPUs don't mean a healthy fabric.
