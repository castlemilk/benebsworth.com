'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCircuitEditor } from '@/lib/lab/circuit-sim/use-circuit-editor'
import { CircuitCanvas } from '@/components/lab/circuit-sim/circuit-canvas'
import { ComponentPalette } from '@/components/lab/circuit-sim/component-palette'
import { Toolbar } from '@/components/lab/circuit-sim/toolbar'
import { ScopeCanvas } from '@/components/lab/circuit-sim/scope-canvas'
import type { CircuitComponent } from '@/lib/lab/circuit-sim/types'
import { formatValue } from '@/lib/lab/circuit-sim/types'

export function CircuitSimPage() {
  const editor = useCircuitEditor()
  const [editingComp, setEditingComp] = useState<CircuitComponent | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const comp = editor.selectedId
      ? editor.circuit.components.find(c => c.id === editor.selectedId)
      : null
    if (comp && comp.id !== editingComp?.id) {
      setEditingComp(comp)
      setEditValue(String(comp.value))
    }
    if (!comp) setEditingComp(null)
  }, [editor.selectedId])

  const handleValueSubmit = useCallback(() => {
    if (editingComp) {
      const val = parseFloat(editValue)
      if (!isNaN(val) && val > 0) {
        editor.updateComponentValue(editingComp.id, val)
        setEditingComp(null)
      }
      // If invalid, keep editor open so user can fix
    }
  }, [editingComp, editValue, editor])

  const handlePanZoom = useCallback((px: number, py: number, z: number) => {
    editor.setPan(px, py)
    editor.setZoom(z)
  }, [editor])

  const handleCopyYaml = useCallback((yaml: string) => {
    navigator.clipboard?.writeText(yaml).catch(() => {})
  }, [])

  const handleLoadSample = useCallback((yaml: string) => {
    editor.resetSimulation()
    editor.importYaml(yaml)
  }, [editor])

  const sidebar = (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]/30">
        <Toolbar
          running={editor.sim?.running ?? false}
          simTime={editor.sim?.time ?? 0}
          dt={editor.dt}
          simDuration={editor.simDuration}
          errors={editor.errors}
          onRun={editor.runSimulation}
          onStop={editor.stopSimulation}
          onReset={editor.resetSimulation}
          onDtChange={editor.setDt}
          onDurationChange={editor.setSimDuration}
          onExportYaml={editor.exportYaml}
          onImportYaml={editor.importYaml}
          onCopyYaml={handleCopyYaml}
          onLoadSample={handleLoadSample}
        />
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]/30">
        <ComponentPalette
          activeType={editor.placingType}
          selectedId={editor.selectedId}
          onSelect={editor.setPlacingType}
          onDelete={() => editor.selectedId && editor.deleteComponent(editor.selectedId)}
          onRotate={() => editor.selectedId && editor.rotateComponent(editor.selectedId)}
          onProbe={() => {
            if (editor.selectedId) {
              const comp = editor.circuit.components.find(c => c.id === editor.selectedId)
              if (comp) editor.addScopeProbe(comp.nodeA)
            }
          }}
        />
      </div>
      {editor.scopeTraces.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]/30 p-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg)]/40 px-1 mb-1">Probes</p>
          {editor.scopeTraces.map((trace, i) => (
            <div key={trace.nodeId} className="flex items-center justify-between px-2 py-1 rounded hover:bg-[var(--color-stage)]/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: trace.color }} />
                <span className="text-[10px] font-mono text-[var(--color-fg)]/60">CH{i + 1} · N{trace.nodeId}</span>
              </div>
              <button onClick={() => editor.removeScopeProbe(trace.nodeId)} className="text-[10px] font-mono text-[var(--color-fg)]/30 hover:text-red-400">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* ── Main layout: responsive grid ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        {/* Canvas column */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-col" style={{ height: 'clamp(300px, 50vh, 650px)' }}>
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-[var(--color-border)]">
              <CircuitCanvas
                circuit={editor.circuit}
                placingType={editor.placingType}
                wiringFrom={editor.wiringFrom}
                selectedId={editor.selectedId}
                scopeTraces={editor.scopeTraces}
                sim={editor.sim}
                panX={editor.panX}
                panY={editor.panY}
                zoom={editor.zoom}
                onPlaceComponent={editor.placeComponent}
                onSelectComponent={(id) => { editor.setPlacingType(null); editor.selectComponent(id) }}
                onMoveComponent={editor.moveComponent}
                onDeleteComponent={editor.deleteComponent}
                onStartWire={editor.startWire}
                onCompleteWire={editor.completeWire}
                onCancelWiring={editor.cancelWiring}
                onCancelPlacing={() => editor.setPlacingType(null)}
                onPanZoom={handlePanZoom}
                onAddProbe={editor.addScopeProbe}
                onRemoveProbe={editor.removeScopeProbe}
                onRotate={editor.rotateComponent}
              />
            </div>
            {/* Scope */}
            <div className={`overflow-hidden transition-all duration-300 ease-out rounded-b-xl ${editor.scopeTraces.length > 0 ? 'h-[150px]' : 'h-[32px]'}`}>
              <ScopeCanvas traces={editor.scopeTraces} simTime={editor.sim?.time ?? 0} />
            </div>
          </div>

          {/* Value editor */}
          {editingComp && (
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-stage)]/50 flex-wrap">
              <span className="text-xs font-mono text-[var(--color-fg)]/50">
                {editingComp.type === 'R' ? 'Ω' : editingComp.type === 'L' ? 'L' : editingComp.type === 'C' ? 'C' : editingComp.type === 'V' ? 'V' : 'GND'}
              </span>
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleValueSubmit(); if (e.key === 'Escape') setEditingComp(null) }}
                onBlur={handleValueSubmit}
                className="w-20 sm:w-24 px-2 py-1 text-xs font-mono bg-[var(--color-stage)] border border-[var(--color-border)] rounded text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-xs font-mono text-[var(--color-fg)]/40">{formatValue(editingComp.type, editingComp.value)}</span>
              <span className="text-[9px] sm:text-[10px] font-mono text-[var(--color-fg)]/30 ml-auto hidden sm:inline">Enter · Esc to cancel</span>
            </div>
          )}
        </div>

        {/* Sidebar: right column on lg+, below on mobile */}
        {sidebar}
      </div>

      {/* Help toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-[10px] font-mono text-[var(--color-fg)]/15 hover:text-[var(--color-fg)]/40 transition-colors"
        >
          {showHelp ? 'Hide shortcuts ↑' : 'Keyboard shortcuts ?'}
        </button>
      </div>
      {showHelp && (
        <div className="text-center text-[10px] font-mono text-[var(--color-fg)]/20 leading-relaxed">
          Click to select · Shift+click terminal to wire · Alt+click to rotate · P to probe<br />
          Del to delete · Scroll to zoom · Middle-drag to pan · Esc to cancel
        </div>
      )}
    </div>
  )
}
