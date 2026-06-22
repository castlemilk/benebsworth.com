'use client'

import { useEffect, useRef, useState } from 'react'
import type { CircuitComponent, ProbeKind, Waveform, WaveformKind } from '@/lib/lab/circuit-sim/types'
import { COMPONENT_LABELS } from '@/lib/lab/circuit-sim/types'

interface Props {
  comp: CircuitComponent | null
  onValue: (id: string, value: number) => void
  onWaveform: (id: string, partial: Partial<Waveform>) => void
  onProbe?: (kind: ProbeKind, ref: number | string) => void
  onToggleSwitch?: (id: string) => void
  /** Called when an editable field loses focus — closes the undo-coalescing window. */
  onEndEdit?: () => void
}

const VALUE_LABEL: Record<string, string> = {
  R: 'Resistance', L: 'Inductance', C: 'Capacitance', V: 'Voltage', I: 'Current',
}
const VALUE_UNIT: Record<string, string> = { R: 'Ω', L: 'H', C: 'F', V: 'V', I: 'A' }

const WAVE_KINDS: { kind: WaveformKind; label: string }[] = [
  { kind: 'dc', label: 'DC' },
  { kind: 'sine', label: 'Sine' },
  { kind: 'pulse', label: 'Pulse' },
  { kind: 'square', label: 'Square' },
]

export function Inspector({ comp, onValue, onWaveform, onProbe, onToggleSwitch, onEndEdit }: Props) {
  if (!comp) {
    return (
      <div className="rounded-xl border border-[#1b2a38] bg-[#0a1118] p-4">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#5c8294]/60">Inspector</p>
        <p className="mt-2 text-[11px] font-mono text-[#5c8294]/50 leading-relaxed">
          Select a component to edit its value or source waveform.
        </p>
      </div>
    )
  }

  const isSource = comp.type === 'V' || comp.type === 'I'
  const wf = comp.waveform
  const kind: WaveformKind = wf?.kind ?? 'dc'

  return (
    <div className="rounded-xl border border-[#1b2a38] bg-[#0a1118] p-4 flex flex-col gap-3" onBlur={() => onEndEdit?.()}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#5c8294]/70">Inspector</p>
        <span className="text-[10px] font-mono text-[#22c8ee]/80">{COMPONENT_LABELS[comp.type]} · {comp.id}</span>
      </div>

      {comp.type === 'GND' && (
        <p className="text-[11px] font-mono text-[#7aa0b2]/60">Reference node (0 V).</p>
      )}

      {comp.type === 'D' && (
        <p className="text-[11px] font-mono text-[#7aa0b2]/60">Ideal diode — triangle points anode → cathode (current flows that way when forward-biased).</p>
      )}

      {comp.type === 'OP' && (
        <p className="text-[11px] font-mono text-[#7aa0b2]/60">Ideal op-amp — inputs are a virtual short (+ top, − bottom); output is the right terminal. Wire feedback for a finite gain.</p>
      )}

      {comp.type === 'SW' && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#5c8294]/60">State</span>
          <button
            onClick={() => onToggleSwitch?.(comp.id)}
            className={`px-3 py-1 rounded text-[11px] font-mono border transition-colors ${
              comp.closed
                ? 'bg-[#67d98a]/15 text-[#67d98a] border-[#67d98a]/40'
                : 'bg-[#101822] text-[#7aa0b2]/70 border-[#1b2a38] hover:bg-[#142233]'
            }`}
          >
            {comp.closed ? '⊷ Closed' : '⊶ Open'}
          </button>
        </div>
      )}

      {(comp.type === 'R' || comp.type === 'L' || comp.type === 'C') && (
        <NumberField
          label={VALUE_LABEL[comp.type]}
          suffix={VALUE_UNIT[comp.type]}
          value={comp.value}
          onCommit={(n) => onValue(comp.id, n)}
        />
      )}

      {isSource && (
        <div className="flex flex-col gap-3">
          {/* Waveform kind selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#5c8294]/60">Waveform</span>
            <div className="grid grid-cols-4 gap-1">
              {WAVE_KINDS.map(({ kind: k, label }) => (
                <button
                  key={k}
                  onClick={() => onWaveform(comp.id, { kind: k })}
                  className={`px-1.5 py-1 rounded text-[10px] font-mono transition-colors border ${
                    kind === k
                      ? 'bg-[#22c8ee]/15 text-[#22c8ee] border-[#22c8ee]/40'
                      : 'bg-[#101822] text-[#7aa0b2]/70 border-transparent hover:bg-[#142233]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* DC: single value */}
          {kind === 'dc' && (
            <NumberField
              label={VALUE_LABEL[comp.type]}
              suffix={VALUE_UNIT[comp.type]}
              value={comp.value}
              onCommit={(n) => onValue(comp.id, n)}
            />
          )}

          {/* AC waveforms */}
          {kind !== 'dc' && wf && (
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Amplitude" suffix={VALUE_UNIT[comp.type]} value={wf.amplitude}
                onCommit={(n) => onWaveform(comp.id, { amplitude: n })} />
              <NumberField label="Offset" suffix={VALUE_UNIT[comp.type]} value={wf.offset}
                onCommit={(n) => onWaveform(comp.id, { offset: n })} />
              <NumberField label="Frequency" suffix="Hz" value={wf.freq}
                onCommit={(n) => onWaveform(comp.id, { freq: n })} />
              {kind === 'sine' ? (
                <NumberField label="Phase" suffix="rad" value={wf.phase} eng={false}
                  onCommit={(n) => onWaveform(comp.id, { phase: n })} />
              ) : (
                <NumberField label="Duty" suffix="0–1" value={wf.duty} eng={false}
                  onCommit={(n) => onWaveform(comp.id, { duty: Math.max(0, Math.min(1, n)) })} />
              )}
            </div>
          )}
        </div>
      )}

      {onProbe && comp.type !== 'GND' && (
        <div className="flex flex-col gap-1 border-t border-[#13202c] pt-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#5c8294]/60">Probe</span>
          <div className="grid grid-cols-4 gap-1">
            <ProbeButton label="V@A" onClick={() => onProbe('nodeV', comp.nodeA)} />
            <ProbeButton label="V@B" onClick={() => onProbe('nodeV', comp.nodeB)} />
            <ProbeButton label="I" onClick={() => onProbe('compI', comp.id)} />
            <ProbeButton label="ΔV" onClick={() => onProbe('compV', comp.id)} />
          </div>
        </div>
      )}
    </div>
  )
}

function ProbeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-1.5 py-1 rounded text-[10px] font-mono bg-[#101822] text-[#7aa0b2]/80 border border-transparent hover:bg-[#142233] hover:text-[#22c8ee] transition-colors"
    >
      {label}
    </button>
  )
}

// ── Engineering-notation number field ──────────────────────────────

function NumberField({
  label, value, onCommit, suffix, eng = true,
}: {
  label: string
  value: number
  onCommit: (n: number) => void
  suffix?: string
  eng?: boolean
}) {
  const [buf, setBuf] = useState(() => (eng ? formatEng(value) : trimNum(value)))
  const focused = useRef(false)

  // Re-sync from the canonical value only when the user isn't editing, so live
  // commits don't reformat (e.g. clobber "0.5" → "500m") mid-keystroke.
  useEffect(() => {
    if (!focused.current) setBuf(eng ? formatEng(value) : trimNum(value))
  }, [value, eng])

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-mono uppercase tracking-wider text-[#5c8294]/60">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={buf}
          onFocus={() => { focused.current = true }}
          onBlur={() => { focused.current = false; setBuf(eng ? formatEng(value) : trimNum(value)) }}
          onChange={(e) => {
            setBuf(e.target.value)
            const n = eng ? parseEng(e.target.value) : parseFloat(e.target.value)
            if (n !== null && isFinite(n)) onCommit(n)
          }}
          className="w-full min-w-0 px-2 py-1 text-[11px] font-mono bg-[#101822] border border-[#1b2a38] rounded text-[#cfe3ee] focus:outline-none focus:border-[#22c8ee]/60"
        />
        {suffix && <span className="text-[10px] font-mono text-[#5c8294]/60 shrink-0">{suffix}</span>}
      </div>
    </label>
  )
}

// ── Engineering notation helpers ───────────────────────────────────

const ENG: [number, string][] = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'],
]
const ENG_MULT: Record<string, number> = {
  p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9,
}

export function parseEng(s: string): number | null {
  const m = s.trim().match(/^(-?\d*\.?\d+)\s*([pnuµmkKMG]?)/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!isFinite(n)) return null
  return n * (ENG_MULT[m[2]] ?? 1)
}

export function formatEng(v: number): string {
  if (v === 0) return '0'
  const abs = Math.abs(v)
  for (const [f, s] of ENG) {
    if (abs >= f) return `${trimNum(v / f)}${s}`
  }
  return trimNum(v)
}

function trimNum(n: number): string {
  return parseFloat(n.toFixed(6)).toString()
}
