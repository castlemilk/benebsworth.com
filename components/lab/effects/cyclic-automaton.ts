import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]]

export const controls: ControlSpec[] = [
  { key: 'cell', label: 'Cell size', type: 'range', min: 4, max: 24, step: 1 },
  { key: 'states', label: 'States', type: 'range', min: 3, max: 16, step: 1 },
  { key: 'threshold', label: 'Threshold', type: 'range', min: 1, max: 4, step: 1 },
  { key: 'tickMs', label: 'Tick (ms)', type: 'range', min: 30, max: 300, step: 10 },
  { key: 'color', label: 'Hue base', type: 'color' },
]

export const defaults: Params = { cell: 10, states: 8, threshold: 2, tickMs: 90, color: '#7c5cff' }

export const cyclicAutomaton: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, _theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    void _theme // clears to transparent; hsl cells read on both the light and dark stage
    let cols = 0, rows = 0, grid = new Int8Array(0), next = new Int8Array(0), cell = 0, states = 0
    let lastTick = 0
    function rebuild(nextCell: number, nextStates: number) {
      cell = nextCell; states = nextStates
      cols = Math.max(1, Math.ceil(dims.w / cell)); rows = Math.max(1, Math.ceil(dims.h / cell))
      grid = new Int8Array(cols * rows); next = new Int8Array(cols * rows)
      for (let i = 0; i < grid.length; i++) grid[i] = Math.floor(Math.random() * states)
    }
    return {
      step(t, p) {
        const pCell = p.cell as number, pStates = p.states as number
        if (pCell !== cell || pStates !== states) rebuild(pCell, pStates)
        const th = p.threshold as number, tickMs = p.tickMs as number
        if (t - lastTick >= tickMs) {
          lastTick = t
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const i = y * cols + x, cur = grid[i], nv = (cur + 1) % states
            let cnt = 0
            for (const [dx, dy] of NEIGHBORS) {
              const nx = (x + dx + cols) % cols, ny = (y + dy + rows) % rows
              if (grid[ny * cols + nx] === nv) cnt++
            }
            next[i] = cnt >= th ? nv : cur
          }
          grid.set(next)
        }
        // draw (hue cycles around the colour wheel by state index)
        const { w, h } = dims
        ctx.clearRect(0, 0, w, h)
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const v = grid[y * cols + x]
          const hue = (v / states) * 360
          ctx.fillStyle = `hsl(${hue} 70% 60%)`
          ctx.fillRect(x * cell, y * cell, cell, cell)
        }
      },
      destroy() {},
    }
  },
}
