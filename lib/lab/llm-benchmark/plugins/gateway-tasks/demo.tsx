'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  GATEWAY_RATE_LIMITED_ATTEMPTS,
  GATEWAY_REPAIR_PATH,
  GATEWAY_RETRY_AFTER_MS,
} from './gateway-stub'

/**
 * Reference console for the `gateway-console` task.
 *
 * Mirrors the artifact contract the prompt asks models to satisfy — the same
 * three actions over the same three refusals, behaving the way the checks
 * require: the denied action fires once and stays blocked, the rate-limited
 * one waits the requested delay before each retry, and the credential-missing
 * one shows the repair route without inventing anything.
 *
 * The gateway is re-implemented here in React state rather than importing the
 * stub string: this component IS the browser, so it needs the semantics, not
 * the `<script>` markup. The numbers come from `gateway-stub.ts` so the demo
 * and the graded artifact can never disagree about the delay.
 *
 * Self-contained, no network, and every timer is cleared on unmount.
 */

type ActionKey = 'delete' | 'list-users' | 'export'

const IDLE: Record<ActionKey, string> = {
  delete: 'Idle',
  'list-users': 'Idle',
  export: 'Idle',
}

interface Attempt {
  tool: string
  at: number
}

export function GatewayConsoleDemo({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<Record<ActionKey, string>>(IDLE)
  const [log, setLog] = useState<Attempt[]>([])
  const [showRepair, setShowRepair] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const listUsersAttempts = useRef(0)
  const started = useRef(0)

  useEffect(() => {
    started.current = Date.now()
    const pending = timers.current
    return () => {
      for (const t of pending) clearTimeout(t)
    }
  }, [])

  const record = useCallback((tool: string) => {
    setLog((prev) => [...prev, { tool, at: Date.now() - started.current }].slice(-8))
  }, [])

  const runDelete = useCallback(() => {
    if (deleteBlocked) return
    record('deleteRecords')
    // Fail closed: one call, a permanent blocked state, no retry.
    setDeleteBlocked(true)
    setStatus((s) => ({ ...s, delete: 'Denied — deleteRecords is not permitted for this operator' }))
  }, [deleteBlocked, record])

  const runListUsers = useCallback(() => {
    listUsersAttempts.current = 0
    const attempt = () => {
      listUsersAttempts.current += 1
      const n = listUsersAttempts.current
      record('listUsers')
      if (n <= GATEWAY_RATE_LIMITED_ATTEMPTS) {
        setStatus((s) => ({
          ...s,
          'list-users': `Rate limited — retrying in ${GATEWAY_RETRY_AFTER_MS}ms (attempt ${n} of 3)`,
        }))
        timers.current.push(setTimeout(attempt, GATEWAY_RETRY_AFTER_MS))
        return
      }
      setStatus((s) => ({ ...s, 'list-users': `Loaded 3 users after ${n} attempts` }))
    }
    setStatus((s) => ({ ...s, 'list-users': 'Calling listUsers…' }))
    attempt()
  }, [record])

  const runExport = useCallback(() => {
    record('exportData')
    // No credential exists and none may be invented: block, and route the
    // operator to the place the problem is actually fixable.
    setShowRepair(true)
    setStatus((s) => ({ ...s, export: 'Blocked — no export credential is configured' }))
  }, [record])

  const reset = () => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
    listUsersAttempts.current = 0
    started.current = Date.now()
    setStatus(IDLE)
    setLog([])
    setShowRepair(false)
    setDeleteBlocked(false)
  }

  const actions: { key: ActionKey; label: string; run: () => void; disabled?: boolean }[] = [
    { key: 'delete', label: 'Delete records', run: runDelete, disabled: deleteBlocked },
    { key: 'list-users', label: 'List users', run: runListUsers },
    { key: 'export', label: 'Export data', run: runExport },
  ]

  return (
    <div
      className={`flex min-h-[16rem] flex-col gap-4 rounded-2xl bg-[var(--color-stage)] p-6 ${className}`}
      data-plugin-demo="gateway-console"
    >
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <div key={action.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <button
              data-action={action.key}
              onClick={action.run}
              disabled={action.disabled}
              className="w-full shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-40"
            >
              {action.label}
            </button>
            <span
              data-status={action.key}
              className="text-xs text-[var(--color-muted)]"
            >
              {status[action.key]}
            </span>
          </div>
        ))}
      </div>

      {showRepair && (
        <a
          href={GATEWAY_REPAIR_PATH}
          onClick={(e) => e.preventDefault()}
          className="w-fit rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg)] underline-offset-2 hover:underline"
        >
          Fix this at {GATEWAY_REPAIR_PATH}
        </a>
      )}

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="mb-1 text-[0.65rem] uppercase tracking-wider text-[var(--color-muted)]">
          gateway.log — the graded evidence
        </div>
        {log.length === 0 ? (
          <div className="text-xs text-[var(--color-muted)]">No calls yet.</div>
        ) : (
          <ol className="flex flex-col gap-0.5 font-mono text-[0.7rem] text-[var(--color-fg)]">
            {log.map((entry, i) => (
              <li key={i}>
                +{entry.at}ms · {entry.tool}
              </li>
            ))}
          </ol>
        )}
      </div>

      <button
        onClick={reset}
        className="w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]"
      >
        Reset
      </button>
    </div>
  )
}
