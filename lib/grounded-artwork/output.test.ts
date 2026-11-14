import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { beforeAll, afterAll, expect, it } from 'vitest'
import { checkGroundedOutput } from '../../scripts/check-grounded-output.mjs'
import { GROUNDED_ARTWORK, groundedArtworkUrl, GROUNDED_PAGE_SIZE } from './registry'

let root: string
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const html = (route: string, body: string) => `<html><head><meta charset="utf-8"><link rel="canonical" href="https://benebsworth.com${route}"></head><body><main id="main-content" data-pagefind-ignore>${body}</main></body></html>`
beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'grounded-output-'))
  await fs.cp('public/artwork/grounded', path.join(root, 'artwork/grounded'), { recursive: true })
  await fs.mkdir(path.join(root, 'vectors/grounded'), { recursive: true })
  const cards = GROUNDED_ARTWORK.slice(0, GROUNDED_PAGE_SIZE).map(a => `<article data-grounded-card="${a.slug}"><img src="${a.variants.light.thumbnail}" loading="lazy" width="480" height="480"></article>`).join('')
  await fs.writeFile(path.join(root, 'vectors/grounded/index.html'), html('/vectors/grounded/', `<h1>Grounded forms</h1><a href="/vectors/">Study lab</a>${cards}`))
  for (const a of GROUNDED_ARTWORK) {
    const route = groundedArtworkUrl(a)
    await fs.mkdir(path.join(root, route), { recursive: true })
    await fs.writeFile(path.join(root, route, 'index.html'), html(route, `<h1>${escape(a.title)}</h1><a href="/vectors/grounded/">Collection</a><img data-grounded-preview="${a.slug}" src="${a.variants.light.preview}"><a data-grounded-download href="${a.variants.light.master}">SVG</a><p data-grounded-basis>${escape(a.basis)}</p><p data-grounded-limitations>${escape(a.limitations)}</p>`))
  }
  await fs.writeFile(path.join(root, 'sitemap.xml'), `<urlset>${['/vectors/grounded/', ...GROUNDED_ARTWORK.map(groundedArtworkUrl)].map(url => `<url><loc>https://benebsworth.com${url}</loc></url>`).join('')}</urlset>`)
})
afterAll(async () => { if (root) await fs.rm(root, { recursive: true, force: true }) })
async function corrupt(relative: string, mutation: (bytes: Buffer) => string | Buffer, error: RegExp) {
  const file = path.join(root, relative), original = await fs.readFile(file)
  try { await fs.writeFile(file, mutation(original)); await expect(checkGroundedOutput(root)).rejects.toThrow(error) }
  finally { await fs.writeFile(file, original) }
}
it('checks all thirty static routes and 270 original/fallback asset bytes without executing HTML', async () => {
  expect(await checkGroundedOutput(root)).toMatchObject({ fixedArtworks: 30, assetsChecked: 270, originalSvgMasters: 90, initialCards: 24, browserAcceptance: 'NOT RUN', deployment: 'NOT RUN' })
})
it('rejects an altered original master', () => corrupt(GROUNDED_ARTWORK[0].variants.light.master, b => { const c = Buffer.from(b); c[100] ^= 1; return c }, /asset hash/))
it('rejects altered thumbnail bytes', () => corrupt(GROUNDED_ARTWORK[0].variants.light.thumbnail, b => Buffer.concat([b, Buffer.from('x')]), /asset size/))
it('rejects preload of a full original master on arrival', () => corrupt('vectors/grounded/index.html', b => b.toString().replace('</main>', '<img src="full.svg"></main>'), /No grounded master/))
it('rejects eager thumbnail regressions', () => corrupt('vectors/grounded/index.html', b => b.toString().replace('loading="lazy"', 'loading="eager"'), /thumbnail lazy/))
it('rejects clipping the square aspect ratio', () => corrupt('vectors/grounded/index.html', b => b.toString().replace('height="480"', 'height="360"'), /Square grounded/))
it('rejects missing scientific limitations', () => corrupt(`${groundedArtworkUrl(GROUNDED_ARTWORK[0])}index.html`, b => b.toString().replace('data-grounded-limitations', 'data-removed'), /Grounded limitations/))
it('rejects canonical route drift', () => corrupt(`${groundedArtworkUrl(GROUNDED_ARTWORK[0])}index.html`, b => b.toString().replace('rel="canonical"', 'rel="other"'), /Grounded canonical/))
it('rejects absent sitemap discovery', () => corrupt('sitemap.xml', b => b.toString().replace(`https://benebsworth.com${groundedArtworkUrl(GROUNDED_ARTWORK[0])}`, 'https://benebsworth.com/wrong/'), /Grounded sitemap/))
