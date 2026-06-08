import { ImageResponse } from 'next/og'

/** Shared 1200×630 OpenGraph card. Rendered at build time (static export). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const BRAND_DOTS = ['#00e0b8', '#7c5cff', '#ff7a59'] // blog · project · about accents

/**
 * Renders the site's OpenGraph card. Satori (next/og) only supports flexbox +
 * gradients + borders — no filter/blur/box-shadow — so depth comes from layered
 * radial-gradient glows, a faint dot-grid, an inner frame and an accent rule.
 */
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
          background: '#08080b',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* accent glow, top-left */}
        <div style={{ position: 'absolute', top: -240, left: -180, width: 680, height: 680, borderRadius: 9999, background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, opacity: 0.5 }} />
        {/* cool secondary glow, bottom-right */}
        <div style={{ position: 'absolute', bottom: -260, right: -200, width: 620, height: 620, borderRadius: 9999, background: 'radial-gradient(circle, #7c5cff 0%, transparent 70%)', opacity: 0.22 }} />
        {/* faint dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
            backgroundSize: '34px 34px',
          }}
        />
        {/* inner frame */}
        <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 28, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 26 }} />

        {/* content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '84px 92px',
          }}
        >
          {/* eyebrow row: brand dots + category */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex' }}>
              {BRAND_DOTS.map((c) => (
                <div key={c} style={{ width: 18, height: 18, borderRadius: 9999, background: c, marginRight: 13 }} />
              ))}
            </div>
            <div style={{ display: 'flex', color: '#9a9aa8', fontSize: 27, letterSpacing: 6, marginLeft: 14, textTransform: 'uppercase' }}>
              {eyebrow}
            </div>
          </div>

          {/* title + accent rule */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', maxWidth: 1000, fontSize: 78, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.05, letterSpacing: -2 }}>
              {title}
            </div>
            <div style={{ display: 'flex', width: 128, height: 7, marginTop: 34, borderRadius: 9999, background: accent }} />
          </div>

          {/* footer: name + meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', color: '#e6e6ec', fontSize: 33, fontWeight: 600 }}>Ben Ebsworth</div>
            <div style={{ display: 'flex', color: accent, fontSize: 27, letterSpacing: 1 }}>{footer}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
