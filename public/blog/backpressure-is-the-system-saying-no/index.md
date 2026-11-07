---
title: Backpressure is the system saying no
date: '2026-07-07T01:00:00.000Z'
description: >-
  Bounded queues and upstream demand signals help a service handle overload.
  Concurrency limits and retry policies keep waiting work from exhausting its
  resources.
dateModified: '2026-11-07T00:00:00.000Z'
labels: 'software,systems,queues,distributed-systems'
heroImage: /blog/backpressure-is-the-system-saying-no/hero.webp
release: true
author: Ben Ebsworth
takeaways:
  - >-
    A queue absorbs short bursts, but sustained excess work still needs
    somewhere to go. Larger buffers add waiting time and consume resources.
  - >-
    For a stable system, Little's Law relates average in-flight work, admitted
    arrival rate and time in the system. It does not predict a finite wait under
    sustained overload.
  - >-
    Backpressure is a feedback loop. It pushes overload information upstream so
    producers slow down, shed work, or retry later instead of silently filling
    buffers.
  - >-
    Bounded queues expose overload early. Callers still need retry limits, and
    queued work needs an expiry policy.
markdown_url: /blog/backpressure-is-the-system-saying-no/
canonical_url: 'https://benebsworth.com/blog/backpressure-is-the-system-saying-no/'
---
## Key takeaways

- A queue absorbs short bursts, but sustained excess work still needs somewhere to go. Larger buffers add waiting time and consume resources.
- For a stable system, Little's Law relates average in-flight work, admitted arrival rate and time in the system. It does not predict a finite wait under sustained overload.
- Backpressure is a feedback loop. It pushes overload information upstream so producers slow down, shed work, or retry later instead of silently filling buffers.
- Bounded queues expose overload early. Callers still need retry limits, and queued work needs an expiry policy.

Backpressure lets a consumer tell a producer to slow down when it cannot keep up.

Consider a service that slows down while callers keep sending at the same rate. Its queue grows, requests time out, and retries add more work. Throughput can stay flat throughout, even as the backlog consumes memory and callers wait longer.

We can follow that feedback through a few familiar systems: worker queues, Reactive Streams and TCP. Each puts a limit in a different place. The useful question is whether the producer can see that limit and respond to it.

## A queue stores time

A queue helps absorb a burst if the service can catch up afterwards. It cannot increase the rate at which workers finish. Under sustained overload, we have to reject work, slow the producer, shed lower-priority work, or keep accumulating a backlog.

Little's Law relates the averages we measure across a system:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
L = \lambda W
```

$$
L = \lambda W
$$

Here $L$ counts average in-flight items, including work in service. $\lambda$ is the average admitted arrival rate, and $W$ includes waiting and service time. Use the same system boundary for all three. For example, a stable service admitting 100 requests per second with a mean response time of 0.2 seconds has 20 requests in flight on average.

This long-run interpretation assumes the averages settle. If admitted work keeps exceeding completions, the backlog grows and there is no stable average wait to calculate this way. Rejected requests do not enter the queue, so exclude them from its arrival rate.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

An unbounded in-memory queue can keep accepting work until memory runs out. Choose a limit and an overload response before that happens. A larger queue only postpones this decision if the excess load persists.

## Backpressure is feedback, not a queue

Backpressure needs a signal that reaches the producer. A full queue might block a write or return an error. A consumer can also report how much work it can accept before the queue fills.

That behaviour can take a few forms:

- **Block:** the producer waits until capacity is available.
- **Drop:** discard low-value work before it consumes more resources.
- **Reject:** the service returns a clear error, often with retry guidance.
- **Slow down:** the caller reduces its rate or concurrency in response to the consumer.

Dropping work protects the consumer but gives no feedback unless the producer can observe it. A token bucket caps a rate, and batching can reduce per-item overhead. Neither by itself tells the producer whether the downstream service has spare capacity.

The right choice depends on the domain. A telemetry pipeline can drop samples. A payment API should reject rather than silently discard. A video player can buffer. A control loop may need to skip stale commands because old work is worse than no work.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\rho = \frac{\lambda}{\mu}
```

$$
\rho = \frac{\lambda}{\mu}
$$

Here $\mu$ is the service capacity in items per second. For a worker pool, use the total capacity, not one worker's rate. As utilisation $\rho$ approaches 1, less capacity remains to absorb bursts. With variable arrivals or service times, waits can grow well before average load reaches that limit.

## The retry trap

Retries help when a failure is transient and the service has capacity for another attempt. During overload, they can worsen the backlog: a request times out, its client retries, and both attempts may still compete for the same workers.

Backoff spaces out retries, and jitter stops clients from retrying together. Cap the number of attempts as well. None of these creates capacity, so the service still needs to decide whether to admit the next request.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A timeout ends the caller's wait, but it may leave queued or running work behind. Callers can use timeouts as a signal to reduce load, provided they actually change their behaviour. An explicit capacity signal gives them a chance to slow down earlier.

Suppose all 32 workers are busy and another 256 requests fill the queue. A new arrival must wait outside that queue or take the configured rejection path, unless capacity opens first. With an unbounded queue it can join the backlog, even if its deadline will expire before a worker reaches it.

## Streams make the signal explicit

In Reactive Streams, a subscriber uses `request(n)` to signal demand. Requests add to that demand, and the publisher must not emit more items than requested in total. This gives the consumer a way to limit delivery across an asynchronous boundary.

TCP has two related controls. Flow control limits sending according to the receiver's available buffer, while congestion control responds to conditions on the network path. Neither replaces application-level limits: a service can read bytes quickly and still have too much unfinished work.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## How I would design it

For a service boundary, I usually want four separate controls.

First, set a **concurrency limit** around the expensive part. That might be database calls, external API calls, CPU-bound work, or a whole request handler. The limit should reflect the resource that actually saturates, not just the number of HTTP connections.

Second, make the **queue bounded** and choose its size against the request deadline. Expire stale work before a worker starts it. A queue length limit alone does not bound latency when service times vary.

Third, choose a **rejection response** callers understand. HTTP 429 can signal a rate limit, and HTTP 503 with `Retry-After` can signal temporary overload. gRPC has a resource-exhausted status. Document when retrying makes sense and when the caller should stop.

Fourth, add **load shedding** before the expensive path. Optional enrichments, previews and recommendation calls should be easier to turn off than the core transaction. Decide which work can wait or disappear without breaking that transaction.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Load-test the rejection path and then reduce the incoming traffic. Check that the backlog drains, accepted requests complete within their deadlines, and retries do not keep the service overloaded.

## A small practical checklist

When a queue appears in a design, I think these are the useful questions:

- What is the maximum queue length, and why that number?
- What happens to the next item once the queue is full?
- Does the producer learn about pressure immediately?
- Are retries capped, backed off, and jittered?
- Can stale work expire before it runs?
- Which work do we drop first under load?
- Is the dashboard showing queue length and age, not just throughput?

Queue age deserves a place beside queue length on the dashboard. A few expensive jobs can hold up later requests even when the queue looks short. Track the oldest item and compare its age with the deadline for that work.

The next useful test is a burst followed by sustained overload. Watch where work accumulates and whether the signal reaches the producer. That will tell us more about the design than the queue size on its own.

## Reading further

- [John D. C. Little, "Little's Law as Viewed on Its 50th Anniversary"](https://projectproduction.org/journal/reprint-littles-law-as-viewed-on-its-50th-anniversary/): the queueing result that makes backlog, throughput, and latency inseparable.
- [Reactive Streams](https://www.reactive-streams.org/): the standard shape of asynchronous streams with non-blocking backpressure.
- [IETF RFC 5681, TCP Congestion Control](https://datatracker.ietf.org/doc/html/rfc5681): the transport-layer version of pushing congestion information back into sender behaviour.
- [Martin Thompson, "Applying Back Pressure When Overloaded"](https://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html): a practical systems note on bounded queues and upstream pressure.
