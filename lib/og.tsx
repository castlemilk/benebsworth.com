import { ImageResponse } from 'next/og'
import fs from 'node:fs'
import path from 'node:path'

/** Shared 1200×630 OpenGraph card. Rendered at build time (static export). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

/**
 * Read a file under `public/` and inline it as a base64 data URI — Satori can't
 * fetch URLs during the static build, so images must be embedded. Returns
 * undefined if the file is missing so the card degrades gracefully.
 */
export function publicDataUri(relPath: string, mime: string): string | undefined {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', relPath.replace(/^\//, '')))
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

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

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

/**
 * Rich per-post OpenGraph card: topic thumbnail panel on the right, title +
 * description + author byline on the left. Images (topic icon, author avatar)
 * must be passed as data URIs (see publicDataUri) — Satori can't fetch URLs.
 */
export function renderBlogOgCard({
  title,
  description,
  topicLabel,
  dateText,
  accent = '#7c5cff',
  iconUri,
  authorUri,
}: {
  title: string
  description?: string
  topicLabel: string
  dateText?: string
  accent?: string
  iconUri?: string
  authorUri?: string
}) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#08080b', position: 'relative', fontFamily: 'sans-serif' }}>
        {/* accent glow + dot grid + inner frame */}
        <div style={{ position: 'absolute', top: -260, left: -200, width: 720, height: 720, borderRadius: 9999, background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, opacity: 0.42 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)', backgroundSize: '34px 34px' }} />
        <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 28, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 26 }} />

        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', padding: '70px 78px', gap: 52 }}>
          {/* left: text column */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* eyebrow: brand dots + topic + date */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex' }}>
                  {BRAND_DOTS.map((c) => (
                    <div key={c} style={{ width: 15, height: 15, borderRadius: 9999, background: c, marginRight: 11 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', color: accent, fontSize: 24, letterSpacing: 4, marginLeft: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                  {topicLabel}
                </div>
                {dateText ? <div style={{ display: 'flex', color: '#7c7c8a', fontSize: 23, marginLeft: 16 }}>· {dateText}</div> : null}
              </div>
              {/* title */}
              <div style={{ display: 'flex', marginTop: 28, fontSize: 56, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.08, letterSpacing: -1.6 }}>
                {truncate(title, 92)}
              </div>
              {/* description */}
              {description ? (
                <div style={{ display: 'flex', marginTop: 24, fontSize: 26, color: '#b7b7c4', lineHeight: 1.42 }}>{truncate(description, 150)}</div>
              ) : null}
            </div>

            {/* author byline */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {authorUri ? (
                <div style={{ display: 'flex', width: 60, height: 60, borderRadius: 9999, overflow: 'hidden', border: `2px solid ${accent}`, marginRight: 18 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={authorUri} width={60} height={60} style={{ objectFit: 'cover' }} alt="" />
                </div>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', color: '#ececf2', fontSize: 28, fontWeight: 600 }}>Ben Ebsworth</div>
                <div style={{ display: 'flex', color: '#7c7c8a', fontSize: 21 }}>benebsworth.com</div>
              </div>
            </div>
          </div>

          {/* right: topic thumbnail panel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 312,
              borderRadius: 24,
              border: `1px solid ${accent}40`,
              background: `radial-gradient(60% 60% at 50% 40%, ${accent}26, transparent 72%)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {iconUri ? <img src={iconUri} width={172} height={172} style={{ objectFit: 'contain' }} alt="" /> : null}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
