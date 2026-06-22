'use client'

import type { ComponentType } from '@/lib/lab/circuit-sim/types'
import { COMPONENT_LABELS } from '@/lib/lab/circuit-sim/types'
import { DRAG_MIME } from './circuit-canvas'

const COMPONENTS: { type: ComponentType; icon: string }[] = [
  { type: 'R', icon: 'Ω' },
  { type: 'L', icon: 'L' },
  { type: 'C', icon: 'C' },
  { type: 'V', icon: 'V' },
  { type: 'I', icon: '⊙' },
  { type: 'D', icon: '◢' },
  { type: 'SW', icon: '⊶' },
  { type: 'OP', icon: '▷' },
  { type: 'GND', icon: '⏚' },
]

interface Props {
  activeType: ComponentType | null
  selectedId: string | null
  onSelect: (type: ComponentType | null) => void
  onDelete: () => void
  onRotate: () => void
  onProbe: () => void
  onDuplicate?: () => void
}

export function ComponentPalette({ activeType, selectedId, onSelect, onDelete, onRotate, onProbe, onDuplicate }: Props) {
  return (
    <div className="flex flex-col gap-2 p-2">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg)]/40 px-1">
        Components
      </p>
      <div className="flex flex-col gap-1">
        {COMPONENTS.map(({ type, icon }) => (
          <button
            key={type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, type)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => onSelect(activeType === type ? null : type)}
            title={`Click then tap canvas, or drag onto the canvas`}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-colors cursor-grab active:cursor-grabbing
              ${activeType === type
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'bg-[var(--color-stage)]/50 text-[var(--color-fg)]/60 border border-transparent hover:bg-[var(--color-stage)] hover:text-[var(--color-fg)]/80'
              }`}
          >
            <span className="text-sm">{icon}</span>
            <span>{COMPONENT_LABELS[type]}</span>
          </button>
        ))}
      </div>
      <hr className="my-2 border-[var(--color-border)]" />
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg)]/40 px-1">
        Selected
      </p>
      <div className="flex flex-col gap-1">
        <button
          onClick={onDelete}
          disabled={!selectedId}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500/20 transition-colors"
        >
          Delete (Del)
        </button>
        <button
          onClick={onRotate}
          disabled={!selectedId}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[var(--color-stage)]/50 text-[var(--color-fg)]/60 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-stage)] hover:text-[var(--color-fg)]/80 transition-colors"
        >
          Rotate (R)
        </button>
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            disabled={!selectedId}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[var(--color-stage)]/50 text-[var(--color-fg)]/60 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-stage)] hover:text-[var(--color-fg)]/80 transition-colors"
          >
            Duplicate (⌘D)
          </button>
        )}
        <button
          onClick={onProbe}
          disabled={!selectedId}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500/20 transition-colors"
        >
          Probe (P)
        </button>
      </div>
    </div>
  )
}
