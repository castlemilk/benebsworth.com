'use client'

import type { Dispatch, SetStateAction } from 'react'
import { APPEARANCE_PRESETS, DEFAULT_APPEARANCE, activePreset, inksFor, lowContrastInks, presetAppearance, type Appearance } from '@/lib/generative-svg/render'
import styles from './gallery.module.css'

export function StyleLab({ appearance, setAppearance }: { appearance: Appearance; setAppearance: Dispatch<SetStateAction<Appearance>> }) {
  const lowContrast = lowContrastInks(appearance)
  return (
    <fieldset className={styles.appearance}>
      <legend>Appearance</legend>
      <p className={styles.labHint}>Start with a preset, then tune the drawing. Your geometry stays put.</p>
      <label>Style preset
        <select value={activePreset(appearance)} onChange={e => setAppearance(presetAppearance(e.target.value, appearance.theme))}>
          {APPEARANCE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          <option value="custom" disabled>Custom</option>
        </select>
      </label>
      <label>Ink
        <select value={appearance.palette} onChange={e => setAppearance(current => {
          const palette = e.target.value as Appearance['palette'], inks = inksFor(current)
          return { ...current, palette, ...(palette === 'custom' ? { inkColor: inks.ink, accentColor: inks.accent } : {}) }
        })}>
          <option value="folio">Graphite + red</option><option value="monochrome">Monochrome</option><option value="custom">Custom colors</option>
        </select>
      </label>
      <label>Preview surface
        <select value={appearance.theme} onChange={e => setAppearance(a => ({ ...a, theme: e.target.value as Appearance['theme'] }))}>
          <option value="light">Paper</option><option value="dark">Night</option>
        </select>
      </label>
      <label className={styles.weight}>Line weight
        <input type="range" min="1.5" max="4" step="0.1" value={appearance.weight} onChange={e => setAppearance(a => ({ ...a, weight: Number(e.target.value) }))} />
        <output>{appearance.weight.toFixed(1)}</output>
      </label>
      <label className={styles.checkbox}><input type="checkbox" checked={appearance.guides} onChange={e => setAppearance(a => ({ ...a, guides: e.target.checked }))} />Construction lines</label>
      <button type="button" onClick={() => setAppearance(DEFAULT_APPEARANCE)}>Reset appearance</button>
      {appearance.palette === 'custom' && <div className={styles.customInks}>
        <label className={styles.colorControl}><span>Drawing ink</span><input aria-label="Drawing ink" type="color" value={appearance.inkColor} onChange={e => setAppearance(a => ({ ...a, inkColor: e.target.value }))} /><output aria-hidden="true">{appearance.inkColor}</output></label>
        <label className={styles.colorControl}><span>Accent ink</span><input aria-label="Accent ink" type="color" value={appearance.accentColor} onChange={e => setAppearance(a => ({ ...a, accentColor: e.target.value }))} /><output aria-hidden="true">{appearance.accentColor}</output></label>
        <p>Custom inks stay unchanged when you switch surfaces.</p>
      </div>}
      <details className={styles.tuning}>
        <summary>Fine tune strokes</summary>
        <div>
          <label>Line ends<select value={appearance.linecap} onChange={e => setAppearance(a => ({ ...a, linecap: e.target.value as Appearance['linecap'] }))}><option value="round">Round</option><option value="butt">Flat</option></select></label>
          <label className={styles.weight}>Guide opacity<input type="range" min="0.2" max="1" step="0.1" disabled={!appearance.guides} value={appearance.guideOpacity} onChange={e => setAppearance(a => ({ ...a, guideOpacity: Number(e.target.value) }))} /><output>{Math.round(appearance.guideOpacity * 100)}%</output></label>
          <label className={styles.weight}>Selection emphasis<input type="range" min="1.25" max="2" step="0.05" value={appearance.emphasis} onChange={e => setAppearance(a => ({ ...a, emphasis: Number(e.target.value) }))} /><output>{appearance.emphasis.toFixed(2)}×</output></label>
        </div>
        <p>Emphasis affects selected graph nodes and marked states. It never moves points or changes the model.</p>
      </details>
      <p role="status" aria-label="Ink contrast" className={styles.contrast}>{lowContrast.length ? `Low contrast: ${lowContrast.join(' and ')} may be hard to read on this surface. Choose another color or reset appearance.` : 'Drawing inks have at least 4.5:1 contrast against the selected surface.'}</p>
    </fieldset>
  )
}
