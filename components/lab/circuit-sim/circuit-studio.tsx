'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CircuitEditor } from '@/lib/lab/circuit-sim/use-circuit-editor'
import type { ComponentType } from '@/lib/lab/circuit-sim/types'
import { componentNodes } from '@/lib/lab/circuit-sim/types'
import { CircuitCanvas } from './circuit-canvas'
import { ComponentPalette } from './component-palette'
import { Inspector } from './inspector'
import { AnalysisPanel } from './analysis-panel'
import { ProbeManager } from './probe-manager'
import { GalleryDialog } from './gallery-dialog'
import { StudioTour, type TourStep } from './studio-tour'

interface Props {
  editor: CircuitEditor
  onClose: () => void
  onShare: () => void
  onCopyYaml: (yaml: string) => void
}

/** First-run guided walkthrough of the studio surface (data-tour anchors below). */
const TOUR_STEPS: TourStep[] = [
  { title: 'Welcome to Circuit Studio', body: 'A full-screen workbench for building and simulating circuits. Here’s a 20-second tour — Skip anytime (Esc), or replay it later from the “?” in the top bar.' },
  { target: '[data-tour="transport"]', title: 'Transport', body: 'Run / Pause and single-Step the transient simulation, or Reset to t=0. Scrub Speed (0.25–4×); dt sets the timestep resolution and window sets the scope’s time span. Tip: Space runs, S steps.' },
  { target: '[data-tour="tools"]', title: 'Tools & file', body: 'Undo/redo every edit (⌘Z / ⌘⇧Z), toggle the live DC operating point, reset the view, open the circuit library, import/export YAML, copy a share link, go true-fullscreen, or close the studio.' },
  { target: '[data-tour="palette"]', title: 'Components', body: 'Drag a part onto the canvas — or click it then click the canvas, or press 1–9. The actions below delete, rotate, duplicate (⌘D), or probe the selected part.' },
  { target: '[data-tour="canvas"]', title: 'Schematic canvas', body: 'Place & move parts, Shift-click terminals to wire them, scroll or pinch to zoom, drag empty space to pan. Click any wire to probe its voltage.' },
  { target: '[data-tour="inspector"]', title: 'Inspector', body: 'Edit the selected component’s value, or shape a source’s waveform — DC, sine, pulse, or square.' },
  { target: '[data-tour="probes"]', title: 'Probes', body: 'Your oscilloscope channels. Rename, recolour, show/hide, or remove each probe here.' },
  { target: '[data-tour="scope"]', title: 'Analysis', body: 'A live oscilloscope (Transient) or Bode plot (AC). Freeze the trace, arm a trigger, or drop draggable Δt / ΔV measurement cursors.' },
  { target: '[data-tour="status"]', title: 'Status bar', body: 'Live circuit stats, the run state, zoom, validation, and a keyboard-shortcut cheat-sheet. That’s the tour — enjoy building!' },
]

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
// Number-key → component type (matches the palette order).
const KEY_TYPES: ComponentType[] = ['R', 'L', 'C', 'V', 'I', 'D', 'SW', 'OP', 'GND']

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const readNum = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback
  const v = Number(window.localStorage.getItem(key))
  return Number.isFinite(v) && v > 0 ? v : fallback
}

export function CircuitStudio({ editor, onClose, onShare, onCopyYaml }: Props) {
  const [mounted, setMounted] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [leftW, setLeftW] = useState(() => readNum('cs.studio.leftW', 184))
  const [rightW, setRightW] = useState(() => readNum('cs.studio.rightW', 312))
  const [bottomH, setBottomH] = useState(() => readNum('cs.studio.bottomH', 280))
  const [tourOpen, setTourOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Always read the freshest editor inside the (once-attached) key listener.
  const editorRef = useRef(editor)
  editorRef.current = editor
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => setMounted(true), [])

  // Lock body scroll + move focus into the dialog while the studio is open, and
  // restore focus to the trigger on close.
  useEffect(() => {
    const prev = document.body.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const id = requestAnimationFrame(() => rootRef.current?.focus())
    return () => {
      document.body.style.overflow = prev
      cancelAnimationFrame(id)
      prevFocus?.focus?.()
    }
  }, [])

  // Persist dock sizes.
  useEffect(() => { window.localStorage.setItem('cs.studio.leftW', String(leftW)) }, [leftW])
  useEffect(() => { window.localStorage.setItem('cs.studio.rightW', String(rightW)) }, [rightW])
  useEffect(() => { window.localStorage.setItem('cs.studio.bottomH', String(bottomH)) }, [bottomH])

  // Track real (OS) fullscreen state.
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // First-run guided tour — auto-opens once (until dismissed), after layout settles.
  useEffect(() => {
    if (window.localStorage.getItem('cs.studio.tourSeen') === '1') return
    const id = window.setTimeout(() => setTourOpen(true), 400)
    return () => window.clearTimeout(id)
  }, [])

  const closeTour = useCallback(() => {
    setTourOpen(false)
    try { window.localStorage.setItem('cs.studio.tourSeen', '1') } catch { /* private mode */ }
    rootRef.current?.focus()
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else rootRef.current?.requestFullscreen?.().catch(() => {})
  }, [])

  // Keyboard shortcuts (attached once; reads editor through the ref).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ed = editorRef.current
      const el = document.activeElement as HTMLElement | null
      const editable = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

      if (e.key === 'Escape') {
        if (ed.placingType) { ed.setPlacingType(null); return }
        if (ed.wiringFrom) { ed.cancelWiring(); return }
        if (showGallery) return // dialog handles its own Esc
        if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}); return }
        closeRef.current()
        return
      }
      if (editable) return

      const meta = e.metaKey || e.ctrlKey
      if (meta) {
        const k = e.key.toLowerCase()
        if (k === 'z') { e.preventDefault(); if (e.shiftKey) ed.redo(); else ed.undo() }
        else if (k === 'y') { e.preventDefault(); ed.redo() }
        else if (k === 'd') { e.preventDefault(); if (ed.selectedId) ed.duplicateComponent(ed.selectedId) }
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (ed.sim?.running) ed.stopSimulation(); else ed.runSimulation()
          break
        case 's': case 'S': ed.stepSimulation(); break
        case 'r': case 'R': if (ed.selectedId) ed.rotateComponent(ed.selectedId); break
        case 'o': case 'O': ed.setShowDcOverlay(!ed.showDcOverlay); break
        case 'f': case 'F': toggleFullscreen(); break
        case 'Delete': case 'Backspace': if (ed.selectedId) ed.deleteComponent(ed.selectedId); break
        case 'Escape': break
        default:
          if (e.key >= '1' && e.key <= '9') {
            const t = KEY_TYPES[Number(e.key) - 1]
            if (t) ed.setPlacingType(ed.placingType === t ? null : t)
          }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showGallery, toggleFullscreen])

  const handleLoadSample = useCallback((yaml: string) => {
    editor.resetSimulation()
    editor.importYaml(yaml)
  }, [editor])

  const selectedComp = editor.circuit.components.find(c => c.id === editor.selectedId) ?? null
  const running = editor.sim?.running ?? false

  // Status-bar derived stats.
  const nodeIds = new Set<number>()
  for (const c of editor.circuit.components) for (const n of componentNodes(c)) if (n > 0) nodeIds.add(n)
  const errCount = editor.errors.filter(e => e.severity === 'error').length
  const warnCount = editor.errors.filter(e => e.severity === 'warning').length

  if (!mounted) return null

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-[#06090e] text-[#cfe3ee] select-none outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Circuit Studio"
      data-testid="circuit-studio"
    >
      {/* ── Header row ─────────────────────────────────────────── */}
      <header data-tour="tools" className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#13202c] bg-[#080c12] px-3 py-2">
        <span className="font-mono text-sm text-[#22c8ee] mr-1">Ω</span>
        <span className="font-mono text-xs uppercase tracking-wider text-[#cfe3ee]/80">Circuit Studio</span>
        <div className="flex-1" />
        <IconBtn onClick={editor.undo} disabled={!editor.canUndo} title="Undo (⌘Z)">↶</IconBtn>
        <IconBtn onClick={editor.redo} disabled={!editor.canRedo} title="Redo (⌘⇧Z)">↷</IconBtn>
        <Divider />
        <ToggleBtn active={editor.showDcOverlay} onClick={() => editor.setShowDcOverlay(!editor.showDcOverlay)} title="DC operating point (O)">DC</ToggleBtn>
        <IconBtn onClick={editor.resetView} title="Reset view">⊡</IconBtn>
        <Divider />
        <IconBtn onClick={() => setShowGallery(true) } title="Circuit library">📚</IconBtn>
        <IconBtn onClick={() => fileRef.current?.click()} title="Load YAML file">⤓</IconBtn>
        <IconBtn onClick={() => onCopyYaml(editor.exportYaml())} title="Copy YAML">⧉</IconBtn>
        <IconBtn onClick={onShare} title="Copy share link">🔗</IconBtn>
        <Divider />
        <IconBtn onClick={toggleFullscreen} title={isFs ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>{isFs ? '⤡' : '⤢'}</IconBtn>
        <IconBtn onClick={() => setTourOpen(true)} title="Guided tour">?</IconBtn>
        <IconBtn onClick={onClose} title="Close studio (Esc)" danger>✕</IconBtn>
        <input
          ref={fileRef} type="file" accept=".yaml,.yml" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => { if (typeof reader.result === 'string') editor.importYaml(reader.result) }
            reader.readAsText(file)
            e.target.value = ''
          }}
        />
      </header>

      {/* ── Transport row ──────────────────────────────────────── */}
      <div data-tour="transport" className="flex flex-wrap items-center gap-2 border-b border-[#13202c] bg-[#0a0f16] px-3 py-1.5">
        <button
          onClick={running ? editor.stopSimulation : editor.runSimulation}
          data-testid="studio-run"
          className={`px-3 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
            running
              ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
          }`}
        >
          {running ? '❚❚ Pause' : editor.paused ? '▶ Resume' : '▶ Run'}
        </button>
        <button
          onClick={editor.stepSimulation}
          disabled={running}
          title="Step one frame (S)"
          className="px-2.5 py-1 rounded-md text-xs font-mono border border-[#1b2a38] bg-[#101822] text-[#7aa0b2]/80 disabled:opacity-30 hover:bg-[#142233] transition-colors"
        >
          ⏭ Step
        </button>
        <button
          onClick={editor.resetSimulation}
          className="px-2.5 py-1 rounded-md text-xs font-mono border border-transparent bg-[#101822] text-[#7aa0b2]/70 hover:bg-[#142233] transition-colors"
        >
          ↺ Reset
        </button>

        <Divider />
        <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#5c8294]/70">
          Speed
          <input
            type="range" min={0.25} max={4} step={0.25} value={editor.simSpeed}
            onChange={(e) => editor.setSimSpeed(parseFloat(e.target.value))}
            className="w-20 accent-[#22c8ee]"
          />
          <span className="tabular-nums text-[#22c8ee] w-7">{editor.simSpeed.toFixed(2)}×</span>
        </label>

        <Divider />
        <label className="flex items-center gap-1 text-[10px] font-mono text-[#5c8294]/70">
          dt
          <select
            value={editor.dt}
            onChange={(e) => editor.setDt(parseFloat(e.target.value))}
            className="bg-[#101822] border border-[#1b2a38] rounded px-1 py-0.5 text-[#cfe3ee]"
          >
            {DT_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[10px] font-mono text-[#5c8294]/70">
          window
          <select
            value={editor.simDuration}
            onChange={(e) => editor.setSimDuration(parseFloat(e.target.value))}
            className="bg-[#101822] border border-[#1b2a38] rounded px-1 py-0.5 text-[#cfe3ee]"
          >
            {DURATION_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>

        <div className="flex-1 min-w-[80px]" />
        {(running || editor.paused) && (
          <div className="flex items-center gap-2">
            <div className="w-28 h-1 rounded-full bg-[#101822] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#22c8ee]"
                style={{ width: `${Math.min(100, ((editor.sim?.time ?? 0) / editor.simDuration) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-[#22c8ee] tabular-nums w-12 text-right">
              {fmtTime(editor.sim?.time ?? 0)}
            </span>
          </div>
        )}
      </div>

      {/* ── Middle: left rail · canvas · right panel ────────────── */}
      <div className="flex flex-1 min-h-0">
        <aside data-tour="palette" style={{ width: leftW }} className="shrink-0 overflow-y-auto border-r border-[#13202c] bg-[#080c12]">
          <ComponentPalette
            activeType={editor.placingType}
            selectedId={editor.selectedId}
            onSelect={editor.setPlacingType}
            onDelete={() => editor.selectedId && editor.deleteComponent(editor.selectedId)}
            onRotate={() => editor.selectedId && editor.rotateComponent(editor.selectedId)}
            onDuplicate={() => editor.selectedId && editor.duplicateComponent(editor.selectedId)}
            onProbe={() => { if (selectedComp) editor.addProbe('nodeV', selectedComp.nodeA) }}
          />
        </aside>
        <Splitter orientation="v" value={leftW} min={150} max={320} onDrag={(d) => setLeftW(w => clamp(w + d, 150, 320))} />

        <main data-tour="canvas" className="relative flex-1 min-w-0">
          <div className="absolute inset-0">
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
              onPanZoom={(px, py, z) => { editor.setPan(px, py); editor.setZoom(z) }}
              onAddProbe={editor.addProbe}
              onRemoveProbe={editor.removeProbe}
              onRotate={editor.rotateComponent}
              onEndInteraction={editor.endInteraction}
            />
          </div>
        </main>

        <Splitter orientation="v" value={rightW} min={240} max={460} onDrag={(d) => setRightW(w => clamp(w - d, 240, 460))} />
        <aside style={{ width: rightW }} className="shrink-0 overflow-y-auto border-l border-[#13202c] bg-[#080c12] p-2.5 flex flex-col gap-2.5">
          <div data-tour="inspector">
            <Inspector
              comp={selectedComp}
              onValue={editor.updateComponentValue}
              onWaveform={editor.updateComponentWaveform}
              onProbe={editor.addProbe}
              onToggleSwitch={editor.toggleSwitch}
              onEndEdit={editor.endInteraction}
            />
          </div>
          <div data-tour="probes" className="rounded-xl border border-[#1b2a38] bg-[#0a1118] p-3">
            <ProbeManager
              probes={editor.probes}
              onRename={editor.renameProbe}
              onColor={editor.setProbeColor}
              onToggle={editor.toggleProbeVisible}
              onRemove={editor.removeProbe}
              onClear={editor.clearProbes}
            />
          </div>
        </aside>
      </div>

      {/* ── Bottom analysis dock ────────────────────────────────── */}
      <Splitter orientation="h" value={bottomH} min={150} max={520} onDrag={(d) => setBottomH(h => clamp(h - d, 150, 520))} />
      <section data-tour="scope" style={{ height: bottomH }} className="shrink-0 overflow-y-auto border-t border-[#13202c] bg-[#080c12] p-3">
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
      </section>

      {/* ── Status bar ──────────────────────────────────────────── */}
      <footer data-tour="status" className="flex items-center gap-3 border-t border-[#13202c] bg-[#080c12] px-3 py-1 text-[10px] font-mono text-[#5c8294]/70 tabular-nums">
        <span>{editor.circuit.components.length} comp</span>
        <span>{nodeIds.size} nodes</span>
        <span>{editor.circuit.wires.length} wires</span>
        <span className="text-[#5c8294]/30">|</span>
        <span className={running ? 'text-emerald-400' : editor.paused ? 'text-amber-400' : 'text-[#5c8294]/60'}>
          {running ? '● running' : editor.paused ? '❚❚ paused' : '○ idle'}
        </span>
        <span>{editor.simSpeed.toFixed(2)}×</span>
        <span className="text-[#5c8294]/30">|</span>
        <span>{Math.round(editor.zoom * 100)}%</span>
        <div className="flex-1" />
        {errCount > 0 ? (
          <span className="text-red-400">{errCount} error{errCount > 1 ? 's' : ''}</span>
        ) : warnCount > 0 ? (
          <span className="text-amber-400">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>
        ) : (
          <span className="text-emerald-400/80">✓ ready</span>
        )}
        <span className="text-[#5c8294]/30">|</span>
        <span className="text-[#5c8294]/40 hidden md:inline">Space run · S step · ⌘Z undo · ⌘D dup · 1–9 place · O dc · F full · Esc exit</span>
      </footer>

      <GalleryDialog
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onLoad={handleLoadSample}
        getCurrentYaml={editor.exportYaml}
      />

      {tourOpen && <StudioTour steps={TOUR_STEPS} rootRef={rootRef} onClose={closeTour} />}
    </div>,
    document.body,
  )
}

// ── Bits ────────────────────────────────────────────────────────────

function IconBtn({
  children, onClick, title, disabled, danger,
}: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`h-7 min-w-7 px-1.5 rounded-md text-xs font-mono border border-transparent transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
        danger
          ? 'text-[#7aa0b2]/70 hover:bg-red-500/15 hover:text-red-400'
          : 'text-[#7aa0b2]/80 hover:bg-[#142233] hover:text-[#cfe3ee]'
      }`}
    >
      {children}
    </button>
  )
}

function ToggleBtn({
  children, active, onClick, title,
}: { children: React.ReactNode; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`h-7 px-2 rounded-md text-[11px] font-mono border transition-colors ${
        active
          ? 'bg-[#ffb37a]/15 text-[#ffb37a] border-[#ffb37a]/40'
          : 'bg-[#101822] text-[#7aa0b2]/70 border-transparent hover:bg-[#142233]'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-[#13202c]" />
}

function Splitter({
  orientation, onDrag, value, min, max,
}: { orientation: 'v' | 'h'; onDrag: (delta: number) => void; value: number; min: number; max: number }) {
  const horizontal = orientation === 'h'
  const dragging = useRef(false)
  const last = useRef(0)
  // Pointer capture keeps move/up events bound to THIS element (React tears them
  // down on unmount), so there are no orphaned window listeners if the studio
  // closes mid-drag.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragging.current = true
    last.current = horizontal ? e.clientY : e.clientX
  }, [horizontal])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const cur = horizontal ? e.clientY : e.clientX
    onDrag(cur - last.current)
    last.current = cur
  }, [horizontal, onDrag])
  const endDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = false
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* not captured */ }
  }, [])
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 12
    const dec = horizontal ? 'ArrowUp' : 'ArrowLeft'
    const inc = horizontal ? 'ArrowDown' : 'ArrowRight'
    if (e.key === dec) { e.preventDefault(); onDrag(-step) }
    else if (e.key === inc) { e.preventDefault(); onDrag(step) }
  }, [horizontal, onDrag])
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label={horizontal ? 'Resize analysis dock' : 'Resize side panel'}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className={`shrink-0 bg-[#0d1622] outline-none transition-colors hover:bg-[#22c8ee]/40 focus-visible:bg-[#22c8ee]/60 ${
        horizontal ? 'h-1.5 cursor-row-resize' : 'w-1.5 cursor-col-resize'
      }`}
    />
  )
}

function fmtTime(t: number): string {
  if (t >= 1) return `${t.toFixed(2)}s`
  if (t >= 1e-3) return `${(t * 1e3).toFixed(0)}ms`
  return `${(t * 1e6).toFixed(0)}µs`
}
