# hosts: Marcus | Iris

A: I'm Marcus, this is Iris. We finished volume one last chapter: the system is the model. Now volume two, scaling, and it opens by telling you the machine itself changed definition. This is the introduction: the scale moment.

B: The question it opens with is almost a riddle. Your training job runs on one thousand twenty-four GPUs, and each step takes eight point seven one seconds. Seven point two five seconds of that is actual math. The rest is a pipeline bubble and the gradient exchange.

A: Leadership asks: if we double to two thousand forty-eight GPUs, does the run finish in half the time?

B: And the chapter's whole argument lives inside that question. The honest answer is no, and the reason is what volume two is about.

A: Let's start with how we got here. Between twenty twelve and the mid twenties, training compute went from about ten to the eighteen for AlexNet up to about ten to the twenty five for a GPT-four-class run. Seven orders of magnitude.

B: And the growth rate itself broke. Before twenty ten, compute grew about one and a half times per year, basically Moore's law. After twenty ten, about four times per year. Deep learning didn't ride the hardware curve, it outran it.

A: The interesting part is where the growth came from. If you decompose each run into accelerators times days times achieved rate, about half the growth is fleet scale, count and duration, not faster chips.
::fig[scale-climb]

B: So the fleets themselves: AlexNet trained on two GTX five eighties. GPT-three used around ten thousand V-one-hundreds. Llama three used sixteen thousand three hundred eighty-four H-one-hundreds. Four orders of magnitude in a dozen years.

A: GPT-three is the one that gets me. An estimated three times ten to the twenty-three FLOPs for the run. On a single A-one-hundred at peak, that's roughly thirty years of ideal compute.

B: Which is why the chapter calls this a discontinuity. On one machine, your wall is the memory wall inside the device. Across a fleet, the wall moves to the network between devices, and to coordination, plus the energy wall, since these are hundred-megawatt campuses now.

A: Here's the mechanism that makes a fleet one computer: the synchronous step. Every worker computes its piece of the gradient, exchanges partial results, and waits at a barrier until all workers report.

B: And that gives us the chapter's workhorse equation, the fleet law. Step time decomposes into compute, communication, and coordination.
::eq[fleet-law]

A: Back to our step: seven point two five seconds compute, zero point five three bubble, zero point nine three exchange. So about seventeen percent of the step never does arithmetic at all.

B: That's the answer to the opening question. Doubling the fleet roughly halves the compute term, the amber span, but the bubble and the exchange don't halve. Worse, they tend to grow.
::fig[step-anatomy]

A: Why do they grow? Same global batch, twice the workers, each replica's share drops. In the book's example, going from one thousand twenty-four to eight thousand one ninety-two GPUs drops per-replica sequences from ninety-six to twelve.

B: So local FLOPs per step fall about eight times, but the bytes each replica has to exchange don't shrink the same way. The chapter formalizes this as communication intensity, bytes moved per local FLOP, and compares it against the fabric's balance point.
::eq[ci-ratio]

A: The one-oh-two-four configuration sits below ten percent of balance. The eight-thousand-plus one sits near half. Same model, same fabric, eight times the GPUs moved the job eight times closer to the network wall.

B: So fleet size is a network-pressure decision, not a capacity decision. That's the single biggest reframing in the chapter.

A: Now, if scale costs all this coordination, why does anyone do it? Because of scaling laws, the second pillar of the chapter. Loss falls as a power law in compute, in parameters, and in data.

B: Fitted, not derived. Loss equals a constant times compute to the negative alpha. The exponent is small: each order of magnitude buys a fixed, modest gain, but it held across orders of magnitude, which turned frontier training into a plannable investment.
::eq[scaling-law]

A: And there's an optimal split: the Chinchilla result, roughly twenty tokens per parameter at the compute-optimal point. A bigger model on a fixed token budget is under-trained.

B: The caveat the chapter insists on: the law is a planning instrument, not a promise. It breaks at regime boundaries: data exhaustion being the big one. Run out of corpus and extra parameters have nothing new to fit.

A: Third pillar: constraints. And the one that lands hardest is reliability. With per-device mean time to failure around fifty thousand hours, about five point seven years, a twenty-five-thousand-GPU job sees an interruption roughly every two hours.

B: Because the interruption rate adds: N devices each failing at one per MTTF gives a job-level rate of N over MTTF.
::eq[fleet-mtbf]

A: And this isn't hypothetical. Meta's published Llama three record: four hundred nineteen unexpected interruptions across a fifty-four-day snapshot on sixteen thousand three hundred eighty-four H-one-hundreds. About one every three hours.

B: The measured cadence matches the arithmetic almost exactly, which is rare and lovely.
::fig[mtbf-ladder]

A: Related wall: availability. If a step needs every node up at once, availability multiplies, A to the N. Ten thousand nodes at four nines gives about thirty-seven percent chance all are up simultaneously. Three nines gives essentially zero.
::eq[availability]

B: Which is why fleet design assumes interruption. Checkpointing, replication, restartable steps, you attack the exponent, not the nines.

A: There are two more walls the chapter names quickly: distributed state has physical limits, coordination costs latency, and governance. A fleet that can train a frontier model in weeks is a concentration of compute worth governing. That's not a metaphor; that's policy.

B: Now the organizing idea the book builds the whole volume on. Volume one had D-dot-A-dot-M: data, algorithm, machine, the nouns of the workload. Volume two needs verbs: what does the fleet spend each step doing?

A: Compute, communication, coordination. C-cubed. And the point of the taxonomy is diagnosis: every optimization relieves exactly one C.
::fig[c3-map]

B: Faster accelerator? Compute only. Better collective algorithm? Communication. Checkpointing, elastic scheduling, straggler mitigation? Coordination. Misdiagnose the term and you're buying hardware for a problem that isn't compute.

A: And the fleet stack wraps it: four bands, infrastructure, distribution, serving, governance, with the warning that they can't be optimized in isolation. The parallel strategy you pick determines the traffic the fabric has to carry.

B: Three archetypes carry the volume's concrete numbers, the way the lighthouses did in volume one: the frontier training fleet, the inference fleet, and the edge fleet. Each stresses a different C.

A: My takeaway is the fallacy list. The faster-accelerator fallacy: a better chip relieves only the compute term. On a step already at half of fabric balance, doubling peak FLOPs buys far less than double.

B: Mine is "just more servers." All the scale-out instincts from embarrassingly parallel work, work stealing, retry the slow task, fail at a barrier. There is no slack in a synchronous step; there's only waiting.

A: And treating MTBF as a device property. Fleet MTBF is device MTTF divided by N. Procurement math that prices uptime per box misprices the job by orders of magnitude.

B: So back to the opening case: does doubling the fleet halve the run?

A: No. Compute halves, roughly, but exchange and coordination don't, and per-replica work dropping pushes communication intensity toward the fabric's balance point. The honest answer to leadership is: it buys less than half the time, and at some fleet size it buys nothing.

B: Volume one ended with "the system is the model." Volume two opens by making the system plural, the machine is the fleet, and the fleet has three ways to spend your step.
