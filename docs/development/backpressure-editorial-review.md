# Backpressure article editorial review

## Scope and source

7 November 2026. Article-only continuation of the requested de-slop reviews.
The branch `editorial/backpressure-deslop-20261107` starts at
`6f8e20faa1696bd2186aed79c9063e0221b64619`, the current
`codex/gamma-blog-editorial-20261027` base. It contains none of the pending
[PR95 Hiking changes](https://github.com/castlemilk/benebsworth.com/pull/95),
including the separate local opener-focus fix. The gallery-data decision is
unchanged.

Changed files: the backpressure article, its generated Markdown sibling,
a real-MDX regression test and this review record. No renderer, route,
scientific component, image, taxonomy or release configuration changed.

## Editorial findings and changes

- The opening used repeated outage metaphors and a generic calendar
  aside. It now follows the concrete sequence: slower service, growing queue,
  timeouts and retries, with throughput hiding the backlog.
- The Little's Law paragraph treated sustained overload as a stable-average
  calculation. It now defines the admitted arrival rate and system boundary,
  states the long-run assumption and gives an illustrative 100 requests/second
  times 0.2 seconds = 20 in-flight requests example.
- Batching and token buckets were listed as if they necessarily provided
  downstream feedback. The article now separates their functions from feedback,
  including the limitation of silent dropping.
- Timeouts and queue bounds sounded like guarantees. The revision explains
  that timed-out work may continue, a full bounded queue can block or reject,
  and queue length alone cannot bound latency when service times vary.
- Reactive Streams demand is cumulative. The article now states that explicitly
  rather than describing each request as an isolated allowance.
- The closing callout replaces "Boring is the goal" with a concrete overload
  and recovery test. The original first-person design section remains.

This was a prose and technical review using the repository's writing-blog-posts
house style, the writing-style guidance and the deterministic prose validator.
It was not a new visual-design or physical-device review.

## Technical sources checked

- [John D. C. Little's retrospective](https://projectproduction.org/journal/reprint-littles-law-as-viewed-on-its-50th-anniversary/), especially section 2's existence and convergence conditions. The revision specifically qualifies the long-run interpretation; it does not rule out finite-window formulations.
- [Reactive Streams 1.0.4](https://github.com/reactive-streams/reactive-streams-jvm/blob/v1.0.4/README.md), Publisher rule 1 and Subscription rule 8: emitted items cannot exceed cumulative demand, and request adds demand.
- [Martin Thompson on overload](https://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html): bounded queues, upstream feedback and sustained excess load.

## Preservation and verification

The original title, publication date, author, labels, hero image and publication
flag are unchanged. `dateModified` records this revision. Both mathematical
expressions, their IDs and copyable LaTeX, all seven section headings/anchors,
all four reference URLs and all three stat entries are unchanged. The revised
Little's Law caption adds its scope without changing the equation.

Checks on the final article and test source:

- Prose: 1,376 to 1,293 extracted words; hard errors 0 to 0; warnings 15 to 1.
  The remaining warning is the deliberate seven-question checklist, which the
  rule counts as a paragraph. No validator rule was weakened.
- Focused MDX pipeline, prose rules and article tests: 34 passed, 0 skipped.
- New article test on the original source: the assumption-visibility test
  failed as expected; the other three were deliberately excluded. Restoring the
  revised source: all four passed.
- Full single-worker suite: 1,865 passed, 5 skipped, across 152 passing and two
  skipped test files. This count belongs to the independent editorial base,
  not to the later Hiking branch.
- TypeScript, changed-test ESLint, generated-Markdown check and Git whitespace
  check passed.
- Full production build: compile and TypeScript passed; 535 static pages
  exported. OG processing renamed 161 files and rewrote 24 HTML files.
  Pagefind indexed 76 pages and 14,666 words.
- Static export inspection confirms the revised prose, both rendered equations
  and all reference links on the article route. Actual browser layout was not
  rerun because no presentation code changed.

The build used Node 24, the unchanged lockfile's existing dependencies, a 2 GiB
heap and a temporary single-worker setting. The configuration was restored
byte-for-byte. The benchmark generator ran with native Node TypeScript support,
as documented in the recovery runbook. Harness generation used an empty HOME;
its existing 12-model, 52-task dataset remained unchanged. All public Hiking and
Google client configuration inputs were empty. This build is not configured
photo-gallery acceptance.

## Integration boundary

This candidate is independent of PR95 and can be reviewed without resolving the
photo-data decision. A saved source branch or draft PR is not a live release.
Exact remote CI, any integration and live verification must be recorded
separately. No credential, publisher-control or gallery configuration change
is part of this article revision.
