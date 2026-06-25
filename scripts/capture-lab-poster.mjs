import { chromium } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'

// Regenerate lab card posters for bespoke (non-EffectModule) labs:
//   node scripts/capture-lab-poster.mjs   (needs `npm run dev` on :3000)
const OUT = 'public/lab/previews'
mkdirSync(OUT, { recursive: true })

// Prefer an already-cached full Chromium build to avoid a fresh download; fall
// back to Playwright's default resolution (run `npx playwright install chromium`).
const CACHED = `${homedir()}/Library/Caches/ms-playwright/chromium-1169/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
const browser = await chromium.launch(existsSync(CACHED) ? { executablePath: CACHED } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })

// hide the studio's overlay chrome so only the WebGL render is captured
const HIDE_CHROME = () => {
  const canvas = document.querySelector('canvas')
  if (!canvas) return false
  let root = canvas
  while (root.parentElement && !root.classList.contains('rounded-xl')) root = root.parentElement
  root.querySelectorAll('*').forEach((el) => {
    if (el === canvas || el.contains(canvas)) return
    el.style.visibility = 'hidden'
  })
  return true
}

const clickMarker = (label) => {
  const els = [...document.querySelectorAll('button, [role="button"], li, span, div')]
  const hit = els.find((e) => e.textContent && e.textContent.trim().toLowerCase() === label.toLowerCase() && e.offsetParent !== null)
  if (hit) { hit.click(); return true }
  return false
}

async function captureUniverse(label) {
  await page.goto('http://localhost:3000/lab/universe-scale/', { waitUntil: 'networkidle' })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(1200)
  const clicked = await page.evaluate(clickMarker, label)
  await page.waitForTimeout(3000) // let the anime.js zoom settle
  await page.evaluate(HIDE_CHROME)
  await page.waitForTimeout(200)
  const file = `${OUT}/universe-scale-${label.toLowerCase()}.jpg`
  await page.locator('canvas').first().screenshot({ path: file, type: 'jpeg', quality: 88 })
  console.log(`saved ${file} (marker clicked=${clicked})`)
}

for (const label of ['Earth', 'Sun', 'Galaxy']) {
  await captureUniverse(label)
}

// circuit-sim: hide chrome, capture canvas
await page.goto('http://localhost:3000/lab/circuit-sim/', { waitUntil: 'networkidle' })
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForTimeout(2500)
await page.evaluate(HIDE_CHROME)
await page.waitForTimeout(200)
await page.locator('canvas').first().screenshot({ path: `${OUT}/circuit-sim.jpg`, type: 'jpeg', quality: 88 })
console.log('saved circuit-sim.jpg')

await browser.close()
console.log('done')
