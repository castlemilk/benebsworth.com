'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Pause, Play, RotateCcw, ScanLine } from 'lucide-react'
import type { SpatialLesson } from '@/lib/lab/spatial/types'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'
import { SpatialScene } from './scene'
import type { CameraView } from './fallback'

const TAU = 2 * Math.PI
const SPATIAL_DESK_LABEL: Record<string, string> = { engineering: 'electrical engineering', biology: 'life sciences', earth: 'earth & space' }
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-project'

export function SpatialWorkbench({ lesson }: { lesson: SpatialLesson }) {
  const id = useId()
  const root = useRef<HTMLElement>(null)
  const [params, setParams] = useState({ ...lesson.defaults })
  const [phase, setPhase] = useState(0)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [inView, setInView] = useState(false)
  const [visible, setVisible] = useState(true)
  const [view, setView] = useState<CameraView>('perspective')
  const [cameraReset, setCameraReset] = useState(0)
  const [projected, setProjected] = useState(false)
  const onFallback = useCallback(() => { setPlaying(false); setProjected(true) }, [])
  const scrolling = useScrollActivity(180)
  const running = playing && inView && visible && !scrolling
  const frame = useMemo(() => lesson.build(params, phase), [lesson, params, phase])
  const readouts = lesson.readouts(params)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 })
    const stage = root.current?.querySelector('[data-spatial-stage]')
    if (stage) observer.observe(stage)
    const onVisibility = () => setVisible(!document.hidden)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => { if (motion.matches) setPlaying(false) }
    document.addEventListener('visibilitychange', onVisibility)
    motion.addEventListener('change', onMotion)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); motion.removeEventListener('change', onMotion) }
  }, [])
  useEffect(() => {
    if (!running) return
    let raf = 0, last = 0
    const tick = (time: number) => {
      if (!last) last = time
      const dt = time - last
      if (dt >= 1000 / 30) { setPhase(old => (old + Math.min(dt, 80) / 1000 * 0.45) % TAU); last = time }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const reset = () => { setParams({ ...lesson.defaults }); setPhase(0); setPlaying(false); setView('perspective'); setCameraReset(value => value + 1) }

  return <section ref={root} aria-label={`${lesson.title} workbench`} data-workbench={lesson.slug} data-playing={playing} data-running={running} data-phase={phase.toFixed(4)} data-params={JSON.stringify(params)} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.19em] text-muted"><ScanLine size={13} aria-hidden /> Spatial notebook / {SPATIAL_DESK_LABEL[lesson.category] ?? lesson.category}</p>
        <h3 className="mt-2 font-display text-xl font-medium tracking-tight text-fg">{lesson.title}</h3>
      </div>
      <Link href={`/lab/${lesson.slug}/`} className="py-2 font-mono text-[11px] text-muted underline-offset-4 hover:underline">Open full lab ↗</Link>
    </div>
    <div data-spatial-stage className="relative h-[330px] overflow-hidden bg-[#080d18] sm:h-[460px]" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 40%, #15233b 0%, #080d18 72%)' }}>
      <SpatialScene frame={frame} title={lesson.title} view={view} cameraDistance={lesson.cameraDistance} cameraReset={cameraReset} onFallback={onFallback} />
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-300"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lesson.accent }} /> {playing ? 'Live model' : 'Inspecting frame'}</div>
      {!projected && <p className="pointer-events-none absolute bottom-4 right-4 hidden font-mono text-[10px] tracking-wide text-slate-400 sm:block">Drag to orbit · pinch to zoom</p>}
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[var(--color-border)] px-5 py-3" aria-label="Colour legend">
      {lesson.legend.map(item => <span key={item.label} className="flex items-center gap-2 text-xs text-fg/75"><span className="h-2 w-2 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />{item.label}</span>)}
    </div>
    <div className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}{playing ? 'Pause' : 'Play'}</button>
        <button className={buttonClass} onClick={reset}><RotateCcw size={14} aria-hidden />Reset experiment</button>
        <div className="flex flex-wrap gap-1 sm:ml-auto" aria-label="Camera views">
          {(['perspective', 'front', 'top'] as const).map(option => <button key={option} className={`${buttonClass} ${view === option ? 'bg-surface-2' : ''}`} aria-pressed={view === option} onClick={() => { setView(option); setCameraReset(value => value + 1) }}>{option === 'perspective' ? '3D view' : `${option[0].toUpperCase()}${option.slice(1)} view`}</button>)}
        </div>
      </div>
      <label className="grid gap-2 text-xs text-fg/80" htmlFor={`${id}-phase`}>
        <span className="flex justify-between gap-3"><span>Animation timeline</span><output aria-live="off" className="font-mono tabular-nums">{Math.round(phase / TAU * 100)}%</output></span>
        <input id={`${id}-phase`} type="range" min={0} max={100} step={0.1} value={phase / TAU * 100} className="h-5 w-full accent-project" onChange={event => { setPlaying(false); setPhase(Number(event.target.value) / 100 * TAU) }} />
      </label>
      <p className="text-xs leading-relaxed text-muted">Time is slowed for inspection. Scrub to compare frames; each loop restarts the demonstration.</p>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {lesson.controls.map(control => <label key={control.key} className="grid gap-2 text-sm text-fg/80" htmlFor={`${id}-${control.key}`}>
          <span className="flex justify-between gap-3"><span>{control.label}</span><output className="shrink-0 font-mono text-xs tabular-nums">{Number(params[control.key].toFixed(3))}{control.unit ? ` ${control.unit}` : ''}</output></span>
          <input id={`${id}-${control.key}`} type="range" min={control.min} max={control.max} step={control.step} value={params[control.key]} className="h-5 w-full accent-project" onChange={event => { setPlaying(false); setParams(current => ({ ...current, [control.key]: Number(event.target.value) })) }} />
        </label>)}
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Experiment presets"><span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted">Try</span>{lesson.presets.map(preset => <button key={preset.label} className={buttonClass} onClick={() => { setParams({ ...lesson.defaults, ...preset.params }); setPhase(0); setPlaying(false) }}>{preset.label}</button>)}</div>
      <dl className="grid grid-cols-2 gap-4 border-y border-[var(--color-border)] py-5 sm:grid-cols-3" data-readouts aria-live="polite" aria-atomic="true">
        {readouts.map(item => <div key={item.label} className="min-w-0"><dt className="text-xs leading-relaxed text-muted">{item.label}</dt><dd className="mt-1 break-words font-mono text-base font-medium text-fg sm:text-lg">{item.value}</dd></div>)}
      </dl>
      <div className="grid gap-4 text-sm leading-relaxed sm:grid-cols-[1.4fr_1fr]">
        <p className="text-fg/85">{lesson.explanation}</p>
        <p className="border-l-2 border-[var(--color-border)] pl-4 text-muted"><span className="mb-1 block font-mono text-[10px] uppercase tracking-widest">Model boundary</span>{lesson.limitation}</p>
      </div>
    </div>
  </section>
}
