import Link from 'next/link'

import { failureSignature, formatBenchRef, relatedRuns } from '@/lib/lab/llm-benchmark/bench-ref'
import type { RelatedRun } from '@/lib/lab/llm-benchmark/bench-ref'
import { BENCHMARK_RESULTS } from '@/lib/lab/llm-benchmark/results'
import { getModel, getTask } from '@/lib/lab/llm-benchmark/registry'
import { benchRefPath } from '@/lib/lab/llm-benchmark/nav'
import { loadTraceIndex } from '@/lib/lab/llm-benchmark/traces-server'
import { findTraceEntry } from '@/lib/lab/llm-benchmark/traces'
import { findResultForRef } from '@/lib/lab/llm-benchmark/bench-ref'
import type { BenchmarkResult } from '@/lib/lab/llm-benchmark/types'

/**
 * "Related runs" — the other runs that failed the same checks.
 *
 * The results table says a model scored 30; the trace below it says which
 * check tripped. Neither can say "the same check tripped for four other models
 * on this task, and for this model on two other tasks" — which is the thing
 * that turns one bad score into a pattern. This panel is that link, computed
 * from failure signatures (`failureSignature`) and ranked by proximity
 * (`relatedRuns`: same task, then same model, then anything).
 *
 * SERVER-ONLY, deliberately: it reads the whole board (`BENCHMARK_RESULTS`,
 * ~5 MB) to look across tasks, and that must never reach the browser. It is a
 * plain server component — no interactivity, no client boundary, no props
 * crossing one.
 *
 * SNAPSHOT HONESTY: this is computed at BUILD time from `results.json` as it
 * stood, and says so in the caption. dsh's session-reference records a capture
 * seq because its sessions keep moving; ours is a static export, so the honest
 * equivalent is naming the source and the moment rather than implying a live
 * query. Rendering nothing (rather than "no related runs") when a record has
 * no neighbours keeps the absence quiet.
 */

/** Most neighbours shown per record — enough to establish a pattern, not a wall. */
const PER_RECORD_LIMIT = 3

export function RelatedRunsPanel({ results }: { results: BenchmarkResult[] }) {
  const groups = results
    // Seeded records are excluded on BOTH sides: `relatedRuns` refuses them as
    // neighbours, and a hand-authored sample must not be the SUBJECT of a
    // pattern claim either — its failed checks were written, not measured.
    .filter((result) => result.source !== 'seeded')
    .map((result) => ({
      result,
      signature: failureSignature(result),
      items: relatedRuns(result, BENCHMARK_RESULTS, { limit: PER_RECORD_LIMIT }),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length || a.result.modelId.localeCompare(b.result.modelId))

  if (groups.length === 0) return null

  return (
    <div
      data-related-runs
      className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Related runs</h3>
        <p className="mt-1 text-xs text-fg/60">
          Runs elsewhere on the board that failed at least one of the same checks — same task
          first, then the same model on other tasks. Computed from the current board
          (results.json) at build time, not a live query.
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {groups.map(({ result, signature, items }) => (
          <li key={result.modelId} className="px-5 py-4">
            <p className="font-mono text-xs text-fg/80">
              <span className="font-medium">{getModel(result.modelId)?.name ?? result.modelId}</span>{' '}
              <span className="text-muted">
                failed {signature.join(', ')} — also failed by:
              </span>
            </p>
            <ul className="mt-2 space-y-1.5">
              {items.map((item) => (
                <RelatedRunRow key={`${item.ref.modelId}/${item.ref.taskId}`} item={item} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedRunRow({ item }: { item: RelatedRun }) {
  const model = getModel(item.ref.modelId)
  const task = getTask(item.ref.taskId)
  // Anchor at the target's trace disclosure only when that trace was actually
  // published — the index is the authority for that, exactly as it is for the
  // "Iteration traces" section itself. Otherwise link the page plainly rather
  // than at a fragment nothing on it matches.
  const target = findResultForRef(BENCHMARK_RESULTS, item.ref)
  const traced = Boolean(findTraceEntry(loadTraceIndex(), target?.runLogRef))
  const href = benchRefPath(item.ref, { anchor: traced })
  const label = `${model?.name ?? item.ref.modelId} · ${task?.title ?? item.ref.taskId}`
  const uri = formatBenchRef(item.ref)

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
      {href ? (
        <Link
          href={href}
          title={uri}
          className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--color-project)]"
        >
          {label}
        </Link>
      ) : (
        <span title={uri}>{label}</span>
      )}
      <span className="text-[0.65rem] uppercase tracking-wider text-muted">
        {item.tier === 'same-task' ? 'same task' : item.tier === 'same-model' ? 'same model' : 'elsewhere'}
      </span>
      {/* Shared FAILED checks, in the failing band of the IterationChecks
          pills (rose) — the same visual language, minus the pass counts,
          which belong to the run being described rather than the overlap. */}
      {item.sharedChecks.map((name) => (
        <span
          key={name}
          className="inline-flex items-center rounded-full border border-rose-600/40 bg-rose-600/10 px-1.5 py-px text-[10px] leading-4 text-rose-600 dark:text-rose-400"
        >
          {name}
        </span>
      ))}
    </li>
  )
}
