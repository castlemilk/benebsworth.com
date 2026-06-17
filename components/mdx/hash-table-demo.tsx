'use client'

/**
 * HashTableDemo — an interactive open-addressing hash table visualiser for a
 * post on how Python dicts really work.
 *
 * The reader inserts string keys; the component computes a djb2-style hash,
 * reduces it mod the table capacity, then *animates the probe sequence*
 * ricocheting through slots until it finds an empty one — collisions flashed
 * in the brand orange, the final landing slot in the blog accent.
 *
 * Faithful to a real open-addressing table:
 *   • Three probe strategies: Linear, Quadratic, and Python-style Perturbed.
 *   • Deletes leave a TOMBSTONE so lookups (and future inserts) probe past
 *     them instead of stopping short.
 *   • A load-factor meter triggers an animated 2× RESIZE + rehash when
 *     (filled + tombstones) / capacity crosses 2/3 — tombstones dropped.
 *
 * Animation is event-driven: a probe insert kicks off a short setInterval
 * that steps through the probe path and stops the moment it lands. No
 * permanent rAF loop, so nothing runs while the figure is idle. Honours
 * prefers-reduced-motion (skips the step animation; result is immediate).
 *
 * Self-contained: plain React + a tiny bit of SVG-free DOM. No new deps.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

type SlotState = 'empty' | 'filled' | 'tombstone'

type Slot = {
  state: SlotState
  key: string | null
  /** Cached full hash so we can rehash on resize without recomputing. */
  hash: number
}

type Strategy = 'linear' | 'quadratic' | 'perturbed'

const STRATEGIES: { value: Strategy; label: string; formula: string }[] = [
  { value: 'linear', label: 'Linear', formula: 'i + 1, i + 2, …' },
  { value: 'quadratic', label: 'Quadratic', formula: 'i + 1², i + 2², …' },
  { value: 'perturbed', label: 'Perturbed', formula: 'j = 5j + 1 + perturb' },
]

const INITIAL_CAP = 8
const LOAD_NUM = 2 // 2/3 load-factor threshold
const LOAD_DEN = 3
const PRESET_KEYS = ['cat', 'dog', 'fox']
const RANDOM_POOL = [
  'apple', 'birch', 'cloud', 'delta', 'ember', 'frost', 'glide', 'harbor',
  'ivory', 'jade', 'kite', 'lumen', 'maple', 'nimbus', 'onyx', 'pixel',
  'quartz', 'raven', 'slate', 'tonic', 'umber', 'vapor', 'willow', 'zephyr',
]

/**
 * djb2 string hash (32-bit, unsigned). hash = hash * 33 + c, seeded at 5381.
 * Kept >>> 0 each step so it stays a non-negative integer the reader can read.
 */
function djb2(key: string): number {
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = (((h << 5) + h) + key.charCodeAt(i)) >>> 0 // h*33 + c
  }
  return h >>> 0
}

/**
 * Produce the probe sequence of slot indices for a given hash + capacity,
 * up to `capacity` entries (a full table is always covered). Mirrors the
 * three supported strategies. Capacity is always a power of two so the
 * perturbed walk visits every slot.
 */
function probeSequence(hash: number, capacity: number, strategy: Strategy): number[] {
  const start = hash % capacity
  const seq: number[] = []
  if (strategy === 'linear') {
    for (let k = 0; k < capacity; k++) seq.push((start + k) % capacity)
    return seq
  }
  if (strategy === 'quadratic') {
    // i + 1², i + 2², … guaranteed to cover all slots for power-of-two cap
    // when using triangular numbers; we use k² for legibility (covers most).
    const seen = new Set<number>()
    let k = 0
    while (seen.size < capacity && k <= capacity * capacity) {
      const idx = (start + k * k) % capacity
      if (!seen.has(idx)) {
        seen.add(idx)
        seq.push(idx)
      }
      k++
    }
    return seq
  }
  // Python-style perturbed probe. j starts at the slot; perturb is the full
  // hash and is shifted right by 5 each step, mixing high bits in.
  let j = start
  let perturb = hash >>> 0
  for (let k = 0; k < capacity; k++) {
    seq.push(j % capacity)
    perturb = perturb >>> 5
    j = (5 * j + 1 + perturb) % capacity
  }
  return seq
}

function emptySlots(capacity: number): Slot[] {
  return Array.from({ length: capacity }, () => ({
    state: 'empty' as SlotState,
    key: null,
    hash: 0,
  }))
}

/** True when the table would cross the 2/3 occupancy threshold after a fill. */
function overLoad(used: number, capacity: number): boolean {
  // used / capacity > 2/3  ⇔  used * 3 > capacity * 2
  return used * LOAD_DEN > capacity * LOAD_NUM
}

/* ------------------------------------------------------------------ *
 * Colours (work in both themes)
 * ------------------------------------------------------------------ */

const C_ACCENT = 'var(--color-blog)' // landing / filled accent
const C_COLLISION = '#ff7a59' // brand orange — collision flash
const C_PROBE = '#7c5cff' // brand purple — probe path

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function HashTableDemo() {
  const uid = useId().replace(/[:]/g, '')
  const [strategy, setStrategy] = useState<Strategy>('linear')
  const [capacity, setCapacity] = useState(INITIAL_CAP)
  const [slots, setSlots] = useState<Slot[]>(() => emptySlots(INITIAL_CAP))
  const [input, setInput] = useState('')

  // animation / readout state
  const [activePath, setActivePath] = useState<number[]>([]) // probed-so-far
  const [landed, setLanded] = useState<number | null>(null)
  const [collisions, setCollisions] = useState<number[]>([])
  const [probeCount, setProbeCount] = useState<number | null>(null)
  const [lastHash, setLastHash] = useState<{ key: string; hash: number; start: number } | null>(null)
  const [caption, setCaption] = useState('Insert a key to watch its probe sequence find an open slot.')
  const [resizing, setResizing] = useState(false)
  const [busy, setBusy] = useState(false)

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialised = useRef(false)

  const filled = useMemo(() => slots.filter((s) => s.state === 'filled').length, [slots])
  const tombstones = useMemo(() => slots.filter((s) => s.state === 'tombstone').length, [slots])
  const used = filled + tombstones
  const loadFraction = used / capacity
  const overThreshold = loadFraction > LOAD_NUM / LOAD_DEN

  const prefersReduced = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const clearTimer = () => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }
  useEffect(() => () => clearTimer(), [])

  /* ---- core insert (operates on a slots snapshot, returns next state) ---- */

  /**
   * Compute where `key` would land in `table`/`cap` under `strategy`, returning
   * the probe path, the final index, and which probed slots were collisions.
   * Returns null only if the table is somehow full (shouldn't happen — we
   * resize before crossing 2/3).
   */
  const planInsert = useCallback(
    (key: string, table: Slot[], cap: number, strat: Strategy) => {
      const hash = djb2(key)
      const start = hash % cap
      const seq = probeSequence(hash, cap, strat)
      const path: number[] = []
      const collided: number[] = []
      let firstTombstone = -1
      for (const idx of seq) {
        path.push(idx)
        const slot = table[idx]
        if (slot.state === 'filled') {
          if (slot.key === key) {
            // key already present — overwrite in place (no collision)
            return { hash, start, path, collided, target: idx, duplicate: true }
          }
          collided.push(idx)
          continue
        }
        if (slot.state === 'tombstone') {
          // remember the first tombstone — we can reuse it, but must keep
          // probing in case the key already exists further along.
          if (firstTombstone === -1) firstTombstone = idx
          continue
        }
        // empty: stop. Prefer an earlier tombstone if we saw one.
        const target = firstTombstone === -1 ? idx : firstTombstone
        return { hash, start, path, collided, target, duplicate: false }
      }
      // fell through (table full of filled/tombstones) — reuse a tombstone
      if (firstTombstone !== -1) {
        return { hash, start, path, collided, target: firstTombstone, duplicate: false }
      }
      return null
    },
    [],
  )

  /* ---- rehash all live keys into a fresh, larger table ---- */

  const rehash = useCallback(
    (sourceSlots: Slot[], newCap: number, strat: Strategy): Slot[] => {
      const next = emptySlots(newCap)
      for (const s of sourceSlots) {
        if (s.state !== 'filled' || s.key == null) continue
        const seq = probeSequence(s.hash, newCap, strat)
        for (const idx of seq) {
          if (next[idx].state === 'empty') {
            next[idx] = { state: 'filled', key: s.key, hash: s.hash }
            break
          }
        }
      }
      return next
    },
    [],
  )

  /* ---- the public insert action (with animation) ---- */

  const doInsert = useCallback(
    (rawKey: string) => {
      const key = rawKey.trim()
      if (!key || busy) return

      const plan = planInsert(key, slots, capacity, strategy)
      if (!plan) return

      setLanded(null)
      setCollisions([])
      setActivePath([])
      setProbeCount(plan.path.length)
      setLastHash({ key, hash: plan.hash, start: plan.start })
      setResizing(false)

      const commit = () => {
        setSlots((prev) => {
          const next = prev.slice()
          next[plan.target] = { state: 'filled', key, hash: plan.hash }
          // check load factor; resize if needed (count occupied = filled+tombstones)
          const occupied =
            next.filter((s) => s.state === 'filled' || s.state === 'tombstone').length
          if (overLoad(occupied, capacity)) {
            const grown = rehash(next, capacity * 2, strategy)
            // schedule the visual resize after state settles
            setResizing(true)
            setCapacity(capacity * 2)
            setCaption(
              `Load factor crossed 2/3 → resize to ${capacity * 2} slots and rehash ${
                grown.filter((s) => s.state === 'filled').length
              } live keys (tombstones dropped).`,
            )
            window.setTimeout(() => setResizing(false), 650)
            return grown
          }
          return next
        })
      }

      const finish = (landedIdx: number, collidedSet: number[]) => {
        setLanded(landedIdx)
        setCollisions(collidedSet)
        setActivePath(plan.path)
        if (plan.duplicate) {
          setCaption(
            `“${key}” already lives in slot ${landedIdx} — value overwritten in place. ${plan.collided.length} collision${
              plan.collided.length === 1 ? '' : 's'
            } on the way.`,
          )
        } else if (plan.collided.length === 0) {
          setCaption(`“${key}” hashed straight to slot ${landedIdx}. No collision.`)
        } else {
          setCaption(
            `“${key}” collided ${plan.collided.length}× (orange) before landing in slot ${landedIdx} after ${plan.path.length} probes.`,
          )
        }
        commit()
      }

      if (prefersReduced() || plan.path.length <= 1) {
        finish(plan.target, plan.collided)
        return
      }

      // animate the probe sequence step by step
      setBusy(true)
      let step = 0
      clearTimer()
      timer.current = setInterval(() => {
        step += 1
        setActivePath(plan.path.slice(0, step))
        if (step >= plan.path.length) {
          clearTimer()
          setBusy(false)
          finish(plan.target, plan.collided)
        }
      }, 220)
    },
    [busy, slots, capacity, strategy, planInsert, rehash],
  )

  /* ---- preset keys on mount ---- */

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    setSlots((prev) => {
      let next = prev.slice()
      let cap = INITIAL_CAP
      for (const key of PRESET_KEYS) {
        const plan = planInsert(key, next, cap, 'linear')
        if (!plan) continue
        next[plan.target] = { state: 'filled', key, hash: plan.hash }
        const occupied = next.filter(
          (s) => s.state === 'filled' || s.state === 'tombstone',
        ).length
        if (overLoad(occupied, cap)) {
          next = rehash(next, cap * 2, 'linear')
          cap *= 2
          setCapacity(cap)
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- actions ---- */

  const handleInsert = () => {
    if (!input.trim()) return
    doInsert(input)
    setInput('')
  }

  const handleRandom = () => {
    const existing = new Set(slots.filter((s) => s.state === 'filled').map((s) => s.key))
    const pool = RANDOM_POOL.filter((k) => !existing.has(k))
    const key = (pool.length ? pool : RANDOM_POOL)[
      Math.floor(Math.random() * (pool.length ? pool.length : RANDOM_POOL.length))
    ]
    doInsert(key)
  }

  const handleDelete = () => {
    if (busy) return
    // delete the last-filled key (highest index) → tombstone
    const idx = [...slots].map((s, i) => ({ s, i })).filter((x) => x.s.state === 'filled').pop()?.i
    if (idx == null) {
      setCaption('Nothing to delete.')
      return
    }
    const key = slots[idx].key
    clearTimer()
    setBusy(false)
    setActivePath([])
    setLanded(null)
    setCollisions([])
    setProbeCount(null)
    setLastHash(null)
    setSlots((prev) => {
      const next = prev.slice()
      next[idx] = { state: 'tombstone', key: null, hash: prev[idx].hash }
      return next
    })
    setCaption(
      `Deleted “${key}” from slot ${idx} → tombstone. Lookups must probe PAST it, not stop.`,
    )
  }

  const resetTable = useCallback(
    (strat: Strategy) => {
      clearTimer()
      setBusy(false)
      setCapacity(INITIAL_CAP)
      setSlots(emptySlots(INITIAL_CAP))
      setActivePath([])
      setLanded(null)
      setCollisions([])
      setProbeCount(null)
      setLastHash(null)
      setResizing(false)
      setInput('')
      // re-seed presets so it isn't empty
      window.setTimeout(() => {
        setSlots((prev) => {
          let next = prev.slice()
          let cap = INITIAL_CAP
          for (const key of PRESET_KEYS) {
            const plan = planInsert(key, next, cap, strat)
            if (!plan) continue
            next[plan.target] = { state: 'filled', key, hash: plan.hash }
            const occupied = next.filter(
              (s) => s.state === 'filled' || s.state === 'tombstone',
            ).length
            if (overLoad(occupied, cap)) {
              next = rehash(next, cap * 2, strat)
              cap *= 2
              setCapacity(cap)
            }
          }
          return next
        })
        setCaption('Table reset with preset keys.')
      }, 0)
    },
    [planInsert, rehash],
  )

  const handleReset = () => resetTable(strategy)

  const handleStrategy = (s: Strategy) => {
    setStrategy(s)
    resetTable(s) // switching strategy resets the table
  }

  /* ---- derived display ---- */

  const lastProbeIdx = activePath.length ? activePath[activePath.length - 1] : null
  const pathSet = useMemo(() => new Set(activePath), [activePath])
  const collisionSet = useMemo(() => new Set(collisions), [collisions])

  const strat = STRATEGIES.find((s) => s.value === strategy)!

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      {/* header: hash readout + strategy */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] leading-snug text-fg/80">
          open-addressing dict ·{' '}
          <span className="text-blog">{strat.label}</span> probing
        </div>
        <label className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-wider text-muted">
          probe
          <select
            value={strategy}
            onChange={(e) => handleStrategy(e.target.value as Strategy)}
            aria-label="Probe strategy"
            className="rounded-md border border-[var(--color-border)] bg-surface px-2 py-1 font-mono text-[0.7rem] normal-case tracking-normal text-fg outline-none focus-visible:ring-2 focus-visible:ring-blog/50"
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* hash computation strip */}
      <div className="border-b border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[0.68rem] text-muted">
          <span>
            hash:{' '}
            <span className="text-fg/85">
              djb2(<span className="text-blog">{lastHash ? `"${lastHash.key}"` : 'key'}</span>)
            </span>
          </span>
          <span aria-live="polite">
            ={' '}
            <span className="tabular-nums text-fg/85">
              {lastHash ? lastHash.hash.toLocaleString() : '—'}
            </span>
          </span>
          <span>
            index = hash % {capacity} ={' '}
            <span className="tabular-nums text-blog">
              {lastHash ? lastHash.start : '—'}
            </span>
          </span>
          <span className="ml-auto">
            probe: {strat.formula}
          </span>
        </div>
      </div>

      {/* the slot grid */}
      <div className="px-4 py-4 sm:px-5">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(58px, 1fr))`,
          }}
        >
          {slots.map((slot, i) => {
            const isLanded = landed === i
            const isCollision = collisionSet.has(i)
            const isLastProbe = lastProbeIdx === i && !isLanded
            const onPath = pathSet.has(i)

            let borderColor = 'var(--color-border)'
            let bg = 'transparent'
            let ring = ''
            if (isLanded) {
              borderColor = C_ACCENT
              bg = 'color-mix(in srgb, var(--color-blog) 16%, transparent)'
              ring = `0 0 0 2px ${C_ACCENT}`
            } else if (isCollision) {
              borderColor = C_COLLISION
              bg = 'color-mix(in srgb, #ff7a59 16%, transparent)'
            } else if (isLastProbe) {
              borderColor = C_PROBE
              bg = 'color-mix(in srgb, #7c5cff 14%, transparent)'
              ring = `0 0 0 2px ${C_PROBE}`
            } else if (onPath) {
              borderColor = C_PROBE
              bg = 'color-mix(in srgb, #7c5cff 8%, transparent)'
            } else if (slot.state === 'filled') {
              bg = 'color-mix(in srgb, var(--color-blog) 7%, transparent)'
            }

            const badge =
              slot.state === 'empty'
                ? { txt: 'empty', col: 'var(--color-muted)' }
                : slot.state === 'tombstone'
                  ? { txt: '⌫ tomb', col: C_COLLISION }
                  : { txt: 'filled', col: C_ACCENT }

            return (
              <div
                key={`slot-${uid}-${i}`}
                className="flex min-h-[58px] flex-col justify-between rounded-lg border p-1.5 transition-all"
                style={{
                  borderColor,
                  background: bg,
                  boxShadow: ring || undefined,
                  transitionDuration: resizing ? '450ms' : '200ms',
                }}
                aria-label={`Slot ${i}: ${slot.state}${slot.key ? `, key ${slot.key}` : ''}`}
              >
                <div className="flex items-center justify-between font-mono text-[0.58rem] text-muted">
                  <span className="tabular-nums">{i}</span>
                  <span style={{ color: badge.col }}>{badge.txt}</span>
                </div>
                <div
                  className="truncate text-center font-mono text-[0.78rem] font-semibold"
                  style={{
                    color: slot.state === 'tombstone' ? C_COLLISION : 'var(--color-fg)',
                  }}
                >
                  {slot.state === 'filled' ? slot.key : slot.state === 'tombstone' ? '×' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* load-factor meter */}
      <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
        <div className="mb-1 flex items-center justify-between font-mono text-[0.64rem] uppercase tracking-wider text-muted">
          <span>
            load factor ={' '}
            <span className="tabular-nums text-fg/85">{filled}+{tombstones}</span> /{' '}
            <span className="tabular-nums text-fg/85">{capacity}</span> ={' '}
            <span
              className="tabular-nums"
              style={{ color: overThreshold ? C_COLLISION : 'var(--color-fg)' }}
            >
              {loadFraction.toFixed(3)}
            </span>
          </span>
          <span>
            {probeCount != null && (
              <span style={{ color: C_PROBE }}>probes: {probeCount}</span>
            )}
            {resizing && (
              <span className="ml-3 text-blog">resize → rehash</span>
            )}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          {/* 2/3 threshold marker */}
          <div
            className="absolute top-0 z-10 h-full w-px"
            style={{ left: `${(LOAD_NUM / LOAD_DEN) * 100}%`, background: 'var(--color-fg)', opacity: 0.4 }}
            aria-hidden
          />
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(loadFraction, 1) * 100}%`,
              background: overThreshold ? C_COLLISION : C_ACCENT,
              transition: 'width 350ms ease, background 350ms ease',
            }}
          />
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInsert()
          }}
          placeholder="key…"
          aria-label="Key to insert"
          maxLength={12}
          className="h-8 w-28 min-w-0 flex-shrink rounded-lg border border-[var(--color-border)] bg-surface px-2.5 font-mono text-[0.78rem] text-fg outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-blog/50"
        />
        <button
          type="button"
          onClick={handleInsert}
          disabled={busy || !input.trim()}
          aria-label="Insert typed key"
          className="h-8 rounded-lg border border-[var(--color-border)] bg-surface px-3 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog disabled:cursor-not-allowed disabled:opacity-40"
        >
          insert
        </button>
        <button
          type="button"
          onClick={handleRandom}
          disabled={busy}
          aria-label="Insert a random key"
          className="h-8 rounded-lg border border-[var(--color-border)] bg-surface px-3 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog disabled:cursor-not-allowed disabled:opacity-40"
        >
          insert random
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy || filled === 0}
          aria-label="Delete the last inserted key, leaving a tombstone"
          className="h-8 rounded-lg border border-[var(--color-border)] bg-surface px-3 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[#ff7a59] hover:text-[#ff7a59] disabled:cursor-not-allowed disabled:opacity-40"
        >
          delete
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset the table"
          className="ml-auto h-8 rounded-lg border border-[var(--color-border)] bg-surface px-3 font-mono text-[0.7rem] uppercase tracking-wider text-muted transition-colors hover:border-fg hover:text-fg"
        >
          reset
        </button>
      </div>

      {/* legend + caption */}
      <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.62rem] text-muted">
          <LegendDot label="empty" border="var(--color-border)" />
          <LegendDot label="filled" border={C_ACCENT} fill="color-mix(in srgb, var(--color-blog) 16%, transparent)" />
          <LegendDot label="tombstone" border={C_COLLISION} fill="color-mix(in srgb, #ff7a59 16%, transparent)" />
          <LegendDot label="probe path" border={C_PROBE} fill="color-mix(in srgb, #7c5cff 14%, transparent)" />
          <LegendDot label="collision" border={C_COLLISION} />
        </div>
        <p className="font-mono text-[0.68rem] leading-snug text-fg/75" aria-live="polite">
          {caption}
        </p>
      </div>
    </figure>
  )
}

function LegendDot({
  label,
  border,
  fill = 'transparent',
}: {
  label: string
  border: string
  fill?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded border"
        style={{ borderColor: border, background: fill }}
        aria-hidden
      />
      {label}
    </span>
  )
}
