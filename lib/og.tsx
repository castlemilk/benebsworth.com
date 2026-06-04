import { ImageResponse } from 'next/og'

/** Shared 1200×630 OpenGraph card. Rendered at build time (static export). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const BRAND_DOTS = ['#00e0b8', '#7c5cff', '#ff7a59'] // blog · project · about accents

export function renderOgCard({
  eyebrow,
  title,
  footer,
  accent = '#7c5cff',
}: {
  eyebrow: string
  title: string
  footer: string
  accent?: string
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0e',
          padding: '76px 84px',
          position: 'relative',
        }}
      >
        {/* accent glow, top-left */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: accent,
            opacity: 0.2,
          }}
        />
        {/* eyebrow row: brand dots + category */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex' }}>
            {BRAND_DOTS.map((c) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 9999, background: c, marginRight: 12 }} />
            ))}
          </div>
          <div style={{ display: 'flex', color: '#8b8b9a', fontSize: 28, letterSpacing: 5, marginLeft: 12, textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        </div>
        {/* title */}
        <div style={{ display: 'flex', maxWidth: 980, fontSize: 76, fontWeight: 700, color: '#f4f4f6', lineHeight: 1.06, letterSpacing: -1.5 }}>
          {title}
        </div>
        {/* footer: name + meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', color: '#cfcfd8', fontSize: 32, fontWeight: 600 }}>Ben Ebsworth</div>
          <div style={{ display: 'flex', color: accent, fontSize: 28 }}>{footer}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
