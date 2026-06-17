import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

// ── Controls ────────────────────────────────────────────────────────────
export const controls: ControlSpec[] = [
  { key: 'algorithm', label: 'Algorithm', type: 'select', options: [
    { label: 'A*', value: 'astar' },
    { label: 'Dijkstra', value: 'dijkstra' },
    { label: 'Greedy best-first', value: 'greedy' },
  ]},
  { key: 'heuristic', label: 'Heuristic', type: 'select', options: [
    { label: 'Manhattan (4-conn)', value: 'manhattan' },
    { label: 'Euclidean (8-conn)', value: 'euclidean' },
    { label: 'Chebyshev (8-conn)', value: 'chebyshev' },
  ]},
  { key: 'weight', label: 'Heuristic weight', type: 'range', min: 1, max: 4, step: 0.1 },
  { key: 'density', label: 'Wall density', type: 'range', min: 0.1, max: 0.4, step: 0.01 },
  { key: 'speed', label: 'Speed', type: 'range', min: 1, max: 40, step: 1 },
]

export const defaults: Params = {
  algorithm: 'astar',
  heuristic: 'manhattan',
  weight: 1,
  density: 0.28,
  speed: 12,
}

// ── Brand palette ───────────────────────────────────────────────────────
const TEAL = '#00e0b8'
const PURPLE = '#7c5cff'
const ORANGE = '#ff7a59'

// Linearly blend two hex colours (used for the g-cost gradient).
function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${bl})`
}

// ── Binary min-heap keyed on a comparable priority (f score) ────────────
// Stores cell indices; priorities are looked up from an external array.
class MinHeap {
  private items: number[] = []
  private prio: Float64Array
  constructor(prio: Float64Array) { this.prio = prio }
  get size() { return this.items.length }
  clear() { this.items.length = 0 }
  push(idx: number) {
    const a = this.items
    a.push(idx)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.prio[a[parent]] <= this.prio[a[i]]) break
      const t = a[parent]; a[parent] = a[i]; a[i] = t
      i = parent
    }
  }
  pop(): number {
    const a = this.items
    const top = a[0]
    const last = a.pop()!
    if (a.length > 0) {
      a[0] = last
      let i = 0
      const n = a.length
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2
        let smallest = i
        if (l < n && this.prio[a[l]] < this.prio[a[smallest]]) smallest = l
        if (r < n && this.prio[a[r]] < this.prio[a[smallest]]) smallest = r
        if (smallest === i) break
        const t = a[smallest]; a[smallest] = a[i]; a[i] = t
        i = smallest
      }
    }
    return top
  }
}

// 4- and 8-connected neighbour offsets.
const N4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const N8: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]

export const pathfinding: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const bg = theme.bg
    const fg = theme.fg

    // ── Layout: grid fills the canvas above a caption strip. ──────────
    const captionH = 22
    const margin = 6
    const gridW = w - margin * 2
    const gridH = h - margin * 2 - captionH
    const cell = Math.max(8, Math.floor(w / 40))
    const cols = Math.max(4, Math.floor(gridW / cell))
    const rows = Math.max(4, Math.floor(gridH / cell))
    // Centre the integer cell grid inside the available area.
    const ox = margin + Math.floor((gridW - cols * cell) / 2)
    const oy = margin + Math.floor((gridH - rows * cell) / 2)
    const N = cols * rows

    // ── ALL mutable simulation state lives here, per-instance. ────────
    let walls = new Uint8Array(N)         // 1 = obstacle
    let gScore = new Float64Array(N)       // cost from start (∞ until reached)
    let fScore = new Float64Array(N)       // priority used by the heap
    let parent = new Int32Array(N)         // predecessor index (-1 = none)
    let visited = new Uint8Array(N)        // 1 = closed (settled)
    let inOpen = new Uint8Array(N)         // 1 = currently in the open set
    const heap = new MinHeap(fScore)
    let startIdx = 0
    let goalIdx = 0
    let maxG = 1                           // running max g for colour normalisation
    let nodesExpanded = 0
    let pathCells: number[] = []           // reconstructed path (start..goal)
    let pathLen = 0
    let phase: 'searching' | 'found' | 'nopath' = 'searching'
    let settleTime = 0                     // timestamp the search finished
    let neighbours: ReadonlyArray<readonly [number, number]> = N4
    let diagonal = false

    let lastKey = ''

    const ri = (x: number) => x | 0
    const idx = (x: number, y: number) => y * cols + x
    const cx = (i: number) => i % cols
    const cy = (i: number) => (i / cols) | 0

    function heuristic(i: number, kind: string): number {
      const dx = Math.abs(cx(i) - cx(goalIdx))
      const dy = Math.abs(cy(i) - cy(goalIdx))
      if (kind === 'euclidean') return Math.sqrt(dx * dx + dy * dy)
      if (kind === 'chebyshev') return Math.max(dx, dy)
      return dx + dy // manhattan
    }

    // Cost of stepping between two adjacent cells (√2 for diagonals).
    function stepCost(dx: number, dy: number): number {
      return dx !== 0 && dy !== 0 ? Math.SQRT2 : 1
    }

    // BFS flood from start to confirm the goal is reachable.
    function reachable(): boolean {
      const seen = new Uint8Array(N)
      const stack = [startIdx]
      seen[startIdx] = 1
      while (stack.length) {
        const i = stack.pop()!
        if (i === goalIdx) return true
        const x = cx(i), y = cy(i)
        for (const [dx, dy] of neighbours) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          const ni = idx(nx, ny)
          if (seen[ni] || walls[ni]) continue
          // Prevent diagonal squeezing through wall corners.
          if (dx !== 0 && dy !== 0 && walls[idx(x + dx, y)] && walls[idx(x, y + dy)]) continue
          seen[ni] = 1
          stack.push(ni)
        }
      }
      return false
    }

    // Generate a fresh random-wall maze with a guaranteed start→goal path.
    function generateMaze(density: number) {
      startIdx = idx(0, ri(rows / 2))
      goalIdx = idx(cols - 1, ri(rows / 2))
      let attempt = 0
      do {
        walls.fill(0)
        for (let i = 0; i < N; i++) {
          if (i === startIdx || i === goalIdx) continue
          walls[i] = Math.random() < density ? 1 : 0
        }
        // Keep the immediate neighbourhood of start/goal open so the
        // search always has somewhere to go.
        walls[startIdx] = 0
        walls[goalIdx] = 0
        attempt++
      } while (!reachable() && attempt < 60)
    }

    // (Re)initialise every search structure and seed the open set.
    function resetSearch(weight: number, heuristicKind: string) {
      gScore.fill(Infinity)
      fScore.fill(Infinity)
      parent.fill(-1)
      visited.fill(0)
      inOpen.fill(0)
      heap.clear()
      maxG = 1
      nodesExpanded = 0
      pathCells = []
      pathLen = 0
      phase = 'searching'
      gScore[startIdx] = 0
      fScore[startIdx] = weight * heuristic(startIdx, heuristicKind)
      inOpen[startIdx] = 1
      heap.push(startIdx)
    }

    function reconstruct() {
      const cells: number[] = []
      let cur = goalIdx
      while (cur !== -1) { cells.push(cur); cur = parent[cur] }
      cells.reverse()
      pathCells = cells
      // Path length in step-cost units.
      let len = 0
      for (let k = 1; k < cells.length; k++) {
        const dx = Math.abs(cx(cells[k]) - cx(cells[k - 1]))
        const dy = Math.abs(cy(cells[k]) - cy(cells[k - 1]))
        len += stepCost(dx, dy)
      }
      pathLen = len
    }

    // Expand one node (pop lowest-f from open). Returns false when the
    // open set is exhausted with no path found.
    function expandOne(algorithm: string, heuristicKind: string, weight: number): boolean {
      if (heap.size === 0) { phase = 'nopath'; return false }
      // Skip stale heap entries (lazy deletion after a better g was found).
      let current = heap.pop()
      while (visited[current] && heap.size > 0) current = heap.pop()
      if (visited[current]) { phase = 'nopath'; return false }

      inOpen[current] = 0
      visited[current] = 1
      nodesExpanded++
      if (gScore[current] > maxG && gScore[current] < Infinity) maxG = gScore[current]

      if (current === goalIdx) { phase = 'found'; reconstruct(); return false }

      const x = cx(current), y = cy(current)
      for (const [dx, dy] of neighbours) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const ni = idx(nx, ny)
        if (walls[ni] || visited[ni]) continue
        if (dx !== 0 && dy !== 0 && walls[idx(x + dx, y)] && walls[idx(x, y + dy)]) continue
        const tentativeG = gScore[current] + stepCost(dx, dy)
        if (tentativeG < gScore[ni]) {
          parent[ni] = current
          gScore[ni] = tentativeG
          const h = heuristic(ni, heuristicKind)
          // A*: g + w·h | Dijkstra: g | Greedy: h
          let f: number
          if (algorithm === 'dijkstra') f = tentativeG
          else if (algorithm === 'greedy') f = h
          else f = tentativeG + weight * h
          fScore[ni] = f
          inOpen[ni] = 1
          heap.push(ni) // lazy: duplicates filtered on pop
        }
      }
      return true
    }

    function fullReset(algorithm: string, heuristicKind: string, weight: number, density: number) {
      // Connectivity follows the heuristic: Manhattan = 4-conn, the rest = 8-conn.
      diagonal = heuristicKind !== 'manhattan'
      neighbours = diagonal ? N8 : N4
      generateMaze(density)
      resetSearch(weight, heuristicKind)
    }

    return {
      step(timeMs, p) {
        // 1. Read params.
        const algorithm = (p.algorithm ?? defaults.algorithm) as string
        const heuristicKind = (p.heuristic ?? defaults.heuristic) as string
        const weight = (p.weight ?? defaults.weight) as number
        const density = (p.density ?? defaults.density) as number
        const speed = (p.speed ?? defaults.speed) as number

        // 2. Reset-on-param-change guard.
        const key = `${algorithm}_${heuristicKind}_${weight.toFixed(2)}_${density.toFixed(2)}`
        if (key !== lastKey) {
          lastKey = key
          fullReset(algorithm, heuristicKind, weight, density)
          settleTime = 0
        }

        // 3. Advance the search a few nodes per frame, scaled by speed.
        if (phase === 'searching') {
          const budget = Math.max(1, Math.round(speed))
          for (let k = 0; k < budget; k++) {
            if (!expandOne(algorithm, heuristicKind, weight)) break
          }
          if ((phase as string) !== 'searching') settleTime = timeMs
        } else {
          // 4. Auto-retrigger: pause ~2s after settling, then new maze.
          if (settleTime === 0) settleTime = timeMs
          if (timeMs - settleTime > 2000) {
            fullReset(algorithm, heuristicKind, weight, density)
            settleTime = 0
          }
        }

        // ── Draw ─────────────────────────────────────────────────────
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        const inv = 1 / Math.max(maxG, 1)
        for (let i = 0; i < N; i++) {
          const x = ox + cx(i) * cell
          const y = oy + cy(i) * cell
          if (walls[i]) {
            // Walls: dark, low-alpha foreground blocks.
            ctx.fillStyle = fg
            ctx.globalAlpha = 0.10
            ctx.fillRect(x, y, cell, cell)
            ctx.globalAlpha = 1
            continue
          }
          if (visited[i]) {
            // Closed set: teal→purple gradient by normalised g.
            const t = Math.min(1, gScore[i] * inv)
            ctx.fillStyle = lerpHex(TEAL, PURPLE, t)
            ctx.globalAlpha = 0.55
            ctx.fillRect(x, y, cell, cell)
            ctx.globalAlpha = 1
          } else if (inOpen[i]) {
            // Open frontier: faint fill + brighter outline.
            ctx.fillStyle = TEAL
            ctx.globalAlpha = 0.18
            ctx.fillRect(x, y, cell, cell)
            ctx.globalAlpha = 0.9
            ctx.strokeStyle = TEAL
            ctx.lineWidth = 1
            ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
            ctx.globalAlpha = 1
          } else {
            // Untouched open cells: barely-there grid tint.
            ctx.fillStyle = fg
            ctx.globalAlpha = 0.02
            ctx.fillRect(x, y, cell, cell)
            ctx.globalAlpha = 1
          }
        }

        // ── Final path: thick orange polyline through cell centres. ──
        if (pathCells.length > 1) {
          ctx.strokeStyle = ORANGE
          ctx.lineWidth = Math.max(2, cell * 0.35)
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          ctx.beginPath()
          for (let k = 0; k < pathCells.length; k++) {
            const i = pathCells[k]
            const px = ox + cx(i) * cell + cell / 2
            const py = oy + cy(i) * cell + cell / 2
            if (k === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }

        // ── Start marker (teal square) and goal ring. ────────────────
        const sx = ox + cx(startIdx) * cell + cell / 2
        const sy = oy + cy(startIdx) * cell + cell / 2
        ctx.fillStyle = TEAL
        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(2.5, cell * 0.32), 0, Math.PI * 2)
        ctx.fill()

        const gx = ox + cx(goalIdx) * cell + cell / 2
        const gy = oy + cy(goalIdx) * cell + cell / 2
        ctx.strokeStyle = ORANGE
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(gx, gy, Math.max(3, cell * 0.40), 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(gx, gy, Math.max(1.2, cell * 0.16), 0, Math.PI * 2)
        ctx.fillStyle = ORANGE
        ctx.fill()

        // ── Caption strip ────────────────────────────────────────────
        const algoName = algorithm === 'astar' ? 'A*' : algorithm === 'dijkstra' ? 'Dijkstra' : 'Greedy'
        const heurName = heuristicKind === 'manhattan' ? 'Manhattan' : heuristicKind === 'euclidean' ? 'Euclidean' : 'Chebyshev'
        const heurLabel = algorithm === 'dijkstra' ? 'h ignored' : heurName
        ctx.font = '10px monospace'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'
        const capY = h - captionH / 2
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.85
        const wLabel = algorithm === 'astar' ? `  w=${weight.toFixed(1)}` : ''
        ctx.fillText(`${algoName} · ${heurLabel}${wLabel}`, margin + 2, capY)
        ctx.textAlign = 'right'
        let status: string
        if (phase === 'found') status = `expanded: ${nodesExpanded}   path: ${pathLen.toFixed(1)}`
        else if (phase === 'nopath') status = `expanded: ${nodesExpanded}   NO PATH`
        else status = `expanded: ${nodesExpanded}   searching…`
        ctx.fillStyle = phase === 'found' ? ORANGE : phase === 'nopath' ? '#ff5577' : TEAL
        ctx.fillText(status, w - margin - 2, capY)
        ctx.globalAlpha = 1
        ctx.textAlign = 'left'
      },
    }
  },
}
