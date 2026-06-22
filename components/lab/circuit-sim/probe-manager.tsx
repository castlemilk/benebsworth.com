'use client'

import type { Probe } from '@/lib/lab/circuit-sim/types'

interface Props {
  probes: Probe[]
  onRename: (id: string, label: string) => void
  onColor: (id: string, color: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

/** Editable channel list — rename, recolour, show/hide, and remove probes. */
export function ProbeManager({ probes, onRename, onColor, onToggle, onRemove, onClear }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#5c8294]/70">
          Probes ({probes.length})
        </p>
        {probes.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] font-mono text-[#5c8294]/50 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {probes.length === 0 ? (
        <p className="text-[11px] font-mono text-[#5c8294]/50 leading-relaxed">
          Click a wire on the canvas to probe its voltage, or use the Inspector’s V / I / ΔV buttons.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {probes.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 rounded-md border border-[#13202c] bg-[#0a1118] px-1.5 py-1 ${
                p.visible ? '' : 'opacity-45'
              }`}
            >
              <input
                type="color"
                value={p.color}
                onChange={e => onColor(p.id, e.target.value)}
                title="Trace colour"
                aria-label={`${p.label} colour`}
                className="h-4 w-4 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <button
                onClick={() => onToggle(p.id)}
                title={p.visible ? 'Hide trace' : 'Show trace'}
                aria-label={p.visible ? `Hide ${p.label}` : `Show ${p.label}`}
                className="shrink-0 text-[11px] leading-none w-4 text-center"
                style={{ color: p.visible ? p.color : '#5c8294' }}
              >
                {p.visible ? '●' : '○'}
              </button>
              <input
                value={p.label}
                onChange={e => onRename(p.id, e.target.value)}
                aria-label={`Rename ${p.label}`}
                className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-[11px] font-mono text-[#cfe3ee]/90 focus:outline-none focus:bg-[#101822] rounded"
              />
              <span className="shrink-0 text-[9px] font-mono text-[#5c8294]/50">{p.unit}</span>
              <button
                onClick={() => onRemove(p.id)}
                aria-label={`Remove ${p.label}`}
                className="shrink-0 text-[11px] font-mono text-[#5c8294]/40 hover:text-red-400 px-0.5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
