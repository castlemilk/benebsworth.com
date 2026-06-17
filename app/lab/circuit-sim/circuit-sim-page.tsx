'use client'

import { useState, useCallback } from 'react'
import { useCircuitEditor } from '@/lib/lab/circuit-sim/use-circuit-editor'
import { CircuitCanvas } from '@/components/lab/circuit-sim/circuit-canvas'
import { ComponentPalette } from '@/components/lab/circuit-sim/component-palette'
import { Toolbar } from '@/components/lab/circuit-sim/toolbar'
import { AnalysisPanel } from '@/components/lab/circuit-sim/analysis-panel'
import { Inspector } from '@/components/lab/circuit-sim/inspector'

export function CircuitSimPage() {
  const editor = useCircuitEditor()
  const [showHelp, setShowHelp] = useState(false)
  const selectedComp = editor.circuit.components.find(c => c.id === editor.selectedId) ?? null

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
            const comp = selectedComp
            if (comp) editor.addProbe('nodeV', comp.nodeA)
          }}
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* ── Main layout: responsive grid ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Canvas column */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]" style={{ height: 'clamp(300px, 48vh, 620px)' }}>
            <CircuitCanvas
              circuit={editor.circuit}
              placingType={editor.placingType}
              wiringFrom={editor.wiringFrom}
              selectedId={editor.selectedId}
              probes={editor.probes}
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
              onAddProbe={editor.addProbe}
              onRemoveProbe={editor.removeProbe}
              onRotate={editor.rotateComponent}
            />
          </div>

          {/* Analysis: oscilloscope (transient) or Bode plot (AC) */}
          <AnalysisPanel
            mode={editor.analysisMode}
            onMode={editor.setAnalysisMode}
            probes={editor.probes}
            scopeSettings={editor.scopeSettings}
            dt={editor.dt}
            onScopeSettings={editor.setScopeSettings}
            onRemoveProbe={editor.removeProbe}
            bode={editor.bode}
            acOptions={editor.acOptions}
            onAcOptions={editor.setAcOptions}
          />

          {/* Inspector: value + source waveform editor + probes for the selected component */}
          <Inspector
            comp={selectedComp}
            onValue={editor.updateComponentValue}
            onWaveform={editor.updateComponentWaveform}
            onProbe={editor.addProbe}
            onToggleSwitch={editor.toggleSwitch}
          />
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
          Click a wire to probe its voltage · Click to select · Shift+click terminal to wire · Alt+click to rotate<br />
          Del to delete · Scroll / pinch to zoom · Middle-drag or one-finger-drag to pan · Esc to cancel
        </div>
      )}
    </div>
  )
}
