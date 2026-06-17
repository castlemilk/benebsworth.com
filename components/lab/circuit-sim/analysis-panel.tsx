'use client'

import type { AnalysisMode, Probe, ScopeSettings } from '@/lib/lab/circuit-sim/types'
import type { ACOptions, BodeResult } from '@/lib/lab/circuit-sim/ac'
import { ScopeCanvas } from './scope-canvas'
import { BodeCanvas } from './bode-canvas'

interface Props {
  mode: AnalysisMode
  onMode: (m: AnalysisMode) => void
  // Scope (transient)
  probes: Probe[]
  scopeSettings: ScopeSettings
  dt: number
  onScopeSettings: (partial: Partial<ScopeSettings>) => void
  onRemoveProbe: (id: string) => void
  // Bode (AC)
  bode: BodeResult | null
  acOptions: ACOptions
  onAcOptions: (partial: Partial<ACOptions>) => void
}

export function AnalysisPanel({
  mode, onMode, probes, scopeSettings, dt, onScopeSettings, onRemoveProbe, bode, acOptions, onAcOptions,
}: Props) {
  const tab = (m: AnalysisMode, label: string) => (
    <button
      onClick={() => onMode(m)}
      className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors border ${
        mode === m
          ? 'bg-[#22c8ee]/15 text-[#22c8ee] border-[#22c8ee]/40'
          : 'bg-[#0a1118] text-[#7aa0b2]/70 border-[#13202c] hover:bg-[#142233]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {tab('transient', '⎍ Transient')}
        {tab('ac', '∿ AC Sweep')}
      </div>
      {mode === 'transient' ? (
        <ScopeCanvas probes={probes} settings={scopeSettings} dt={dt} onSettings={onScopeSettings} onRemoveProbe={onRemoveProbe} />
      ) : (
        <BodeCanvas bode={bode} acOptions={acOptions} onAcOptions={onAcOptions} />
      )}
    </div>
  )
}
