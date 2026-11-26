# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. Volume two, chapter seven: fault tolerance, the chapter where the rare event becomes the routine one.

B: Start with the hook. A ten-thousand-GPU cluster sits three months into a foundation run, worth about half a million dollars a day of accelerator time. One GPU hangs at an AllReduce barrier, and the other nine thousand nine hundred ninety-nine wait at full price: about three hundred forty dollars a minute while the system figures out it has a failure.

A: And the failures are guaranteed to arrive. Each GPU has a fifty-thousand-hour mean time to failure, twenty thousand FITs. Series systems add rates, so the per-GPU budget picks up the PCIe link and a prorated share of node power and networking too.
::eq[series-composition]

B: Multiply by the fleet and take the reciprocal, and the cluster MTBF lands near four hours: about six failures a day. A week-long job should plan for dozens of interruptions, not zero.
::eq[system-mtbf]

A: Production confirms it. Llama three pretraining logged four hundred nineteen unexpected interruptions in fifty-four days on sixteen thousand H100s, an observed mean time to failure near three point one hours. GPU components took about two thirds; silent data corruption showed up six times, and only because it got caught.

B: The taxonomy sorts by observability. Transient faults leave nothing to repair. Fail-stop announces itself. Byzantine components keep answering while lying. And correlated failures, one top-of-rack switch taking sixty-four GPUs, break the independence assumption the math depends on.
::fig[mtbf-ladder]

A: Then there's the class that beats every liveness check. Silent data corruption at the chapter's illustrative rate arrives about once every hundred hours on the ten-thousand-GPU cluster, roughly twenty events over the three-month run, and each one can poison every checkpoint written after it.

B: So the defense changes shape. Checkpointing turns a catastrophic restart into a bounded replay, but every save spends accelerator time and every skipped save risks replaying work. The Young-Daly interval balances the two costs with a square root.
::eq[young-daly]

A: Twenty-four and a half seconds to write two point four five terabytes, three point nine hours of MTBF: the optimum is near fourteen minutes, about six percent of wall time. And the floor is shallow, so being slightly off is cheap while intuition is wrong in both directions. Every hour is four times too frequent in one context and too infrequent in the other.

B: The service objectives bound it from outside. RPO caps lost progress: a twenty-minute interval can't promise better than twenty minutes. RTO caps resume delay: five minutes is impossible if the reload alone takes eight.
::fig[young-daly-floor]

A: And what does the recovery actually cost? Four terms: detect, restart, load, warmup. About thirty seconds to classify, roughly four minutes for scheduler allocation and rendezvous, twenty-four and a half seconds to load, two minutes of warmup. Six point six minutes total.
::eq[recovery-time]

B: The striking part: the checkpoint read everyone optimizes is the small term. Restart and warmup are ninety percent of the budget. And averaged over cadence, that's three minutes of fleet time per day at a thousand GPUs, thirty-one at ten thousand.
::fig[recovery-budget]

A: There's also a subtler variant of a dead rank: one that isn't dead. A single half-speed straggler on a thousand-twenty-four-GPU job halves the entire cluster's throughput, about a thousand dollars an hour idle, while passing every heartbeat.
::eq[straggler-step]

B: Which is why detection is layered. Liveness probes catch dead processes, timeouts catch hangs, inference checks catch wrong answers, and progress-median comparison catches the straggler that survives all of them. Five-second probes with three misses pull a crashed replica in twelve to seventeen seconds.
::fig[detection-layers]

A: When no spare exists, elastic recovery trades worker count for interruption: the thousand-twenty-four-GPU job that loses an eight-GPU node keeps ninety-nine point two percent of its allocation and resumes smaller. Serving prices the same trade differently: at ninety-nine percent per replica, annual downtime runs three point six five days, fifty-two point six minutes, thirty-one point five seconds across one, two, three replicas.
::eq[replica-availability]

B: And when the failure can't be masked at all, degrade on purpose. Prepared rungs, ViT-Large down to EfficientNet down to MobileNet, trade accuracy for survival. The degraded path is designed and drilled, or it's just a slower way to be down.

A: Carry these out of the chapter: failure is a rate, not an event. Recovery time is four terms and I-O is the small one. The checkpoint interval is a square root, not a guess. And the quiet failures, gray, silent, straggling, are what the fancy detection layers exist for.

B: Next chapter: fleet orchestration, where spare capacity, scheduling, and preemption turn this chapter's recovery contracts into a control loop.
