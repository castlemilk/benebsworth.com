# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two chapter four: data storage, the fuel line under the fleet. It opens with a mismatch that flips the whole design.

B: A hundred-seventy-five-billion-parameter run reads a six-terabyte tokenized corpus all epoch. Yet the storage system is provisioned for petabytes. Where does the other ten point six petabytes come from?

A: From the write side. The resumable checkpoint contract is fourteen bytes per parameter, FP16 weights, FP32 master, two FP32 Adam moments. One save is twenty-four fifty gigabytes, every ten minutes, for thirty days.

B: Four thousand three hundred twenty saves, about ten point six petabytes. Over a thousand times the entire epoch's read volume. So the dataset is not the load, the checkpoint is.

A: The running example doubles the book's usual cluster: two hundred fifty-six nodes, two thousand forty-eight accelerators, the one-seventy-five-B job as thirty-two replicas of sixty-four GPUs, a four point six four second modeled step, one epoch in about twenty-five point six days.
::eq[ckpt-volume]

B: And the bandwidth ladder starts with a ratio. HBM moves data at three point three five terabytes a second; one NVMe drive does about seven gigabytes. Four hundred seventy-nine times apart.

A: But the gap contrasts tiers, it doesn't set the feed requirement. That comes from batch bytes over step time. Which is why the hierarchy exists at all, six tiers trading bandwidth for capacity.
::fig[tier-ladder]

B: Tier zero, GPU HBM, per accelerator. Tier one, host DRAM, which actually reaches first byte sooner than HBM even though its bandwidth is lower. Tier two, local NVMe, per node. Then the shared services: parallel file system, object store, archive.

A: And a subtle one I liked: four drives in RAID-0 stripe to about seven times the node's individual share of the parallel file system. Local beats shared, which is why warm data stages on the node at all.

B: Then the workload inverts everything database storage was built for. Small random four-kilobyte reads become megabyte sequential scans through immutable shards. A drive that streams seven to fourteen gigabytes a second falls to half a gigabyte on random reads.

A: Ten to thirty times gone per access pattern, a hundred times on spinning disks. And SGD still needs shuffled batches, so the compromise is shuffle the shard order, mix within a buffer, keep the sequential reads.

B: The payoff for getting this wrong is the I/O wall. The book's normalized example: input delivery is a quarter of compute, perfectly overlapped. Make compute sixteen times faster and batch throughput improves exactly four times, then flatlines.

A: Doubling compute halves batch time, quadrupling makes the two equal, and past that the pipeline is delivery-bound. Faster compute just idles sooner.

B: Which brings the design equation: required bandwidth is accelerator count times batch bytes over step time.
::eq[required-bw]

A: For the text job the answer is almost comic: six terabytes over twenty-five point six days averages two point seven megabytes a second for the whole fleet. Meanwhile MLPerf shows vision workloads demanding up to two point eight gigabytes a second per accelerator. Same cluster, overfed on tokens, starved on pixels.

B: The stall frontier makes starvation quantitative: active fraction is min of one and supply over demand. Below the knee you starve linearly; above it you're fed. The text job sits at six thousand times headroom, an image job at three point three.
::eq[stall-fraction]

A: And prefetching doesn't move that knee, the frontier figure shows why. It hides latency variance, never a sustained rate deficit. The chapter measured multi-worker loading at about a sixth of the all-hot rate once real service times mixed in.
::fig[stall-frontier]

B: Locality is the other lever. Prestaging the working set costs about eighty seconds once, then eighty-eight percent of the corpus hits the local cache and mean delivered rate lands near sixteen gigabytes a second. A miss is seven times slower per byte.
::eq[locality-mean]

A: GPUDirect storage attacks a different copy: normally a payload DMAs into a kernel buffer in host DRAM, the CPU copies it to pinned memory, then DMA descends to HBM. GDS skips the host entirely, about four times the CPU service ratio, seventy-five percent latency cut on that path.

B: It removes the copy, not the network round trip, not the tail. Now the write side: a naive full-state save is absurd at scale, the seventy-B scenario's nine hundred eighty gigabyte checkpoint at a hundred gigabytes a second stalls over ten thousand seconds.

A: So the design is two-phase. Pause only for the local stripe write, point three four seconds for the node's nine point six gigabyte shard, then copy to the parallel file system asynchronously, two point four five seconds overlapping later steps.
::eq[two-phase-ckpt]

B: A one-second pause would still eat twenty-two percent of a step but only point one seven percent of the ten-minute interval. And between local write and manifest the new generation is staged, not restorable, the previous committed save is still the restore point.
::fig[ckpt-staging]

A: The correctness bug has a name too: the acknowledgment gap. A worker writes the row for event e42, crashes before recording the commit, its replacement replays. Append and the click counts twice; write under a stable key and the replay overwrites the same row.

B: Effectively-once out of at-least-once. Synthetic data adds the provenance angle: store the regeneration recipe and a five percent source change shrinks the needed payload twenty times, at forty percent metadata overhead across versions.

A: Then the bill, which inverts the same way. One petabyte at two cents a gigabyte-month is two hundred forty thousand a year of rent. Ten full reads at nine cents a gigabyte is nine hundred thousand of egress. The meter runs on movement.

B: HBM-as-storage prices the whole pyramid at one point five million per hundred terabytes. And tiering pays: demoting forty of fifty datasets saves a hundred forty-four thousand a year; one dedup pass saved two hundred eighty-two thousand, roughly nine H100s.
::eq[egress-vs-rent]

A: Serving repeats the fuel line at a different tempo. Push three fifty gigabytes of weights to a hundred replicas, thirty-five terabytes at a terabyte a second, thirty-five seconds. And retrieval indexes reintroduce random I/O: a billion vectors at fifteen thirty-six dimensions is six point one terabytes plus a tenth of adjacency.

B: The fallacies audit lands cleanly: size storage for the dataset, wrong by three orders of magnitude. Faster compute relieves storage pressure, wrong past the knee. A saved checkpoint is a restore point, not until the manifest commits.

A: So the chapter's thesis holds: the fleet's storage is a write system with a read side. The corpus is six terabytes; the workload is ten point six petabytes, and it arrives as a burst every ten minutes.

B: Design the fuel line for the traffic that exists: sequential streams in, checkpoint storms out, and a manifest at the end that decides what a save actually means.
