'use client'
import { GammaButton } from '@/components/gamma/GammaButton'
import { RangeSlider } from '@/components/gamma/RangeSlider'
import type { ControlSpec, Params, ParamValue } from '@/lib/lab/types'
import styles from './controls.module.css'

type Props = {
  variant?: 'panel' | 'editorial'
  specs: ControlSpec[]
  params: Params
  onChange: (key: string, value: ParamValue) => void
  onReset: () => void
  onCopy?: () => void
}

export function Controls({ specs, params, onChange, onReset, onCopy, variant = 'panel' }: Props) {
  return (
    <div className={variant === 'editorial'
      ? `${styles.editorial} border-t border-[var(--color-border)] bg-transparent pt-4 font-mono`
      : 'rounded-2xl border border-[var(--color-border)] bg-surface p-5 font-mono'}>
      <div className={variant === 'editorial' ? "mb-4 flex flex-wrap items-center justify-between gap-3" : "mb-4 flex items-center justify-between"}>
        <span className={variant === 'editorial' ? styles.label : "type-label text-muted"}>knobs</span>
        <div className="flex gap-2">
          {onCopy && <GammaButton variant="secondary" size="sm" onClick={onCopy} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-fg/70 hover:text-fg">⧉ copy</GammaButton>}
          <GammaButton variant="secondary" size="sm" onClick={onReset} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-fg/70 hover:text-fg">↺ reset</GammaButton>
        </div>
      </div>
      <div className={variant === 'editorial' ? styles.fields : "space-y-3"}>
        {specs.map((s, index) => (
          <div key={s.key} data-study-target={variant === 'editorial' && index === 0 ? '' : undefined}>
            {s.type === 'range' ? <RangeSlider label={s.label} min={s.min} max={s.max} step={s.step} value={Number(params[s.key])} onChange={value=>onChange(s.key,value)} /> : <label className="flex items-center justify-between gap-4 text-xs">
            <span className="text-fg/70">{s.label}</span>
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
          </label>}
          </div>
        ))}
      </div>
    </div>
  )
}
