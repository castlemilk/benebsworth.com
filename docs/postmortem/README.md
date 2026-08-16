# Postmortems

A postmortem is written when a bug reached a place it should not have: it
survived the checks that existed, cost real time or real money to rediscover,
and would cost the same again next time. The point is not the incident. The
point is the guardrail the incident bought.

## When to write one

All three, or don't bother:

- **Subtle** — the code looked correct. A reviewer reading the diff would have
  approved it. If a linter or a typechecker would have caught it, fix the tool
  instead.
- **Systemic** — the mechanism generalises. One provider was miswired, but the
  wiring shape means the *next* provider will be miswired too.
- **Costly to rediscover** — the symptom is far from the cause, or the failure
  is silent, or reproducing it means spending money or waiting out a long run.

A crash with a stack trace pointing at its own cause is not a postmortem. A
sweep that writes correct results and then never exits is.

## Rules

- **Every postmortem ends in guardrails, and every guardrail is real.** Cite the
  test name, the file, the commit, the skill section. Verify each one exists
  before writing it down — a postmortem citing a phantom test is worse than no
  postmortem, because it retires a worry that is still live. Where the class is
  still unguarded, say so in the same list.
- **Mechanism, not blame.** "The inner timer defaults independently of the outer
  one" is a root cause. "The timeout was not passed" is a symptom.
- **Dates come from git.** `git log --format='%h %ad %s' --date=short`,
  `git log -S <symbol>`. Where the history genuinely does not record when
  something was first observed, write "date unrecovered" rather than inventing
  one.
- **Short.** Sixty-odd lines. A reader gets the executive summary in thirty
  seconds and stops there unless they need the mechanism. If it needs more than
  a screen of root cause, the mechanism is not understood yet — but never cut a
  verified guardrail to hit the number.

## Template

```markdown
# NNNN — Short name

**Executive summary.** Two or three sentences. What broke, what it cost, what
now prevents it. A reader who stops here should be able to recognise the class.

## Timeline

- **YYYY-MM-DD** (`sha`) — what happened.

## Root cause

The mechanism. Why the code was wrong in a way that reading it did not reveal.

## Guardrails

- `path/to/file.ts` — what it now does.
- `some.test.ts` — `'exact test name'`.
- Known gap: what is still unguarded.
```

## Index

| # | Incident | Class |
|---|---|---|
| [0001](0001-sweep-hang.md) | Sweeps wrote every result, then never exited | Un-owned live handle keeps the event loop alive |
| [0002](0002-timeout-config-miswire.md) | A 25-minute cap silently ran at 10 | Two timers, one name; per-provider opt-in with a silent default |
| [0003](0003-bearer-blip-misclassification.md) | A transient pool blip read as a revoked key | Classification keyed on a message's wording, not its distribution |
| [0004](0004-results-json-race.md) | A long sweep's startup snapshot clobbered newer writes | Whole-file write from a stale in-memory baseline |
