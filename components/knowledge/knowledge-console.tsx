'use client'

import * as React from 'react'
import { Network, Columns3, Orbit, Cloud } from 'lucide-react'
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
import {
  forceCollide as forceCollide3d,
  forceLink as forceLink3d,
  forceManyBody as forceManyBody3d,
  forceSimulation as forceSimulation3d,
  forceX as forceX3d,
  forceY as forceY3d,
  forceZ as forceZ3d,
} from 'd3-force-3d'
import type { KGEdge, KGNode, KnowledgeGraph, NodeKind } from '@/lib/knowledge/graph'
import { Field, FieldLabel } from '@ui-sdk/react/field'
import { Input } from '@ui-sdk/react/input'
import { Display } from '@/components/ui/display'
import { Lcd, LcdDigits } from '@/components/ui/lcd'
import { haptic } from '@/lib/haptics'
import { DPad } from '@/components/ui/dpad'
import { Slider } from '@/components/ui/slider'
import { BarGraph } from '@/components/ui/bar-graph'
import { ItemList } from '@/components/ui/item-list'
import { SegmentedPicker } from '@/components/fluid/SegmentedPicker'
import { SpringSwitch } from '@/components/fluid/SpringSwitch'
import { SpringButton } from '@/components/fluid/SpringButton'
import { Button } from '@/components/ui/hardware/button'
import { Badge } from '@/components/ui/hardware/badge'

type SimNode = SimulationNodeDatum & KGNode & { degree: number; hop: number; z?: number; vz?: number; fz?: number | null }
type SimLink = SimulationLinkDatum<SimNode> & { kind: KGEdge['kind'] }

/** Row marker mirroring the canvas: art hubs get their engraving disc, other
 *  hubs a kind-coloured ring, content kinds a filled square. */
function NodeMark({ node }: { node: KGNode }) {
  if (node.art)
    return <img src={node.art} alt="" data-kind={node.kind} className="kg-mark-art" width={30} height={30} />
  return <span data-kind={node.kind} data-shape={isHub(node.kind) ? 'disc' : 'square'} className="kg-mark" aria-hidden />
}

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

/** Percentile bounds — the 1st/99th percentile per axis. A few stray nodes
 *  far from the cluster must not shrink the whole map to fit them in. */
const nodeBounds = (nodes: { x?: number; y?: number }[]) => {
  const xs = nodes.map((n) => n.x!).filter(Number.isFinite).sort((a, b) => a - b)
  const ys = nodes.map((n) => n.y!).filter(Number.isFinite).sort((a, b) => a - b)
  if (!xs.length || !ys.length) return null
  const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]
  return { x0: q(xs, 0.01), x1: q(xs, 0.99), y0: q(ys, 0.01), y1: q(ys, 0.99) }
}

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

type LayoutMode = 'drift' | 'lanes' | 'orbit' | 'cloud'

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
  const zoomGoal = React.useRef(1) // view.zoom eases toward this every frame
  const fly = React.useRef<{ x: number; y: number; z: number } | null>(null)
  // Cloud mode: turntable camera eased toward fly3 targets, plus the last
  // frame's projected points for screen-space hit-testing.
  const cloudRef = React.useRef({ yaw: -0.5, pitch: 0.24 })
  const fly3 = React.useRef<{ yaw: number; pitch: number } | null>(null)
  const projRef = React.useRef<{ n: SimNode; px: number; py: number; s: number; zc: number }[]>([])
  // Paint scheduler: frames only render while the world is awake — any
  // interaction, mode change or pending image bumps this clock.
  const awakeRef = React.useRef(0)
  const simRef = React.useRef<{
    sim: ReturnType<typeof forceSimulation<SimNode>>
    sim3: ReturnType<typeof forceSimulation3d<SimNode>>
    nodes: SimNode[]
    links: SimLink[]
    nodes3: SimNode[]
    links3: SimLink[]
    neighbors: Map<string, Set<string>>
    arts: Map<string, HTMLImageElement>
    warmed3: boolean
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

  const degreeMap = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const e of graph.edges) {
      m.set(e.source, (m.get(e.source) ?? 0) + 1)
      m.set(e.target, (m.get(e.target) ?? 0) + 1)
    }
    return m
  }, [graph])

  const hits = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    // Match quality first (exact > prefix > substring), then connectivity —
    // 'physics' should find the physics hub, not geophysics by graph order.
    return visibleGraph.nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .map((n) => {
        const l = n.label.toLowerCase()
        return { n, rank: l === q ? 0 : l.startsWith(q) ? 1 : 2 }
      })
      .sort((a, b) => a.rank - b.rank || (degreeMap.get(b.n.id) ?? 0) - (degreeMap.get(a.n.id) ?? 0))
      .slice(0, 7)
      .map((h) => h.n)
  }, [visibleGraph, query, degreeMap])

  // The most-connected hubs, for the idle panel; the fastest way in.
  const topHubs = React.useMemo(() => {
    return graph.nodes
      .filter((n) => isHub(n.kind) && enabled.has(n.kind))
      .map((n) => ({ n, links: degreeMap.get(n.id) ?? 0 }))
      .sort((a, b) => b.links - a.links)
      .slice(0, 8)
  }, [graph, enabled, degreeMap])

  // ── Force tuning per layout mode ─────────────────────────────────────

  // Modes don't swap engines; they retune the same sim, which is what makes
  // lanes feel like a node graph that still breathes. Shared by the sim
  // effect (initial layout) and the mode/selection effects below.
  const applyForces = React.useCallback(() => {
    const s = simRef.current
    if (!s) return
    awakeRef.current = performance.now() + 2500
    const { sim, nodes, neighbors } = s
    const modeNow = modeRef.current
    const link = sim.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>
    for (const n of nodes) {
      n.fx = null
      n.fy = null
      n.hop = -1
    }

    if (modeNow === 'cloud') {
      // The 3D world is a separate sim over copies of the same nodes. Freeze
      // the flat layout and warm the cloud once per rebuild; after that a low
      // simmer keeps it alive without churning.
      sim.stop()
      const { sim3, nodes3 } = s
      for (const n of nodes3) { n.fx = null; n.fy = null; n.fz = null }
      if (!s.warmed3) {
        sim3.stop()
        for (let i = 0; i < 200; i += 1) sim3.tick()
        s.warmed3 = true
      }
      if (reduceMotion.current || pausedRef.current) {
        sim3.stop()
        for (let i = 0; i < 60; i += 1) sim3.tick()
      } else sim3.alpha(0.25).restart()
      return
    }
    s.sim3?.stop()

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
      zoomGoal.current = z
      setZoom(z)
    } else {
      // Longer links + stronger repulsion keep neighbours far enough apart
      // that their labels resolve instead of stacking. Hubs repel hardest —
      // they carry the always-on labels.
      link.strength((l) => (l.kind === 'concept' ? 0.5 : 0.32)).distance((l) => (l.kind === 'category' ? 70 : 46))
      sim.force('x', forceX<SimNode>(0).strength(0.04))
      sim.force('y', forceY<SimNode>(0).strength(0.05))
      sim.force('charge', forceManyBody<SimNode>().strength((n) => (isHub(n.kind) ? -80 - n.degree * 8 : -42)))
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
      .force('collide', forceCollide<SimNode>().radius((n) => radius(n) + (n.art ? (isHub(n.kind) ? 16 : 9) : 7)))
      .stop()
    const arts = new Map<string, HTMLImageElement>()
    const wake = (ms = 900) => {
      awakeRef.current = Math.max(awakeRef.current, performance.now() + ms)
    }
    for (const n of nodes) {
      if (!n.art) continue
      const img = new Image()
      img.onload = () => wake(700)
      img.src = n.art
      arts.set(n.id, img)
    }
    // Font variants + a measure cache — canvas measureText costs real layout
    // work, and we measured every label candidate every frame.
    const FONTS = [
      '600 10.5px "IBM Plex Mono", monospace',
      '400 10.5px "IBM Plex Mono", monospace',
      '400 9.5px "IBM Plex Mono", monospace',
    ] as const
    const textWCache = new Map<string, number>()
    const measure = (fi: number, text: string) => {
      const key = `${fi}${text}`
      let wv = textWCache.get(key)
      if (wv === undefined) {
        ctx.font = FONTS[fi]
        wv = ctx.measureText(text).width
        textWCache.set(key, wv)
      }
      return wv
    }
    // Artwork sprites: a node's disc/thumb never changes once its image is
    // loaded, so the plate + clip + ring bake once into an offscreen canvas
    // and each frame pays a single drawImage instead of the ~7-call path.
    const sprites = new Map<string, HTMLCanvasElement>()
    // Cloud node→projection lookup, reused across frames instead of a fresh
    // Map + intermediate array every paint.
    const byNode = new Map<SimNode, { n: SimNode; px: number; py: number; s: number; zc: number }>()
    const spriteFor = (n: SimNode, art: HTMLImageElement): HTMLCanvasElement | null => {
      const cached = sprites.get(n.id)
      if (cached) return cached
      if (!art.complete || art.naturalWidth === 0) return null
      const hub = isHub(n.kind)
      const SZ = hub ? 72 : 64
      const c = document.createElement('canvas')
      c.width = c.height = SZ
      const g = c.getContext('2d')!
      const col = paletteRef.current!.kind[n.kind]
      const TAU = Math.PI * 2
      if (hub) {
        g.globalAlpha = 0.35
        g.fillStyle = col
        g.beginPath(); g.arc(SZ / 2, SZ / 2, SZ / 2, 0, TAU); g.fill()
        g.globalAlpha = 1
        g.save()
        g.beginPath(); g.arc(SZ / 2, SZ / 2, SZ / 2 - 3, 0, TAU); g.clip()
        g.drawImage(art, 3, 3, SZ - 6, SZ - 6)
        g.restore()
        g.strokeStyle = col
        g.lineWidth = 2
        g.beginPath(); g.arc(SZ / 2, SZ / 2, SZ / 2 - 2, 0, TAU); g.stroke()
      } else {
        const s = Math.min(art.naturalWidth, art.naturalHeight)
        const cx0 = (art.naturalWidth - s) / 2
        const cy0 = (art.naturalHeight - s) / 2
        g.save()
        g.beginPath(); g.roundRect(2, 2, SZ - 4, SZ - 4, 8); g.clip()
        g.drawImage(art, cx0, cy0, s, s, 2, 2, SZ - 4, SZ - 4)
        g.restore()
        g.strokeStyle = col
        g.lineWidth = 2
        g.beginPath(); g.roundRect(2, 2, SZ - 4, SZ - 4, 8); g.stroke()
      }
      sprites.set(n.id, c)
      return c
    }

    // The cloud world: fresh node copies so the two sims never fight over
    // positions. A weak center pull plus 3D charge/link forces settle it into
    // a sphere on first activation (warmed3 gates the synchronous warm-up).
    // vz MUST be seeded: d3-force-3d initializes nodes at nDim=2 inside
    // forceSimulation(), before numDimensions(3) lands, so an undefined vz
    // turns z NaN on the first tick.
    const nodes3: SimNode[] = nodes.map((n) => ({ ...n, x: n.x, y: n.y, z: (Math.random() - 0.5) * 24, vz: 0 }))
    const byId3 = new Map(nodes3.map((n) => [n.id, n]))
    const links3: SimLink[] = links
      .map((e) => {
        const src = byId3.get((e.source as SimNode).id ?? (e.source as string))
        const tgt = byId3.get((e.target as SimNode).id ?? (e.target as string))
        return src && tgt ? ({ ...e, source: src, target: tgt } as SimLink) : null
      })
      .filter((e): e is SimLink => e != null)
    const sim3 = forceSimulation3d<SimNode>(nodes3)
      .numDimensions(3)
      .force('link', forceLink3d<SimNode, SimLink>(links3).id((n) => n.id).distance(38).strength(0.3))
      .force('charge', forceManyBody3d<SimNode>().strength((n) => (isHub(n.kind) ? -70 - n.degree * 6 : -28)))
      .force('x', forceX3d<SimNode>(0).strength(0.06))
      .force('y', forceY3d<SimNode>(0).strength(0.06))
      .force('z', forceZ3d<SimNode>(0).strength(0.06))
      .force('collide', forceCollide3d<SimNode>().radius((n) => radius(n) + (n.art ? (isHub(n.kind) ? 16 : 9) : 7)))
      .stop()

    simRef.current = { sim, sim3, nodes, links, nodes3, links3, neighbors, arts, warmed3: false }
    // Configure forces, then pre-run synchronously so the first paint is
    // already organized; a low simmer stays live for drags and toggles.
    applyForces()
    sim.stop()
    for (let i = 0; i < 220; i += 1) sim.tick()
    if (!reduceMotion.current && !pausedRef.current) sim.alpha(0.18).restart()

    // Auto-fit once after the warm-up so the settled map starts fully in
    // frame instead of cropped at whatever the default zoom happens to show.
    {
      const b = nodeBounds(nodes)
      const box = screen.getBoundingClientRect()
      if (b && box.width > 0 && box.height > 0) {
        const z = Math.max(ZOOM_MIN, Math.min(box.width / (b.x1 - b.x0 + 160), box.height / (b.y1 - b.y0 + 160), ZOOM_MAX))
        view.current = { x: -((b.x0 + b.x1) / 2) * z, y: -((b.y0 + b.y1) / 2) * z, zoom: z }
        zoomGoal.current = z
        setZoom(z)
      }
    }

    const ctx = canvas.getContext('2d')!
    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1

    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      // Ease zoom toward its goal in every mode; wheel/pinch keeps the
      // anchored screen point pinned while the scale catches up.
      if (!fly.current && view.current.zoom !== zoomGoal.current) {
        const vz = view.current.zoom
        const zg = zoomGoal.current
        const next = reduceMotion.current ? zg : vz + (zg - vz) * 0.2
        view.current.zoom = Math.abs(zg - next) < 0.002 ? zg : next
        if (zoomAnchor && modeRef.current !== 'cloud') {
          const k = view.current.zoom / vz
          view.current.x = zoomAnchor.x - (zoomAnchor.x - view.current.x) * k
          view.current.y = zoomAnchor.y - (zoomAnchor.y - view.current.y) * k
        }
        if (view.current.zoom === zg) zoomAnchor = null
        setZoom(view.current.zoom)
      }
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

      const pal = paletteRef.current!
      const sel = selectedRef.current
      const hov = hoveredRef.current
      const lit = sel ? neighbors.get(sel) : hov ? neighbors.get(hov) : null

      // ── Cloud: the same graph as a tumbling point cloud ─────────────
      // The 3D sim owns positions; here we rotate world coords by yaw/pitch,
      // divide by camera depth, and paint far-to-near so occlusions resolve
      // like a real volume. Everything is screen-space — no ctx transform.
      if (modeRef.current === 'cloud') {
        const cloud = cloudRef.current
        const f3 = fly3.current
        if (f3) {
          // Ease yaw along the shortest arc; reduced motion snaps.
          const dy = reduceMotion.current ? f3.yaw - cloud.yaw : Math.atan2(Math.sin(f3.yaw - cloud.yaw), Math.cos(f3.yaw - cloud.yaw))
          cloud.yaw += dy * (reduceMotion.current ? 1 : 0.14)
          cloud.pitch += (f3.pitch - cloud.pitch) * (reduceMotion.current ? 1 : 0.14)
          if (Math.abs(f3.yaw - cloud.yaw) < 0.004 && Math.abs(f3.pitch - cloud.pitch) < 0.004) {
            cloud.yaw = f3.yaw
            cloud.pitch = f3.pitch
            fly3.current = null
          }
        } else {
          // Flick momentum decays after release; the idle tumble fades back
          // in over ~1.5s of stillness rather than snapping back on.
          if (activePointer === null && (Math.abs(spin.yaw) > 0.00008 || Math.abs(spin.pitch) > 0.00008)) {
            cloud.yaw += spin.yaw
            cloud.pitch = Math.min(1.3, Math.max(-1.3, cloud.pitch + spin.pitch))
            spin.yaw *= 0.9
            spin.pitch *= 0.9
          }
          if (!reduceMotion.current && !pausedRef.current && activePointer === null && !pinch) {
            const ramp = Math.min(1, Math.max(0, (performance.now() - idleT - 1400) / 1500))
            cloud.yaw += 0.0016 * ramp
          }
        }
        const cy = Math.cos(cloud.yaw)
        const sy = Math.sin(cloud.yaw)
        const cp = Math.cos(cloud.pitch)
        const sp = Math.sin(cloud.pitch)
        const F = 820 // focal length
        const D = 1400 // camera distance from the origin-centred cloud
        const zoomScale = view.current.zoom
        const proj: { n: SimNode; px: number; py: number; s: number; zc: number }[] = []
        let zMin = Infinity
        let zMax = -Infinity
        for (const n of nodes3) {
          const x1 = n.x! * cy + n.z! * sy
          const z1 = -n.x! * sy + n.z! * cy
          const y1 = n.y! * cp - z1 * sp
          const z2 = n.y! * sp + z1 * cp
          const zc = Math.max(60, z2 + D) // clamp: a node past the camera would flip scale
          const s = (F / zc) * zoomScale
          const px = w / 2 + x1 * s
          const py = h / 2 + y1 * s
          zMin = Math.min(zMin, zc)
          zMax = Math.max(zMax, zc)
          proj.push({ n, px, py, s, zc })
        }
        projRef.current = proj
        const span = Math.max(1, zMax - zMin)
        const fade = (zc: number) => Math.max(0.14, 1 - ((zc - zMin) / span) * 0.86)

        // Straight edges: patch-wire tangents are a 2D signature; in a volume
        // they would read as artifacts. Depth fades far wires into the glass.
        // Depth is quantized into a few bands so quiet wires batch by
        // (kind, band) — ~14 strokes instead of ~750 — while hot wires stay
        // solo at full alpha.
        byNode.clear()
        for (const p of proj) byNode.set(p.n, p)
        const NB = 7
        const bInk: { ps: (typeof proj)[0]; pt: (typeof proj)[0] }[][] = Array.from({ length: NB }, () => [])
        const bCon: typeof bInk = Array.from({ length: NB }, () => [])
        const hot3: { l: SimLink; ps: (typeof proj)[0]; pt: (typeof proj)[0] }[] = []
        for (const l of links3) {
          const ps = byNode.get(l.source as SimNode)
          const pt = byNode.get(l.target as SimNode)
          if (!ps || !pt) continue
          if (lit && (ps.n.id === sel || ps.n.id === hov || pt.n.id === sel || pt.n.id === hov)) {
            hot3.push({ l, ps, pt })
            continue
          }
          const depth = (fade(ps.zc) + fade(pt.zc)) / 2
          const q = Math.min(NB - 1, Math.max(0, Math.round(depth * (NB - 1))))
          ;(l.kind === 'concept' ? bCon : bInk)[q].push({ ps, pt })
        }
        for (let q = 0; q < NB; q++) {
          for (const [batch, style, alpha] of [
            [bInk[q], pal.ink, 0.14 * (q / (NB - 1))],
            [bCon[q], pal.kind.concept, 0.3 * (q / (NB - 1))],
          ] as const) {
            if (!batch.length) continue
            ctx.strokeStyle = style
            ctx.globalAlpha = alpha
            ctx.lineWidth = 0.7
            ctx.beginPath()
            for (const { ps, pt } of batch) {
              ctx.moveTo(ps.px, ps.py)
              ctx.lineTo(pt.px, pt.py)
            }
            ctx.stroke()
          }
        }
        for (const { l, ps, pt } of hot3) {
          ctx.strokeStyle = l.kind === 'concept' ? pal.kind.concept : pal.ink
          ctx.globalAlpha = 0.85
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(ps.px, ps.py)
          ctx.lineTo(pt.px, pt.py)
          ctx.stroke()
        }
        ctx.globalAlpha = 1

        // Painter's pass: farthest first so near nodes overlap correctly.
        proj.sort((a, b) => b.zc - a.zc)
        for (const p of proj) {
          const n = p.n
          const r = Math.max(1.1, radius(n) * p.s)
          const depth = fade(p.zc)
          const hot = n.id === sel || n.id === hov
          const linked = lit?.has(n.id) ?? false
          const dimmed = lit != null && !hot && !linked
          ctx.globalAlpha = (dimmed ? 0.12 : 1) * depth
          ctx.fillStyle = pal.kind[n.kind]
          const art = simRef.current?.arts.get(n.id)
          // Depth horizon: the far face fades to ~14% alpha — clipped art
          // there is illegible but still costs a save/clip/drawImage. Under
          // ~5px the marker earns the same pixels for free. Artwork blits from
          // the same baked sprites as the flat map.
          const useArt = art && r * (isHub(n.kind) ? 3 : 2.6) >= 5
          const sp = useArt ? spriteFor(n, art!) : null
          if (isHub(n.kind) && sp) {
            const d = r * 3
            ctx.drawImage(sp, p.px - d / 2, p.py - d / 2, d, d)
          } else if (isHub(n.kind)) {
            ctx.beginPath()
            ctx.arc(p.px, p.py, r, 0, Math.PI * 2)
            ctx.globalAlpha = (dimmed ? 0.08 : 0.3) * depth
            ctx.fill()
            ctx.globalAlpha = (dimmed ? 0.12 : 1) * depth
            ctx.beginPath()
            ctx.arc(p.px, p.py, r * 0.62, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = pal.kind[n.kind]
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.arc(p.px, p.py, r, 0, Math.PI * 2)
            ctx.stroke()
          } else if (sp) {
            // Content thumbnail: center-cropped square in a kind ring.
            const d = r * 2.6
            ctx.drawImage(sp, p.px - d / 2, p.py - d / 2, d, d)
          } else {
            const q = r * 0.9
            ctx.fillRect(p.px - q, p.py - q, q * 2, q * 2)
          }
          if (hot) {
            ctx.globalAlpha = depth
            ctx.strokeStyle = pal.kind[n.kind]
            ctx.lineWidth = 1.6
            ctx.beginPath()
            ctx.arc(p.px, p.py, r + 3.5, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
        // Labels on the near face: hubs inside the front 35% of the depth
        // span (plus anything hot/linked), capped so the face stays readable
        // at any cloud radius. Absolute scale would gate the wrong band
        // whenever the sim tightens or loosens.
        const labelers = proj
          .filter((p) => (isHub(p.n.kind) && p.zc < zMin + span * 0.35) || p.n.id === sel || p.n.id === hov || (lit?.has(p.n.id) ?? false))
          .sort((a, b) => a.zc - b.zc)
          .slice(0, Math.min(48, Math.max(14, Math.round(w / 22))))
        // Nearest labels claim space first; overlapping ones drop rather
        // than stack text-on-text.
        const placed3: { x0: number; y0: number; x1: number; y1: number }[] = []
        for (const p of labelers) {
          const n = p.n
          const r = Math.max(1.1, radius(n) * p.s)
          const depth = fade(p.zc)
          const strong = n.id === sel || n.id === hov
          const fi = strong ? 0 : isHub(n.kind) ? 1 : 2
          ctx.font = FONTS[fi]
          const text = n.label.length > 38 ? `${n.label.slice(0, 37)}…` : n.label
          const tw = measure(fi, text)
          const tx = Math.min(Math.max(p.px + r + 4, 6), Math.max(6, w - 6 - tw))
          const ty = Math.min(Math.max(p.py + 3, 12), h - 6)
          if (placed3.some((q) => tx < q.x1 + 3 && tx + tw + 3 > q.x0 && ty - 9 < q.y1 + 1 && ty + 3 + 1 > q.y0)) continue
          ctx.globalAlpha = Math.min(1, depth + 0.15)
          ctx.strokeStyle = 'rgba(10,10,10,0.9)'
          ctx.lineWidth = 3
          ctx.strokeText(text, tx, ty)
          ctx.fillStyle = strong ? pal.ink : pal.dim
          ctx.fillText(text, tx, ty)
          placed3.push({ x0: tx, y0: ty - 9, x1: tx + tw, y1: ty + 3 })
        }
        ctx.globalAlpha = 1
        return
      }

      ctx.save()
      const { x, y, zoom: z } = view.current
      ctx.translate(w / 2 + x, h / 2 + y)
      ctx.scale(z, z)

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
      // Off-screen cull: a bezier stays inside its endpoints' bounding box,
      // so pairs beyond the same viewport edge can't produce visible ink.
      // Quiet wires batch into three strokes (one per kind) instead of ~750
      // beginPath/stroke calls; only hot wires still draw solo so their
      // endpoints can light up.
      const quiet: { cat: SimLink[]; con: SimLink[]; tag: SimLink[] } = { cat: [], con: [], tag: [] }
      const hotLinks: { l: SimLink; s: SimNode; t: SimNode }[] = []
      for (const l of links) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        const ex0 = s.x! * z + w / 2 + x
        const ex1 = t.x! * z + w / 2 + x
        const ey0 = s.y! * z + h / 2 + y
        const ey1 = t.y! * z + h / 2 + y
        if ((ex0 < -60 && ex1 < -60) || (ex0 > w + 60 && ex1 > w + 60) || (ey0 < -60 && ey1 < -60) || (ey0 > h + 60 && ey1 > h + 60)) continue
        if (lit && (s.id === sel || s.id === hov || t.id === sel || t.id === hov)) hotLinks.push({ l, s, t })
        else if (l.kind === 'category') quiet.cat.push(l)
        else if (l.kind === 'concept') quiet.con.push(l)
        else quiet.tag.push(l)
      }
      const strokeBatch = (batch: SimLink[], style: string, alpha: number) => {
        if (!batch.length) return
        ctx.strokeStyle = style
        ctx.globalAlpha = alpha
        ctx.lineWidth = 0.7
        ctx.beginPath()
        for (const l of batch) {
          const s = l.source as SimNode
          const t = l.target as SimNode
          const mx = (s.x! + t.x!) / 2
          ctx.moveTo(s.x!, s.y!)
          ctx.bezierCurveTo(mx, s.y!, mx, t.y!, t.x!, t.y!)
        }
        ctx.stroke()
      }
      strokeBatch(quiet.cat, pal.ink, 0.07)
      strokeBatch(quiet.con, pal.kind.concept, 0.32)
      strokeBatch(quiet.tag, pal.ink, 0.16)
      for (const { l, s, t } of hotLinks) {
        ctx.strokeStyle = l.kind === 'concept' ? pal.kind.concept : pal.ink
        ctx.globalAlpha = 0.85
        ctx.lineWidth = 1.5
        const mx = (s.x! + t.x!) / 2
        ctx.beginPath()
        ctx.moveTo(s.x!, s.y!)
        ctx.bezierCurveTo(mx, s.y!, mx, t.y!, t.x!, t.y!)
        ctx.stroke()
        ctx.fillStyle = l.kind === 'concept' ? pal.kind.concept : pal.ink
        for (const p of [s, t]) {
          ctx.beginPath()
          ctx.arc(p.x!, p.y!, 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      const labelZ = z > 1.45
      const labelCands: {
        n: SimNode
        tx: number
        ty: number
        shown: string
        align: 'left' | 'right'
        textW: number
        alt: { tx: number; align: 'left' | 'right' } | null
        pri: number
        strong: boolean
        dimmed: boolean
        fi: number
      }[] = []
      for (const n of nodes) {
        const r = radius(n)
        // Off-screen cull: margin covers the artwork disc and selection ring,
        // so a skipped node could not have produced visible ink either.
        const sx = n.x! * z + w / 2 + x
        const sy = n.y! * z + h / 2 + y
        const cm = r * 1.7 + 12
        if (sx < -cm || sx > w + cm || sy < -cm || sy > h + cm) continue
        const hot = n.id === sel || n.id === hov
        const linked = lit?.has(n.id) ?? false
        const dimmed = lit != null && !hot && !linked
        ctx.globalAlpha = dimmed ? 0.15 : 1
        ctx.fillStyle = pal.kind[n.kind]
        // Detail horizon: a node under ~1.2px on screen is a dot — no disc
        // geometry, ring, or label work. Clipped artwork under ~5px reads as
        // noise but costs a full clip+drawImage+restore, so it falls back to
        // the plain marker until it earns its pixels.
        if (r * z < 1.2) {
          ctx.fillRect(sx - 1, sy - 1, 2, 2)
          ctx.globalAlpha = 1
          continue
        }
        const art = simRef.current?.arts.get(n.id)
        const artPx = r * (isHub(n.kind) ? 3 : 2.6) * z
        const useArt = art != null && artPx >= 5
        let sp: HTMLCanvasElement | null = null
        if (isHub(n.kind)) {
          sp = useArt ? spriteFor(n, art!) : null
          if (sp) {
            // Category artwork: baked disc — plate, clip, ring all in the sprite.
            const d = r * 3
            ctx.globalAlpha = dimmed ? 0.18 : 1
            ctx.drawImage(sp, n.x! - d / 2, n.y! - d / 2, d, d)
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
        } else if (useArt && (sp = spriteFor(n, art!))) {
          // Content thumbnail: center-cropped square in a kind ring — smaller
          // and squarer than the hub discs so the hierarchy stays readable.
          const d = r * 2.6
          ctx.drawImage(sp, n.x! - d / 2, n.y! - d / 2, d, d)
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
        // Labels only while the node itself is on screen; otherwise panning
        // leaves clipped mid-word fragments floating at the bezel. The grace
        // margin is just past the node disc so edge nodes keep their labels.
        const margin = r + 4
        if ((isHub(n.kind) || labelZ || hot || linked) && sx > -margin && sx < w + margin && sy > -margin && sy < h + margin) {
          const strong = hot || n.id === sel
          const fi = strong ? 0 : isHub(n.kind) ? 1 : 2
          const text = n.label.length > 38 ? `${n.label.slice(0, 37)}…` : n.label
          const gap = n.art && useArt ? r * 1.5 + 6 : r + 3
          let tx = n.x! + gap
          let ty = n.y! + 3
          let shown = text
          let align: 'left' | 'right' = 'left'
          // Keep the label inside the bezel: flip to the node's left when it
          // would run past the right edge; if it fits neither side, ellipsize
          // to the room that remains. Lift above when it falls off the bottom.
          // Screen space = world * z + (viewport/2 + camera).
          const textW = measure(fi, text)
          const toScreen = (wx: number) => wx * z + w / 2 + x
          if (toScreen(tx + textW) > w - 6) {
            if (toScreen(n.x! - gap - textW) > 6) {
              tx = n.x! - gap
              align = 'right'
            } else {
              const avail = Math.max(0, (w - 6 - toScreen(tx)) / z)
              let len = text.length
              while (len > 2 && measure(fi, `${text.slice(0, len - 1)}…`) > avail) len--
              shown = avail > 10 ? `${text.slice(0, Math.max(1, len - 1))}…` : ''
            }
          }
          if (ty * z + h / 2 + y > h - 6) ty = n.y! - r - 6
          else if (ty * z + h / 2 + y < 12) ty = n.y! + r + 10
          // Dimmed nodes don't compete for label space — during selection
          // only the lit neighborhood earns text.
          if (shown && !dimmed) {
            // Alternate side as a fallback slot for the collision pass.
            const altTx = align === 'left' ? n.x! - gap : n.x! + gap
            const altFits = align === 'left' ? toScreen(altTx - textW) > 6 : toScreen(altTx + textW) < w - 6
            labelCands.push({
              n, tx, ty, shown, align, textW, dimmed, fi,
              alt: altFits ? { tx: altTx, align: align === 'left' ? 'right' : 'left' } : null,
              pri: n.id === sel ? 0 : hot ? 1 : linked ? 2 : isHub(n.kind) ? 3 : 4,
              strong: hot || n.id === sel,
            })
          }
        }
        ctx.globalAlpha = 1
      }

      // Greedy label placement: candidates draw in priority order and only
      // where the screen-space rect is still free — selection > hover >
      // linked > hubs-by-degree > content. Overlaps try the node's other
      // side before dropping, so dense cores keep readable text instead of
      // text-on-text soup.
      labelCands.sort((a, b) => a.pri - b.pri || b.n.degree - a.n.degree)
      // Placed labels live in a coarse screen-space grid — collision probes
      // visit a handful of cells instead of scanning every accepted label.
      const LCELL = 40
      type LRect = { x0: number; y0: number; x1: number; y1: number }
      const labelGrid = new Map<number, LRect[]>()
      const labelHit = (x0: number, y0: number, x1: number, y1: number) => {
        for (let gx = Math.floor((x0 - 3) / LCELL); gx <= Math.floor((x1 + 3) / LCELL); gx++) {
          for (let gy = Math.floor((y0 - 1) / LCELL); gy <= Math.floor((y1 + 1) / LCELL); gy++) {
            const cell = labelGrid.get(gy * 8192 + gx)
            if (cell?.some((p) => x0 < p.x1 + 3 && x1 + 3 > p.x0 && y0 < p.y1 + 1 && y1 + 1 > p.y0)) return true
          }
        }
        return false
      }
      const labelClaim = (x0: number, y0: number, x1: number, y1: number) => {
        const p = { x0, y0, x1, y1 }
        for (let gx = Math.floor((x0 - 3) / LCELL); gx <= Math.floor((x1 + 3) / LCELL); gx++) {
          for (let gy = Math.floor((y0 - 1) / LCELL); gy <= Math.floor((y1 + 1) / LCELL); gy++) {
            const k = gy * 8192 + gx
            const cell = labelGrid.get(k)
            if (cell) cell.push(p)
            else labelGrid.set(k, [p])
          }
        }
      }
      for (const c of labelCands) {
        const spots: { tx: number; align: 'left' | 'right' }[] = [{ tx: c.tx, align: c.align }]
        if (c.alt) spots.push(c.alt)
        for (const spot of spots) {
          const ltx = spot.tx * z + w / 2 + x
          const x0 = spot.align === 'left' ? ltx : ltx - c.textW * z
          const x1 = x0 + c.textW * z
          const cy = c.ty * z + h / 2 + y
          const y0 = cy - 8.5 * z
          const y1 = cy + 2.5 * z
          if (labelHit(x0, y0, x1, y1)) continue
          ctx.font = FONTS[c.fi]
          ctx.strokeStyle = 'rgba(10,10,10,0.9)'
          ctx.lineWidth = 3
          ctx.textAlign = spot.align
          ctx.globalAlpha = c.dimmed ? 0.15 : 1
          ctx.strokeText(c.shown, spot.tx, c.ty)
          ctx.fillStyle = c.pri <= 1 ? pal.ink : pal.dim
          ctx.fillText(c.shown, spot.tx, c.ty)
          ctx.textAlign = 'left'
          ctx.globalAlpha = 1
          labelClaim(x0, y0, x1, y1)
          break
        }
      }
      ctx.restore()
    }

    // Sleep gate: while nothing can produce new ink — sim asleep, no camera
    // easing, no momentum, no live pointer, past the wake window — frames are
    // skipped entirely. The rAF probe itself is a few comparisons; the paint
    // it avoids is hundreds of canvas ops plus label layout.
    // Adaptive resolution: paint cost is EMA'd per frame; sustained frames
    // over ~15ms step the backing-store scale down (fill rate is the real
    // bottleneck at DPR 2 on a 1440px canvas), easy frames step it back up.
    // Cooldown + hysteresis keep it from oscillating.
    let renderScale = Math.min(window.devicePixelRatio || 1, 2)
    let costAvg = 8
    let lastAdapt = 0
    let onScreen = true
    let autoStopped = false
    const frame = () => {
      const s = simRef.current
      const now = performance.now()
      const settling = !pausedRef.current && !reduceMotion.current &&
        ((s?.sim.alpha() ?? 0) > 0.012 || (modeRef.current === 'cloud' && (s?.sim3.alpha() ?? 0) > 0.012))
      const easing = fly.current != null || fly3.current != null ||
        Math.abs(view.current.zoom - zoomGoal.current) > 0.0008 ||
        Math.abs(spin.yaw) + Math.abs(spin.pitch) > 0.00008 ||
        activePointer !== null || pinch != null || dragNode != null
      if (onScreen && (now < awakeRef.current || settling || easing)) {
        const t0 = performance.now()
        paint()
        costAvg += (performance.now() - t0 - costAvg) * 0.08
        if (now - lastAdapt > 2500) {
          const maxScale = Math.min(window.devicePixelRatio || 1, 2)
          const want = costAvg > 15 ? Math.max(1, renderScale - 0.25) : costAvg < 6 ? Math.min(maxScale, renderScale + 0.25) : renderScale
          if (want !== renderScale) {
            renderScale = want
            lastAdapt = now
            resize()
          }
        }
      }
      raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      const box = screen.getBoundingClientRect()
      dpr = renderScale
      w = box.width
      h = box.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      wake(1200)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(screen)
    // Visibility sleep: off-screen consoles freeze paint AND the sims —
    // scrolling past shouldn't burn sim ticks nobody can see.
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) {
        wake(900)
        if (autoStopped) {
          autoStopped = false
          if (!pausedRef.current && !reduceMotion.current) {
            if (modeRef.current === 'cloud') sim3.alpha(0.15).restart()
            else sim.alpha(0.15).restart()
          }
        }
      } else if (!pausedRef.current && !reduceMotion.current) {
        sim.stop()
        sim3.stop()
        autoStopped = true
      }
    })
    io.observe(screen)
    resize()
    wake(6000) // settle window: the sim's opening drift gets real frames
    raf = requestAnimationFrame(frame)

    // ── pointer interaction ──────────────────────────────────────────
    let activePointer: number | null = null
    let dragNode: SimNode | null = null
    let panFrom: { px: number; py: number; vx: number; vy: number } | null = null
    let moved = 0
    // Smooth-motion state: every live touch, a pinch gesture record, spin
    // momentum for the cloud, a wheel-zoom anchor, and the last-interaction
    // clock that gates the idle tumble.
    const ptrs = new Map<number, { x: number; y: number }>()
    let pinch: { d0: number; z0: number } | null = null
    const spin = { yaw: 0, pitch: 0 }
    let zoomAnchor: { x: number; y: number } | null = null
    let idleT = performance.now()

    const toWorld = (e: PointerEvent | WheelEvent) => {
      const box = canvas.getBoundingClientRect()
      const { x, y, zoom: z } = view.current
      return { wx: (e.clientX - box.left - box.width / 2 - x) / z, wy: (e.clientY - box.top - box.height / 2 - y) / z }
    }
    const nodeAt = (e: PointerEvent) => {
      if (modeRef.current === 'cloud') {
        // Screen-space pick against last frame's projection; front node wins ties.
        const box = canvas.getBoundingClientRect()
        const ex = e.clientX - box.left
        const ey = e.clientY - box.top
        let best: SimNode | null = null
        let bd = 14
        let bd2 = bd * bd
        for (const p of projRef.current) {
          const dx = p.px - ex
          const dy = p.py - ey
          const d2 = dx * dx + dy * dy
          const reach = Math.max(radius(p.n) * p.s, 6) + bd
          if (d2 < reach * reach && (!best || d2 < bd2)) {
            best = p.n
            bd = Math.sqrt(d2)
            bd2 = d2
          }
        }
        return best
      }
      const { wx, wy } = toWorld(e)
      let best: SimNode | null = null
      let bd = 14 / view.current.zoom
      let bd2 = bd * bd
      for (const n of nodes) {
        const dx = n.x! - wx
        const dy = n.y! - wy
        const d2 = dx * dx + dy * dy
        const reach = Math.max(radius(n), 6) + bd
        if (d2 < reach * reach && (!best || d2 < bd2)) {
          best = n
          bd = Math.sqrt(d2)
          bd2 = d2
        }
      }
      return best
    }

    const down = (e: PointerEvent) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      idleT = performance.now()
      wake(2600)
      moved = 0
      if (ptrs.size === 2) {
        // Second finger lands: drop any drag/rotate and go to pinch.
        const [a, b] = [...ptrs.values()]
        pinch = { d0: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), z0: zoomGoal.current }
        moved = 99 // a two-finger gesture is never a click
        dragNode = null
        panFrom = null
        return
      }
      if (activePointer !== null || ptrs.size > 2) return
      activePointer = e.pointerId
      canvas.setPointerCapture(e.pointerId)
      fly.current = null
      fly3.current = null
      spin.yaw = 0
      spin.pitch = 0
      if (modeRef.current === 'cloud') {
        // The cloud is a viewing volume: every drag tumbles it; a click on a
        // node still selects via the moved<4 check in `up`.
        panFrom = { px: e.clientX, py: e.clientY, vx: cloudRef.current.yaw, vy: cloudRef.current.pitch }
        return
      }
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
      if (!ptrs.has(e.pointerId)) {
        // Free-floating mouse: hover-pick only — no drag state to update.
        if (e.pointerType !== 'mouse') return
        const n = nodeAt(e)
        if (hoveredRef.current !== (n?.id ?? null)) {
          hoveredRef.current = n?.id ?? null
          canvas.style.cursor = n ? 'pointer' : 'grab'
          wake(900)
        }
        return
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      idleT = performance.now()
      wake(1400)
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        zoomGoal.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.z0 * (d / pinch.d0)))
        const box = canvas.getBoundingClientRect()
        if (modeRef.current !== 'cloud') {
          zoomAnchor = { x: (a.x + b.x) / 2 - box.left - box.width / 2, y: (a.y + b.y) / 2 - box.top - box.height / 2 }
        }
        return
      }
      if (activePointer !== e.pointerId) return
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
        if (modeRef.current === 'cloud') {
          cloudRef.current.yaw = panFrom.vx + (e.clientX - panFrom.px) * 0.006
          cloudRef.current.pitch = Math.min(1.3, Math.max(-1.3, panFrom.vy + (e.clientY - panFrom.py) * 0.006))
          // Track release velocity for the flick: a light exponential
          // average keeps the throw faithful without noise spikes, capped
          // so a hard flick reads as a spin, not a whiplash.
          spin.yaw = Math.min(0.09, Math.max(-0.09, spin.yaw * 0.65 + e.movementX * 0.006 * 0.35))
          spin.pitch = Math.min(0.09, Math.max(-0.09, spin.pitch * 0.65 + e.movementY * 0.006 * 0.35))
        } else {
          view.current.x = panFrom.vx + (e.clientX - panFrom.px)
          view.current.y = panFrom.vy + (e.clientY - panFrom.py)
        }
        moved += Math.abs(e.movementX) + Math.abs(e.movementY)
      }
    }
    const up = (e: PointerEvent) => {
      ptrs.delete(e.pointerId)
      idleT = performance.now()
      wake(1600)
      if (pinch) {
        if (ptrs.size === 1) {
          // The remaining finger resumes a rotate/pan from where it is —
          // rebase the gesture so nothing jumps.
          const rem = [...ptrs.entries()][0]
          activePointer = rem[0]
          panFrom = modeRef.current === 'cloud'
            ? { px: rem[1].x, py: rem[1].y, vx: cloudRef.current.yaw, vy: cloudRef.current.pitch }
            : { px: rem[1].x, py: rem[1].y, vx: view.current.x, vy: view.current.y }
          pinch = null
          return
        }
        if (ptrs.size === 0) {
          pinch = null
          activePointer = null
          panFrom = null
        }
        return
      }
      if (activePointer !== e.pointerId) return
      activePointer = null
      if (dragNode) {
        dragNode.fx = null
        dragNode.fy = null
        sim.alphaTarget(0)
        if (moved < 4) setSelected(dragNode.id)
        dragNode = null
      } else if (panFrom && moved < 4) {
        const n = nodeAt(e)
        if (n) setSelected(n.id)
        else setSelected(null)
      }
      panFrom = null
    }
    const cancelDrag = (e: PointerEvent) => {
      ptrs.delete(e.pointerId)
      if (ptrs.size === 0) pinch = null
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
      idleT = performance.now()
      wake(1400)
      // Set the goal; the paint loop eases toward it and keeps this screen
      // point fixed while it travels (anchor is ignored in cloud mode).
      zoomGoal.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomGoal.current * (e.deltaY < 0 ? 1.14 : 0.88)))
      const box = canvas.getBoundingClientRect()
      zoomAnchor = { x: e.clientX - box.left - box.width / 2, y: e.clientY - box.top - box.height / 2 }
    }

    const leave = () => {
      if (hoveredRef.current !== null) {
        hoveredRef.current = null
        canvas.style.cursor = 'grab'
        wake(700)
      }
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancelDrag)
    canvas.addEventListener('lostpointercapture', cancelDrag)
    canvas.addEventListener('wheel', wheelZoom, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      sim.stop()
      sim3.stop()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', leave)
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
    fly3.current = null
    if (modeRef.current === 'cloud') {
      // The D-pad/arrows tumble the volume the same way a drag does.
      cloudRef.current.yaw += dx * 0.006
      cloudRef.current.pitch = Math.min(1.3, Math.max(-1.3, cloudRef.current.pitch + dy * 0.006))
      return
    }
    view.current.x += dx
    view.current.y += dy
  }

  const setViewZoom = (z: number) => {
    fly.current = null
    zoomGoal.current = z
    setZoom(z)
  }

  const fit = () => {
    const s = simRef.current
    const screen = screenRef.current
    if (!s || !screen || s.nodes.length === 0) return
    if (modeRef.current === 'cloud') {
      // The cloud is already origin-centred; fit means canonical zoom.
      fly.current = null
      zoomGoal.current = 1
      setZoom(1)
      return
    }
    const box = screen.getBoundingClientRect()
    const b = nodeBounds(s.nodes)
    if (!b) return
    const z = Math.max(ZOOM_MIN, Math.min(box.width / (b.x1 - b.x0 + 160), box.height / (b.y1 - b.y0 + 160), ZOOM_MAX))
    fly.current = { x: -((b.x0 + b.x1) / 2) * z, y: -((b.y0 + b.y1) / 2) * z, z }
    zoomGoal.current = z
    setZoom(z)
  }

  const focusNode = (n: SimNode | KGNode) => {
    setSelected(n.id)
    setQuery('')
    if (modeRef.current === 'cloud') {
      // Rotate the volume until the node faces the camera: yaw brings its
      // depth to minimum, pitch centres its height.
      const n3 = simRef.current?.nodes3.find((s) => s.id === n.id)
      if (n3?.x != null && n3.z != null) {
        fly3.current = {
          yaw: Math.PI - Math.atan2(n3.x, n3.z),
          pitch: -Math.atan2(n3.y ?? 0, Math.max(1, Math.hypot(n3.x, n3.z))),
        }
      }
      return
    }
    const world = 'x' in n && typeof n.x === 'number' ? n : simRef.current?.nodes.find((s) => s.id === n.id)
    if (world?.x != null && world.y != null) {
      const z = Math.max(view.current.zoom, 1.5)
      fly.current = { x: -world.x * z, y: -world.y * z, z }
      zoomGoal.current = z
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
          if (pausedRef.current) {
            simRef.current?.sim.stop()
            simRef.current?.sim3.stop()
          } else applyForces()
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
              {mode === 'cloud' && <span className="kg-hint"> · drag to tumble · scroll zooms · press a node</span>}
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
            <BarGraph
              label="nodes per layer"
              values={KINDS.map((k) => (enabled.has(k.kind) ? counts[k.kind] / Math.max(1, Math.max(...KINDS.map((x) => counts[x.kind]))) : 0))}
              segments={16}
            />
            {KINDS.map((k) => (
              <div key={k.kind} className="kg-rail-row">
                <SpringSwitch
                  label={`${k.label} ${counts[k.kind]}`}
                  checked={enabled.has(k.kind)}
                  onChange={(on) => {
                    haptic('medium')
                    toggleKind(k.kind, on)
                  }}
                />
              </div>
            ))}
          </div>

          <div className="kg-display">
            <Display label={`map · ${visibleCount} nodes`} aspect="auto">
              <div ref={screenRef} className="kg-screen">
              <canvas
                ref={canvasRef}
                role="img"
                tabIndex={0}
                aria-label={`Knowledge graph: ${counts.blog} posts, ${counts.lab} lab studies, ${counts.study} chapters, linked by tags and concepts. Arrow keys pan or tumble, plus and minus zoom, Enter opens the selected node.`}
                onKeyDown={onCanvasKey}
              />
              </div>
            </Display>
          </div>

          <aside className="kg-panel">
            <SegmentedPicker
              label="layout"
              value={mode}
              onChange={(v) => {
                haptic('selection')
                const m = v as LayoutMode
                setMode(m)
                // Cloud reads at canonical zoom; entering it from a deep or
                // fit-out flat zoom would strand it tiny. Ease up to 1.
                if (m === 'cloud' && zoomGoal.current < 0.85) {
                  zoomGoal.current = 1
                  setZoom(1)
                }
              }}
              options={[
                { value: 'drift' as const, label: <><Network aria-hidden /> drift</> },
                { value: 'lanes' as const, label: <><Columns3 aria-hidden /> lanes</> },
                { value: 'orbit' as const, label: <><Orbit aria-hidden /> orbit</> },
                { value: 'cloud' as const, label: <><Cloud aria-hidden /> cloud</> },
              ]}
            />
            <Lcd tag={selectedNode ? selectedNode.kind : 'idle'} size="md" className="kg-readout">
              {selectedNode ? (
                <div className="kg-selection" key={selectedNode.id}>
                  <div className="kg-sel-head">
                    {selectedNode.art && (
                      <img
                        src={selectedNode.art}
                        alt=""
                        width={56}
                        height={56}
                        data-kind={selectedNode.kind}
                        className="kg-sel-art"
                      />
                    )}
                    <Badge tone={KINDS.find((k) => k.kind === selectedNode.kind)?.tone ?? 'neutral'}>
                      {selectedNode.kind}
                    </Badge>
                    {selectedNode.meta && <span className="kg-meta">{selectedNode.meta}</span>}
                    <span className="kg-meta">{neighborIds.size} link{neighborIds.size === 1 ? '' : 's'}</span>
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
                    { key: 'mark', label: '', width: '2.1rem', render: (n: KGNode) => <NodeMark node={n} /> },
                    { key: 'label', label: 'name', render: (n: KGNode) => <span title={n.label}>{n.label}<small className="block kg-row-sub">{n.kind} · {[...new Set(visibleGraph.edges.filter((e) => (e.source === selected && e.target === n.id) || (e.target === selected && e.source === n.id)).map((e) => e.evidence === 'normalized-tag-match' ? 'Automatic tag-name match' : e.evidence === 'authored-glossary' ? 'Chapter glossary' : e.kind === 'category' ? 'Registry category' : 'Shared tag'))].join(', ')}</small></span> },
                  ]}
                />
              ) : (
                <ItemList
                  label="biggest hubs"
                  rows={topHubs}
                  rowKey={(t) => t.n.id}
                  value={selected ?? ''}
                  onValueChange={(id) => {
                    const t = topHubs.find((t) => t.n.id === id)
                    if (t) focusNode(t.n)
                  }}
                  columns={[
                    { key: 'mark', label: '', width: '2.1rem', render: (t: { n: KGNode; links: number }) => <NodeMark node={t.n} /> },
                    { key: 'label', label: 'hub', render: (t: { n: KGNode; links: number }) => <span title={t.n.label}>{t.n.label}<small className="block kg-row-sub">{t.n.kind}</small></span> },
                    { key: 'links', label: 'links', width: '2.2rem', align: 'end', render: (t: { n: KGNode; links: number }) => <span className="kg-links">{t.links}</span> },
                  ]}
                />
              )}
            </div>
          </aside>
        </div>

        <div className="kg-deck">
          <DPad label="Pan map" onUp={() => panBy(0, 60)} onDown={() => panBy(0, -60)} onLeft={() => panBy(60, 0)} onRight={() => panBy(-60, 0)} />
          <Slider label="zoom" value={zoom} min={ZOOM_MIN} max={ZOOM_MAX} step={0.05} onValueChange={setViewZoom} />
          <SpringButton variant="quiet" onClick={fit}>
            fit
          </SpringButton>
          <SpringButton
            variant="quiet"
            onClick={() => {
              fly.current = { x: 0, y: 0, z: 1 }
              zoomGoal.current = 1
              fly3.current = null
              cloudRef.current = { yaw: -0.5, pitch: 0.24 }
              setZoom(1)
              setSelected(null)
            }}
          >
            reset
          </SpringButton>
        </div>
    </div>
  )
}
