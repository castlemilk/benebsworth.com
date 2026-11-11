'use client'
import { RotateCcw, Link2 } from 'lucide-react'
import { GammaButton } from '@/components/gamma/GammaButton'
import { RangeSlider } from '@/components/gamma/RangeSlider'
import type { ControlSpec, Params, ParamValue } from '@/lib/lab/types'
import { CategoryIcon } from './category-icon'
import styles from './controls.module.css'

type Props = {
  variant?: 'panel' | 'editorial'
  title?: string
  category?: string
  specs: ControlSpec[]
  params: Params
  onChange: (key: string, value: ParamValue) => void
  onReset: () => void
  onCopy?: () => void
}

export function Controls({ specs, params, onChange, onReset, onCopy, title, category, variant = 'panel' }: Props) {
  const editorial = variant === 'editorial'
  const actions = <div className={editorial ? styles.actions : 'flex gap-2'}>
    <GammaButton variant="quiet" size="sm" onClick={onReset}>{editorial && <RotateCcw size={14} aria-hidden="true" />}{editorial ? 'Reset' : '↺ reset'}</GammaButton>
    {onCopy && <GammaButton variant="quiet" size="sm" onClick={onCopy}>{editorial && <Link2 size={14} aria-hidden="true" />}{editorial ? 'Copy link' : '⧉ copy'}</GammaButton>}
  </div>
  return (
    <div className={variant === 'editorial'
      ? `${styles.editorial} font-mono`
      : 'rounded-2xl border border-[var(--color-border)] bg-surface p-5 font-mono'}>
      <div className={editorial ? styles.header : "mb-4 flex items-center justify-between"}>
        <div><span className={editorial ? styles.label : "type-label text-muted"}>{editorial ? 'Parameters' : 'knobs'}</span>{editorial && title && <p className={styles.subtitle}>{title}</p>}</div>
        {editorial && category && <CategoryIcon category={category} fallback="" size={30} />}
        {!editorial && actions}
      </div>
      <div className={variant === 'editorial' ? styles.fields : "space-y-3"}>
        {specs.map((s, index) => (
          <div key={s.key} className={variant === 'editorial' ? styles.field : undefined} data-control-type={s.type} data-study-target={variant === 'editorial' && index === 0 ? '' : undefined}>
            {editorial && s.group && (index === 0 || specs[index - 1].group !== s.group) && <h3 className={styles.group}>{s.group}</h3>}
            {s.type === 'range' ? <RangeSlider label={s.label} formatValue={editorial && s.unit ? value => `${value} ${s.unit}` : undefined} min={s.min} max={s.max} step={s.step} value={Number(params[s.key])} onChange={value=>onChange(s.key,value)} /> : <label className="flex items-center justify-between gap-4 text-xs">
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
      {editorial && actions}
    </div>
  )
}
