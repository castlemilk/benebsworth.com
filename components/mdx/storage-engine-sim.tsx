'use client'

/**
 * StorageEngineSim — a dual-pane visualiser contrasting the two dominant
 * on-disk storage philosophies for a post on B-trees vs LSM-trees.
 *
 *   LEFT  — B-TREE   (read-optimised, update-in-place)
 *   RIGHT — LSM-TREE (write-optimised, append + compact)
 *
 * Both structures are kept "correct enough to teach": the B-tree performs
 * real top-down splits (median pushed up on overflow); the LSM-tree runs a
 * real memtable → L0 flush → L1 size-tiered compaction. Operations animate
 * one at a time, driven event-by-event (no permanent rAF). A short ticker
 * pulses the relevant node/run and clears itself when the queue drains.
 *
 * The teaching payload is the RUM conjecture: Read, Update (write) and
 * Memory (space) amplification can't all be minimised at once. A workload
 * toggle (read-heavy / write-heavy) re-weights a qualitative amplification
 * readout so the reader can watch the trade-off move as the structures grow.
 *
 * Self-contained: plain React + SVG, no new deps. Theme-token styled, works
 * in light + dark, mobile-responsive (panels stack under ~640px). Honours
 * prefers-reduced-motion (animation flags resolve instantly).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

/* ------------------------------------------------------------------ *
 * Tunables — kept small so the structures stay legible.
 * ------------------------------------------------------------------ */

const BTREE_ORDER = 4 // max keys per node before a split (order-5 tree)
const MEMTABLE_CAP = 4 // memtable flushes when it holds this many keys
const L0_FANOUT = 3 // L0 runs compact into one L1 run at this count
const MAX_KEYS = 22 // illustrative cap on total live keys inserted
const BYTES_PER_KEY = 16 // notional record size for the byte counters

const TEAL = '#00e0b8'
const PURPLE = '#7c5cff'
const ORANGE = '#ff7a59'

/* ------------------------------------------------------------------ *
 * B-tree model — array-of-keys nodes with real top-down splits.
 * ------------------------------------------------------------------ */

type BNode = {
  keys: number[]
  children: BNode[] // empty array == leaf
}

function makeBNode(keys: number[] = [], children: BNode[] = []): BNode {
  return { keys, children }
}

function isLeaf(n: BNode): boolean {
  return n.children.length === 0
}

/** Split a full child of `parent` at index `i`, pushing the median up. */
function splitChild(parent: BNode, i: number): number {
  const child = parent.children[i]
  const mid = child.keys.length >> 1
  const median = child.keys[mid]

  const left = makeBNode(
    child.keys.slice(0, mid),
    isLeaf(child) ? [] : child.children.slice(0, mid + 1),
  )
  const right = makeBNode(
    child.keys.slice(mid + 1),
    isLeaf(child) ? [] : child.children.slice(mid + 1),
  )

  parent.keys.splice(i, 0, median)
  parent.children.splice(i, 1, left, right)
  return median
}

type BInsertResult = {
  root: BNode
  rootSplit: boolean
  splitMedian: number | null
  updatedInPlace: boolean
  pageWrites: number // touched nodes == page writes (write amplification)
}

/**
 * Insert (or update) a key. Pre-emptive top-down split: any full node we
 * descend through is split first, guaranteeing the parent has room. Counts
 * every node we write to as a page write.
 */
function btreeInsert(root: BNode, key: number): BInsertResult {
  // already present? in-place update — touches exactly the node it lives in.
  let touched = 0
  const exists = (n: BNode): boolean => {
    touched++
    if (n.keys.includes(key)) return true
    if (isLeaf(n)) return false
    let i = 0
    while (i < n.keys.length && key > n.keys[i]) i++
    return exists(n.children[i])
  }
  if (exists(root)) {
    return {
      root,
      rootSplit: false,
      splitMedian: null,
      updatedInPlace: true,
      pageWrites: touched, // path rewrite — the cost of update-in-place
    }
  }

  let pageWrites = 0
  let rootSplit = false
  let splitMedian: number | null = null
  let working = root

  // grow height: if the root is full, split it under a fresh root first.
  if (working.keys.length >= BTREE_ORDER) {
    const newRoot = makeBNode([], [working])
    splitMedian = splitChild(newRoot, 0)
    rootSplit = true
    pageWrites += 3 // new root + two halves
    working = newRoot
  }

  // descend, splitting any full child before we step into it.
  let node = working
  for (;;) {
    pageWrites++ // we write to this node
    if (isLeaf(node)) {
      let i = node.keys.length
      while (i > 0 && key < node.keys[i - 1]) i--
      node.keys.splice(i, 0, key)
      break
    }
    let i = 0
    while (i < node.keys.length && key > node.keys[i]) i++
    if (node.children[i].keys.length >= BTREE_ORDER) {
      const med = splitChild(node, i)
      pageWrites += 2 // the two new halves
      if (splitMedian == null) splitMedian = med
      if (key > med) i++
    }
    node = node.children[i]
  }

  return { root: working, rootSplit, splitMedian, updatedInPlace: false, pageWrites }
}

function btreeHeight(n: BNode): number {
  return isLeaf(n) ? 1 : 1 + Math.max(...n.children.map(btreeHeight))
}

function btreeKeyCount(n: BNode): number {
  return n.keys.length + n.children.reduce((s, c) => s + btreeKeyCount(c), 0)
}

/* ------------------------------------------------------------------ *
 * LSM-tree model — memtable + immutable sorted runs in levels.
 * ------------------------------------------------------------------ */

type SSTable = {
  id: number
  keys: number[] // sorted; immutable once written
}

type LsmState = {
  memtable: number[] // sorted in-memory buffer
  l0: SSTable[]
  l1: SSTable[]
  sstWrites: number // total SSTables ever written (flush + compaction)
  nextId: number
}

function emptyLsm(): LsmState {
  return { memtable: [], l0: [], l1: [], sstWrites: 0, nextId: 1 }
}

type LsmEvent = 'insert' | 'update' | 'flush' | 'compact'

type LsmStepResult = {
  state: LsmState
  events: LsmEvent[]
  flushedRunNo: number | null
  compacted: boolean
}

/**
 * Insert one key. Mutates a *clone* of the passed state. May trigger a
 * flush (memtable full) and then a compaction (L0 reached fan-out).
 */
function lsmInsert(prev: LsmState, key: number): LsmStepResult {
  const s: LsmState = {
    memtable: [...prev.memtable],
    l0: prev.l0.map((r) => ({ ...r, keys: [...r.keys] })),
    l1: prev.l1.map((r) => ({ ...r, keys: [...r.keys] })),
    sstWrites: prev.sstWrites,
    nextId: prev.nextId,
  }
  const events: LsmEvent[] = []

  // an overwrite still appends — that's where space amplification comes from.
  const isUpdate =
    s.memtable.includes(key) ||
    s.l0.some((r) => r.keys.includes(key)) ||
    s.l1.some((r) => r.keys.includes(key))
  events.push(isUpdate ? 'update' : 'insert')

  if (!s.memtable.includes(key)) {
    // keep the in-memory buffer sorted (real memtables are ordered structures)
    let i = s.memtable.length
    while (i > 0 && key < s.memtable[i - 1]) i--
    s.memtable.splice(i, 0, key)
  }

  let flushedRunNo: number | null = null
  let compacted = false

  // memtable full → flush to a new immutable L0 run
  if (s.memtable.length >= MEMTABLE_CAP) {
    const run: SSTable = { id: s.nextId++, keys: [...s.memtable] }
    s.l0.push(run)
    s.memtable = []
    s.sstWrites++
    flushedRunNo = s.l0.length
    events.push('flush')

    // L0 reached fan-out → size-tiered compaction: merge all L0 + L1 into one.
    if (s.l0.length >= L0_FANOUT) {
      const merged = mergeRuns([...s.l0, ...s.l1])
      s.l1 = [{ id: s.nextId++, keys: merged }]
      s.l0 = []
      s.sstWrites++
      compacted = true
      events.push('compact')
    }
  }

  return { state: s, events, flushedRunNo, compacted }
}

/** k-way merge with last-writer-wins dedup (newer runs passed last win). */
function mergeRuns(runs: SSTable[]): number[] {
  const seen = new Set<number>()
  for (const r of runs) for (const k of r.keys) seen.add(k)
  return [...seen].sort((a, b) => a - b)
}

/** Total keys physically stored across runs (incl. stale duplicates). */
function lsmTotalKeys(s: LsmState): number {
  return (
    s.memtable.length +
    s.l0.reduce((sum, r) => sum + r.keys.length, 0) +
    s.l1.reduce((sum, r) => sum + r.keys.length, 0)
  )
}

/** Distinct live keys (what a query would actually return). */
function lsmLiveKeys(s: LsmState): number {
  const live = new Set<number>(s.memtable)
  for (const r of s.l0) for (const k of r.keys) live.add(k)
  for (const r of s.l1) for (const k of r.keys) live.add(k)
  return live.size
}

/** Runs a read must consult worst-case: memtable + every L0 + every L1. */
function lsmReadFanout(s: LsmState): number {
  return 1 + s.l0.length + s.l1.length
}

/* ------------------------------------------------------------------ *
 * B-tree layout — tidy level-based positioning into SVG coordinates.
 * ------------------------------------------------------------------ */

type LaidNode = {
  node: BNode
  x: number
  y: number
  w: number
  level: number
  id: string
}

type BLayout = {
  nodes: LaidNode[]
  edges: Array<{ x1: number; y1: number; x2: number; y2: number }>
  width: number
  height: number
}

const KEY_W = 26 // px per key cell
const NODE_PAD = 6
const NODE_H = 26
const LEVEL_GAP = 54
const SIBLING_GAP = 16

function nodeWidth(n: BNode): number {
  return Math.max(n.keys.length, 1) * KEY_W + NODE_PAD * 2
}

/** Width a subtree needs (max of own width and the sum of its children). */
function subtreeWidth(n: BNode): number {
  const own = nodeWidth(n)
  if (isLeaf(n)) return own
  const kids = n.children.reduce(
    (s, c) => s + subtreeWidth(c) + SIBLING_GAP,
    -SIBLING_GAP,
  )
  return Math.max(own, kids)
}

function layoutBTree(root: BNode): BLayout {
  const nodes: LaidNode[] = []
  const edges: BLayout['edges'] = []

  const place = (n: BNode, level: number, left: number, path: string): LaidNode => {
    const span = subtreeWidth(n)
    const y = level * LEVEL_GAP + NODE_H / 2 + 8
    let cx: number

    if (isLeaf(n)) {
      cx = left + span / 2
    } else {
      let childLeft = left
      const childCenters: number[] = []
      n.children.forEach((c, ci) => {
        const cw = subtreeWidth(c)
        const laid = place(c, level + 1, childLeft, `${path}.${ci}`)
        childCenters.push(laid.x)
        childLeft += cw + SIBLING_GAP
      })
      cx = (childCenters[0] + childCenters[childCenters.length - 1]) / 2
    }

    const laid: LaidNode = {
      node: n,
      x: cx,
      y,
      w: nodeWidth(n),
      level,
      id: path,
    }
    nodes.push(laid)
    return laid
  }

  const rootLaid = place(root, 0, 0, '0')

  // wire parent → child edges now that every node has coordinates.
  const byNode = new Map<BNode, LaidNode>()
  for (const l of nodes) byNode.set(l.node, l)
  for (const l of nodes) {
    if (!isLeaf(l.node)) {
      for (const c of l.node.children) {
        const cl = byNode.get(c)
        if (cl) edges.push({ x1: l.x, y1: l.y + NODE_H / 2, x2: cl.x, y2: cl.y - NODE_H / 2 })
      }
    }
  }

  const minX = Math.min(...nodes.map((n) => n.x - n.w / 2))
  const maxX = Math.max(...nodes.map((n) => n.x + n.w / 2))
  const height = (btreeHeight(root) - 1) * LEVEL_GAP + NODE_H + 16

  // normalise so the leftmost edge sits at x=8
  const shift = 8 - minX
  for (const n of nodes) n.x += shift
  for (const e of edges) {
    e.x1 += shift
    e.x2 += shift
  }
  void rootLaid

  return { nodes, edges, width: maxX - minX + 16, height }
}

/* ------------------------------------------------------------------ *
 * Amplification model — qualitative RUM read-outs, workload-weighted.
 * ------------------------------------------------------------------ */

type Workload = 'read' | 'write'

type Amp = {
  read: number // 0..1 relative cost
  write: number
  space: number
  readLabel: string
  writeLabel: string
  spaceLabel: string
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function btreeAmp(root: BNode, workload: Workload): Amp {
  const h = btreeHeight(root)
  // reads: one root-to-leaf path. cheap & bounded by height.
  const read = clamp01(h / 6)
  // writes: update-in-place rewrites a full page per touched node, and the
  // write-heavy workload makes that recurring cost bite harder.
  const write = clamp01((h / 6) * (workload === 'write' ? 1.15 : 0.85) + 0.15)
  // space: tight — no duplicate records, ~no dead space.
  const space = 0.12
  return {
    read,
    write,
    space,
    readLabel: `~${h} page reads (one path)`,
    writeLabel: `~${h} page writes / op`,
    spaceLabel: 'compact (in-place)',
  }
}

function lsmAmp(s: LsmState, workload: Workload): Amp {
  const fanout = lsmReadFanout(s)
  const total = lsmTotalKeys(s)
  const live = lsmLiveKeys(s)
  const bloat = live > 0 ? total / live : 1
  // reads: worst case consults the memtable + every run. grows with run count;
  // a read-heavy workload spotlights how expensive that fan-out is.
  const read = clamp01((fanout / 8) * (workload === 'read' ? 1.15 : 0.9) + 0.1)
  // writes: sequential append is cheap; compaction re-rewrites data but it's
  // amortised and batched — overall lighter than in-place page rewrites.
  const write = clamp01(0.18 + (s.sstWrites / 24) * (workload === 'write' ? 0.9 : 0.7))
  // space: stale duplicates + un-compacted runs inflate on-disk bytes.
  const space = clamp01((bloat - 1) * 1.6 + 0.18)
  return {
    read,
    write,
    space,
    readLabel: `${fanout} run${fanout === 1 ? '' : 's'} checked`,
    writeLabel: `${s.sstWrites} sequential writes`,
    spaceLabel: `${bloat.toFixed(2)}× live bytes`,
  }
}

/* ------------------------------------------------------------------ *
 * Animation queue — event-driven, drains then idles. No permanent rAF.
 * ------------------------------------------------------------------ */

type Pulse = { kind: 'btree-node' | 'lsm-mem' | 'lsm-run'; key: string }

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function StorageEngineSim() {
  const uid = useId().replace(/[:]/g, '')

  const [btree, setBtree] = useState<BNode>(() => makeBNode([]))
  const [lsm, setLsm] = useState<LsmState>(() => emptyLsm())
  const [pageWrites, setPageWrites] = useState(0)
  const [workload, setWorkload] = useState<Workload>('write')
  const [caption, setCaption] = useState(
    'Insert keys to watch a read-optimised B-tree and a write-optimised LSM-tree diverge.',
  )
  const [nextKey, setNextKey] = useState(10)
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [busy, setBusy] = useState(false)

  // used keys so random/incrementing inserts stay legible & deduped-ish
  const usedKeys = useRef<Set<number>>(new Set())
  const pulseTimer = useRef<number | null>(null)
  const batchTimer = useRef<number | null>(null)

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    return () => {
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
      if (batchTimer.current) window.clearInterval(batchTimer.current)
    }
  }, [])

  const firePulse = useCallback(
    (p: Pulse) => {
      if (prefersReduced) return
      setPulse(p)
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
      pulseTimer.current = window.setTimeout(() => setPulse(null), 620)
    },
    [prefersReduced],
  )

  const liveKeyCount = btreeKeyCount(btree)
  const atCap = liveKeyCount >= MAX_KEYS

  /** Apply one insert to BOTH structures and narrate it. */
  const doInsert = useCallback(
    (key: number) => {
      // --- B-tree ---
      const bres = btreeInsert(makeBNodeClone(btree), key)
      setBtree(bres.root)
      setPageWrites((w) => w + bres.pageWrites)

      // --- LSM-tree ---
      const lres = lsmInsert(lsm, key)
      setLsm(lres.state)

      // --- narrate (LSM events are the more dramatic; prefer them) ---
      let msg: string
      if (lres.compacted) {
        msg = `LSM: L0 hit ${L0_FANOUT} runs → compacted/merged into one L1 run.`
        firePulse({ kind: 'lsm-run', key: 'l1' })
      } else if (lres.flushedRunNo != null) {
        msg = `LSM: memtable full (${MEMTABLE_CAP}) → flushed L0 run #${lres.flushedRunNo}.`
        firePulse({ kind: 'lsm-run', key: `l0-${lres.flushedRunNo - 1}` })
      } else if (bres.updatedInPlace) {
        msg = `Update ${key}: B-tree rewrites the page in place (${bres.pageWrites} page writes); LSM just appends a newer copy.`
        firePulse({ kind: 'lsm-mem', key: 'mem' })
      } else if (bres.splitMedian != null) {
        msg = `B-tree: leaf overflow → split, median ${bres.splitMedian} pushed up (${bres.pageWrites} page writes).`
      } else {
        msg = `Inserted ${key}: B-tree placed it in a leaf; LSM buffered it in the memtable.`
        firePulse({ kind: 'lsm-mem', key: 'mem' })
      }
      setCaption(msg)
      usedKeys.current.add(key)
    },
    [btree, lsm, firePulse],
  )

  // a fresh key: increment past whatever's used, occasionally re-issue an
  // existing one so updates/overwrites (and their amplification) get exercised.
  const pickKey = useCallback((): { key: number; reuse: boolean } => {
    const used = usedKeys.current
    if (used.size >= 3 && Math.random() < 0.22) {
      const arr = [...used]
      return { key: arr[Math.floor(Math.random() * arr.length)], reuse: true }
    }
    let k = nextKey
    while (used.has(k)) k += Math.floor(Math.random() * 7) + 1
    return { key: k, reuse: false }
  }, [nextKey])

  const insertOne = useCallback(() => {
    if (atCap) {
      setCaption(`Reached the illustrative cap of ${MAX_KEYS} keys — reset to explore again.`)
      return
    }
    const { key, reuse } = pickKey()
    doInsert(key)
    if (!reuse) setNextKey(key + Math.floor(Math.random() * 9) + 2)
  }, [atCap, pickKey, doInsert])

  const insertBatch = useCallback(() => {
    if (busy || atCap) return
    setBusy(true)
    let remaining = 8
    // step one op at a time so each split / flush / compaction is visible.
    const tick = () => {
      if (remaining <= 0 || btreeKeyCount(btreeRef.current) >= MAX_KEYS) {
        if (batchTimer.current) window.clearInterval(batchTimer.current)
        batchTimer.current = null
        setBusy(false)
        return
      }
      insertOne()
      remaining--
    }
    if (prefersReduced) {
      // resolve instantly: no motion, just apply the eight ops back-to-back.
      while (remaining > 0 && btreeKeyCount(btreeRef.current) < MAX_KEYS) {
        insertOne()
        remaining--
      }
      setBusy(false)
      return
    }
    tick()
    batchTimer.current = window.setInterval(tick, 360)
  }, [busy, atCap, insertOne, prefersReduced])

  // keep a ref to btree so the interval closure reads the freshest tree
  const btreeRef = useRef(btree)
  useEffect(() => {
    btreeRef.current = btree
  }, [btree])

  const reset = useCallback(() => {
    if (batchTimer.current) window.clearInterval(batchTimer.current)
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
    batchTimer.current = null
    pulseTimer.current = null
    usedKeys.current = new Set()
    setBtree(makeBNode([]))
    setLsm(emptyLsm())
    setPageWrites(0)
    setNextKey(10)
    setPulse(null)
    setBusy(false)
    setCaption(
      'Insert keys to watch a read-optimised B-tree and a write-optimised LSM-tree diverge.',
    )
  }, [])

  const layout = useMemo(() => layoutBTree(btree), [btree])
  const bAmp = useMemo(() => btreeAmp(btree, workload), [btree, workload])
  const lAmp = useMemo(() => lsmAmp(lsm, workload), [lsm, workload])

  const totalBytes = lsmTotalKeys(lsm) * BYTES_PER_KEY
  const liveBytes = lsmLiveKeys(lsm) * BYTES_PER_KEY

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      {/* ── header / controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          B-tree <span className="text-muted">vs</span> LSM-tree ·{' '}
          <span className="text-muted">the on-disk trade-off</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={insertOne}
            disabled={busy || atCap}
            aria-label="Insert one key into both structures"
            className="rounded-lg border border-[var(--color-border)] bg-surface px-2.5 py-1.5 font-mono text-[0.66rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog disabled:cursor-not-allowed disabled:opacity-40"
          >
            insert key
          </button>
          <button
            type="button"
            onClick={insertBatch}
            disabled={busy || atCap}
            aria-label="Insert eight keys in sequence"
            className="rounded-lg border border-[var(--color-border)] bg-surface px-2.5 py-1.5 font-mono text-[0.66rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog disabled:cursor-not-allowed disabled:opacity-40"
          >
            insert ×8
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset both structures"
            className="rounded-lg border border-[var(--color-border)] bg-surface px-2.5 py-1.5 font-mono text-[0.66rem] uppercase tracking-wider text-muted transition-colors hover:border-[var(--color-border)] hover:text-fg"
          >
            reset
          </button>
        </div>
      </div>

      {/* ── two panels ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-px bg-[var(--color-border)] sm:grid-cols-2">
        {/* B-TREE PANEL */}
        <div className="bg-surface px-3 py-3 sm:px-4">
          <PanelHeading
            title="B-tree"
            tag="read-optimised · update-in-place"
            color={PURPLE}
          />
          <div className="mt-2 overflow-x-auto">
            <svg
              viewBox={`0 0 ${Math.max(layout.width, 260)} ${Math.max(layout.height, 64)}`}
              className="block h-auto w-full"
              style={{ minHeight: 96, maxHeight: 220 }}
              role="img"
              aria-label={`B-tree with ${liveKeyCount} keys and height ${btreeHeight(btree)}.`}
            >
              {layout.edges.map((e, i) => (
                <line
                  key={`be-${uid}-${i}`}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke="var(--color-border)"
                  strokeWidth={1.2}
                />
              ))}
              {layout.nodes.map((ln) => {
                const w = ln.w
                const lit = pulse?.kind === 'btree-node' && pulse.key === ln.id
                return (
                  <g key={`bn-${uid}-${ln.id}`}>
                    <rect
                      x={ln.x - w / 2}
                      y={ln.y - NODE_H / 2}
                      width={w}
                      height={NODE_H}
                      rx={5}
                      fill={
                        lit
                          ? 'color-mix(in srgb, ' + PURPLE + ' 28%, var(--color-surface-2))'
                          : 'var(--color-surface-2)'
                      }
                      stroke={lit ? PURPLE : 'var(--color-border)'}
                      strokeWidth={lit ? 1.6 : 1}
                      style={{ transition: 'fill 280ms ease, stroke 280ms ease' }}
                    />
                    {ln.node.keys.map((k, ki) => {
                      const cellX = ln.x - w / 2 + NODE_PAD + ki * KEY_W
                      return (
                        <g key={`bk-${uid}-${ln.id}-${ki}`}>
                          {ki > 0 && (
                            <line
                              x1={cellX}
                              y1={ln.y - NODE_H / 2 + 4}
                              x2={cellX}
                              y2={ln.y + NODE_H / 2 - 4}
                              stroke="var(--color-border)"
                              strokeWidth={0.8}
                            />
                          )}
                          <text
                            x={cellX + KEY_W / 2}
                            y={ln.y + 3.5}
                            textAnchor="middle"
                            className="font-mono fill-fg"
                            style={{ fontSize: 11, fontWeight: 600 }}
                          >
                            {k}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[0.64rem] text-muted">
            <span>
              keys <span className="text-fg/80">{liveKeyCount}</span> · height{' '}
              <span className="text-fg/80">{btreeHeight(btree)}</span>
            </span>
            <span>
              page writes{' '}
              <span style={{ color: PURPLE }} className="font-semibold tabular-nums">
                {pageWrites}
              </span>
            </span>
          </div>
        </div>

        {/* LSM-TREE PANEL */}
        <div className="bg-surface px-3 py-3 sm:px-4">
          <PanelHeading
            title="LSM-tree"
            tag="write-optimised · append + compact"
            color={TEAL}
          />
          <div className="mt-2 space-y-2">
            {/* memtable */}
            <LsmRow
              label="memtable"
              sub={`${lsm.memtable.length}/${MEMTABLE_CAP} · in-memory`}
              keys={lsm.memtable}
              cap={MEMTABLE_CAP}
              color={ORANGE}
              lit={pulse?.kind === 'lsm-mem'}
              uid={`${uid}-mem`}
              dashed
            />
            {/* L0 runs */}
            <div>
              <div className="mb-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                L0 · {lsm.l0.length}/{L0_FANOUT} runs
              </div>
              {lsm.l0.length === 0 ? (
                <EmptyHint text="no flushed runs yet" />
              ) : (
                <div className="space-y-1">
                  {lsm.l0.map((run, i) => (
                    <RunStrip
                      key={`l0-${uid}-${run.id}`}
                      keys={run.keys}
                      color={TEAL}
                      label={`run #${i + 1}`}
                      lit={pulse?.kind === 'lsm-run' && pulse.key === `l0-${i}`}
                      uid={`${uid}-l0-${run.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* L1 runs */}
            <div>
              <div className="mb-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                L1 · merged
              </div>
              {lsm.l1.length === 0 ? (
                <EmptyHint text="no compaction yet" />
              ) : (
                <div className="space-y-1">
                  {lsm.l1.map((run) => (
                    <RunStrip
                      key={`l1-${uid}-${run.id}`}
                      keys={run.keys}
                      color={PURPLE}
                      label="sorted run"
                      lit={pulse?.kind === 'lsm-run' && pulse.key === 'l1'}
                      uid={`${uid}-l1-${run.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 font-mono text-[0.64rem] text-muted">
            <span>
              SSTable writes{' '}
              <span style={{ color: TEAL }} className="font-semibold tabular-nums">
                {lsm.sstWrites}
              </span>
            </span>
            <span>
              bytes{' '}
              <span className="text-fg/80 tabular-nums">{liveBytes}</span>
              <span className="text-muted"> live / </span>
              <span style={{ color: ORANGE }} className="tabular-nums">
                {totalBytes}
              </span>
              <span className="text-muted"> total</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── caption ───────────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.68rem] leading-snug text-fg/80">
          <span className="text-blog">›</span> {caption}
        </p>
      </div>

      {/* ── amplification / RUM panel ─────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-4 py-3.5 sm:px-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-[0.64rem] uppercase tracking-wider text-muted">
            amplification (RUM trade-off)
          </div>
          <div
            role="group"
            aria-label="Workload"
            className="flex overflow-hidden rounded-lg border border-[var(--color-border)]"
          >
            {(['read', 'write'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWorkload(w)}
                aria-pressed={workload === w}
                className={`px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  workload === w
                    ? 'bg-blog/15 text-blog'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {w}-heavy
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          <AmpMetric
            title="read amp"
            btreeVal={bAmp.read}
            btreeNote={bAmp.readLabel}
            lsmVal={lAmp.read}
            lsmNote={lAmp.readLabel}
          />
          <AmpMetric
            title="write amp"
            btreeVal={bAmp.write}
            btreeNote={bAmp.writeLabel}
            lsmVal={lAmp.write}
            lsmNote={lAmp.writeLabel}
          />
          <AmpMetric
            title="space amp"
            btreeVal={bAmp.space}
            btreeNote={bAmp.spaceLabel}
            lsmVal={lAmp.space}
            lsmNote={lAmp.spaceLabel}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.6rem] text-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: PURPLE }}
            />
            B-tree
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: TEAL }}
            />
            LSM-tree
          </span>
          <span className="text-muted/80">
            RUM conjecture: you can shrink any two of read / update / memory — never all three.
          </span>
        </div>
      </div>
    </figure>
  )
}

/* ------------------------------------------------------------------ *
 * Helpers — deep-clone the B-tree so React sees a new object every op.
 * ------------------------------------------------------------------ */

function makeBNodeClone(n: BNode): BNode {
  return makeBNode([...n.keys], n.children.map(makeBNodeClone))
}

/* ------------------------------------------------------------------ *
 * Small presentational pieces
 * ------------------------------------------------------------------ */

function PanelHeading({
  title,
  tag,
  color,
}: {
  title: string
  tag: string
  color: string
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
        style={{ background: color }}
        aria-hidden
      />
      <span className="font-mono text-[0.78rem] font-semibold text-fg">{title}</span>
      <span className="font-mono text-[0.58rem] uppercase tracking-wider text-muted">
        {tag}
      </span>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--color-border)] px-2 py-1.5 text-center font-mono text-[0.6rem] text-muted/70">
      {text}
    </div>
  )
}

/** A horizontal strip of key cells — used for memtable + SSTable runs. */
function RunStrip({
  keys,
  color,
  label,
  lit,
  uid,
}: {
  keys: number[]
  color: string
  label: string
  lit?: boolean
  uid: string
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md px-1.5 py-1"
      style={{
        background: lit
          ? `color-mix(in srgb, ${color} 16%, transparent)`
          : 'transparent',
        transition: 'background 320ms ease',
      }}
    >
      <span
        className="w-14 shrink-0 font-mono text-[0.58rem] uppercase tracking-wide text-muted"
        aria-hidden
      >
        {label}
      </span>
      <div className="flex flex-1 flex-wrap gap-0.5">
        {keys.map((k, i) => (
          <span
            key={`${uid}-${i}`}
            className="rounded-[3px] px-1 py-0.5 font-mono text-[0.62rem] tabular-nums text-fg"
            style={{
              background: `color-mix(in srgb, ${color} 18%, var(--color-surface-2))`,
              border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
            }}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}

/** The memtable: a fixed-capacity buffer drawn with empty + filled slots. */
function LsmRow({
  label,
  sub,
  keys,
  cap,
  color,
  lit,
  uid,
  dashed,
}: {
  label: string
  sub: string
  keys: number[]
  cap: number
  color: string
  lit?: boolean
  uid: string
  dashed?: boolean
}) {
  const slots = Array.from({ length: cap }, (_, i) => keys[i])
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-wider text-muted">
        <span>{label}</span>
        <span className="normal-case tracking-normal text-muted/80">{sub}</span>
      </div>
      <div
        className="flex gap-1 rounded-md p-1"
        style={{
          border: `1px ${dashed ? 'dashed' : 'solid'} color-mix(in srgb, ${color} 45%, var(--color-border))`,
          background: lit
            ? `color-mix(in srgb, ${color} 14%, transparent)`
            : 'transparent',
          transition: 'background 320ms ease',
        }}
      >
        {slots.map((k, i) => (
          <span
            key={`${uid}-${i}`}
            className="flex h-6 flex-1 items-center justify-center rounded-[3px] font-mono text-[0.66rem] tabular-nums"
            style={
              k == null
                ? {
                    background: 'transparent',
                    border: '1px dashed var(--color-border)',
                    color: 'var(--color-muted)',
                  }
                : {
                    background: `color-mix(in srgb, ${color} 20%, var(--color-surface-2))`,
                    border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
                    color: 'var(--color-fg)',
                  }
            }
          >
            {k ?? '·'}
          </span>
        ))}
      </div>
    </div>
  )
}

/** One RUM metric: title + two stacked comparison bars (B-tree / LSM). */
function AmpMetric({
  title,
  btreeVal,
  btreeNote,
  lsmVal,
  lsmNote,
}: {
  title: string
  btreeVal: number
  btreeNote: string
  lsmVal: number
  lsmNote: string
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[0.62rem] uppercase tracking-wider text-fg/80">
        {title}
      </div>
      <AmpBar value={btreeVal} note={btreeNote} color={PURPLE} />
      <div className="h-1" />
      <AmpBar value={lsmVal} note={lsmNote} color={TEAL} />
    </div>
  )
}

function AmpBar({
  value,
  note,
  color,
}: {
  value: number
  note: string
  color: string
}) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${Math.max(pct, 3)}%`,
            background: color,
            transition: 'width 420ms ease',
          }}
        />
      </div>
      <span className="w-[5.5rem] shrink-0 text-right font-mono text-[0.56rem] leading-tight text-muted">
        {note}
      </span>
    </div>
  )
}
