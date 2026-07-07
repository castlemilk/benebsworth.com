---
title: Backpressure is the system saying no
date: '2026-07-07T01:00:00.000Z'
description: >-
  Queues, retries, rate limits, and stream demand signals are all ways of saying
  the same thing: a healthy system needs a controlled way to refuse more work
  before overload turns into collapse.
labels: 'software,systems,queues,distributed-systems'
heroImage: /blog/backpressure-is-the-system-saying-no/hero.webp
release: true
author: Ben Ebsworth
takeaways:
  - >-
    A queue does not remove work. It stores work in time, which means it trades
    immediate failure for latency and memory pressure.
  - >-
    Little's Law is the systems engineer's warning label: if arrival rate rises
    while throughput is fixed, the number of in-flight requests and their
    waiting time must grow.
  - >-
    Backpressure is a feedback loop. It pushes overload information upstream so
    producers slow down, shed work, or retry later instead of silently filling
    buffers.
  - >-
    Unbounded queues are usually a delayed outage. Bounded queues make the
    failure explicit while the caller can still do something useful.
markdown_url: /blog/backpressure-is-the-system-saying-no/
canonical_url: 'https://benebsworth.com/blog/backpressure-is-the-system-saying-no/'
---
## Key takeaways

- A queue does not remove work. It stores work in time, which means it trades immediate failure for latency and memory pressure.
- Little's Law is the systems engineer's warning label: if arrival rate rises while throughput is fixed, the number of in-flight requests and their waiting time must grow.
- Backpressure is a feedback loop. It pushes overload information upstream so producers slow down, shed work, or retry later instead of silently filling buffers.
- Unbounded queues are usually a delayed outage. Bounded queues make the failure explicit while the caller can still do something useful.

Backpressure is what happens when a system says "not yet" instead of pretending it can say "yes" forever.

That sounds simple, but a surprising number of outages are just variations on ignoring it. A service gets slower. The caller keeps sending traffic. A queue grows. Retries multiply. Memory fills. Latency climbs. Dashboards show throughput staying flat for a while, which looks comforting if you do not look at the backlog. Then everything falls over at once and the incident channel discovers the queue was not a shock absorber. It was a fuse with no rating.

I like backpressure as a topic because it is both humble and everywhere. TCP has it. Reactive streams formalise it. Message queues need it. Thread pools need it. Humans have it too, though we call it a calendar.

## A queue stores time

The most common mistake is treating a queue as spare capacity. It is not. A queue is stored waiting time. If work arrives faster than it completes, the excess has to go somewhere. You can reject it, slow the producer, shed lower-priority work, or let it wait. The queue is the waiting option.

Little's Law gives the tiny formula that makes this concrete:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
L = \lambda W
```

$$
L = \lambda W
$$

Here $L$ is the average number of items in the system, $\lambda$ is the arrival rate, and $W$ is the average time an item spends in the system. If arrival rate goes up and service capacity does not, then either in-flight work grows, waiting time grows, or both. There is no configuration flag that exempts you from the equation.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

An unbounded queue says every caller may hand you work, no matter how much unfinished work already exists. That turns overload into memory pressure and latency, which are usually harder to recover from than an early, explicit rejection.

## Backpressure is feedback, not a queue

A queue by itself is not backpressure. It is just a buffer. Backpressure is the feedback signal that travels upstream when the buffer is full or getting dangerous. The producer learns that the consumer is saturated and changes behaviour.

That behaviour can take a few forms:

- **Block:** the producer waits until capacity is available.
- **Drop:** low-value work is discarded before it consumes more resources.
- **Reject:** the service returns a clear error, often with retry guidance.
- **Slow down:** the caller reduces rate, either by token bucket, adaptive concurrency, or stream demand.
- **Batch:** the system combines work so fixed overhead is paid less often.

The right choice depends on the domain. A telemetry pipeline can drop samples. A payment API should reject rather than silently discard. A video player can buffer. A control loop may need to skip stale commands because old work is worse than no work.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\rho = \frac{\lambda}{\mu}
```

$$
\rho = \frac{\lambda}{\mu}
$$

When utilisation $\rho$ creeps toward 1, the system has no slack. Small bursts turn into long waits. That is the operational smell backpressure is supposed to catch early.

## The retry trap

Retries are useful when the failure is transient and the downstream service has spare capacity. During overload, retries are often a small distributed denial-of-service attack launched by your own clients. The first request times out because the queue is long. The client sends another. Now the queue is longer. More clients time out. More retries arrive.

Backoff and jitter help because they turn a tight retry loop into a slower, spread-out signal. But they are still downstream of the main question: should this system accept more work right now?

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A timeout tells the caller the work took too long. Backpressure tells the caller before the work is admitted, or while the stream is still negotiating demand. One is a receipt for pain already incurred. The other is a control signal.

This is why bounded queues feel harsh but are kinder. If a worker pool has 32 workers and a queue of 256, the 289th request gets a quick answer: try later, go elsewhere, or shed the optional path. With an unbounded queue, it gets accepted into a line that may already be seconds or minutes long. The caller thinks it has a promise. The service has only made a wish.

## Streams make the signal explicit

The cleanest version of backpressure is a demand signal. In Reactive Streams, a subscriber asks for $n$ items. The publisher is not meant to send more than requested. That "request(n)" shape is a useful mental model even if you never use a reactive library. The consumer owns the pace because the consumer knows what it can absorb.

TCP does a related thing at another layer. Flow control stops a sender from overrunning the receiver's buffer, while congestion control tries not to overrun the network path. The details are very different from application queues, but the moral is the same: healthy protocols expose pressure upstream. They do not rely on infinite buffers and good luck.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## How I would design it

For a service boundary, I usually want four separate knobs, not one magic queue size.

First, set a **concurrency limit** around the expensive part. That might be database calls, external API calls, CPU-bound work, or a whole request handler. The limit should reflect the resource that actually saturates, not just the number of HTTP connections.

Second, make the **queue bounded** and small enough that waiting work still has a chance of being useful by the time it runs. A 10-minute queue for user-facing requests is just a slow error message.

Third, choose a **rejection language**. That might be HTTP 429 for rate limits, HTTP 503 with `Retry-After` for overload, a gRPC resource-exhausted status, or a domain-specific "come back later" response. The caller needs to know whether to retry, fail open, fail closed, or show the user a message.

Fourth, add **load shedding** before the expensive path. Optional enrichments, previews, analytics, recommendation calls, and best-effort side effects should be easier to turn off than the core transaction. Overload is not one thing; some work is more valuable than other work.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The best backpressure design is not dramatic. It keeps latency bounded, preserves the core path, gives callers explicit answers, and lets the system recover when load drops. Boring is the goal.

## A small practical checklist

When a queue appears in a design, I think these are the useful questions:

- What is the maximum queue length, and why that number?
- What happens to item 1 past the limit?
- Does the producer learn about pressure immediately?
- Are retries capped, backed off, and jittered?
- Can stale work expire before it runs?
- Which work is dropped first when the system is hot?
- Is the dashboard showing queue length and age, not just throughput?

The "age" part matters. Queue length alone can hide trouble when item cost varies. A short queue of expensive items can be worse than a long queue of cheap ones. Oldest-item age is often the better panic gauge because users experience time, not list length.

Some food for thought: a lot of software reliability is just honesty about capacity. A system that says no early is not less available than one that says yes and times out. It is more honest about the work it can actually finish.

## Reading further

- [John D. C. Little, "Little's Law as Viewed on Its 50th Anniversary"](https://projectproduction.org/journal/reprint-littles-law-as-viewed-on-its-50th-anniversary/): the queueing result that makes backlog, throughput, and latency inseparable.
- [Reactive Streams](https://www.reactive-streams.org/): the standard shape of asynchronous streams with non-blocking backpressure.
- [IETF RFC 5681, TCP Congestion Control](https://datatracker.ietf.org/doc/html/rfc5681): the transport-layer version of pushing congestion information back into sender behaviour.
- [Martin Thompson, "Applying Back Pressure When Overloaded"](https://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html): a practical systems note on bounded queues and upstream pressure.
