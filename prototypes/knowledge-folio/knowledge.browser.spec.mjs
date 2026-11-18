import { test as base, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const CONCEPT = 'concept:logistic-map:proposal'
const ARTICLE = 'blog:chaos-in-one-equation'
const LAB = 'lab:logistic-bifurcation'
const STUDY = 'study:editorial-system'
const LONG = 'mock:long-label'
const ARTICLE_URL = 'https://benebsworth.com/blog/chaos-in-one-equation/'
const LAB_URL = 'https://benebsworth.com/lab/logistic-bifurcation/'
const SOURCE_REVISION = '1121edc4ae6ac8de415b5395d8fadc11450fc55f'

// Any application exception fails the affected browser check. HTTP navigation
// to the live blog is deliberately outside this isolated suite: exact hrefs
// are checked, but no substituted source page is rendered as fake evidence.
const test = base.extend({
  page: async ({ page }, runWithPage) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await runWithPage(page)
    expect(errors, 'The isolated prototype must not raise browser exceptions').toEqual([])
  },
})

const node = (page, id) => page.locator(`[data-node-id="${id}"]`)
const inspector = page => page.locator('#kg-inspector')
const title = page => page.locator('#kg-inspector-title')
const params = page => new URL(page.url()).searchParams

async function open(page, values = {}) {
  const query = new URLSearchParams(values).toString()
  await page.goto(query ? `?${query}` : './')
  await expect(page.locator('#kg-title')).toHaveText('Follow an idea.')
  await expect(title(page)).not.toBeEmpty()
  await page.evaluate(() => document.fonts.ready)
}

async function noHorizontalOverflow(page) {
  const size = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(size.document, `Document overflow at ${size.viewport}px`).toBeLessThanOrEqual(size.viewport + 1)
  expect(size.body, `Body overflow at ${size.viewport}px`).toBeLessThanOrEqual(size.viewport + 1)
}

async function uniqueIds(page) {
  const duplicates = await page.evaluate(() => {
    const counts = new Map()
    for (const element of document.querySelectorAll('[id]')) counts.set(element.id, (counts.get(element.id) || 0) + 1)
    return [...counts].filter(([, count]) => count > 1).map(([id]) => id)
  })
  expect(duplicates, 'Accessible headings and focus targets need unique IDs').toEqual([])
}

async function tabTo(page, locator, maximum = 35) {
  for (let step = 0; step < maximum; step += 1) {
    if (await locator.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(locator, 'The control must be reachable with ordinary Tab navigation').toBeFocused()
}

async function capture(page, testInfo, name, { fullPage = true, inputMethod = 'programmatic fixture navigation' } = {}) {
  await page.evaluate(() => document.fonts.ready)
  const screenshotPath = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage })
  const context = {
    screenshot: `${name}.png`,
    route: page.url(),
    viewport: page.viewportSize(),
    theme: await page.locator('body').getAttribute('data-theme'),
    fixture: params(page).get('kgFixture') || 'source',
    inputMethod,
    browserVersion: page.context().browser()?.version() || 'unavailable',
    browserSelection: process.env.KG02_CHROMIUM_EXECUTABLE ? 'explicit system executable' : 'Playwright managed Chromium',
    implementationRevision: process.env.KG02_SOURCE_REVISION || 'implementation revision not supplied; capture is not attributed to a commit',
    fixtureSourceRevision: SOURCE_REVISION,
    evidence: 'Actual isolated Chromium test capture, not the Mac draft or a deployed route',
    verification: 'Capture alone does not establish that the test or suite passed; consult report.json',
    liveArticleAndLabJourney: 'not exercised by this suite',
  }
  const contextPath = testInfo.outputPath(`${name}.json`)
  await writeFile(contextPath, JSON.stringify(context, null, 2) + '\n')
  await testInfo.attach(name, { path: screenshotPath, contentType: 'image/png' })
  await testInfo.attach(`${name} capture context`, { path: contextPath, contentType: 'application/json' })
}

test('folio opening names its root, proposed mapping and original evidence', async ({ page }, testInfo) => {
  await open(page)
  await expect(page.locator('#kg-context')).toContainText('Root of neighbourhood')
  await expect(page.locator('#kg-context strong')).toHaveText('Logistic map')
  await expect(title(page)).toHaveText('Logistic map')
  await expect(inspector(page)).toContainText('Proposed concept mapping')
  await expect(page.locator('#kg-primary-source')).toHaveAttribute('href', `${ARTICLE_URL}#eqn:logistic-map`)
  await expect(page.locator('.kg-network [data-node-id]')).toHaveCount(3)
  await expect(page.locator('.kg-figure-footer')).toContainText('2 of 2')
  await uniqueIds(page)
  await noHorizontalOverflow(page)
  await capture(page, testInfo, 'desktop-light-first', { fullPage: false })
  await capture(page, testInfo, 'desktop-light-full')
})

test('inspection preserves root, DOM identity, focus and repeated-activation history', async ({ page }) => {
  await open(page)
  const article = node(page, ARTICLE)
  const before = await article.elementHandle()
  await article.click()
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await expect(page.locator('#kg-context strong')).toHaveText('Logistic map')
  await expect(article).toBeFocused()
  expect(await article.evaluate((element, saved) => element === saved, before)).toBe(true)
  const selectedUrl = page.url()
  const historyLength = await page.evaluate(() => history.length)
  await article.press('Enter')
  await expect(article).toBeFocused()
  expect(page.url()).toBe(selectedUrl)
  expect(await page.evaluate(() => history.length)).toBe(historyLength)
  await before.dispose()
})

test('related-link selection does not refocus the reversed relationship destination', async ({ page }) => {
  await open(page)
  const relatedArticle = inspector(page).locator('.kg-related-title').filter({ hasText: 'Chaos hides in one line of algebra' })
  await relatedArticle.press('Enter')
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await expect(node(page, ARTICLE)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  expect(params(page).get('kgSelected')).toBe(ARTICLE)
})

test('explicit rerooting and native Back and Forward keep selection distinct', async ({ page }) => {
  await open(page)
  await node(page, ARTICLE).click()
  const inspectionUrl = page.url()
  await page.locator('#kg-reroot').click()
  await expect(page.locator('#kg-context strong')).toHaveText('Chaos hides in one line of algebra')
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  expect(params(page).get('kgRoot')).toBe(ARTICLE)
  const rootUrl = page.url()
  await page.goBack()
  await expect(page).toHaveURL(inspectionUrl)
  await expect(page.locator('#kg-context strong')).toHaveText('Logistic map')
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await page.goForward()
  await expect(page).toHaveURL(rootUrl)
  await expect(page.locator('#kg-context strong')).toHaveText('Chaos hides in one line of algebra')
})

test('deep-link reload and view history restore filters without dropping foreign URL state', async ({ page }) => {
  const query = new URLSearchParams({ kgView: 'list', kgRoot: 'tag:chaos', kgSelected: LAB, kgQ: 'logistic', kgKind: 'lab', kgCategory: 'lab-category:maths' })
  query.append('campaign', 'first')
  query.append('campaign', 'second')
  await page.goto(`?${query}#kg-main`)
  await expect(page.locator('#kg-query')).toHaveValue('logistic')
  await expect(page.locator('#kg-kind')).toHaveValue('lab')
  await expect(page.locator('#kg-category')).toHaveValue('lab-category:maths')
  await expect(page.locator('.kg-result')).toHaveCount(1)
  await expect(title(page)).toHaveText('Logistic Bifurcation')
  const deepLink = page.url()
  await page.reload()
  await expect(page).toHaveURL(deepLink)
  await expect(page.locator('#kg-query')).toHaveValue('logistic')
  await expect(title(page)).toHaveText('Logistic Bifurcation')
  await page.getByRole('link', { name: 'Categories', exact: true }).click()
  expect(params(page).getAll('campaign')).toEqual(['first', 'second'])
  expect(new URL(page.url()).hash).toBe('#kg-main')
  await page.goBack()
  await expect(page.locator('#kg-query')).toHaveValue('logistic')
  await expect(page.locator('#kg-kind')).toHaveValue('lab')
  await expect(page.locator('#kg-category')).toHaveValue('lab-category:maths')
  await expect(page.locator('.kg-result')).toHaveCount(1)
  await page.goForward()
  await expect(page.getByRole('link', { name: 'Categories', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('typing is uncommitted, search and native filters navigate the list, selection persists', async ({ page }) => {
  await open(page)
  const originalUrl = page.url()
  const beforeTyping = await page.evaluate(() => history.length)
  await page.locator('#kg-query').fill('logistic')
  expect(page.url()).toBe(originalUrl)
  expect(await page.evaluate(() => history.length)).toBe(beforeTyping)
  await page.locator('#kg-query').press('Enter')
  expect(params(page).get('kgQ')).toBe('logistic')
  await expect(page.getByRole('link', { name: 'Searchable list', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByLabel('Item type', { exact: true }).selectOption('lab')
  await page.getByLabel('Source category', { exact: true }).selectOption('lab-category:maths')
  await expect(page.locator('.kg-result')).toHaveCount(1)
  await expect(node(page, LAB)).toBeVisible()
  await expect(title(page)).toHaveText('Logistic map')
  await expect(inspector(page)).toContainText('outside the current result page or filters')
  await page.reload()
  await expect(page.getByLabel('Item type', { exact: true })).toHaveValue('lab')
  await expect(page.locator('.kg-result')).toHaveCount(1)
})

test('zero results recover without silently replacing the inspected item', async ({ page }) => {
  await open(page, { kgView: 'list', kgQ: 'a query with no match', kgSelected: ARTICLE })
  await expect(page.getByRole('heading', { name: 'No items match these filters.' })).toBeVisible()
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await expect(page.locator('.kg-result')).toHaveCount(0)
  await page.getByRole('link', { name: 'Clear search and filters', exact: true }).click()
  await expect(page.locator('.kg-result')).toHaveCount(10)
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await uniqueIds(page)
})

test('ordinary keyboard navigation reaches search, result, inspector and the original source link', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to exploration' })).toBeFocused()
  await page.keyboard.press('Enter')
  await tabTo(page, page.locator('#kg-query'))
  await page.keyboard.type('logistic')
  await page.keyboard.press('Enter')
  await expect(page.locator('#kg-view-title')).toBeFocused()
  await tabTo(page, node(page, LAB))
  await page.keyboard.press('Enter')
  await expect(title(page)).toHaveText('Logistic Bifurcation')
  await tabTo(page, page.locator('#kg-primary-source'), 45)
  await expect(page.locator('#kg-primary-source')).toBeFocused()
  await expect(page.locator('#kg-primary-source')).toHaveAttribute('href', LAB_URL)
  // The exact original href is tested; activation of the live lab is a separate
  // acceptance step and is not replaced with a mocked success page here.
})

test('Escape from the inline inspector restores its opener while other Escape remains local', async ({ page }) => {
  await open(page)
  await node(page, ARTICLE).click()
  await page.locator('#kg-query').press('Escape')
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await page.locator('#kg-inspector-jump').click()
  await expect(page.locator('#kg-inspector')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(title(page)).toHaveText('Choose an item.')
  expect(params(page).has('kgSelected')).toBe(true)
  expect(params(page).get('kgSelected')).toBe('')
  await expect(page.locator('#kg-inspector-jump')).toBeFocused()
})

test('modified activation preserves native opening of an independent graph deep link', async ({ page, context }) => {
  await open(page)
  const startingUrl = page.url()
  const [opened] = await Promise.all([
    context.waitForEvent('page'),
    node(page, ARTICLE).click({ modifiers: ['ControlOrMeta'] }),
  ])
  try {
    await opened.waitForLoadState('domcontentloaded')
    await expect(opened.locator('#kg-inspector-title')).toHaveText('Chaos hides in one line of algebra')
    expect(new URL(opened.url()).searchParams.get('kgSelected')).toBe(ARTICLE)
    expect(page.url()).toBe(startingUrl)
    await expect(title(page)).toHaveText('Logistic map')
  } finally {
    await opened.close()
  }
})

test('valid empty data has a recoverable empty state', async ({ page }) => {
  await open(page, { kgFixture: 'empty', kgSelected: ARTICLE })
  await expect(page.getByRole('heading', { name: 'There are no items in this sample.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The graph is unavailable.' })).toHaveCount(0)
  await expect(page.locator('.kg-network')).toHaveCount(0)
  expect(params(page).get('kgSelected')).toBe(ARTICLE)
  await page.getByRole('link', { name: 'Load the source sample', exact: true }).click()
  await expect(title(page)).toHaveText('Logistic map')
})

test('failure stays unavailable after retry and never masquerades as empty success', async ({ page }, testInfo) => {
  await open(page, { kgFixture: 'error' })
  await expect(page.getByRole('heading', { name: 'The graph is unavailable.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'There are no items in this sample.' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry simulation', exact: true }).click()
  await expect(page.locator('#kg-status')).toContainText('No successful result was returned')
  await expect(page.getByRole('heading', { name: 'The graph is unavailable.' })).toBeVisible()
  await expect(page.locator('.kg-network')).toHaveCount(0)
  await capture(page, testInfo, 'error-light-1280', { inputMethod: 'automated pointer activation of retry' })
})

test('partial coverage reports unknown totals and keeps available sources usable', async ({ page }) => {
  await open(page, { kgFixture: 'partial' })
  await expect(page.locator('#kg-availability')).toContainText('Coverage is incomplete')
  await expect(page.locator('#kg-availability')).toContainText('unknown')
  await expect(page.locator('.kg-figure-footer')).toContainText('total unknown')
  await node(page, LAB).click()
  await expect(page.locator('#kg-primary-source')).toHaveAttribute('href', LAB_URL)
  await expect(page.locator('#kg-context strong')).toHaveText('Logistic map')
})

test('missing root retains the requested identity and independent article selection', async ({ page }) => {
  await open(page, { kgRoot: 'unavailable:root', kgSelected: ARTICLE })
  await expect(page.getByRole('heading', { name: 'This root is unavailable.' })).toBeVisible()
  await expect(page.locator('#kg-view')).toContainText('unavailable:root')
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await expect(page.locator('#kg-primary-source')).toHaveAttribute('href', ARTICLE_URL)
  expect(params(page).get('kgRoot')).toBe('unavailable:root')
  await page.getByRole('link', { name: 'Browse the available items', exact: true }).click()
  await expect(page.locator('.kg-result')).toHaveCount(10)
  expect(params(page).get('kgRoot')).toBe('unavailable:root')
})

test('missing selection is visible without silently substituting the root', async ({ page }) => {
  await open(page, { kgSelected: 'unavailable:selection' })
  await expect(title(page)).toHaveText('Selection unavailable.')
  await expect(inspector(page)).toContainText('unavailable:selection')
  await expect(page.locator('#kg-context strong')).toHaveText('Logistic map')
  await expect(node(page, CONCEPT)).not.toHaveAttribute('aria-current', 'true')
  await page.getByRole('link', { name: 'Inspect the current root', exact: true }).click()
  await expect(title(page)).toHaveText('Logistic map')
})

test('missing source metadata has no invented destination or successful evidence', async ({ page }) => {
  await open(page, { kgFixture: 'missing', kgSelected: LAB })
  await expect(title(page)).toHaveText('Logistic Bifurcation')
  await expect(page.locator('#kg-primary-source')).toHaveCount(0)
  await expect(inspector(page)).toContainText('No standalone source link was supplied')
  await expect(inspector(page)).toContainText('Source evidence was not supplied for this record')
  await expect(inspector(page)).toContainText('Mock record for interface review')
  await expect(node(page, ARTICLE)).toBeVisible()
})

test('study inspector exposes its real design-study source without invented scientific edges', async ({ page }, testInfo) => {
  await open(page, { kgView: 'list', kgKind: 'study', kgSelected: STUDY })
  await expect(title(page)).toHaveText('Research folio — editorial study')
  await expect(page.locator('#kg-primary-source')).toHaveAttribute('href', 'https://benebsworth.com/lab/editorial-system/')
  await expect(inspector(page)).toContainText('No connections are recorded for this item in the sample')
  await expect(inspector(page)).toContainText('not experimental data')
  await expect(page.locator('.kg-result')).toHaveCount(1)
  await capture(page, testInfo, 'study-light-1280')
})

test('category overview retains all twenty blog topics and nine Lab categories', async ({ page }, testInfo) => {
  await open(page, { kgView: 'categories' })
  const blogTopics = page.getByRole('region', { name: 'Blog topics', exact: true })
  const labCategories = page.getByRole('region', { name: 'Lab categories', exact: true })
  await expect(blogTopics.locator('.kg-category-rows li')).toHaveCount(20)
  await expect(labCategories.locator('.kg-category-rows li')).toHaveCount(9)
  await expect(page.locator('#kg-view')).toContainText('29 registry entries in 2 namespaces')
  await expect(blogTopics.getByRole('link', { name: 'Config · Kustomize', exact: true })).toBeVisible()
  await expect(blogTopics.getByRole('link', { name: 'Hiking', exact: true })).toBeVisible()
  await expect(labCategories.getByRole('link', { name: 'Generative Art', exact: true })).toBeVisible()
  await capture(page, testInfo, 'categories-light-1280')
  await blogTopics.getByRole('link', { name: 'Mathematics', exact: true }).click()
  await expect(page.locator('#kg-category')).toHaveValue('blog-topic:maths')
  await expect(node(page, ARTICLE)).toBeVisible()
  await expect(node(page, LAB)).toHaveCount(0)
  await page.goBack()
  await labCategories.getByRole('link', { name: 'Mathematics', exact: true }).click()
  await expect(page.locator('#kg-category')).toHaveValue('lab-category:maths')
  await expect(node(page, LAB)).toBeVisible()
  await expect(node(page, ARTICLE)).toHaveCount(0)
})

test('large neighbourhood has a readable cap and a complete neighbour-list continuation', async ({ page }) => {
  await open(page, { kgFixture: 'large' })
  await expect(page.locator('.kg-network [data-node-id]')).toHaveCount(7)
  await expect(page.locator('.kg-figure-footer')).toContainText('6 of 999')
  await expect(page.locator('#kg-disclosure')).toContainText('synthetic')
  await page.getByRole('link', { name: /List all loaded neighbours/ }).click()
  expect(params(page).get('kgScope')).toBe('neighbours')
  await expect(page.locator('.kg-result')).toHaveCount(12)
  await page.getByRole('link', { name: 'Last page (84)', exact: true }).click()
  await expect(page.locator('.kg-result')).toHaveCount(3)
  await expect(page.getByRole('navigation', { name: 'Result pages' })).toContainText('Page 84 of 84')
  await expect(page.getByRole('navigation', { name: 'Result pages' })).toContainText('End of results')
})

test('large collection reaches its final four items and restores that page on reload', async ({ page }, testInfo) => {
  await open(page, { kgFixture: 'large', kgView: 'list', kgScope: 'collection' })
  await expect(page.locator('.kg-result')).toHaveCount(12)
  await page.getByRole('link', { name: 'Last page (84)', exact: true }).click()
  await expect(page.locator('.kg-result')).toHaveCount(4)
  await expect(page.getByRole('navigation', { name: 'Result pages' })).toContainText('Page 84 of 84')
  await expect(page.getByRole('link', { name: 'Next page →', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.kg-result')).toHaveCount(4)
  await expect(page.getByRole('navigation', { name: 'Result pages' })).toContainText('Page 84 of 84')
  await capture(page, testInfo, 'large-final-light-1280', { inputMethod: 'automated pointer pagination and programmatic reload' })
})

test('out-of-range continuation stays explicit until its recovery action is chosen', async ({ page }) => {
  await open(page, { kgFixture: 'large', kgView: 'list', kgPage: '900', kgScope: 'collection' })
  await expect(page.getByRole('heading', { name: 'This page is no longer available.' })).toBeVisible()
  expect(params(page).get('kgPage')).toBe('900')
  await expect(page.locator('.kg-result')).toHaveCount(0)
  await page.getByRole('link', { name: 'Go to the last available page', exact: true }).click()
  expect(params(page).get('kgPage')).toBe('84')
  await expect(page.locator('.kg-result')).toHaveCount(4)
  await uniqueIds(page)
})

test('desktop dark theme preserves layout bounds and does not create a history step', async ({ page }, testInfo) => {
  await open(page, { kgSelected: ARTICLE })
  const before = await page.evaluate(() => history.length)
  await page.getByRole('button', { name: 'Dark paper', exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Light paper', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => history.length)).toBe(before)
  await noHorizontalOverflow(page)
  await capture(page, testInfo, 'desktop-dark-full', { inputMethod: 'automated pointer theme toggle' })
})

test('390px neighbourhood exposes the inspector and 44px action targets', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  await node(page, ARTICLE).click()
  await page.locator('#kg-inspector-jump').click()
  await expect(page.locator('#kg-inspector')).toBeFocused()
  await expect(page.locator('#kg-primary-source')).toBeInViewport()
  for (const selector of ['#kg-query', '#kg-search button', '#kg-inspector-jump', '#kg-primary-source']) {
    const bounds = await page.locator(selector).boundingBox()
    expect(bounds?.height, `${selector} minimum pointer target`).toBeGreaterThanOrEqual(44)
  }
  await noHorizontalOverflow(page)
  await capture(page, testInfo, 'mobile-neighbourhood-390', { inputMethod: 'automated pointer selection and inspector jump; narrow viewport, no physical touch device' })
})

test('320px list retains long source titles, filters and keyboard focus', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await open(page, { kgView: 'list', kgSelected: ARTICLE })
  await expect(node(page, 'blog:lorenz-and-the-limits-of-prediction')).toHaveText('The Lorenz Attractor and the Limits of Prediction')
  await page.getByLabel('Item type', { exact: true }).focus()
  await page.getByLabel('Item type', { exact: true }).selectOption('lab')
  await expect(page.getByLabel('Item type', { exact: true })).toBeFocused()
  await expect(page.locator('.kg-result')).toHaveCount(3)
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  await noHorizontalOverflow(page)
  await capture(page, testInfo, 'mobile-list-320', { inputMethod: 'programmatic focus and native selectOption; narrow viewport, no physical touch device' })
})

for (const width of [320, 390, 1280]) {
  for (const theme of ['light', 'dark']) {
    test(`long root, query and missing identifier remain contained at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width < 500 ? 740 : 900 })
      await open(page, { kgFixture: 'long-label', kgTheme: theme, kgSelected: LONG })
      await page.locator('#kg-reroot').click()
      expect(params(page).get('kgRoot')).toBe(LONG)
      await expect(page.locator('#kg-view-title')).toContainText('Synthetic long-label study:')
      await expect(title(page)).toContainText('UnbrokenIdentifier')
      await noHorizontalOverflow(page)
      if (width === 390 && theme === 'dark') await capture(page, testInfo, 'long-label-root-dark-390', { inputMethod: 'automated pointer rerooting; narrow viewport, no physical touch device' })
      await open(page, { kgView: 'list', kgTheme: theme, kgQ: 'Q'.repeat(300) })
      await expect(page.locator('#kg-view-title')).toContainText('Q'.repeat(300))
      await noHorizontalOverflow(page)
      const missingRoot = 'missing:'.padEnd(500, 'Z')
      await open(page, { kgTheme: theme, kgRoot: missingRoot, kgSelected: ARTICLE })
      await expect(page.locator('#kg-context')).toContainText(missingRoot)
      await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
      await noHorizontalOverflow(page)
      await uniqueIds(page)
    })
  }
}

test('reduced motion keeps the content immediately available without running animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expect(node(page, ARTICLE)).toBeVisible()
  await node(page, ARTICLE).click()
  await expect(title(page)).toHaveText('Chaos hides in one line of algebra')
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0)
  await expect(page.locator('#kg-primary-source')).toHaveAttribute('href', ARTICLE_URL)
})

test('forced colours retain selected state, visible keyboard focus and narrow content', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ forcedColors: 'active' })
  await open(page, { kgSelected: ARTICLE })
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  await tabTo(page, node(page, ARTICLE))
  await expect(node(page, ARTICLE)).toBeFocused()
  await expect(node(page, ARTICLE)).toHaveAttribute('aria-current', 'true')
  const focus = await node(page, ARTICLE).evaluate(element => ({
    style: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
  }))
  expect(focus.style).not.toBe('none')
  expect(focus.width).toBeGreaterThanOrEqual(2)
  await noHorizontalOverflow(page)
  await capture(page, testInfo, 'forced-colors-390', { inputMethod: 'automated keyboard, forced-colors emulation' })
})
