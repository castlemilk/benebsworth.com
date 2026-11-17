# Audio overview: vol1 ch1, Introduction

# hosts: Marcus | Iris

Two-host script for local TTS. `A:` = Marcus, `B:` = Iris. Each line is
one TTS segment; keep units spoken naturally (no formulas, spell numbers out).
`::eq[id]` on its own line inside a turn tags it with an equations.json entry:
stripped from speech, rendered as math in the transcript.

A: Welcome back, I'm Marcus. Today we're doing chapter one of Machine
Learning Systems, Vijay Janapa Reddi's Harvard text and honestly, it's the
chapter that reframes what "AI engineering" even means.

B: And I'm Iris. The chapter's big move is to say: the model isn't the
product. The system is. And they have a name for that — the dual mandate.

A: The dual mandate, yeah. Two obligations at once: the model has to keep
producing statistically trustworthy behaviour, and the system has to execute
inside physical budgets, time, memory, energy, cost. Fail either side and
you've failed, even if the other side looks perfect.

B: And the examples they pick are great, because each one fails on a different
side. So there's Google Flu Trends.

A: Which I love because everyone assumes it was a data problem. They had
hundreds of billions of search queries. Real-time data at a scale nobody had
ever touched.

B: And it still failed, right? It overestimated flu prevalence in a hundred
out of a hundred and eight weeks, ending up at about twice the CDC rate.
The code ran fine. The problem was the proxy: search volume measured public
attention, not influenza. Autocomplete suggestions, news coverage, all of it
leaking into the signal.

A: So data volume is not ground truth. That's the lesson. A behavioural proxy
needs a feedback loop to something you actually trust: labelled outcomes.

B: Then contrast that with Knight Capital. Completely different failure.

A: Yeah, forty-five minutes, four hundred and forty million dollars gone.
Deployment error, dormant code path reactivated. The system was "correct" in
the sense that it executed exactly what it was told. The failure was that the
thing it was told was wrong, and nothing in the runtime noticed.

B: And Boeing's MCAS is the darkest one, a correct system in an untrue
world. Single angle-of-attack sensor feeding a flight-control system that
kept pushing the nose down. The software did exactly what it was designed to
do; the model of the world it was built on was wrong.

A: Three failures, one pattern: the code was fine. So the chapter's claim is
that code correctness is the wrong verification target for ML systems:
you're verifying the wrong layer.

B: Which sets up the thing I found most counter-intuitive, silent
degradation. In normal software, broken things scream. Exceptions, crash
loops, five-hundreds.

A: In ML systems the dashboard stays green and the predictions quietly get
worse. The chapter draws it as two curves: health flat over time, recall
sliding from ninety-five to eighty-five percent. Nothing to page on. You have
to detect degradation statistically, which means labelled outcomes arriving
late so there's always a lag between "the world moved" and "you found out".

B: And they formalise that as an equation, accuracy at time t equals
baseline accuracy minus lambda times the divergence between the current data
distribution and the training distribution. Drift is the warning signal, not
the proof, labelled outcomes are the proof.
::eq[silent-degradation]

A: There's a nice phrase in the packet for this: a green dashboard is not
evidence the model works.

B: Good line. Okay, second pillar of the chapter: the iron law of execution.
If software engineering has Amdahl, ML systems has this.

A: Execution time decomposes into data over bandwidth, plus operations over
the rate you actually achieve, plus latency. Three terms, the memory term,
the compute term, the latency term. And the important bit: the real
bottleneck is whichever term is biggest, so you take the max, not the sum,
because memory movement and compute overlap.
::eq[iron-law-overlapped]

B: Which is where it gets spicy, because data movement is usually the wall.
Moving a byte costs orders of magnitude more energy than computing on it. So
the fastest fix is rarely a faster chip, it's moving less data.

A: And that loops back to the D-A-M structure: data, algorithm, machine.
Three axes, and every edge of the triangle points both ways, relax a
bottleneck on one axis and it migrates to a neighbour.

B: The book makes the point with a triangle; we drew it as a loop, find the
binding constraint, relieve it, re-measure, because the constraint always
moves.

A: Last piece, the economics. Return on compute: the value of the increment
versus the cost of the increment. The chapter's example is spending twenty
thousand dollars on better data versus a hundred and twenty thousand on a
bigger model.
::eq[return-on-compute]

B: And the answer is usually the data, which feels wrong because model
upgrades are what make conference talks. But RoC is about marginal return,
not peak capability.

A: Plus the fallacies list, my favourite is "the model is the system", and
its cousin "the bottleneck is compute". Nine out of ten times the book's
answer is: it's data movement, or it's the data itself.

B: So the through-line for the whole book: ML engineering is a systems
discipline. The physics, bandwidth, energy, latency, is not negotiable, and
the verification target is the system's behaviour, not the code's.

A: And the practical takeaway for review: when you look at your own stack,
ask which of the three iron-law terms is binding and check whether your
dashboards measure health or outcomes.

B: Next up, chapter two, the deployment paradigms, and why your laptop is
basically a bandwidth-bound device.

A: See you there.
