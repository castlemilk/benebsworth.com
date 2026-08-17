#!/usr/bin/env node
/**
 * Prove the `gateway-console` checks DISCRIMINATE (#22's acceptance criterion).
 *
 * Runs the task's three behavioural checks over two hand-written reference
 * artifacts — a known-good console and a known-bad one — in a real browser,
 * and compares each verdict against the expectation recorded beside the
 * fixtures (`plugins/gateway-tasks/fixtures.ts`).
 *
 * WHY THIS IS A SCRIPT AND NOT A UNIT TEST. Nothing in `vitest` launches a
 * browser: `scorers/sandbox.test.ts` drives a RECORDING backend precisely so
 * the suite stays fast and hermetic, and the two existing browser-driving
 * paths (`bench:rescore`, `bench:corpus:probe`) are opt-in CLIs for the same
 * reason. A check-discrimination run is the same cost shape — headless
 * Chromium, real timers, ~10s — so it lives here, beside them, rather than
 * putting a browser in the pre-push gate. The unit suite covers what does not
 * need a browser (the fixtures embed the stub verbatim, carry the contract's
 * markup hooks, and the bad one carries its two defects).
 *
 * Unlike `corpus:probe` this IS a gate: the fixtures are hand-written and
 * deterministic, so a mismatch means a check stopped discriminating, which is
 * always a bug.
 *
 * Run: npx tsx scripts/gateway-fixtures.mjs [--json]
 *
 * Exit 0 every verdict matched, 1 a mismatch, 2 the task or its checks could
 * not be resolved at all.
 */
import { BENCHMARK_TASKS } from '../lib/lab/llm-benchmark/registry.ts'
import { getChecksForTask } from '../lib/lab/llm-benchmark/scorers/checks.ts'
import { closeSandbox, runChecks } from '../lib/lab/llm-benchmark/scorers/sandbox.ts'
import { scoreWithBreakdown } from '../lib/lab/llm-benchmark/scorers/behavioral.ts'
import {
  BAD_GATEWAY_ARTIFACT,
  GATEWAY_FIXTURE_EXPECTATIONS,
  GOOD_GATEWAY_ARTIFACT,
} from '../lib/lab/llm-benchmark/plugins/gateway-tasks/fixtures.ts'

const asJson = process.argv.includes('--json')

const task = BENCHMARK_TASKS.find((t) => t.id === 'gateway-console')
if (!task) {
  console.error('[gateway-fixtures] task "gateway-console" is not in the registry — is the plugin rostered?')
  process.exit(2)
}

let checks
try {
  checks = getChecksForTask(task)
} catch (err) {
  console.error(`[gateway-fixtures] ${err.message}`)
  process.exit(2)
}
if (checks.length === 0) {
  console.error('[gateway-fixtures] gateway-console resolved zero checks')
  process.exit(2)
}

const fixtures = [
  { label: 'good', html: GOOD_GATEWAY_ARTIFACT },
  { label: 'bad', html: BAD_GATEWAY_ARTIFACT },
]

const report = []
let mismatches = 0

try {
  for (const fixture of fixtures) {
    // The same options the behavioural scorer uses, so what this reports is
    // what a real sweep would record — not a friendlier variant of it.
    const results = await runChecks(fixture.html, checks, {
      settleMs: 600,
      perCheckTimeoutMs: 6000,
      totalTimeoutMs: 25_000,
    })
    const breakdown = await scoreWithBreakdown(fixture.html, task)
    const expectations = GATEWAY_FIXTURE_EXPECTATIONS[fixture.label]
    const rows = results.map((r) => {
      const expected = expectations[r.name]
      const matched = expected === undefined || expected === r.passed
      if (!matched) mismatches += 1
      return {
        check: r.name,
        passed: r.passed,
        expected: expected ?? null,
        matched,
        points: r.points,
        maxPoints: r.maxPoints,
        detail: r.detail,
      }
    })
    report.push({ fixture: fixture.label, compositeScore: breakdown.score, structural: breakdown.structural, checks: rows })
  }
} finally {
  await closeSandbox()
}

if (asJson) {
  console.log(JSON.stringify({ taskId: task.id, mismatches, fixtures: report }, null, 2))
} else {
  for (const entry of report) {
    console.log(`\n[gateway-fixtures] ${entry.fixture} fixture — composite ${entry.compositeScore} (structural ${entry.structural})`)
    for (const row of entry.checks) {
      const verdict = row.passed ? 'PASS' : 'FAIL'
      const want = row.expected === null ? '(no expectation)' : row.expected ? 'expect PASS' : 'expect FAIL'
      const flag = row.matched ? ' ' : '!'
      console.log(`  ${flag} ${verdict.padEnd(4)} ${row.check.padEnd(24)} ${String(row.points).padStart(2)}/${row.maxPoints}  ${want}`)
      if (row.detail) console.log(`      ${row.detail}`)
    }
  }
  console.log(
    mismatches === 0
      ? '\n[gateway-fixtures] every verdict matched — the checks discriminate broken from working'
      : `\n[gateway-fixtures] ${mismatches} verdict(s) did not match the recorded expectation`
  )
}

process.exit(mismatches === 0 ? 0 : 1)
