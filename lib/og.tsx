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

/** Like publicDataUri but reads a repo-relative path (build-time only inputs that
    should NOT ship in the public bundle, e.g. per-hike OG source art). */
export function repoFileDataUri(relPath: string, mime: string): string | undefined {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), relPath))
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

export function imageMimeFromPath(relPath: string): string {
  const ext = path.extname(relPath.split('?')[0] ?? '').toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  return 'image/png'
}

export async function publicOgImageDataUri(
  relPath: string,
  options: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' } = {},
): Promise<string | undefined> {
  try {
    const cleanPath = relPath.replace(/^\//, '')
    const mime = imageMimeFromPath(cleanPath)
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', cleanPath))

    if (mime === 'image/webp' || options.width || options.height) {
      const sharp = (await import('sharp')).default
      let img = sharp(buf)
      if (options.width || options.height) {
        img = img.resize({ width: options.width, height: options.height, fit: options.fit ?? 'cover' })
      }
      const png = await img.png().toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    }

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
  description,
  footer,
  accent = '#7c5cff',
  glyph,
  iconDataUri,
  tags,
  backgroundUri,
}: {
  eyebrow: string
  title: string
  description?: string
  footer: string
  accent?: string
  /** Optional category glyph (∫ ψ Ω ◆) shown in the top-right of the card. */
  glyph?: string
  /** Optional icon PNG (topic mark) as a data URI. */
  iconDataUri?: string
  /** Optional tag list shown as a small monospace row at the bottom. */
  tags?: string[]
  /** Optional full-bleed background image (data URI) — replaces the glows/dot-grid
      with the photo + a dark scrim for text legibility. */
  backgroundUri?: string
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
        {backgroundUri ? (
          <>
            {/* full-bleed hike art (pre-cropped to exactly 1200×630) */}
            { }
            <img src={backgroundUri} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} alt="" />
            {/* scrim for text legibility (Satori has no blur, so use stacked gradients):
                darken the left two-thirds (eyebrow/title/footer-left) + the bottom strip,
                leaving the right side of the art clear. */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(8,8,11,0.80) 0%, rgba(8,8,11,0.30) 46%, transparent 78%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,11,0.12) 0%, rgba(8,8,11,0.04) 45%, rgba(8,8,11,0.66) 100%)' }} />
          </>
        ) : (
          <>
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
          </>
        )}
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
          {/* eyebrow row: brand dots + category + glyph */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {glyph ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${accent}26, ${accent}08)`, border: `1px solid ${accent}40` }}>
                <div style={{ display: 'flex', fontSize: 40, color: accent, lineHeight: 1 }}>{glyph}</div>
              </div>
            ) : iconDataUri ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${accent}26, ${accent}08)`, border: `1px solid ${accent}40` }}>
                { }
                <img src={iconDataUri} width={42} height={42} style={{ objectFit: 'contain' }} alt="" />
              </div>
            ) : null}
          </div>

          {/* title + accent rule */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', maxWidth: 1000, fontSize: 78, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.05, letterSpacing: -2 }}>
              {title}
            </div>
            <div style={{ display: 'flex', width: 128, height: 7, marginTop: 34, borderRadius: 9999, background: accent }} />
            {description ? (
              <div style={{ display: 'flex', marginTop: 26, fontSize: 30, color: '#c1c1cd', lineHeight: 1.4, maxWidth: 1000 }}>
                {truncate(description, 140)}
              </div>
            ) : null}
            {tags && tags.length > 0 ? (
              <div style={{ display: 'flex', marginTop: 24, flexWrap: 'wrap', gap: 10 }}>
                {tags.map((t) => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 14px',
                      borderRadius: 9999,
                      border: `1px solid ${accent}50`,
                      background: `${accent}10`,
                      color: '#cfcfd9',
                      fontSize: 22,
                      letterSpacing: 1,
                      textTransform: 'lowercase',
                    }}
                  >
                    #{t}
                  </div>
                ))}
              </div>
            ) : null}
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
  heroUri,
  iconUri,
  authorUri,
}: {
  title: string
  description?: string
  topicLabel: string
  dateText?: string
  accent?: string
  heroUri?: string
  iconUri?: string
  authorUri?: string
}) {
  const hasHero = Boolean(heroUri)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#08080b', position: 'relative', fontFamily: 'sans-serif' }}>
        {/* accent glow + dot grid + inner frame */}
        <div style={{ position: 'absolute', top: -260, left: -200, width: 720, height: 720, borderRadius: 9999, background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, opacity: 0.42 }} />
        {hasHero ? (
          <div style={{ position: 'absolute', bottom: -260, right: -220, width: 640, height: 640, borderRadius: 9999, background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, opacity: 0.18 }} />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)', backgroundSize: '34px 34px' }} />
        <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 28, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 26 }} />

        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', padding: '70px 78px', gap: hasHero ? 42 : 52 }}>
          {/* left: text column */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, maxWidth: hasHero ? 626 : 700 }}>
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
              <div style={{ display: 'flex', marginTop: 28, fontSize: hasHero ? 53 : 56, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.08, letterSpacing: -1.6 }}>
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
                  { }
                  <img src={authorUri} width={60} height={60} style={{ objectFit: 'cover' }} alt="" />
                </div>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', color: '#ececf2', fontSize: 28, fontWeight: 600 }}>Ben Ebsworth</div>
                <div style={{ display: 'flex', color: '#7c7c8a', fontSize: 21 }}>benebsworth.com</div>
              </div>
            </div>
          </div>

          {/* right: generated hero panel, falling back to the topic mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: hasHero ? 430 : 312,
              height: 490,
              borderRadius: 24,
              border: `1px solid ${accent}40`,
              background: hasHero ? '#111116' : `radial-gradient(60% 60% at 50% 40%, ${accent}26, transparent 72%)`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            { }
            {heroUri ? (
              <>
                <img src={heroUri} width={430} height={490} style={{ objectFit: 'cover' }} alt="" />
                <div style={{ position: 'absolute', inset: 0, border: `1px solid ${accent}50`, borderRadius: 24 }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, background: 'linear-gradient(180deg, transparent 0%, rgba(8,8,11,0.55) 100%)' }} />
              </>
            ) : iconUri ? <img src={iconUri} width={172} height={172} style={{ objectFit: 'contain' }} alt="" /> : null}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
