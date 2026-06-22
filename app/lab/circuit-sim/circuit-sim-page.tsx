'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCircuitEditor } from '@/lib/lab/circuit-sim/use-circuit-editor'
import { CircuitCanvas } from '@/components/lab/circuit-sim/circuit-canvas'
import { ComponentPalette } from '@/components/lab/circuit-sim/component-palette'
import { Toolbar } from '@/components/lab/circuit-sim/toolbar'
import { AnalysisPanel } from '@/components/lab/circuit-sim/analysis-panel'
import { Inspector } from '@/components/lab/circuit-sim/inspector'
import { GalleryDialog } from '@/components/lab/circuit-sim/gallery-dialog'
import { CircuitStudio } from '@/components/lab/circuit-sim/circuit-studio'
import { StarBorder, ShinyText } from '@/components/lab/circuit-sim/react-bits'
import { encodeCircuit, decodeShareYaml } from '@/lib/lab/circuit-sim/storage'

export function CircuitSimPage() {
  const editor = useCircuitEditor()
  const [showHelp, setShowHelp] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const selectedComp = editor.circuit.components.find(c => c.id === editor.selectedId) ?? null

  // Hydrate from a ?c= share link on first mount.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('c')
    if (!param) return
    const yaml = decodeShareYaml(param)
    if (yaml) editor.importYaml(yaml)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/lab/circuit-sim/?c=${encodeCircuit(editor.circuit)}`
    navigator.clipboard?.writeText(url).catch(() => {})
  }, [editor.circuit])

  const sidebar = (
    <div className="flex flex-col gap-3">
      <StarBorder color="#22c8ee" speed="4s" onClick={() => setStudioOpen(true)} className="w-full" title="Open the full-screen Studio workbench">
        <span className="flex w-full items-center gap-3 rounded-[15px] bg-gradient-to-br from-[#0a1018] to-[#101d28] px-3.5 py-3 border border-[#1b2a38] transition-colors group-hover:border-[#22c8ee]/45">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#22c8ee]/12 text-lg text-[#22c8ee] shadow-[0_0_14px_-3px_rgba(34,200,238,0.6)] transition-all group-hover:bg-[#22c8ee]/22 group-hover:shadow-[0_0_18px_-2px_rgba(34,200,238,0.85)]">
            ⤢
          </span>
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <ShinyText className="text-sm font-bold tracking-tight">Open Studio</ShinyText>
            <span className="font-mono text-[10px] text-[#7aa0b2]/70">
              Full-screen workbench
              <span aria-hidden className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1 text-[#22c8ee]/80">→</span>
            </span>
          </span>
        </span>
      </StarBorder>
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
          onOpenGallery={() => setShowGallery(true)}
          onShare={handleShare}
        />
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]/30">
        <ComponentPalette
          activeType={editor.placingType}
          selectedId={editor.selectedId}
          onSelect={editor.setPlacingType}
          onDelete={() => editor.selectedId && editor.deleteComponent(editor.selectedId)}
          onRotate={() => editor.selectedId && editor.rotateComponent(editor.selectedId)}
          onDuplicate={() => editor.selectedId && editor.duplicateComponent(editor.selectedId)}
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
          <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)]" style={{ height: 'clamp(300px, 48vh, 620px)' }}>
            {studioOpen ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#06090e] text-[var(--color-fg)]/40">
                <span className="font-mono text-2xl">⤢</span>
                <span className="font-mono text-xs">Studio open in fullscreen</span>
              </div>
            ) : (
              <CircuitCanvas
                circuit={editor.circuit}
                placingType={editor.placingType}
                wiringFrom={editor.wiringFrom}
                selectedId={editor.selectedId}
                probes={editor.probes}
                sim={editor.sim}
                dcOp={editor.dcOp}
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
                onEndInteraction={editor.endInteraction}
              />
            )}
          </div>

          {/* Analysis + Inspector — unmounted while the Studio owns them (avoids two
              live scope canvases redrawing the same probes every frame). */}
          {!studioOpen && (
            <>
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
                onEndEdit={editor.endInteraction}
              />
            </>
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
          Click a wire to probe its voltage · Click to select · Shift+click terminal to wire · Alt+click to rotate<br />
          Del to delete · Scroll / pinch to zoom · Middle-drag or one-finger-drag to pan · Esc to cancel<br />
          Drag a component from the palette onto the canvas · Pop out to Studio for the full workbench
        </div>
      )}

      <GalleryDialog
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onLoad={handleLoadSample}
        getCurrentYaml={editor.exportYaml}
      />

      {studioOpen && (
        <CircuitStudio
          editor={editor}
          onClose={() => setStudioOpen(false)}
          onShare={handleShare}
          onCopyYaml={handleCopyYaml}
        />
      )}
    </div>
  )
}
