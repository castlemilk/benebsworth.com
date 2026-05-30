'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { pack, type Placement } from './packer'
import { shuffle, mulberry32 } from './rng'
import { ARTIFACTS } from './artifacts'
import { ArtifactTile } from './artifact-tiles'

const WORDS = [
  { key: 'blog', text: 'BLOG' },
  { key: 'project', text: 'PROJECT' },
  { key: 'about', text: 'ABOUT' },
]
const HREF: Record<string, string> = { blog: '/blog/', project: '/projects/', about: '/about/' }
const COLOR: Record<string, string> = { blog: '#00e0b8', project: '#7c5cff', about: '#ff7a59' }

/* Snake-draw timing. The body of each word draws over BODY_DUR at constant
 * (linear) speed; words cascade with a START_STAGGER that is < BODY_DUR so they
 * overlap. Because every monotone step is exactly one cell, the head moves at a
 * constant speed and letter i lands precisely when the head passes its cell:
 *   delay(i) = wordStart + (i / (len-1)) * BODY_DUR.
 * Linear easing on body+head is required to keep the head glued to the letters. */
const BODY_DUR = 760 // ms, time for one word's connector to draw fully
const START_STAGGER = 320 // ms between successive words' starts (overlapping cascade)
const HEAD_LEAD = 70 // ms the head fades in ahead of the first letter
const CASCADE = ['blog', 'project', 'about'] // draw order

type Latest = { title: string; href: string } | null

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export function GridNav({ latest }: { latest: Latest }) {
  const reducedMotion = useReducedMotion()
  const [dims, setDims] = useState<{ cols: number; rows: number }>({ cols: 5, rows: 4 })
  const [seed, setSeed] = useState(1)
  const [cell, setCell] = useState(84)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 1e9))
    function fit() {
      const w = window.innerWidth, h = window.innerHeight
      const cols = w < 560 || h > w ? 4 : 5
      const rows = cols === 4 ? 5 : 4
      const availW = Math.min(w * 0.96, 1200), availH = Math.min(h * 0.64, 740)
      const PAD_FRAC = 0.5
      const c = Math.max(62, Math.floor(Math.min(availW / (cols + PAD_FRAC * 2), availH / (rows + PAD_FRAC * 2))))
      setDims({ cols, rows }); setCell(c)
    }
    fit()
    let t: number
    const onResize = () => { clearTimeout(t); t = window.setTimeout(fit, 180) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [])

  const { cols, rows } = dims
  const PAD = cell * 0.5
  // Extra bottom padding so a hovered artifact-tile label (drawn below its tile)
  // is never clipped by the SVG bounds. Top/left padding stays PAD.
  const LABEL_PAD = cell * 0.34
  const W = cols * cell + PAD * 2, H = rows * cell + PAD * 2 + LABEL_PAD
  const cx = (c: number) => PAD + c * cell + cell / 2
  const cy = (r: number) => PAD + r * cell + cell / 2

  // Connector path through the centres of a word's cells (monotone right/down).
  const connectorD = (path: [number, number][]) =>
    path.map(([c, r], i) => `${i === 0 ? 'M' : 'L'}${cx(c)} ${cy(r)}`).join(' ')

  const placement = useMemo<Placement | null>(() => {
    let p: Placement | null = null
    for (let s = seed; !p && s < seed + 80; s++) p = pack(cols, rows, WORDS, s)
    return p
  }, [cols, rows, seed])
  if (!placement) return null

  const occ = new Set(Object.values(placement).flat().map(([c, r]) => `${c},${r}`))
  const gaps: [number, number][] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!occ.has(`${c},${r}`)) gaps.push([c, r])

  const rng = mulberry32(seed)
  const picks = shuffle(ARTIFACTS, rng).slice(0, gaps.length).map((a) =>
    a.id === 'latest' && latest
      ? { ...a, link: latest.href, lines: ['↳ NEW', ...latest.title.split(' ').slice(0, 2)] }
      : a,
  )

  return (
    <main className="font-mono flex min-h-screen flex-col items-center gap-4 p-4 sm:p-6">
      <header className="w-full pt-2 text-center sm:pt-4">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-4xl">BEN EBSWORTH</h1>
        <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted sm:text-[0.7rem]">platform · sre engineer</p>
      </header>
      <div className="flex w-full flex-1 items-center justify-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="navigation" aria-label="Primary">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => (
            <circle key={`${c}-${r}`} cx={cx(c)} cy={cy(r)} r={Math.max(1.6, cell * 0.024)} fill="#26262d" opacity={0.5} />
          )),
        )}
        {WORDS.map((w) => {
          const path = placement![w.key]
          const accent = COLOR[w.key]
          const order = CASCADE.indexOf(w.key)
          const wordStart = order * START_STAGGER
          const len = path.length
          // Per-letter delay: the head crosses the word over BODY_DUR at constant
          // speed, so letter i settles exactly as the head passes its cell.
          const letterDelay = (i: number) =>
            wordStart + (len > 1 ? (i / (len - 1)) * BODY_DUR : 0)
          const d = connectorD(path)
          return (
            // Re-key by seed so a re-roll remounts the group and replays the draw.
            <Link key={`${w.key}-${seed}`} href={HREF[w.key]} aria-label={w.key}>
              <g className="word">
                {/* Persistent connector "snake body": draws in, then stays as the
                    structural line linking the letters; brightens on hover/focus. */}
                <path
                  d={d}
                  pathLength={1}
                  className="snake-body motion-safe:animate-[snakedraw_linear_backwards]"
                  stroke={accent}
                  strokeWidth={Math.max(2, cell * 0.05)}
                  style={{
                    animationDuration: `${BODY_DUR}ms`,
                    animationDelay: `${wordStart}ms`,
                    filter: `drop-shadow(0 0 ${Math.max(2, cell * 0.04)}px ${accent})`,
                  }}
                />
                {/* Bright comet head riding the same retracting dash offset, so it
                    stays glued to the draw front. Decorative → skip under reduced
                    motion (would otherwise leave a static dash at the path end). */}
                {!reducedMotion && (
                  <path
                    d={d}
                    pathLength={1}
                    className="snake-head motion-safe:animate-[snakehead_linear_backwards]"
                    stroke={accent}
                    strokeWidth={Math.max(3, cell * 0.08)}
                    strokeDasharray="0.06 0.94"
                    style={{
                      animationDuration: `${BODY_DUR}ms`,
                      animationDelay: `${Math.max(0, wordStart - HEAD_LEAD)}ms`,
                      filter: `drop-shadow(0 0 ${Math.max(4, cell * 0.09)}px ${accent})`,
                    }}
                  />
                )}
                {path.map(([c, r], i) => (
                  <text key={i} x={cx(c)} y={cy(r)} textAnchor="middle" dominantBaseline="central"
                    fill={accent} fontWeight={700} fontSize={Math.round(cell * 0.46)}
                    className="motion-safe:animate-[glyphsettle_.34s_cubic-bezier(.34,1.56,.64,1)_backwards]"
                    style={{ animationDelay: `${letterDelay(i)}ms` }}>{w.text[i]}</text>
                ))}
              </g>
            </Link>
          )
        })}
        {gaps.map(([c, r], i) => {
          const a = picks[i]; if (!a) return null
          const external = a.link.startsWith('http')
          const inner = <ArtifactTile artifact={a} cx={cx(c)} cy={cy(r)} cell={cell} reducedMotion={reducedMotion} />
          // Hover/focus on the anchor (focus lands on the link, not the inner
          // <g>, so handlers live here) reveals this tile's label in the top layer.
          const active = {
            onMouseEnter: () => setHovered(i),
            onMouseLeave: () => setHovered((prev) => (prev === i ? null : prev)),
            onFocus: () => setHovered(i),
            onBlur: () => setHovered((prev) => (prev === i ? null : prev)),
          }
          return external
            ? <a key={i} href={a.link} target="_blank" rel="noreferrer" aria-label={a.label} {...active}>{inner}</a>
            : <Link key={i} href={a.link} prefetch={a.link === '/archive/' ? false : undefined} aria-label={a.label} {...active}>{inner}</Link>
        })}
        {/* Label layer painted after all tiles so the hovered tile's label is
            never covered by a neighbouring tile's rect (tiles paint row-major). */}
        {gaps.map(([c, r], i) => {
          const a = picks[i]; if (!a || hovered !== i) return null
          const s = cell * 0.84
          return (
            <text key={`lbl-${i}`} x={cx(c)} y={cy(r) + s / 2 + cell * 0.2}
              textAnchor="middle" fill="#e6e6ee" fontSize={Math.max(9, Math.round(cell * 0.13))}
              style={{ pointerEvents: 'none' }}>{a.label}</text>
          )
        })}
      </svg>
      </div>
      <button onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
        className="text-xs uppercase tracking-wider text-muted hover:text-fg">↻ shuffle</button>
    </main>
  )
}
