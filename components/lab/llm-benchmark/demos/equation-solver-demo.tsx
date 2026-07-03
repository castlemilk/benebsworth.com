'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#ef4444'

interface Step {
  title: string
  content: ReactNode
}

const STEPS: Step[] = [
  {
    title: 'System',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p>
          x<sup>2</sup> + y<sup>2</sup> = 25
        </p>
        <p>xy = 12</p>
      </div>
    ),
  },
  {
    title: 'Substitution',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p>
          Let s = x + y, so xy = p = 12 and x<sup>2</sup> + y<sup>2</sup> = s
          <sup>2</sup> − 2p.
        </p>
        <p className="text-[var(--color-muted)]">
          s<sup>2</sup> − 2(12) = 25
        </p>
      </div>
    ),
  },
  {
    title: 'Solve for s',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p>
          s<sup>2</sup> = 49
        </p>
        <p>
          s = 7 or s = −7
        </p>
      </div>
    ),
  },
  {
    title: 'Quadratic for roots',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p>For each s, x and y are roots of:</p>
        <p>
          t<sup>2</sup> − st + 12 = 0
        </p>
      </div>
    ),
  },
  {
    title: 'Roots when s = 7',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p>
          t = (7 ± √(49 − 48)) / 2 = (7 ± 1) / 2
        </p>
        <p className="text-[var(--color-fg)]">
          (x, y) = (3, 4) or (4, 3)
        </p>
      </div>
    ),
  },
  {
    title: 'Roots when s = −7',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p>
          t = (−7 ± √(49 − 48)) / 2 = (−7 ± 1) / 2
        </p>
        <p className="text-[var(--color-fg)]">
          (x, y) = (−3, −4) or (−4, −3)
        </p>
      </div>
    ),
  },
  {
    title: 'Solution pairs',
    content: (
      <div className="space-y-2 font-mono text-sm">
        <p className="text-[var(--color-fg)]">
          (3, 4), (4, 3), (−3, −4), (−4, −3)
        </p>
        <p className="text-[var(--color-muted)]">ordered pairs satisfy both equations</p>
      </div>
    ),
  },
]

export function EquationSolverDemo({ className = '' }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0)

  const paramsRef = useRef({ speed, playing })
  paramsRef.current = { speed, playing }

  const indexRef = useRef(stepIndex)
  indexRef.current = stepIndex

  const stepStartRef = useRef<number>(0)

  useEffect(() => {
    if (!wrapRef.current) return
    const wrap = wrapRef.current
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let onscreen = false

    const tick = (now: number) => {
      if (!stepStartRef.current) stepStartRef.current = now
      const { playing: isPlaying, speed: sp } = paramsRef.current
      const duration = 2500 / Math.max(0.25, sp)

      if (isPlaying && onscreen && !reduce) {
        const elapsed = now - stepStartRef.current
        const pct = Math.min(1, elapsed / duration)
        setProgress(pct)

        if (elapsed >= duration) {
          const next = indexRef.current + 1
          if (next < STEPS.length) {
            setStepIndex(next)
            stepStartRef.current = now
            setProgress(0)
          } else {
            setPlaying(false)
            setProgress(1)
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        onscreen = e.isIntersecting
      },
      { threshold: 0 },
    )
    io.observe(wrap)

    if (!reduce) raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx))
    setStepIndex(clamped)
    stepStartRef.current = 0
    setProgress(0)
  }

  const togglePlay = () => {
    if (stepIndex >= STEPS.length - 1 && !playing) {
      goTo(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
    stepStartRef.current = 0
  }

  const reset = () => {
    setPlaying(false)
    goTo(0)
  }

  return (
    <DemoFrame
      title="Equation Solver"
      accent={ACCENT}
      blurb="Step-by-step non-linear system solution"
      className={className}
      controls={
        <div className="flex items-center gap-3 font-mono text-[0.65rem]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-40"
              aria-label="Previous step"
            >
              ←
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? 'Pause' : stepIndex >= STEPS.length - 1 ? 'Replay' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => goTo(stepIndex + 1)}
              disabled={stepIndex === STEPS.length - 1}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-40"
              aria-label="Next step"
            >
              →
            </button>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            Reset
          </button>
          <label className="hidden items-center gap-1.5 text-[var(--color-muted)] sm:flex">
            speed
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-project w-16"
            />
            {speed.toFixed(2)}x
          </label>
        </div>
      }
    >
      <div ref={wrapRef} className="absolute inset-0 overflow-auto p-5">
        <div className="flex flex-col gap-4">
          {STEPS.map((step, i) => {
            const isActive = i === stepIndex
            const isPast = i < stepIndex
            const isFuture = i > stepIndex
            return (
              <div
                key={step.title}
                className={`rounded-xl border p-4 transition-opacity duration-300 ${
                  isActive
                    ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    : 'border-transparent opacity-60'
                } ${isFuture ? 'opacity-30' : ''}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold"
                    style={{
                      backgroundColor: isActive || isPast ? ACCENT : 'var(--color-surface-2)',
                      color: isActive || isPast ? '#fff' : 'var(--color-muted)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <h4 className={`text-xs font-semibold ${isActive ? 'text-[var(--color-fg)]' : 'text-[var(--color-muted)]'}`}>
                    {step.title}
                  </h4>
                </div>
                <div className="pl-7">{step.content}</div>
                {isActive && playing && (
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress * 100}%`,
                        backgroundColor: ACCENT,
                        transition: 'width 0.05s linear',
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </DemoFrame>
  )
}
