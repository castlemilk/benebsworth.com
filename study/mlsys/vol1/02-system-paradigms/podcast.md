# Audio overview: vol1 ch2, System paradigms

# hosts: Marcus | Iris

Two-host script for local TTS. `A:` = Marcus, `B:` = Iris. Each line is
one TTS segment; keep units spoken naturally (no formulas, spell numbers out).
`::eq[id]` on its own line inside a turn tags it with an equations.json entry:
stripped from speech, rendered as math in the transcript.

A: Chapter two today, I'm Marcus, with Iris. System paradigms. And this one
::fig[tier-ladder]
surprised me because it's secretly a physics chapter wearing a deployment
diagram's clothes.

B: That's the right read. The chapter's organizing claim is what they call the
silicon contract: the deployment tier is determined by three terms, power,
memory, interconnect, plus two preconditions, privacy and latency. Software
wishes don't move any of them.

A: And the preconditions come first, which is the part people skip. Privacy
screens out paths the data isn't allowed to take at all. Latency rules out
paths whose lower bound already misses the deadline. Neither is negotiable:
a slower answer later is not a negotiation.

B: The braking example is the cleanest one. Your car needs a decision inside
ten milliseconds. The cloud is fifteen hundred kilometres away. Light in
fibre does roughly two hundred thousand kilometres a second, so the round
trip alone is fifteen milliseconds, more than the whole budget. No
engineering fixes that. Physics says the decision happens on the car.
::eq[light-barrier]

A: Feasibility before speed, that's the order. You screen first, then
optimize.

B: Then the three walls. Light is the first, we just did it. Power is the
second and the math here is brutal. Dynamic power scales with frequency
cubed, because voltage scales with frequency. So doubling the clock costs
eight times the power. That's why every chip in your house froze around
three to five gigahertz in about two thousand and five.
::eq[power-scaling]

A: The end of Dennard scaling, transistors kept shrinking but you couldn't
run them faster without melting, so the free lunch became more cores instead
of more clock.

B: And the third wall is memory, which is the sneaky one. Compute grows about
one-point-six times a year; memory bandwidth about one-point-two. Ratio of
one-point-three-three, sounds small, but it compounds to about sixteen
times per decade. Every year the gap between how fast you can compute and
how fast you can feed the compute gets wider.
::eq[memory-wall]

A: Which is why the book keeps hammering "the bottleneck is data movement",
and why your laptop running a local model is, at heart, a bandwidth-bound
machine.

B: Then the workload archetypes, and this is where it stops being trivia and
::fig[archetype-map]
becomes a design tool. Four regimes, throughput, latency, capacity, power:
each named after a lighthouse task that defines it.

A: Right, batch inference is throughput-bound, interactive serving is
latency-bound, training is capacity-bound because the weights have to fit,
and TinyML sensing is power-bound. And the key move: the archetype isn't a
property of the model, it's a property of the deployment context. The same
model is different archetypes on different tiers.

B: Prove it with the drone example, because that's the worked number that
sticks. A four-K frame is about twenty-five megabytes, call it two hundred
megabits. On a hundred megabit uplink that's two seconds of pure transmission.
Meanwhile the sixty-fps frame budget is sixteen-point-seven milliseconds.

A: So the remote path can't even start. The workload is power-archetype
territory: the answer has to be on the drone.

B: And then they make the ordering explicit: the locality invariant. Remote
execution is a lower bound you compute first, data volume over network
bandwidth, plus network latency, plus compute on the remote side. If that
bound already misses the budget, you never get to round two.
::eq[locality-invariant]

A: Which is the screen-then-cost method, privacy screen, latency screen,
::fig[screen-funnel]
resource screen, and only then lifecycle cost. Each check excludes candidates
before the next one runs, and they're ordered by how cheap the check is:
physics first, money last.

B: Last bit, hybrid architectures, because the real world isn't a single
::fig[tier-ladder]
tier. The voice-assistant cascade is the pricing exercise: waking word
detection on-device, because streaming audio from a billion devices to the
cloud is thirty-two terabytes a second and hundreds of millions of dollars a
year for a free feature. Local detection cuts the uploads by a factor of
about eight hundred and sixty.

A: But the wake word is only the first filter, everything after it still
wants the cloud. Hybrid isn't a compromise; at that scale it's the only shape
that works.

B: And the complexity tax is real, synchronized state, feature definitions,
model versions all have to match across the boundary or you reintroduce
training-serving skew where the tiers meet.

A: Takeaway for the review shelf: before any deployment discussion, write
::fig[screen-funnel]
down the three contract terms and the two preconditions. If a path fails a
precondition, it's not a candidate, no amount of budget or cleverness
reopens it.

B: And keep the numbers handy: fifteen milliseconds of light-speed round trip
per fifteen hundred kilometres, eight times power for twice the clock, one
point three three times the memory gap per year, sixteen point seven
milliseconds per frame at sixty fps.

A: Chapter three next, the ML lifecycle, where the data half of that dual
mandate becomes a pipeline.

B: See you there.
