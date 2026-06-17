'use client'
import type { ControlSpec, Params, ParamValue } from '@/lib/lab/types'

type Props = {
  specs: ControlSpec[]
  params: Params
  onChange: (key: string, value: ParamValue) => void
  onReset: () => void
  onCopy: () => void
}

export function Controls({ specs, params, onChange, onReset, onCopy }: Props) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-surface p-5 font-mono">
      <div className="mb-4 flex items-center justify-between">
        <span className="type-label text-muted">knobs</span>
        <div className="flex gap-2">
          <button onClick={onCopy} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-fg/70 hover:text-fg">⧉ copy</button>
          <button onClick={onReset} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-fg/70 hover:text-fg">↺ reset</button>
        </div>
      </div>
      <div className="space-y-3">
        {specs.map((s) => (
          <label key={s.key} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-fg/70">{s.label}</span>
            {s.type === 'range' && (
              <span className="flex items-center gap-2">
                <input type="range" min={s.min} max={s.max} step={s.step} value={Number(params[s.key])}
                  onChange={(e) => onChange(s.key, Number(e.target.value))} className="accent-project" />
                <span className="w-10 text-right tabular-nums text-muted">{Number(params[s.key])}</span>
              </span>
            )}
            {s.type === 'toggle' && (
              <input type="checkbox" checked={Boolean(params[s.key])} onChange={(e) => onChange(s.key, e.target.checked)} className="accent-project" />
            )}
            {s.type === 'color' && (
              <input type="color" value={String(params[s.key])} onChange={(e) => onChange(s.key, e.target.value)} className="h-6 w-10 rounded bg-transparent" />
            )}
            {s.type === 'select' && (
              <select value={String(params[s.key])} onChange={(e) => onChange(s.key, e.target.value)} className="rounded bg-surface-2 px-2 py-1 text-fg">
                {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
