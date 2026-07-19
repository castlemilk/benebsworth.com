// Render verification for the K3 blog trilogy.
// Usage: npx tsx scripts/verify-k3-posts.mjs [baseUrl]
// Default base: http://localhost:3128 (serve out/ with: python3 -m http.server 3128 --directory out)
import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:3128'
const POSTS = [
  {
    slug: 'how-kimi-k3-works',
    checks: [
      ['StatGroup stats', (p) => p.locator('text=2.8T').first().isVisible()],
      ['MoEBlock 64 cells', async (p) => (await p.locator('[data-expert-cell], .moe-expert, svg rect').count()) >= 64],
      ['AttnResDepth 6 blocks', async (p) => (await p.locator('.attnres-block').count()) === 6],
      ['AttnResDepth toggle to plain', async (p) => {
        const curvedBefore = await p.locator('.attnres-edge').count()
        await p.getByRole('button', { name: /plain residual/i }).click()
        const plainEdges = await p.locator('.attnres-edges-plain line, .attnres-edges-plain path').count()
        const curvedAfter = await p.locator('.attnres-edge').count()
        return curvedBefore === 5 && plainEdges >= 1 && curvedAfter === 0
      }],
      ['escaped dollars', (p) => p.locator('text=$0.30').first().isVisible()],
    ],
  },
  {
    slug: 'benchmarking-kimi-k3',
    checks: [
      ['table 7 rows', async (p) => (await p.locator('table tbody tr').count()) >= 7],
      ['partial dagger', (p) => p.locator('td:has-text("†")').first().isVisible()],
      ['ArtifactFrame srcdoc artifact', async (p) => {
        const frame = p.locator('iframe[title*="N-Body" i], iframe[title*="artifact" i]').first()
        await frame.waitFor({ timeout: 15000 })
        const srcdoc = await frame.getAttribute('srcdoc')
        return !!srcdoc && srcdoc.length > 1000 && /canvas|script/i.test(srcdoc)
      }],
      ['open full page link', async (p) => {
        const href = await p.locator('a:has-text("Open full page")').first().getAttribute('href')
        return !!href && href.includes('/lab-data/llm-benchmark/outputs/n-body-field/kimi-k3')
      }],
    ],
  },
  {
    slug: 'delta-rule-linear-attention',
    checks: [
      ['cost curve paths', async (p) => (await p.locator('svg path').count()) >= 2],
      ['61× marker', (p) => p.locator('text=61×').first().isVisible()],
      ['DeltaMemory 4 slots', async (p) => (await p.locator('text=/^K[1-4]$/').count()) >= 4],
      ['delta toggle', async (p) => {
        await p.getByRole('button', { name: /delta rule/i }).first().click()
        return p.locator('text=/delta rule/i').first().isVisible()
      }],
      ['katex rendered', async (p) => (await p.locator('.katex').count()) >= 4],
    ],
  },
]

const failures = []
const browser = await chromium.launch()

for (const { slug, checks } of POSTS) {
  const url = `${BASE}/blog/${slug}/`
  console.log(`\n[${slug}] ${url}`)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const resp = await page.goto(url, { waitUntil: 'networkidle' })
  if (!resp?.ok()) {
    failures.push(`${slug}: HTTP ${resp?.status()}`)
    console.log(`  ✗ HTTP ${resp?.status()}`)
    await page.close()
    continue
  }
  // hero image resolves
  const hero = await page.request.get(`${BASE}/blog/${slug}/hero.webp`)
  if (!hero.ok()) failures.push(`${slug}: hero.webp HTTP ${hero.status()}`)

  // Warm-up: lazy (ssr:false / content-visibility) components only mount once
  // scrolled into view. Sweep the whole page, then return to top.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(600)

  for (const [name, fn] of checks) {
    try {
      const ok = await fn(page)
      if (ok) console.log(`  ✓ ${name}`)
      else { failures.push(`${slug}: ${name}`); console.log(`  ✗ ${name}`) }
    } catch (err) {
      failures.push(`${slug}: ${name}: ${err instanceof Error ? err.message : String(err)}`)
      console.log(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // mobile: no horizontal overflow
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mob.goto(url, { waitUntil: 'networkidle' })
  const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (overflow > 1) { failures.push(`${slug}: mobile overflow ${overflow}px`); console.log(`  ✗ mobile overflow ${overflow}px`) }
  else console.log('  ✓ mobile no overflow')
  await mob.close()
  await page.close()
}

await browser.close()
if (failures.length) {
  console.log('\nFailures:')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\nAll three K3 posts render correctly.')
