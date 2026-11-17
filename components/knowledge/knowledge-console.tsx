'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import './knowledge-console.css'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import type { KGEdge, KGNode, KnowledgeGraph, NodeKind } from '@/lib/knowledge/graph'
import { Field, FieldLabel } from '@ui-sdk/react/field'
import { Input } from '@ui-sdk/react/input'
import { Display } from '@/components/ui/display'
import { Lcd, LcdDigits } from '@/components/ui/lcd'
import { Switch } from '@/components/ui/switch'
import { DPad } from '@/components/ui/dpad'
import { Slider } from '@/components/ui/slider'
import { BarGraph } from '@/components/ui/bar-graph'
import { ItemList } from '@/components/ui/item-list'
import { Segmented } from '@/components/ui/segmented-control'
import { Button } from '@/components/ui/hardware/button'
import { Badge } from '@/components/ui/hardware/badge'

type SimNode = SimulationNodeDatum & KGNode & { degree: number; hop: number }
type SimLink = SimulationLinkDatum<SimNode> & { kind: KGEdge['kind'] }

const KINDS: { kind: NodeKind; label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }[] = [
  { kind: 'blog', label: 'blog', tone: 'info' },
  { kind: 'lab', label: 'lab', tone: 'success' },
  { kind: 'study', label: 'study', tone: 'warning' },
  { kind: 'tag', label: 'tags', tone: 'neutral' },
  { kind: 'concept', label: 'concepts', tone: 'danger' },
  { kind: 'category', label: 'categories', tone: 'neutral' },
]

// Lane order for the node-graph layout: packets on the left feeding concepts,
// tags bridging into posts and lab work, categories closing the right side.
const LANES: NodeKind[] = ['study', 'concept', 'tag', 'blog', 'lab', 'category']
const LANE_GAP = 210
const laneX = (kind: NodeKind) => (LANES.indexOf(kind) - (LANES.length - 1) / 2) * LANE_GAP

// Drawn on the Display's dark screen glass, so the palette comes from
// screen-scoped vars declared in knowledge-console.css, never the light
// panel inks (--ink/#1b1b19 is invisible on glass).
const KIND_COLOR: Record<NodeKind, { css: string; fallback: string }> = {
  blog: { css: '--kg-blog', fallback: '#6ea8ff' },
  lab: { css: '--kg-lab', fallback: '#4cd97a' },
  study: { css: '--kg-study', fallback: '#ff9d6b' },
  tag: { css: '--kg-tag', fallback: '#9a9a92' },
  concept: { css: '--kg-concept', fallback: '#e6c34a' },
  category: { css: '--kg-category', fallback: '#7d8a9a' },
}

type Palette = { kind: Record<NodeKind, string>; ink: string; dim: string }

const ZOOM_MIN = 0.3
const ZOOM_MAX = 4
const isHub = (k: NodeKind) => k === 'tag' || k === 'concept' || k === 'category'
const radius = (n: SimNode) => (isHub(n.kind) ? Math.min(5 + n.degree * 0.55, 15) : Math.min(3 + n.degree * 0.65, 9))

function resolvePalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el)
  const kind = {} as Record<NodeKind, string>
  for (const k of KINDS) {
    const v = cs.getPropertyValue(KIND_COLOR[k.kind].css).trim()
    kind[k.kind] = v || KIND_COLOR[k.kind].fallback
  }
  return {
    kind,
    ink: cs.getPropertyValue('--kg-ink').trim() || '#f2f2ee',
    dim: cs.getPropertyValue('--kg-dim').trim() || '#8f8f87',
  }
}

type LayoutMode = 'drift' | 'lanes' | 'orbit'

export function KnowledgeConsole({ graph }: { graph: KnowledgeGraph }) {
  const router = useRouter()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const screenRef = React.useRef<HTMLDivElement>(null)
  const paletteRef = React.useRef<Palette | null>(null)
  const [enabled, setEnabled] = React.useState<Set<NodeKind>>(new Set(KINDS.map((k) => k.kind)))
  const [selected, setSelected] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<LayoutMode>('drift')
  const [zoom, setZoom] = React.useState(1)
  const [query, setQuery] = React.useState('')
  const view = React.useRef({ x: 0, y: 0, zoom: 1 })
  const fly = React.useRef<{ x: number; y: number; z: number } | null>(null)
  const simRef = React.useRef<{
    sim: ReturnType<typeof forceSimulation<SimNode>>
    nodes: SimNode[]
    links: SimLink[]
    neighbors: Map<string, Set<string>>
    arts: Map<string, HTMLImageElement>
  } | null>(null)
  // Interaction state the rAF paint loop reads without re-running the sim.
  const selectedRef = React.useRef<string | null>(null)
  const hoveredRef = React.useRef<string | null>(null)
  const modeRef = React.useRef<LayoutMode>(mode)
  const reduceMotion = React.useRef(false)
  const [paused, setPaused] = React.useState(false)
  const pausedRef = React.useRef(false)
  React.useEffect(() => {
    selectedRef.current = selected
  }, [selected])
  React.useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const counts = React.useMemo(() => {
    const c = Object.fromEntries(KINDS.map((k) => [k.kind, 0])) as Record<NodeKind, number>
    for (const n of graph.nodes) c[n.kind] += 1
    return c
  }, [graph])

  const visibleGraph = React.useMemo(() => {
    const nodes = graph.nodes.filter((n) => enabled.has(n.kind))
    const ids = new Set(nodes.map((n) => n.id))
    const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
    return { nodes, edges }
  }, [graph, enabled])
  const selectedNode = visibleGraph.nodes.find((n) => n.id === selected)
  const neighborIds = new Set(visibleGraph.edges.flatMap((e) =>
    e.source === selected ? [e.target] : e.target === selected ? [e.source] : []))

  const hits = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return visibleGraph.nodes.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 7)
  }, [visibleGraph, query])

  // The most-connected hubs, for the idle panel; the fastest way in.
  const topHubs = React.useMemo(() => {
    const degree = new Map<string, number>()
    for (const e of graph.edges) {
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
    }
    return graph.nodes
      .filter((n) => isHub(n.kind) && enabled.has(n.kind))
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 8)
  }, [graph, enabled])

  // ── Force tuning per layout mode ─────────────────────────────────────
  // Modes don't swap engines; they retune the same sim, which is what makes
  // lanes feel like a node graph that still breathes. Shared by the sim
  // effect (initial layout) and the mode/selection effects below.
  const applyForces = React.useCallback(() => {
    const s = simRef.current
    if (!s) return
    const { sim, nodes, neighbors } = s
    const modeNow = modeRef.current
    const link = sim.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>
    for (const n of nodes) {
      n.fx = null
      n.fy = null
      n.hop = -1
    }

    if (modeNow === 'lanes') {
      link.strength((l) => (l.kind === 'concept' ? 0.14 : 0.07))
      sim.force('x', forceX<SimNode>((n) => laneX(n.kind)).strength(0.5))
      sim.force('y', forceY<SimNode>(0).strength(0.02))
      sim.force('charge', forceManyBody<SimNode>().strength(-18))
      sim.force('radial', null)
    } else if (modeNow === 'orbit' && selectedRef.current) {
      const hops = new Map<string, number>([[selectedRef.current, 0]])
      const queue = [selectedRef.current]
      while (queue.length) {
        const id = queue.shift()!
        const hop = hops.get(id)!
        if (hop >= 2) continue
        for (const next of neighbors.get(id) ?? []) {
          if (!hops.has(next)) {
            hops.set(next, hop + 1)
            queue.push(next)
          }
        }
      }
      for (const n of nodes) n.hop = hops.get(n.id) ?? -1
      link.strength(0.08)
      sim.force('x', null)
      sim.force('y', null)
      sim.force('charge', forceManyBody<SimNode>().strength((n) => (n.hop === -1 ? -60 : -8)))
      sim.force(
        'radial',
        forceRadial<SimNode>((n) => (n.hop === -1 ? 460 : n.hop * 170), 0, 0).strength((n) =>
          n.hop === -1 ? 0.05 : 0.55,
        ),
      )
      // The orbit is anchored at world origin; bring the camera to it.
      const z = Math.max(view.current.zoom, 1.25)
      fly.current = { x: 0, y: 0, z }
      setZoom(z)
    } else {
      link.strength((l) => (l.kind === 'concept' ? 0.5 : 0.32)).distance((l) => (l.kind === 'category' ? 55 : 34))
      sim.force('x', forceX<SimNode>(0).strength(0.04))
      sim.force('y', forceY<SimNode>(0).strength(0.05))
      sim.force('charge', forceManyBody<SimNode>().strength((n) => (isHub(n.kind) ? -60 - n.degree * 6 : -26)))
      sim.force('radial', null)
    }
    sim.alpha(0.55)
    if (reduceMotion.current || pausedRef.current) {
      sim.stop().tick(220)
    } else sim.restart()
  }, [])

  React.useEffect(() => {
    applyForces()
  }, [mode, selected, enabled, applyForces])

  // ── Simulation + canvas ──────────────────────────────────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current
    const screen = screenRef.current
    if (!canvas || !screen) return
    paletteRef.current = resolvePalette(screen)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotion.current = media.matches
    const onMotionChange = () => {
      reduceMotion.current = media.matches
      if (media.matches) simRef.current?.sim.stop()
      applyForces()
    }
    media.addEventListener('change', onMotionChange)

    const degree = new Map<string, number>()
    for (const e of graph.edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
    }
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))

    const nodes: SimNode[] = graph.nodes
      .filter((n) => enabled.has(n.kind))
      .map((n) => ({ ...n, degree: degree.get(n.id) ?? 0, hop: -1 }))
    const visible = new Set(nodes.map((n) => n.id))
    const links: SimLink[] = graph.edges
      .filter((e) => visible.has(e.source) && visible.has(e.target) && byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ ...e }))
    const neighbors = new Map<string, Set<string>>()
    for (const e of links) {
      const s = (e.source as SimNode).id ?? (e.source as string)
      const t = (e.target as SimNode).id ?? (e.target as string)
      ;(neighbors.get(s) ?? neighbors.set(s, new Set()).get(s)!).add(t)
      ;(neighbors.get(t) ?? neighbors.set(t, new Set()).get(t)!).add(s)
    }

    const sim = forceSimulation(nodes)
      .force('link', forceLink<SimNode, SimLink>(links).id((n) => n.id))
      .force('charge', forceManyBody<SimNode>())
      .force('collide', forceCollide<SimNode>().radius((n) => radius(n) + (n.art ? 12 : 3)))
      .stop()
    const arts = new Map<string, HTMLImageElement>()
    for (const n of nodes) {
      if (!n.art) continue
      const img = new Image()
      img.src = n.art
      arts.set(n.id, img)
    }
    simRef.current = { sim, nodes, links, neighbors, arts }
    // Configure forces, then pre-run synchronously so the first paint is
    // already organized; a low simmer stays live for drags and toggles.
    applyForces()
    sim.stop()
    for (let i = 0; i < 220; i += 1) sim.tick()
    if (!reduceMotion.current && !pausedRef.current) sim.alpha(0.18).restart()

    const ctx = canvas.getContext('2d')!
    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1

    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      // Fly-to easing toward a search/selection target; snaps instantly under
      // reduced motion.
      const f = fly.current
      if (f) {
        if (reduceMotion.current) {
          view.current = { x: f.x, y: f.y, zoom: f.z }
          fly.current = null
        } else {
          const v = view.current
          v.x += (f.x - v.x) * 0.16
          v.y += (f.y - v.y) * 0.16
          v.zoom += (f.z - v.zoom) * 0.16
          if (Math.abs(f.x - v.x) < 0.5 && Math.abs(f.y - v.y) < 0.5 && Math.abs(f.z - v.zoom) < 0.005) {
            view.current = { x: f.x, y: f.y, zoom: f.z }
            fly.current = null
          }
        }
      }

      ctx.save()
      const { x, y, zoom: z } = view.current
      ctx.translate(w / 2 + x, h / 2 + y)
      ctx.scale(z, z)
      const pal = paletteRef.current!
      const sel = selectedRef.current
      const hov = hoveredRef.current
      const lit = sel ? neighbors.get(sel) : hov ? neighbors.get(hov) : null

      if (modeRef.current === 'lanes') {
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = pal.ink
        ctx.globalAlpha = 0.12
        ctx.lineWidth = 1
        const top = (-h / 2 - y) / z
        const bot = (h / 2 - y) / z
        for (const kind of LANES) {
          if (!enabled.has(kind)) continue
          const lx = laneX(kind)
          ctx.beginPath()
          ctx.moveTo(lx, top)
          ctx.lineTo(lx, bot)
          ctx.stroke()
          ctx.globalAlpha = 0.6
          ctx.font = '600 11px "IBM Plex Mono", monospace'
          ctx.fillStyle = pal.kind[kind]
          ctx.fillText(kind.toUpperCase(), lx - 18, top + 16)
          ctx.globalAlpha = 0.12
        }
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }

      if (modeRef.current === 'orbit' && sel) {
        ctx.setLineDash([3, 6])
        ctx.strokeStyle = pal.dim
        ctx.globalAlpha = 0.3
        ctx.lineWidth = 1
        for (const r of [170, 340]) {
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }

      // Patch-wire edges: horizontal tangents, the node-graph signature.
      for (const l of links) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        const hot = lit && (s.id === sel || s.id === hov || t.id === sel || t.id === hov)
        ctx.strokeStyle = l.kind === 'concept' ? pal.kind.concept : pal.ink
        ctx.globalAlpha = hot ? 0.85 : l.kind === 'category' ? 0.07 : l.kind === 'concept' ? 0.32 : 0.16
        ctx.lineWidth = hot ? 1.5 : 0.7
        const mx = (s.x! + t.x!) / 2
        ctx.beginPath()
        ctx.moveTo(s.x!, s.y!)
        ctx.bezierCurveTo(mx, s.y!, mx, t.y!, t.x!, t.y!)
        ctx.stroke()
        if (hot) {
          ctx.fillStyle = l.kind === 'concept' ? pal.kind.concept : pal.ink
          for (const p of [s, t]) {
            ctx.beginPath()
            ctx.arc(p.x!, p.y!, 1.8, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.globalAlpha = 1

      const labelZ = z > 1.45
      for (const n of nodes) {
        const r = radius(n)
        const hot = n.id === sel || n.id === hov
        const linked = lit?.has(n.id) ?? false
        const dimmed = lit != null && !hot && !linked
        ctx.globalAlpha = dimmed ? 0.15 : 1
        ctx.fillStyle = pal.kind[n.kind]
        const art = simRef.current?.arts.get(n.id)
        if (isHub(n.kind)) {
          const drawn = art && art.complete && art.naturalWidth > 0
          if (drawn) {
            // Category artwork: parchment disc, clipped illustration, tinted ring.
            const d = r * 3
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, d / 2 + 3, 0, Math.PI * 2)
            ctx.fillStyle = pal.kind[n.kind]
            ctx.globalAlpha = dimmed ? 0.1 : 0.35
            ctx.fill()
            ctx.globalAlpha = dimmed ? 0.18 : 1
            ctx.save()
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, d / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(art, n.x! - d / 2, n.y! - d / 2, d, d)
            ctx.restore()
            ctx.strokeStyle = pal.kind[n.kind]
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, d / 2 + 1, 0, Math.PI * 2)
            ctx.stroke()
          } else {
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2)
            ctx.globalAlpha = dimmed ? 0.08 : 0.3
            ctx.fill()
            ctx.globalAlpha = dimmed ? 0.15 : 1
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, r * 0.62, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = pal.kind[n.kind]
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2)
            ctx.stroke()
          }
        } else {
          const q = r * 0.9
          ctx.fillRect(n.x! - q, n.y! - q, q * 2, q * 2)
        }
        if (hot) {
          ctx.strokeStyle = pal.kind[n.kind]
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(n.x!, n.y!, r + 3.5, 0, Math.PI * 2)
          ctx.stroke()
          ctx.lineWidth = 1
          for (const [tx, ty] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            ctx.beginPath()
            ctx.moveTo(n.x! + tx * (r + 6), n.y! + ty * (r + 6))
            ctx.lineTo(n.x! + tx * (r + 9.5), n.y! + ty * (r + 9.5))
            ctx.stroke()
          }
        }
        if (isHub(n.kind) || labelZ || hot || linked) {
          const strong = hot || n.id === sel
          ctx.font = `${strong ? 600 : 400} ${strong || isHub(n.kind) ? 10.5 : 9.5}px "IBM Plex Mono", monospace`
          ctx.strokeStyle = 'rgba(10,10,10,0.9)'
          ctx.lineWidth = 3
          const text = n.label.length > 38 ? `${n.label.slice(0, 37)}…` : n.label
          const tx = n.x! + (n.art ? r * 1.5 + 6 : r + 3)
          ctx.strokeText(text, tx, n.y! + 3)
          ctx.fillStyle = hot ? pal.ink : pal.dim
          ctx.fillText(text, tx, n.y! + 3)
        }
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }

    const frame = () => {
      paint()
      raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      const box = screen.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = box.width
      h = box.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(screen)
    resize()
    raf = requestAnimationFrame(frame)

    // ── pointer interaction ──────────────────────────────────────────
    let activePointer: number | null = null
    let dragNode: SimNode | null = null
    let panFrom: { px: number; py: number; vx: number; vy: number } | null = null
    let moved = 0

    const toWorld = (e: PointerEvent | WheelEvent) => {
      const box = canvas.getBoundingClientRect()
      const { x, y, zoom: z } = view.current
      return { wx: (e.clientX - box.left - box.width / 2 - x) / z, wy: (e.clientY - box.top - box.height / 2 - y) / z }
    }
    const nodeAt = (e: PointerEvent) => {
      const { wx, wy } = toWorld(e)
      let best: SimNode | null = null
      let bd = 14 / view.current.zoom
      for (const n of nodes) {
        const d = Math.hypot(n.x! - wx, n.y! - wy)
        const r = Math.max(radius(n), 6)
        if (d < r + bd && (!best || d < bd)) {
          best = n
          bd = d
        }
      }
      return best
    }

    const down = (e: PointerEvent) => {
      if (activePointer !== null) return
      activePointer = e.pointerId
      canvas.setPointerCapture(e.pointerId)
      fly.current = null
      moved = 0
      const n = nodeAt(e)
      if (n) {
        dragNode = n
        n.fx = n.x
        n.fy = n.y
        if (!reduceMotion.current && !pausedRef.current) sim.alphaTarget(0.2).restart()
      } else {
        panFrom = { px: e.clientX, py: e.clientY, vx: view.current.x, vy: view.current.y }
      }
    }
    const move = (e: PointerEvent) => {
      if (activePointer !== null && activePointer !== e.pointerId) return
      const n = nodeAt(e)
      if (hoveredRef.current !== (n?.id ?? null)) {
        hoveredRef.current = n?.id ?? null
        canvas.style.cursor = n ? 'pointer' : 'grab'
      }
      if (dragNode) {
        const { wx, wy } = toWorld(e)
        dragNode.fx = wx
        dragNode.fy = wy
        if (reduceMotion.current || pausedRef.current) { dragNode.x = wx; dragNode.y = wy }
        moved += 1
      } else if (panFrom) {
        view.current.x = panFrom.vx + (e.clientX - panFrom.px)
        view.current.y = panFrom.vy + (e.clientY - panFrom.py)
        moved += Math.abs(e.movementX) + Math.abs(e.movementY)
      }
    }
    const up = (e: PointerEvent) => {
      if (activePointer !== e.pointerId) return
      activePointer = null
      if (dragNode) {
        dragNode.fx = null
        dragNode.fy = null
        sim.alphaTarget(0)
        if (moved < 4) setSelected(dragNode.id)
        dragNode = null
      } else if (panFrom && moved < 4) {
        if (!nodeAt(e)) setSelected(null)
      }
      panFrom = null
    }
    const cancelDrag = (e: PointerEvent) => {
      if (activePointer !== e.pointerId) return
      activePointer = null
      if (dragNode) { dragNode.fx = null; dragNode.fy = null }
      dragNode = null
      panFrom = null
      sim.alphaTarget(0)
      if (reduceMotion.current || pausedRef.current) sim.stop()
    }
    const wheelZoom = (e: WheelEvent) => {
      e.preventDefault()
      fly.current = null
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.current.zoom * (e.deltaY < 0 ? 1.12 : 0.89)))
      const box = canvas.getBoundingClientRect()
      const mx = e.clientX - box.left - box.width / 2
      const my = e.clientY - box.top - box.height / 2
      const k = next / view.current.zoom
      view.current.x = mx - (mx - view.current.x) * k
      view.current.y = my - (my - view.current.y) * k
      view.current.zoom = next
      setZoom(next)
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancelDrag)
    canvas.addEventListener('lostpointercapture', cancelDrag)
    canvas.addEventListener('wheel', wheelZoom, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      sim.stop()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancelDrag)
      canvas.removeEventListener('lostpointercapture', cancelDrag)
      media.removeEventListener('change', onMotionChange)
      canvas.removeEventListener('wheel', wheelZoom)
    }
  }, [enabled, graph, applyForces])

  const toggleKind = (kind: NodeKind, on: boolean) => {
    if (!on && selectedNode?.kind === kind) setSelected(null)
    setEnabled((s) => {
      const next = new Set(s)
      if (on) next.add(kind)
      else next.delete(kind)
      return next
    })
  }

  const panBy = (dx: number, dy: number) => {
    fly.current = null
    view.current.x += dx
    view.current.y += dy
  }

  const setViewZoom = (z: number) => {
    fly.current = null
    view.current.zoom = z
    setZoom(z)
  }

  const fit = () => {
    const s = simRef.current
    const screen = screenRef.current
    if (!s || !screen || s.nodes.length === 0) return
    const box = screen.getBoundingClientRect()
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (const n of s.nodes) {
      x0 = Math.min(x0, n.x!)
      x1 = Math.max(x1, n.x!)
      y0 = Math.min(y0, n.y!)
      y1 = Math.max(y1, n.y!)
    }
    const z = Math.max(ZOOM_MIN, Math.min(box.width / (x1 - x0 + 160), box.height / (y1 - y0 + 160), ZOOM_MAX))
    fly.current = { x: -((x0 + x1) / 2) * z, y: -((y0 + y1) / 2) * z, z }
    setZoom(z)
  }

  const focusNode = (n: SimNode | KGNode) => {
    setSelected(n.id)
    setQuery('')
    const world = 'x' in n && typeof n.x === 'number' ? n : simRef.current?.nodes.find((s) => s.id === n.id)
    if (world?.x != null && world.y != null) {
      const z = Math.max(view.current.zoom, 1.5)
      fly.current = { x: -world.x * z, y: -world.y * z, z }
      setZoom(z)
    }
  }

  const onCanvasKey = (e: React.KeyboardEvent) => {
    const step = 44
    if (e.key === 'ArrowUp') panBy(0, step)
    else if (e.key === 'ArrowDown') panBy(0, -step)
    else if (e.key === 'ArrowLeft') panBy(step, 0)
    else if (e.key === 'ArrowRight') panBy(-step, 0)
    else if (e.key === '+' || e.key === '=') setViewZoom(Math.min(ZOOM_MAX, view.current.zoom * 1.2))
    else if (e.key === '-') setViewZoom(Math.max(ZOOM_MIN, view.current.zoom / 1.2))
    else if (e.key === 'Escape') setSelected(null)
    else if (e.key === 'Enter' && selectedNode?.href) router.push(selectedNode.href)
    else return
    e.preventDefault()
  }

  const neighbors = visibleGraph.nodes.filter((n) => neighborIds.has(n.id))
  const visibleCount = KINDS.reduce((s, k) => s + (enabled.has(k.kind) ? counts[k.kind] : 0), 0)
  const visibleEdges = visibleGraph.edges.length

  return (
    <div className="kg-console" aria-label="knowledge console">
      <header className="kg-plate">
        <span className="kg-power" aria-hidden />
        <strong>kg-01</strong>
        <span>knowledge console</span>
        <Button aria-pressed={paused} onClick={() => {
          pausedRef.current = !paused
          setPaused(!paused)
          if (pausedRef.current) simRef.current?.sim.stop()
          else applyForces()
        }}>{paused ? 'Resume layout' : 'Pause layout'}</Button>
      </header>
      <div className="kg-top">
          <Lcd tag="sys" size="sm" className="kg-status">
            <span className="kg-status-line">
              <b>{mode}</b>
              <span aria-hidden>·</span>
              <LcdDigits value={String(visibleCount)} ghost="888" /> nodes
              <span aria-hidden>·</span>
              {visibleEdges} wires
              {mode === 'orbit' && !selectedNode && <span className="kg-hint"> · select a node to orbit</span>}
              {mode === 'drift' && !selectedNode && <span className="kg-hint"> · drag · scroll · press a node</span>}
            </span>
          </Lcd>
          <div className="kg-find">
            <Field data-kit="field">
              <FieldLabel data-kit="label">find</FieldLabel>
              <Input
                data-kit="input"
                value={query}
                placeholder="search nodes…"
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hits[0]) focusNode(hits[0])
                  if (e.key === 'Escape') setQuery('')
                }}
              />
            </Field>
            {hits.length > 0 && (
              <ul className="kg-hits" aria-label="Search results">
                {hits.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => focusNode(n)}>
                      <span data-kind={n.kind}>{n.kind}</span> {n.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="kg-body">
          <div className="kg-rail" role="group" aria-label="Layer switches">
            {KINDS.map((k) => (
              <div key={k.kind} className="kg-rail-row">
                <Switch
                  label={`${k.label} ${counts[k.kind]}`}
                  defaultChecked
                  onCheckedChange={(on) => toggleKind(k.kind, on)}
                />
              </div>
            ))}
            <BarGraph
              label="nodes per layer"
              values={KINDS.map((k) => (enabled.has(k.kind) ? counts[k.kind] : 0))}
              segments={16}
            />
          </div>

          <div className="kg-display">
            <Display label={`map · ${visibleCount} nodes`} aspect="auto">
              <div ref={screenRef} className="kg-screen">
              <canvas
                ref={canvasRef}
                role="img"
                tabIndex={0}
                aria-label={`Knowledge graph: ${counts.blog} posts, ${counts.lab} lab studies, ${counts.study} chapters, linked by tags and concepts. Arrow keys pan, plus and minus zoom, Enter opens the selected node.`}
                onKeyDown={onCanvasKey}
              />
              </div>
            </Display>
          </div>

          <aside className="kg-panel">
            <Segmented
              label="layout"
              options={['drift', 'lanes', 'orbit']}
              defaultValue="drift"
              onValueChange={(v) => setMode(v as LayoutMode)}
            />
            <Lcd tag={selectedNode ? selectedNode.kind : 'idle'} size="md" className="kg-readout">
              {selectedNode ? (
                <div className="kg-selection" key={selectedNode.id}>
                  <div className="kg-sel-head">
                    {selectedNode.art && (
                      <img src={selectedNode.art} alt="" width={34} height={34} className="kg-sel-art" />
                    )}
                    <Badge tone={KINDS.find((k) => k.kind === selectedNode.kind)?.tone ?? 'neutral'}>
                      {selectedNode.kind}
                    </Badge>
                    {selectedNode.meta && <span className="kg-meta">{selectedNode.meta}</span>}
                    <span className="kg-meta">{neighborIds.size} links</span>
                  </div>
                  <div className="kg-sel-title">{selectedNode.label}</div>
                  {selectedNode.blurb && <p className="kg-sel-blurb">{selectedNode.blurb}</p>}
                  {selectedNode.href && (
                    <Button tone="primary" onClick={() => router.push(selectedNode.href!)}>
                      open →
                    </Button>
                  )}
                </div>
              ) : (
                <div className="kg-idle">nothing selected. the map is live; wires light up where things connect</div>
              )}
            </Lcd>
            <div className="kg-neighbors">
              {selectedNode && neighbors.length > 0 ? (
                <ItemList
                  label="linked"
                  rows={neighbors}
                  rowKey={(n) => n.id}
                  value={selected ?? ''}
                  onValueChange={(id) => setSelected(id)}
                  columns={[
                    { key: 'kind', label: 'kind', width: '4.5rem', render: (n: KGNode) => <span data-kind={n.kind}>{n.kind}</span> },
                    { key: 'label', label: 'name', render: (n: KGNode) => <span>{n.label}<small className="block">{[...new Set(visibleGraph.edges.filter((e) => (e.source === selected && e.target === n.id) || (e.target === selected && e.source === n.id)).map((e) => e.evidence === 'normalized-tag-match' ? 'Automatic tag-name match' : e.evidence === 'authored-glossary' ? 'Chapter glossary' : e.kind === 'category' ? 'Registry category' : 'Shared tag'))].join(', ')}</small></span> },
                  ]}
                />
              ) : (
                <ItemList
                  label="biggest hubs"
                  rows={topHubs}
                  rowKey={(n) => n.id}
                  value={selected ?? ''}
                  onValueChange={(id) => {
                    const n = topHubs.find((t) => t.id === id)
                    if (n) focusNode(n)
                  }}
                  columns={[
                    { key: 'kind', label: 'kind', width: '4.5rem', render: (n: KGNode) => <span data-kind={n.kind}>{n.kind}</span> },
                    { key: 'label', label: 'name', render: (n: KGNode) => n.label },
                  ]}
                />
              )}
            </div>
          </aside>
        </div>

        <div className="kg-deck">
          <DPad label="Pan map" onUp={() => panBy(0, 60)} onDown={() => panBy(0, -60)} onLeft={() => panBy(60, 0)} onRight={() => panBy(-60, 0)} />
          <Slider label="zoom" value={zoom} min={ZOOM_MIN} max={ZOOM_MAX} step={0.05} onValueChange={setViewZoom} />
          <Button tone="secondary" onClick={fit}>
            fit
          </Button>
          <Button
            tone="secondary"
            onClick={() => {
              fly.current = { x: 0, y: 0, z: 1 }
              setZoom(1)
              setSelected(null)
            }}
          >
            reset
          </Button>
        </div>
    </div>
  )
}
