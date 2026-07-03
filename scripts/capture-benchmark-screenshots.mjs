import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3456'
const OUT = process.env.OUT_DIR || 'tmp/benchmark-screenshots'

const paths = [
  { name: 'overview', path: '/lab/llm-benchmark/' },
  { name: 'category-physics', path: '/lab/llm-benchmark/advanced-physics/' },
  { name: 'task-nbody', path: '/lab/llm-benchmark/3d-physics-animation/n-body-field/' },
  { name: 'task-platformer', path: '/lab/llm-benchmark/advanced-game-building/mini-platformer/' },
  { name: 'task-crypto', path: '/lab/llm-benchmark/security-tasks/crypto-hash-race/' },
  { name: 'task-ui', path: '/lab/llm-benchmark/ui-building/landing-page-morph/' },
  { name: 'task-math', path: '/lab/llm-benchmark/advanced-mathematics/equation-solver/' },
  { name: 'task-pendulum', path: '/lab/llm-benchmark/advanced-physics/physics-pendulum-wave/' },
  { name: 'task-circuit', path: '/lab/llm-benchmark/advanced-electronics/circuit-builder-teaser/' },
  { name: 'models', path: '/lab/llm-benchmark/models/' },
]

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  for (const { name, path } of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
    console.log(`captured ${name}`)
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
