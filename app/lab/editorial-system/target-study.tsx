'use client'

import { useState } from 'react'
import { GammaButton } from '@/components/gamma/GammaButton'
import { RangeSlider } from '@/components/gamma/RangeSlider'
import { InteractiveStudy } from '@/components/mdx/interactive-study'
import styles from './target-study.module.css'

const fields = [
  { id: 'amplitude', label: 'Amplitude', hint: 'Amplitude changes the height, not the spacing.', initial: 1, min: 0, max: 2 },
  { id: 'frequency', label: 'Frequency', hint: 'Frequency changes the spacing between peaks.', initial: 1, min: .2, max: 3 },
  { id: 'damping', label: 'Damping', hint: 'Damping changes how quickly the envelope falls.', initial: .6, min: 0, max: 2 },
] as const

/** Authoring specimen: changing the cue never changes the experiment. */
export function TargetStudy() {
  const [selected, setSelected] = useState(0)
  const [values, setValues] = useState<number[]>(fields.map(field => field.initial))
  const points = Array.from({ length: 241 }, (_, i) => {
    const x = i / 60
    return `${20 + x * 110},${110 - values[0] * Math.exp(-values[2] * x) * Math.sin(2 * Math.PI * values[1] * x) * 42}`
  }).join(' ')
  return <div className={styles.specimen}>
    <div className={styles.choices} role="group" aria-label="Choose a guide target">
      <span className={styles.label}>Guide target</span>
      {fields.map((field, index) => <GammaButton key={field.id} size="sm" variant="quiet" aria-pressed={selected === index} onClick={() => setSelected(index)}>{field.label}</GammaButton>)}
    </div>
    <InteractiveStudy title="One signal, three controls" hint={fields[selected].hint} targetSelector={`[data-signal-control="${fields[selected].id}"]`}>
      <svg className={styles.plot} role="img" aria-label="Illustrative damped signal" viewBox="0 0 480 220">
        <path d="M20 20V190H460 M20 110H460" stroke="currentColor" opacity=".3" fill="none" />
        <polyline points={points} fill="none" stroke="var(--blog)" strokeWidth="2" />
      </svg>
      <div className={styles.fields}>
        {fields.map((field, index) => <RangeSlider key={field.id} data-signal-control={field.id} label={field.label} min={field.min} max={field.max} step={.1} value={values[index]} formatValue={value => value.toFixed(1)} onChange={value => setValues(previous => previous.map((current, i) => i === index ? value : current))} />)}
      </div>
    </InteractiveStudy>
    <p className={styles.caption}>Illustrative model: y = A exp(−d x) sin(2π f x). Choose any guide target without changing its value. After editing, use Show guide to replay the cue.</p>
  </div>
}
