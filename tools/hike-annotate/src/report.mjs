import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function card(m, heroId) {
  const badges = [
    m.id === heroId ? '<span class="hero">HERO</span>' : '',
    m.skip ? '<span class="b warn">skip</span>' : '',
    m.needsManual ? '<span class="b warn">manual</span>' : '',
    m.overrode ? `<span class="b ov">scene≠geo</span>` : '',
    `<span class="b">q${m.quality}</span>`,
    `<span class="b">h${m.heroWorthiness}</span>`,
    `<span class="b">${esc(m.sceneType)}</span>`,
  ].join('')
  const geo = `${m.geoWaypoint || '—'}${m.geoKm != null ? ` ${m.geoKm.toFixed(1)}km` : ''}`
  const when = m.takenAt ? esc(m.takenAt.slice(0, 16).replace('T', ' ')) : ''
  return `<figure class="${m.skip || m.needsManual ? 'dim' : ''}">
  <img src="${esc(m.thumb)}" loading="lazy" alt="">
  <figcaption>
    <div class="badges">${badges}</div>
    <p class="cap">${esc(m.caption) || '<em>(no caption)</em>'}</p>
    <p class="tags">${(m.subjectTags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</p>
    <p class="meta">geo: ${esc(geo)}${when ? ` · ${when}` : ''}</p>
    <p class="alt">${esc(m.alt)}</p>
  </figcaption></figure>`
}

/** Write a self-contained HTML review report grouped by placed waypoint (route order). */
export async function writeReport({ slug, meta, geo, metas, heroId, tmpDir, partial }) {
  const order = geo.map((w) => w.name)
  const groups = {}
  for (const m of metas) (groups[m.slot || '(unplaced)'] ||= []).push(m)
  const names = [...order.filter((n) => groups[n]), ...Object.keys(groups).filter((n) => !order.includes(n))]
  const sections = names
    .map(
      (n) =>
        `<section><h2>${esc(n)} <small>${groups[n].length} photo${groups[n].length === 1 ? '' : 's'}</small></h2>` +
        `<div class="grid">${groups[n].map((m) => card(m, heroId)).join('')}</div></section>`,
    )
    .join('')
  const skips = metas.filter((m) => m.skip).length
  const manual = metas.filter((m) => m.needsManual).length
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(meta.name)} — photo placement proposal</title>
<style>
:root{color-scheme:dark}body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#0b0b0d;color:#e9e9ee}
header{padding:18px 22px;border-bottom:1px solid #26262c}h1{margin:0 0 4px;font-size:20px}.sub{color:#9a9aa2;font:13px monospace}
h2{margin:0;padding:8px 22px;border-top:1px solid #26262c;background:#141419;position:sticky;top:0;z-index:1;font-size:15px}h2 small{color:#7a7a82;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;padding:16px 22px}
figure{margin:0;background:#15151a;border:1px solid #26262c;border-radius:10px;overflow:hidden}figure.dim{opacity:.5}
img{width:100%;height:155px;object-fit:cover;display:block;background:#222}
figcaption{padding:9px 11px}.badges{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px}
.b,.hero{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:10px}.b{background:#26262e;color:#a8a8b2}
.hero{background:#1f6f4f;color:#c3ffe6}.warn{background:#6f3a1f;color:#ffd9bf}.ov{background:#3a2f6f;color:#dcd2ff}
.cap{margin:4px 0;font-weight:600;color:#f2f2f6}.tags{margin:3px 0;display:flex;gap:4px;flex-wrap:wrap}.tags span{font:11px monospace;color:#8a8a94;background:#1d1d23;padding:0 5px;border-radius:8px}
.meta{margin:3px 0;color:#8a8a94;font:12px ui-monospace,monospace}.alt{margin:5px 0 0;color:#70707a;font-size:12px}
</style></head><body>
<header><h1>${esc(meta.name)} — photo placement proposal${partial ? ' (PARTIAL / trial)' : ''}</h1>
<div class="sub">${metas.length} photos · hero: ${esc(heroId || 'none')} · ${skips} flagged skip · ${manual} need manual · slug: ${esc(slug)}</div></header>
${sections}</body></html>`
  const file = join(tmpDir, 'report.html')
  await writeFile(file, html)
  return file
}
