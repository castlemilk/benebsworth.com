import { appliedSandboxConstraints } from '@/lib/lab/llm-benchmark/prompts'
import type { BenchmarkTask } from '@/lib/lab/llm-benchmark/types'

/**
 * The sandbox contract as APPLIED to one task — the text the harness
 * appends to the prompt before the model ever sees it
 * (`prompts.ts:withSandboxConstraints`). Without this the task page shows
 * the raw prompt and quietly under-reports what the model was told.
 *
 * Collapsed by default: it is long, and it is the same text on most pages,
 * so it must not push the results below the fold. Server-rendered
 * `<details>` — no client JS, and the text is in the static HTML, so it is
 * greppable in `out/` and findable by in-page search even while collapsed.
 *
 * The text is read from `appliedSandboxConstraints()`, never copied, so a
 * contract edit (global or per-task) can't drift from what the page claims.
 * The three states are labelled, because "no contract" is a deliberate
 * choice a task can make (`sandboxConstraints: ''`), not an omission.
 */
export function SandboxContract({ task }: { task: BenchmarkTask }) {
  const contract = appliedSandboxConstraints(task).trim()
  const source = task.sandboxConstraints === undefined ? 'global' : 'task-specific'

  if (contract === '') {
    return (
      <p className="mt-4 border-t border-[var(--color-border)] pt-4 font-mono text-xs text-muted">
        Sandbox contract: none —{' '}
        {task.sandboxConstraints === undefined
          ? 'this task’s output is read as text, not executed, so the prompt above is exactly what the model received.'
          : 'this task opts out of the contract, so the prompt above is exactly what the model received.'}
      </p>
    )
  }

  return (
    <details className="mt-4 border-t border-[var(--color-border)] pt-4">
      <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-[0.18em] text-fg/80 marker:text-muted">
        Sandbox contract ({source}) — appended to the prompt
      </summary>
      <p className="mt-3 max-w-prose text-xs text-muted">
        {source === 'global'
          ? 'Every task whose output runs in the demo iframe gets this contract appended verbatim.'
          : 'This task ships its own contract, which replaces the global one.'}{' '}
        It is part of the prompt hash, so editing it re-runs the task rather
        than replaying a cached response.
      </p>
      <p className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-fg/70">
        {contract}
      </p>
    </details>
  )
}
