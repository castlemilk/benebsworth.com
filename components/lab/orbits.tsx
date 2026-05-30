'use client'
import { useEffect, useState } from 'react'

const COLORS = ['#00e0b8', '#7c5cff', '#ff7a59']

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

export function Orbits({ size = 320 }: { size?: number }) {
  const reduced = useReducedMotion()
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.32
  const dot = size * 0.05
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img"
      className="h-auto w-full max-w-full" style={{ maxWidth: size }}
      aria-label="Generative orbiting dots animation">
      {[0, 1, 2].map((i) => {
        if (reduced) {
          const ang = (i * 120 * Math.PI) / 180
          return (
            <circle key={i} cx={cx + r * Math.cos(ang)} cy={cy + r * Math.sin(ang)}
              r={dot} fill={COLORS[i]} />
          )
        }
        return (
          <circle key={i} cx={cx + r} cy={cy} r={dot} fill={COLORS[i]}>
            <animateTransform attributeName="transform" type="rotate"
              from={`${i * 120} ${cx} ${cy}`} to={`${i * 120 + 360} ${cx} ${cy}`}
              dur="3.2s" repeatCount="indefinite" />
          </circle>
        )
      })}
      <circle cx={cx} cy={cy} r={size * 0.04} fill="#fff" opacity={0.8} />
    </svg>
  )
}
