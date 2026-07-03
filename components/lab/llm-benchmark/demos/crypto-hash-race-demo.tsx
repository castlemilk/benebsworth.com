'use client'

import { useEffect, useRef, useState } from 'react'
import { DemoFrame } from './demo-frame'

const ACCENT = '#10b981'
const PRESETS = [
  { label: 'Match', target: 'hunter2', candidate: 'hunter2' },
  { label: 'Mismatch first char', target: 'hunter2', candidate: 'xunter2' },
  { label: 'Mismatch last char', target: 'hunter2', candidate: 'hunter3' },
  { label: 'Longer', target: 'correct-horse-battery-staple', candidate: 'correct-horse-battery-stable' },
]

export function CryptoHashRaceDemo({ className = '' }: { className?: string }) {
  const [target, setTarget] = useState('hunter2')
  const [candidate, setCandidate] = useState('xunter2')
  const [running, setRunning] = useState(false)
  const [earlyProgress, setEarlyProgress] = useState(0)
  const [constantProgress, setConstantProgress] = useState(0)
  const [earlyTime, setEarlyTime] = useState<number | null>(null)
  const [constantTime, setConstantTime] = useState<number | null>(null)
  const [winner, setWinner] = useState<'early' | 'constant' | null>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const reset = () => {
    abortRef.current = true
    setRunning(false)
    setEarlyProgress(0)
    setConstantProgress(0)
    setEarlyTime(null)
    setConstantTime(null)
    setWinner(null)
  }

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const runRace = async () => {
    if (running) return
    reset()
    await sleep(50)
    abortRef.current = false
    setRunning(true)

    const startEarly = performance.now()
    const earlyLen = Math.max(target.length, candidate.length)
    for (let i = 0; i < earlyLen; i++) {
      if (abortRef.current) return
      setEarlyProgress(((i + 1) / earlyLen) * 100)
      if ((target[i] ?? '') !== (candidate[i] ?? '')) {
        break
      }
      await sleep(18)
    }
    const endEarly = performance.now()
    setEarlyTime(endEarly - startEarly)

    const startConstant = performance.now()
    const constantLen = Math.max(target.length, candidate.length)
    for (let i = 0; i < constantLen; i++) {
      if (abortRef.current) return
      setConstantProgress(((i + 1) / constantLen) * 100)
      await sleep(18)
    }
    const endConstant = performance.now()
    setConstantTime(endConstant - startConstant)

    setWinner(endEarly - startEarly < endConstant - startConstant ? 'early' : 'constant')
    setRunning(false)
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    reset()
    setTarget(preset.target)
    setCandidate(preset.candidate)
  }

  return (
    <DemoFrame
      title="Constant-Time Compare"
      accent={ACCENT}
      blurb="Timing-safe comparison vs early-exit lookup"
      className={className}
      controls={
        <div className="flex items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono text-[0.6rem] text-[var(--color-muted)] transition hover:border-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex h-full min-h-[220px] flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 font-mono text-[0.65rem] text-[var(--color-muted)]">
            Target secret
            <input
              type="text"
              value={target}
              disabled={running}
              onChange={(e) => {
                reset()
                setTarget(e.target.value)
              }}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 font-mono text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-muted)] disabled:opacity-60"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[0.65rem] text-[var(--color-muted)]">
            Candidate
            <input
              type="text"
              value={candidate}
              disabled={running}
              onChange={(e) => {
                reset()
                setCandidate(e.target.value)
              }}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 font-mono text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-muted)] disabled:opacity-60"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[0.65rem] text-[var(--color-muted)]">
              <span>Early-exit compare</span>
              <span>{earlyTime !== null ? `${earlyTime.toFixed(2)} ms` : running && earlyProgress > 0 ? '…' : '-'}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${earlyProgress}%`,
                  backgroundColor: earlyProgress === 100 || (earlyTime !== null && winner !== 'early') ? ACCENT : '#ef4444',
                }}
              />
            </div>
            <p className="font-mono text-[0.6rem] text-[var(--color-muted)]">
              Stops at first mismatch — fast but leaks information about prefix length.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[0.65rem] text-[var(--color-muted)]">
              <span>Constant-time compare</span>
              <span>{constantTime !== null ? `${constantTime.toFixed(2)} ms` : running && constantProgress > 0 ? '…' : '-'}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{ width: `${constantProgress}%`, backgroundColor: ACCENT }}
              />
            </div>
            <p className="font-mono text-[0.6rem] text-[var(--color-muted)]">
              Always scans the full length — independent of input, safer against timing attacks.
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={runRace}
            disabled={running || target.length === 0}
            className="rounded-md px-4 py-2 font-mono text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {running ? 'Racing…' : 'Race comparisons'}
          </button>

          {winner && !running && (
            <span
              className="font-mono text-xs"
              style={{ color: winner === 'early' ? '#ef4444' : ACCENT }}
            >
              {winner === 'early' ? 'Early-exit won (and leaked)' : 'Constant-time finished last (safely)'}
            </span>
          )}
        </div>
      </div>
    </DemoFrame>
  )
}
