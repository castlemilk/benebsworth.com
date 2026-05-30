'use client'
import { useEffect, useRef, useState } from 'react'
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

type Latest = { title: string; href: string } | null

export function GridNav({ latest }: { latest: Latest }) {
  const [dims, setDims] = useState<{ cols: number; rows: number }>({ cols: 5, rows: 4 })
  const [seed, setSeed] = useState(1)
  const [cell, setCell] = useState(84)

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 1e9))
    function fit() {
      const w = window.innerWidth, h = window.innerHeight
      const cols = w < 560 || h > w ? 4 : 5
      const rows = cols === 4 ? 5 : 4
      const availW = Math.min(w * 0.92, 660), availH = Math.min(h * 0.58, 560)
      const PAD_FRAC = 0.5
      const c = Math.max(48, Math.floor(Math.min(availW / (cols + PAD_FRAC * 2), availH / (rows + PAD_FRAC * 2))))
      setDims({ cols, rows }); setCell(c)
    }
    fit()
    let t: number
    const onResize = () => { clearTimeout(t); t = window.setTimeout(fit, 180) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { cols, rows } = dims
  const PAD = cell * 0.5
  const W = cols * cell + PAD * 2, H = rows * cell + PAD * 2
  const cx = (c: number) => PAD + c * cell + cell / 2
  const cy = (r: number) => PAD + r * cell + cell / 2

  let placement: Placement | null = null
  for (let s = seed; !placement && s < seed + 80; s++) placement = pack(cols, rows, WORDS, s)
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="navigation" aria-label="Primary">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => (
            <circle key={`${c}-${r}`} cx={cx(c)} cy={cy(r)} r={Math.max(1.6, cell * 0.024)} fill="#26262d" opacity={0.5} />
          )),
        )}
        {WORDS.map((w) => {
          const path = placement![w.key]
          return (
            <Link key={w.key} href={HREF[w.key]} aria-label={w.key}>
              <g className="word">
                {path.map(([c, r], i) => (
                  <text key={i} x={cx(c)} y={cy(r)} textAnchor="middle" dominantBaseline="central"
                    fill={COLOR[w.key]} fontWeight={700} fontSize={Math.round(cell * 0.46)}
                    className="motion-safe:animate-[fadeglyph_.3s_ease_both]"
                    style={{ animationDelay: `${i * 60}ms` }}>{w.text[i]}</text>
                ))}
              </g>
            </Link>
          )
        })}
        {gaps.map(([c, r], i) => {
          const a = picks[i]; if (!a) return null
          const external = a.link.startsWith('http')
          const inner = <ArtifactTile artifact={a} cx={cx(c)} cy={cy(r)} cell={cell} />
          return external
            ? <a key={i} href={a.link} target="_blank" rel="noreferrer">{inner}</a>
            : <Link key={i} href={a.link}>{inner}</Link>
        })}
      </svg>
      <button onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
        className="text-xs uppercase tracking-wider text-muted hover:text-fg">↻ shuffle</button>
    </main>
  )
}
