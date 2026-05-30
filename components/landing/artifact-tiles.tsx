'use client'
import type { Artifact } from '@/lib/gen/content'
import { ArtifactKind } from '@/lib/gen/content'

type Props = {
  artifact: Artifact
  cx: number
  cy: number
  cell: number
  reducedMotion?: boolean
}

export function ArtifactTile({ artifact: a, cx, cy, cell, reducedMotion = false }: Props) {
  const s = cell * 0.84
  const x = cx - s / 2, y = cy - s / 2, rad = s * 0.16
  const cols = ['#00e0b8', '#7c5cff', '#ff7a59']
  return (
    <g className="group cursor-pointer">
      <rect x={x} y={y} width={s} height={s} rx={rad}
        className="fill-[#14141b] stroke-[#2a2a34] [stroke-width:1.5] transition group-hover:stroke-[#5a5a66]" />
      {a.kind === ArtifactKind.IMAGE && a.image && (
        <>
          <clipPath id={`clip-${a.id}-${Math.round(cx)}-${Math.round(cy)}`}>
            <rect x={x} y={y} width={s} height={s} rx={rad} />
          </clipPath>
          <image href={a.image} x={x} y={y} width={s} height={s}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${a.id}-${Math.round(cx)}-${Math.round(cy)})`} />
        </>
      )}
      {a.kind === ArtifactKind.TEXT && (
        <>
          <clipPath id={`cliptext-${a.id}-${Math.round(cx)}-${Math.round(cy)}`}>
            <rect x={x} y={y} width={s} height={s} rx={rad} />
          </clipPath>
          <g clipPath={`url(#cliptext-${a.id}-${Math.round(cx)}-${Math.round(cy)})`}>
            {a.lines.map((ln, i) => (
              <text key={i} x={cx} y={y + s * 0.32 + i * (s * 0.22)} textAnchor="middle"
                fill={i === 0 ? '#00e0b8' : '#b9b9c4'} fontSize={Math.round(s * (i === 0 ? 0.13 : 0.16))}
                fontWeight={i === 0 ? 700 : 500}>{ln}</text>
            ))}
          </g>
        </>
      )}
      {a.kind === ArtifactKind.GLYPH && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill="#9a9aa6" fontSize={Math.round(s * 0.42)} fontWeight={700}>{a.glyph}</text>
      )}
      {a.kind === ArtifactKind.AVATAR && (
        <>
          <circle cx={cx} cy={cy} r={s * 0.3} fill="none" stroke="#ff7a59" strokeWidth={2}
            className="motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#ff7a59"
            fontSize={Math.round(s * 0.26)} fontWeight={700}>be</text>
        </>
      )}
      {a.kind === ArtifactKind.ANIM && (
        <>
          {[0, 1, 2].map((i) => {
            if (reducedMotion) {
              const ang = (i * 120 * Math.PI) / 180
              const r = s * 0.24
              return (
                <circle key={i} cx={cx + r * Math.cos(ang)} cy={cy + r * Math.sin(ang)}
                  r={s * 0.06} fill={cols[i]} />
              )
            }
            return (
              <circle key={i} cx={cx} cy={cy} r={s * 0.06} fill={cols[i]}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`${i * 120} ${cx} ${cy}`} to={`${i * 120 + 360} ${cx} ${cy}`}
                  dur="3.2s" repeatCount="indefinite" />
                <animate attributeName="cx" values={`${cx};${cx + s * 0.24}`} dur="0s" fill="freeze" />
              </circle>
            )
          })}
          <circle cx={cx} cy={cy} r={s * 0.05} fill="#fff" opacity={0.8} />
        </>
      )}
    </g>
  )
}
