'use client'

import { useCallback, useRef } from 'react'
import type { CircuitDiagnostic } from '@/lib/lab/circuit-sim/validator'

interface Props {
  running: boolean
  simTime: number
  dt: number
  simDuration: number
  errors: CircuitDiagnostic[]
  onRun: () => void
  onStop: () => void
  onReset: () => void
  onDtChange: (dt: number) => void
  onDurationChange: (dur: number) => void
  onExportYaml: () => string
  onImportYaml: (yaml: string) => boolean
  onCopyYaml: (yaml: string) => void
  onOpenGallery: () => void
  onShare: () => void
}

const DT_PRESETS = [
  { label: '1µs', value: 1e-6 },
  { label: '10µs', value: 1e-5 },
  { label: '100µs', value: 1e-4 },
  { label: '1ms', value: 1e-3 },
]

const DURATION_PRESETS = [
  { label: '10ms', value: 0.01 },
  { label: '100ms', value: 0.1 },
  { label: '500ms', value: 0.5 },
  { label: '1s', value: 1 },
]

export function Toolbar({
  running, simTime, dt, simDuration, errors,
  onRun, onStop, onReset, onDtChange, onDurationChange,
  onExportYaml, onImportYaml, onCopyYaml, onOpenGallery, onShare,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = useCallback(() => {
    const yaml = onExportYaml()
    const blob = new Blob([yaml], { type: 'application/x-yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'circuit.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }, [onExportYaml])

  const handleLoad = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportYaml(reader.result)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [onImportYaml])

  const handleCopy = useCallback(() => {
    const yaml = onExportYaml()
    onCopyYaml(yaml)
  }, [onExportYaml, onCopyYaml])

  return (
    <div className="flex flex-col gap-2">
      {/* Run / Stop / Reset */}
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center gap-2">
          <button
            onClick={running ? onStop : onRun}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors
              ${running
                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
          >
            {running ? '■ Stop' : '▶ Run'}
          </button>
          <button
            onClick={onReset}
            disabled={running}
            className="px-4 py-1.5 rounded-lg text-xs font-mono bg-[var(--color-stage)]/50 text-[var(--color-fg)]/60 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-stage)] transition-colors"
          >
            ↺ Reset
          </button>
        </div>
        {running && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-1 rounded-full bg-[var(--color-stage)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-100"
                style={{ width: `${Math.min(100, (simTime / simDuration) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-[var(--color-accent)] tabular-nums">
              {simTime >= 0.001
                ? `${(simTime * 1000).toFixed(0)}ms`
                : `${(simTime * 1e6).toFixed(0)}µs`}
            </span>
          </div>
        )}
      </div>

      {/* Library */}
      <div className="px-2">
        <button
          onClick={onOpenGallery}
          className="w-full px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border bg-[var(--color-stage)]/30 text-[var(--color-fg)]/50 border-transparent hover:bg-[var(--color-stage)]"
        >
          📚 Circuit library…
        </button>
      </div>

      {/* Timestep */}
      <div className="flex flex-col gap-1 px-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg)]/40">Timestep</p>
        <div className="flex gap-1">
          {DT_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onDtChange(p.value)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors
                ${dt === p.value
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'bg-[var(--color-stage)]/30 text-[var(--color-fg)]/50 border border-transparent hover:bg-[var(--color-stage)]'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1 px-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg)]/40">Duration</p>
        <div className="flex gap-1">
          {DURATION_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onDurationChange(p.value)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors
                ${simDuration === p.value
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'bg-[var(--color-stage)]/30 text-[var(--color-fg)]/50 border border-transparent hover:bg-[var(--color-stage)]'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save / Load */}
      <hr className="mx-2 border-[var(--color-border)]" />
      <div className="flex flex-col gap-1 px-2 pb-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg)]/40">Design</p>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--color-stage)]/30 text-[var(--color-fg)]/50 border border-transparent hover:bg-[var(--color-stage)] transition-colors"
          >
            Download YAML
          </button>
          <button
            onClick={handleLoad}
            className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--color-stage)]/30 text-[var(--color-fg)]/50 border border-transparent hover:bg-[var(--color-stage)] transition-colors"
          >
            Load YAML
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--color-stage)]/30 text-[var(--color-fg)]/50 border border-transparent hover:bg-[var(--color-stage)] transition-colors"
        >
          Copy to clipboard
        </button>
        <button
          onClick={onShare}
          className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/25 hover:bg-[var(--color-accent)]/20 transition-colors"
        >
          🔗 Copy share link
        </button>
        <input ref={fileRef} type="file" accept=".yaml,.yml" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Validation diagnostics */}
      {errors.length > 0 && (
        <div className="mx-2 mb-2 flex flex-col gap-1">
          {errors.map((d, i) => {
            const isError = d.severity === 'error'
            const isWarn = d.severity === 'warning'
            return (
              <div
                key={i}
                className={`p-2 rounded-lg text-[10px] font-mono leading-relaxed border
                  ${isError ? 'bg-red-500/5 border-red-500/15 text-red-400' : ''}
                  ${isWarn ? 'bg-amber-500/5 border-amber-500/15 text-amber-400' : ''}
                  ${!isError && !isWarn ? 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]/10 text-[var(--color-fg)]/50' : ''}`}
              >
                <span className="uppercase tracking-wider mr-1.5 opacity-60">[{d.code}]</span>
                {d.message}
                {d.nodes.length > 0 && (
                  <span className="block mt-0.5 opacity-50">
                    nodes: {d.nodes.join(', ')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
