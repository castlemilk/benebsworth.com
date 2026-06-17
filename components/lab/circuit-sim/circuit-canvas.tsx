'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CircuitComponent, CircuitWire, ComponentType, ScopeTrace, SimulationState } from '@/lib/lab/circuit-sim/types'
import { SNAP_RADIUS, GRID_SIZE } from '@/lib/lab/circuit-sim/types'
import {
  drawGrid,
  drawComponent,
  drawWireSegment,
  drawJunctionDot,
  drawTerminal,
  getTerminalPositions,
  gridSnap,
} from '@/lib/lab/circuit-sim/draw'
import { INSTRUMENT, voltageColor } from './instrument'
import { computeManhattanPath } from '@/lib/lab/circuit-sim/wiring'
import { drawFlowParticles } from './scope-panel'

interface Props {
  circuit: { components: CircuitComponent[]; wires: CircuitWire[] }
  placingType: ComponentType | null
  wiringFrom: string | null
  selectedId: string | null
  scopeTraces: ScopeTrace[]
  sim: SimulationState | null
  panX: number
  panY: number
  zoom: number
  onPlaceComponent: (type: ComponentType, gx: number, gy: number) => void
  onSelectComponent: (id: string | null) => void
  onMoveComponent: (id: string, gx: number, gy: number) => void
  onDeleteComponent: (id: string) => void
  onStartWire: (compId: string, nodeHint?: string) => void
  onCompleteWire: (toCompId: string, fromNodeHint?: string, toNodeHint?: string) => void
  onCancelWiring: () => void
  onCancelPlacing: () => void
  onPanZoom: (panX: number, panY: number, zoom: number) => void
  onAddProbe: (nodeId: number) => void
  onRemoveProbe: (nodeId: number) => void
  onRotate: (id: string) => void
}

export function CircuitCanvas({
  circuit,
  placingType,
  wiringFrom,
  selectedId,
  scopeTraces,
  sim,
  panX, panY, zoom,
  onPlaceComponent, onSelectComponent, onMoveComponent,
  onDeleteComponent, onStartWire, onCompleteWire, onCancelWiring, onCancelPlacing,
  onPanZoom, onAddProbe, onRemoveProbe, onRotate,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredTerminal, setHoveredTerminal] = useState<{
    compId: string; nodeId: number; x: number; y: number
  } | null>(null)
  const dragRef = useRef<{ compId: string; offsetX: number; offsetY: number } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const wireEndRef = useRef({ x: 0, y: 0 })
  // Active pointers (touch/pen/mouse) for multi-touch pinch-zoom.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ startDist: number; startZoom: number; startPanX: number; startPanY: number; midX: number; midY: number } | null>(null)
  const flowParticlesRef = useRef<Map<string, number[]>>(new Map())
  const lastFlowTimeRef = useRef(0)

  const canvasToWorld = useCallback((clientX: number, clientY: number) => {
    const wrap = wrapRef.current
    if (!wrap) return { x: 0, y: 0 }
    const rect = wrap.getBoundingClientRect()
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom,
    }
  }, [panX, panY, zoom])

  const hitTestComponent = useCallback((wx: number, wy: number): CircuitComponent | null => {
    for (const comp of circuit.components) {
      const dx = wx - comp.x, dy = wy - comp.y
      // Hit-test dims must match visual symbol sizes from draw.ts
      let bw = 52, bh = 24  // R: 44 body + 8 lead margin
      if (comp.type === 'V' || comp.type === 'I') { bw = 44; bh = 44 }   // V/I: 32 circle + margin
      if (comp.type === 'GND') { bw = 28; bh = 28 } // GND: 20 bars + margin
      if (comp.type === 'C') { bw = 32; bh = 32 }   // C: 12 gap + plates + margin
      if (comp.type === 'L') { bw = 64; bh = 28 }   // L: 56 loops + margin
      if (comp.rotation === 90 || comp.rotation === 270) [bw, bh] = [bh, bw]
      if (Math.abs(dx) < bw / 2 && Math.abs(dy) < bh / 2) return comp
    }
    return null
  }, [circuit.components])

  const hitTestTerminal = useCallback((wx: number, wy: number) => {
    for (const comp of circuit.components) {
      const [ax, ay, bx, by] = getTerminalPositions(comp)
      const sax = gridSnap(ax), say = gridSnap(ay)
      const sbx = gridSnap(bx), sby = gridSnap(by)
      if (Math.hypot(wx - sax, wy - say) < SNAP_RADIUS) return { compId: comp.id, nodeId: comp.nodeA, x: sax, y: say }
      if (Math.hypot(wx - sbx, wy - sby) < SNAP_RADIUS) return { compId: comp.id, nodeId: comp.nodeB, x: sbx, y: sby }
    }
    return null
  }, [circuit.components])

  // Hit-test wire segments: return the node if click is near a wire
  const hitTestWire = useCallback((wx: number, wy: number): number | null => {
    const threshold = 10 // px distance to consider "on wire"
    for (const wire of circuit.wires) {
      // Reconstruct the wire path
      let fromComp = wire.fromCompId
        ? (circuit.components.find(c => c.id === wire.fromCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA))
        : circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)
      let toComp = wire.toCompId
        ? (circuit.components.find(c => c.id === wire.toCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB))
        : circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB)
      if (!fromComp || !toComp || fromComp === toComp) {
        // Same-node wire: find two distinct components
        const shared = circuit.components.filter(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)
        if (shared.length >= 2) { fromComp = shared[0]; toComp = shared[1] }
      }
      if (!fromComp || !toComp || fromComp === toComp) continue

      const [fax, fay, fbx, fby] = getTerminalPositions(fromComp)
      const [tax, tay, tbx, tby] = getTerminalPositions(toComp)
      const fn = fromComp.nodeA === wire.nodeA ? 0 : 1
      const tn = toComp.nodeA === wire.nodeB ? 0 : 1
      let px = gridSnap(fn === 0 ? fax : fbx)
      let py = gridSnap(fn === 0 ? fay : fby)
      const ex = gridSnap(tn === 0 ? tax : tbx)
      const ey = gridSnap(tn === 0 ? tay : tby)

      const waypoints = wire.waypoints.length > 0 ? wire.waypoints : [{ x: ex, y: py }]
      
      // Check each segment
      let sx = px, sy = py
      for (const wp of waypoints) {
        if (distToSegment(wx, wy, sx, sy, wp.x, wp.y) < threshold) return wire.nodeA
        sx = wp.x; sy = wp.y
      }
      if (distToSegment(wx, wy, sx, sy, ex, ey) < threshold) return wire.nodeA
    }
    return null
  }, [circuit.components])

  // ── Render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const rect = wrap.getBoundingClientRect()
    const w = rect.width, h = rect.height
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const colors = INSTRUMENT

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, w, h)

    // Voltage scale for live node-heat coloring (baseline 5V, grows with the circuit).
    let vmax = 5
    if (sim) {
      for (const v of sim.nodeVoltages) {
        const a = Math.abs(v)
        if (isFinite(a) && a > vmax) vmax = a
      }
    }
    const live = sim?.running ?? false

    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    drawGrid(ctx, w / zoom + 200, h / zoom + 200, panX / zoom, panY / zoom, colors)

    // ── Collect terminal grid positions for junction detection ───
    const gridPointCounts = new Map<string, number>()

    function inc(key: string) {
      gridPointCounts.set(key, (gridPointCounts.get(key) ?? 0) + 1)
    }

    // Register ALL component terminals
    for (const comp of circuit.components) {
      const [ax, ay, bx, by] = getTerminalPositions(comp)
      inc(`${gridSnap(ax)},${gridSnap(ay)}`)
      inc(`${gridSnap(bx)},${gridSnap(by)}`)
    }

    // ── Draw wires with Manhattan routing ────────────────────────
    for (const wire of circuit.wires) {
      const fromComp = wire.fromCompId
        ? (circuit.components.find(c => c.id === wire.fromCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA))
        : circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)
      let toComp = wire.toCompId
        ? (circuit.components.find(c => c.id === wire.toCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB))
        : circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB)
      if (!fromComp || !toComp) continue

      // Same-node wire: find two distinct components
      if (fromComp === toComp) {
        const shared = circuit.components.filter(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)
        if (shared.length >= 2 && shared[0] === fromComp) toComp = shared[1]
      }
      if (fromComp === toComp) continue

      const [fax, fay, fbx, fby] = getTerminalPositions(fromComp)
      const [tax, tay, tbx, tby] = getTerminalPositions(toComp)

      const fromNode = fromComp.nodeA === wire.nodeA ? 0 : 1
      const fromTx = fromNode === 0 ? gridSnap(fax) : gridSnap(fbx)
      const fromTy = fromNode === 0 ? gridSnap(fay) : gridSnap(fby)
      const toNode = toComp.nodeA === wire.nodeB ? 0 : 1
      const toTx = toNode === 0 ? gridSnap(tax) : gridSnap(tbx)
      const toTy = toNode === 0 ? gridSnap(tay) : gridSnap(tby)

      // Use pre-computed waypoints if available, otherwise compute Manhattan
      let waypoints = wire.waypoints
      if (waypoints.length === 0) {
        waypoints = computeManhattanPath(fromTx, fromTy, toTx, toTy)
      }

      // Register waypoint corners as junction points
      for (const wp of waypoints) {
        inc(`${gridSnap(wp.x)},${gridSnap(wp.y)}`)
      }

      // Live: tint the wire by its node voltage (heat) with a phosphor glow.
      const nv = sim && wire.nodeA < sim.nodeVoltages.length ? sim.nodeVoltages[wire.nodeA] : undefined
      const wireColor = live && nv !== undefined && isFinite(nv) ? voltageColor(nv, vmax, colors) : undefined

      // Draw wire segments
      let px = fromTx, py = fromTy
      for (const wp of waypoints) {
        drawWireSegment(ctx, px, py, wp.x, wp.y, colors, wireColor, live)
        px = wp.x; py = wp.y
      }
      drawWireSegment(ctx, px, py, toTx, toTy, colors, wireColor, live)
    }

    // ── Draw junction dots ───────────────────────────────────────
    for (const [key, count] of gridPointCounts) {
      if (count >= 2) {
        const [jx, jy] = key.split(',').map(Number)
        drawJunctionDot(ctx, jx, jy, colors)
      }
    }

    // ── Flow particles (during simulation) ──────────────────────
    if (sim?.running) {
      const now = performance.now()
      const dt = (now - lastFlowTimeRef.current) / 1000
      lastFlowTimeRef.current = now

      // Compute component currents
      const compCurrents = new Map<string, number>()
      for (const comp of circuit.components) {
        if (comp.type === 'R') {
          const vDiff = (sim.nodeVoltages[comp.nodeA] ?? 0) - (sim.nodeVoltages[comp.nodeB] ?? 0)
          compCurrents.set(comp.id, vDiff / comp.value)
        } else if (comp.type === 'V') {
          // Voltage source current is stored in vsCurrents by transientStep
          // We need to find which vsCurrent entry corresponds to this component
          // For now, use the first (and usually only) entry
          const idx = [...circuit.components].filter(c => c.type === 'V').indexOf(comp)
          compCurrents.set(comp.id, sim.vsCurrents[idx] ?? 0)
        } else if (comp.type === 'L') {
          // Inductor current from companion state
          const cs = sim.indState.get(comp.id)
          if (cs) compCurrents.set(comp.id, cs.iPrev)
        } else if (comp.type === 'C') {
          // Capacitor current from companion state
          const cs = sim.capState.get(comp.id)
          if (cs) compCurrents.set(comp.id, cs.iPrev)
        }
      }

      // Draw particles for each wire
      for (const wire of circuit.wires) {
        const fromComp = wire.fromCompId
          ? (circuit.components.find(c => c.id === wire.fromCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA))
          : circuit.components.find(c => c.nodeA === wire.nodeA || c.nodeB === wire.nodeA)
        const toComp = wire.toCompId
          ? (circuit.components.find(c => c.id === wire.toCompId) ?? circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB))
          : circuit.components.find(c => c.nodeA === wire.nodeB || c.nodeB === wire.nodeB)
        if (!fromComp || !toComp || fromComp === toComp) continue

        const [fax, fay, fbx, fby] = getTerminalPositions(fromComp)
        const [tax, tay, tbx, tby] = getTerminalPositions(toComp)

        const fn = fromComp.nodeA === wire.nodeA ? 0 : 1
        const fromTx = fn === 0 ? gridSnap(fax) : gridSnap(fbx)
        const fromTy = fn === 0 ? gridSnap(fay) : gridSnap(fby)
        const tn = toComp.nodeA === wire.nodeB ? 0 : 1
        const toTx = tn === 0 ? gridSnap(tax) : gridSnap(tbx)
        const toTy = tn === 0 ? gridSnap(tay) : gridSnap(tby)

        // Estimate current: use fromComp's current
        const current = compCurrents.get(fromComp.id) ?? compCurrents.get(toComp.id) ?? 0
        // Use absolute current magnitude for particle speed, direction is always from→to
        const absCurrent = Math.abs(current)
        if (absCurrent < 1e-9) continue

        // Initialize or update particle phases
        const key = wire.id
        if (!flowParticlesRef.current.has(key)) {
          const n = Math.min(12, Math.max(5, Math.floor(absCurrent * 1000)))
          const phases: number[] = []
          for (let i = 0; i < n; i++) phases.push(i / n)
          flowParticlesRef.current.set(key, phases)
        }

        let phases = flowParticlesRef.current.get(key)!
        const speed = Math.min(2, absCurrent * 100) // current → speed
        phases = phases.map(p => p + speed * dt * 0.1)
        flowParticlesRef.current.set(key, phases)

        let waypoints = wire.waypoints
        if (waypoints.length === 0) waypoints = computeManhattanPath(fromTx, fromTy, toTx, toTy)

        drawFlowParticles(ctx, fromTx, fromTy, toTx, toTy, waypoints, phases, current * 1000, colors, sim.time)
      }
    } else {
      flowParticlesRef.current.clear()
    }

    // ── Draw components on top ───────────────────────────────────
    for (const comp of circuit.components) {
      drawComponent(ctx, comp, colors, comp.id === selectedId)

      const [ax, ay, bx, by] = getTerminalPositions(comp)
      const sax = gridSnap(ax), say = gridSnap(ay)
      const sbx = gridSnap(bx), sby = gridSnap(by)

      // Draw terminal dots — heat-tinted by node voltage while running.
      const hA = hoveredTerminal?.compId === comp.id && hoveredTerminal.nodeId === comp.nodeA
      const hB = hoveredTerminal?.compId === comp.id && hoveredTerminal.nodeId === comp.nodeB
      const tva = live ? sim!.nodeVoltages[comp.nodeA] : undefined
      const tvb = live ? sim!.nodeVoltages[comp.nodeB] : undefined
      drawTerminal(ctx, sax, say, colors, hA, tva !== undefined && isFinite(tva) ? voltageColor(tva, vmax, colors) : undefined)
      drawTerminal(ctx, sbx, sby, colors, hB, tvb !== undefined && isFinite(tvb) ? voltageColor(tvb, vmax, colors) : undefined)

      // Probe labels with real-time voltage
      const probed = scopeTraces.find(t => t.nodeId === comp.nodeA || t.nodeId === comp.nodeB)
      if (probed) {
        const nx = comp.nodeA === probed.nodeId ? sax : sbx
        const ny = comp.nodeA === probed.nodeId ? say : sby
        ctx.fillStyle = probed.color
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        const label = `CH${scopeTraces.indexOf(probed) + 1}`
        ctx.fillText(label, nx, ny - 12)

        // Real-time voltage readout
        if (sim && probed.nodeId < sim.nodeVoltages.length) {
          const v = sim.nodeVoltages[probed.nodeId]
          if (isFinite(v)) {
            ctx.font = '9px monospace'
            ctx.fillStyle = probed.color
            ctx.globalAlpha = 0.8
            ctx.fillText(`${v.toFixed(2)}V`, nx, ny - 24)
            ctx.globalAlpha = 1
          }
        }
      }
    }

    // ── Wiring preview ───────────────────────────────────────────
    if (wiringFrom) {
      const fromComp = circuit.components.find(c => c.id === wiringFrom)
      if (fromComp) {
        const [ax, ay, bx, by] = getTerminalPositions(fromComp)
        // Use terminal A as default for preview (since we may not know which was clicked in preview mode)
        const sx = gridSnap(ax), sy = gridSnap(ay)
        const wr = wrapRef.current?.getBoundingClientRect()
        if (wr) {
          const wx = (wireEndRef.current.x - wr.left - panX) / zoom
          const wy = (wireEndRef.current.y - wr.top - panY) / zoom
          ctx.strokeStyle = colors.accent
          ctx.lineWidth = 2
          ctx.setLineDash([6, 4])
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(wx, wy)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    ctx.restore()
  }, [circuit, selectedId, hoveredTerminal, wiringFrom, panX, panY, zoom, scopeTraces, sim])

  // ── Pointer handlers (mouse + touch + pen) ──────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* fake/inactive pointer */ }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two pointers → begin pinch-zoom; cancel any single-pointer interaction.
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const rect = wrapRef.current?.getBoundingClientRect()
      const midX = (pts[0].x + pts[1].x) / 2 - (rect?.left ?? 0)
      const midY = (pts[0].y + pts[1].y) / 2 - (rect?.top ?? 0)
      pinchRef.current = { startDist: dist, startZoom: zoom, startPanX: panX, startPanY: panY, midX, midY }
      dragRef.current = null
      panRef.current = null
      return
    }
    if (pointersRef.current.size > 2) return

    // Mouse middle button → pan.
    if (e.pointerType === 'mouse' && e.button === 1) {
      panRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY }
      return
    }
    // Mouse: only the left button drives editing.
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const pos = canvasToWorld(e.clientX, e.clientY)
    const gx = gridSnap(pos.x), gy = gridSnap(pos.y)

    if (placingType) {
      // Place on pointer-up — allows right-click / second-finger cancel.
      return
    }

    if (wiringFrom) {
      const term = hitTestTerminal(pos.x, pos.y)
      if (term && term.compId !== wiringFrom) {
        const toComp = circuit.components.find(c => c.id === term.compId)
        onCompleteWire(term.compId, undefined, toComp?.nodeA === term.nodeId ? 'A' : 'B')
      } else onCancelWiring()
      return
    }

    const comp = hitTestComponent(pos.x, pos.y)
    if (comp) {
      if (e.shiftKey) {
        if (e.metaKey || e.ctrlKey) onAddProbe(comp.nodeA)
        else {
          const [ax, ay, bx, by] = getTerminalPositions(comp)
          const dA = Math.hypot(pos.x - ax, pos.y - ay)
          const dB = Math.hypot(pos.x - bx, pos.y - by)
          onStartWire(comp.id, dA < dB ? 'A' : 'B')
        }
      } else if (e.altKey) {
        onRotate(comp.id)
      } else {
        onSelectComponent(comp.id)
        dragRef.current = { compId: comp.id, offsetX: comp.x - gx, offsetY: comp.y - gy }
      }
      return
    }

    const term = hitTestTerminal(pos.x, pos.y)
    if (term && e.shiftKey) {
      const comp = circuit.components.find(c => c.id === term.compId)
      onStartWire(term.compId, comp?.nodeA === term.nodeId ? 'A' : 'B')
      return
    }

    onSelectComponent(null)
    panRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY }
  }, [placingType, wiringFrom, canvasToWorld, hitTestComponent, hitTestTerminal, circuit.components, panX, panY, zoom, onCompleteWire, onCancelWiring, onAddProbe, onSelectComponent, onStartWire, onRotate])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    wireEndRef.current = { x: e.clientX, y: e.clientY }

    // Pinch-zoom about the gesture midpoint.
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const p = pinchRef.current
      const newZoom = Math.max(0.3, Math.min(3, p.startZoom * (dist / p.startDist)))
      const k = newZoom / p.startZoom
      onPanZoom(p.midX - (p.midX - p.startPanX) * k, p.midY - (p.midY - p.startPanY) * k, newZoom)
      return
    }

    const pos = canvasToWorld(e.clientX, e.clientY)
    const gx = gridSnap(pos.x), gy = gridSnap(pos.y)

    if (panRef.current) {
      const p = panRef.current
      onPanZoom(p.startPanX + (e.clientX - p.startX), p.startPanY + (e.clientY - p.startY), zoom)
      return
    }

    if (dragRef.current) {
      const d = dragRef.current
      onMoveComponent(d.compId, gx + d.offsetX, gy + d.offsetY)
      return
    }

    setHoveredTerminal(hitTestTerminal(pos.x, pos.y))
  }, [canvasToWorld, zoom, onPanZoom, onMoveComponent, hitTestTerminal])

  const endPointer = useCallback((e: React.PointerEvent, place: boolean) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId) } catch { /* not captured */ }
    const wasPinching = !!pinchRef.current
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    dragRef.current = null
    panRef.current = null
    if (place && !wasPinching && placingType) {
      const pos = canvasToWorld(e.clientX, e.clientY)
      onPlaceComponent(placingType, gridSnap(pos.x), gridSnap(pos.y))
    }
  }, [canvasToWorld, placingType, onPlaceComponent])

  const handlePointerUp = useCallback((e: React.PointerEvent) => endPointer(e, true), [endPointer])
  const handlePointerCancel = useCallback((e: React.PointerEvent) => endPointer(e, false), [endPointer])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.max(0.3, Math.min(3, zoom - e.deltaY * 0.001))
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) {
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top
      onPanZoom(cx - (cx - panX) * (newZoom / zoom), cy - (cy - panY) * (newZoom / zoom), newZoom)
    } else {
      onPanZoom(panX, panY, newZoom)
    }
  }, [panX, panY, zoom, onPanZoom])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (placingType) { onCancelPlacing(); return }
      if (wiringFrom) { onCancelWiring(); return }
      onSelectComponent(null)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedId) onDeleteComponent(selectedId) }
    if (e.key === 'r' && selectedId) onRotate(selectedId)
    if (e.key === 'p' && selectedId) {
      const comp = circuit.components.find(c => c.id === selectedId)
      if (comp) onAddProbe(comp.nodeA)
    }
  }, [placingType, wiringFrom, selectedId, onDeleteComponent, onSelectComponent, onCancelPlacing, onCancelWiring, onRotate, onAddProbe, circuit.components])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (placingType) { onCancelPlacing(); return }
    if (wiringFrom) { onCancelWiring(); return }
    if (selectedId) onDeleteComponent(selectedId)
  }, [placingType, wiringFrom, selectedId, onCancelPlacing, onCancelWiring, onDeleteComponent])

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden rounded-xl border border-[var(--color-border)]"
      style={{ background: INSTRUMENT.bg }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      />
      {placingType && (
        <div className="absolute top-3 left-3 px-3 py-1.5 text-xs font-mono bg-[#0f1820] border border-[var(--color-border)] rounded-lg text-[var(--color-fg)]/60 pointer-events-none">
          Placing — click canvas · Esc to cancel
        </div>
      )}
      {wiringFrom && (
        <div className="absolute top-3 left-3 px-3 py-1.5 text-xs font-mono bg-[#0f1820] border border-[var(--color-accent)] rounded-lg text-[var(--color-accent)] pointer-events-none">
          Wiring — click terminal to connect · Esc to cancel
        </div>
      )}
    </div>
  )
}

/** Shortest distance from point (px,py) to the line segment (ax,ay)-(bx,by). */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
