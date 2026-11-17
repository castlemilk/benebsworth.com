import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { gotoSettled } from './settled'

// Acceptance against the real static export, using the existing CI/browser setup.
// Authoring this suite is not a claim that it has run or that captures exist.
const route = '/lab/folio-components/'
const fixtureRevision = '1121edc4ae6ac8de415b5395d8fadc11450fc55f'
const articleTitle = 'Every Wire Is an RLC Circuit: Why Your Digital Signal Rings'
const articleLocator = 'content/blog/every-wire-is-an-rlc-circuit/index.mdx'
const articleSource = `https://github.com/castlemilk/benebsworth.com/blob/${fixtureRevision}/${articleLocator}`
const studyTitle = 'RLC band-pass response'

test.use({ colorScheme: 'light' })

function surface(page: Page) {
  return page.locator('[data-theme]').filter({
    has: page.getByRole('navigation', { name: 'Workbench location', exact: true }),
  })
}

function entries(page: Page) {
  return page.getByRole('region', { name: 'Find. Read. Inspect.', exact: true })
}

function context(page: Page) {
  return page.getByRole('region', { name: 'A root is not a selection.', exact: true })
}

async function openWorkbench(page: Page) {
  await gotoSettled(page, route)
  await page.evaluate(() => document.fonts.ready)
  await expect(surface(page)).toHaveCount(1)
  await expect(surface(page).getByRole('heading', { level: 1 })).toContainText('Keep the source')
  await expect(entries(page).getByRole('article')).toHaveCount(3)
}

async function setWorkbenchTheme(page: Page, theme: 'light' | 'dark' | 'inherit') {
  const label = theme === 'inherit' ? 'Follow site' : theme === 'light' ? 'Light' : 'Dark'
  await surface(page).getByRole('group', { name: 'Workbench theme', exact: true })
    .getByRole('radio', { name: label, exact: true }).check()
  await expect(surface(page)).toHaveAttribute('data-theme', theme)
}

async function hostTheme(page: Page) {
  return page.evaluate(() => ({
    classes: document.documentElement.className,
    dataTheme: document.documentElement.getAttribute('data-theme'),
    colorScheme: document.documentElement.style.colorScheme,
    storedTheme: localStorage.getItem('theme'),
    bodyColor: getComputedStyle(document.body).color,
    bodyBackground: getComputedStyle(document.body).backgroundImage,
  }))
}

async function noPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBeLessThanOrEqual(1)
}

async function expectRootAndSelection(page: Page, selected: string) {
  await expect(context(page).locator('dt')).toHaveText(['Exploring', 'Inspecting'])
  await expect(context(page).locator('dd')).toHaveText(['Source-backed RLC fixture', selected])
}

async function capture(page: Page, testInfo: TestInfo, name: string, state: string, fullPage = false) {
  await page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'))
  await page.evaluate(() => document.fonts.ready)
  const metadata = {
    route: new URL(page.url()).pathname,
    state,
    viewport: page.viewportSize(),
    theme: await surface(page).getAttribute('data-theme'),
    media: await page.evaluate(() => ({
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      forcedColors: matchMedia('(forced-colors: active)').matches,
    })),
    capture: fullPage ? 'full page' : 'viewport',
    sourceRevision: process.env.EXPECTED_SHA ?? null,
    fixtureRevision,
    project: testInfo.project.name,
    browser: testInfo.project.use.browserName ?? 'chromium',
    file: name,
  }
  const file = testInfo.outputPath(name)
  await page.screenshot({ path: file, fullPage, animations: 'disabled' })
  await testInfo.attach(name, { path: file, contentType: 'image/png' })
  await testInfo.attach(`${name}.metadata`, {
    body: Buffer.from(JSON.stringify(metadata, null, 2)), contentType: 'application/json',
  })
  // The always-uploaded PNG glob excludes JSON. Keep the exact capture context
  // in CI logs too; the existing artifact name independently includes the head SHA.
  console.info(`Folio workbench capture ${JSON.stringify(metadata)}`)
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} workbench preserves the host theme and reading hierarchy at 1280 and 390`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openWorkbench(page)
    const hostBefore = await hostTheme(page)
    // Exercise a real local change even when the requested capture is light.
    await setWorkbenchTheme(page, theme === 'light' ? 'dark' : 'light')
    expect(await hostTheme(page)).toEqual(hostBefore)
    await setWorkbenchTheme(page, theme)
    expect(await hostTheme(page)).toEqual(hostBefore)
    await expect(surface(page)).toHaveCSS('color-scheme', theme)
    await expect(surface(page).getByRole('navigation', { name: 'Workbench location' })
      .getByText('Folio components', { exact: true })).toHaveAttribute('aria-current', 'page')
    await expectRootAndSelection(page, `SVG study: ${studyTitle}`)
    await noPageOverflow(page)
    await capture(page, testInfo, `gallery-view-folio-workbench-${theme}-1280x900-initial.png`,
      'Initial view; all three entries, SVG study selected, default reading controls')

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(entries(page).getByRole('article', { name: articleTitle, exact: true })
      .getByRole('heading', { level: 3 })).toHaveText(articleTitle)
    await expect(entries(page).getByRole('complementary', { name: studyTitle, exact: true })).toBeVisible()
    await expect(surface(page).getByRole('navigation', { name: 'Workbench sections' }).getByRole('link')).toHaveCount(6)
    await noPageOverflow(page)
    expect(await hostTheme(page)).toEqual(hostBefore)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await capture(page, testInfo, `gallery-view-folio-workbench-${theme}-390x844-full-page.png`,
      'Complete workbench; responsive context, entries, sources, categories, reading and recovery', true)

    await setWorkbenchTheme(page, 'inherit')
    expect(await hostTheme(page)).toEqual(hostBefore)
  })
}

test('search, clear and facet reset retain the inspected source and exploration root', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openWorkbench(page)
  await setWorkbenchTheme(page, 'light')
  const discovery = entries(page)
  const search = discovery.getByRole('searchbox', { name: 'Find a source-backed entry', exact: true })
  const opener = discovery.getByRole('button', { name: 'Inspect Lab: RLC Resonance', exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'RLC Resonance', exact: true })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await expectRootAndSelection(page, 'Lab: RLC Resonance')

  await search.fill('a query with no matching fixture')
  await expect(discovery.getByRole('heading', { name: 'No entries match these filters', exact: true })).toBeVisible()
  await expect(discovery.getByRole('article')).toHaveCount(0)
  const retained = discovery.getByRole('complementary', { name: 'RLC Resonance', exact: true })
  await expect(retained.getByRole('link', { name: 'Lab registry entry', exact: true }))
    .toHaveAttribute('href', `https://github.com/castlemilk/benebsworth.com/blob/${fixtureRevision}/lib/lab/registry.ts`)
  await expectRootAndSelection(page, 'Lab: RLC Resonance')
  await discovery.scrollIntoViewIfNeeded()
  await capture(page, testInfo, 'gallery-view-folio-workbench-light-1280x900-empty-retained-inspector.png',
    'No matches; the previously selected RLC lab and its source remain available')

  await discovery.getByRole('button', { name: 'Clear search', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  await expect(discovery.getByRole('article')).toHaveCount(3)
  await expect(discovery.getByRole('article', { name: 'RLC Resonance', exact: true }))
    .toHaveAttribute('data-selected', 'true')

  await discovery.getByRole('group', { name: 'Entry type', exact: true })
    .getByRole('checkbox', { name: /^Article/ }).check()
  await expect(discovery.getByRole('article')).toHaveCount(1)
  await expect(retained).toBeVisible()
  await expectRootAndSelection(page, 'Lab: RLC Resonance')
  await discovery.getByRole('button', { name: 'Reset filters', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(search).toBeFocused()
  await expect(discovery.getByRole('article')).toHaveCount(3)
  await expect(discovery.getByRole('status')).toHaveText('3 entries · 0 active filters')
  await expectRootAndSelection(page, 'Lab: RLC Resonance')
  await expect(page).toHaveURL(/\/lab\/folio-components\/$/)
  await noPageOverflow(page)
})

test('native inspector keeps Close reachable after scrolling and restores its keyboard opener repeatedly', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 480 })
  await openWorkbench(page)
  await setWorkbenchTheme(page, 'dark')
  const opener = entries(page).getByRole('button', { name: `Inspect Article: ${articleTitle}`, exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: articleTitle, exact: true })
  const title = dialog.getByRole('heading', { level: 2, name: articleTitle, exact: true })
  const close = dialog.getByRole('button', { name: 'Close inspector', exact: true })
  await expect(dialog).toHaveJSProperty('open', true)
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true)
  await expect(title).toBeFocused()
  // The focused title starts the scrollable body; Close precedes it in the
  // compact, non-scrolling header and is reached with reverse tab order.
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await expect(close).toBeInViewport({ ratio: 1 })
  const headerPosition = await close.boundingBox()
  expect(headerPosition).not.toBeNull()
  await capture(page, testInfo, 'gallery-view-folio-workbench-dark-390x480-inspector-open.png',
    'Native modal opened by keyboard; long article title, Close focused, source trail at initial scroll')

  const disclosure = dialog.getByText('Identity and original tags', { exact: true })
  await disclosure.focus()
  await page.keyboard.press('Enter')
  await dialog.getByText('fixture:blog:every-wire-is-an-rlc-circuit', { exact: true }).scrollIntoViewIfNeeded()
  // This is the actual dialog body, not a synthetic overflow fixture.
  await expect.poll(() => dialog.locator(':scope > div').evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await expect(close).toBeInViewport({ ratio: 1 })
  const scrolledPosition = await close.boundingBox()
  expect(scrolledPosition).not.toBeNull()
  expect(Math.abs(scrolledPosition!.y - headerPosition!.y)).toBeLessThanOrEqual(1)
  await capture(page, testInfo, 'gallery-view-folio-workbench-dark-390x480-inspector-scrolled.png',
    'Identity disclosure open; real dialog body scrolled; the same Close control remains in the viewport')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await expectRootAndSelection(page, `Article: ${articleTitle}`)
  await page.keyboard.press('Space')
  await expect(dialog).toBeVisible()
  await expect(title).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await noPageOverflow(page)
})

test('320px layout wraps real long titles and locators while reading controls stay operable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await openWorkbench(page)
  await setWorkbenchTheme(page, 'light')
  const title = entries(page).getByRole('article', { name: articleTitle, exact: true })
    .getByRole('heading', { level: 3 })
  await expect(title).toHaveText(articleTitle)
  expect(await title.evaluate(element =>
    element.getBoundingClientRect().height > parseFloat(getComputedStyle(element).lineHeight) * 1.5,
  )).toBe(true)
  // The first occurrence is the masthead citation, not a new test-only fixture.
  const citation = surface(page).locator('[data-source-state="recorded"]').filter({
    has: page.getByRole('link', { name: 'Article MDX and authored lab reference', exact: true }),
  }).first()
  const locator = citation.getByText(articleLocator, { exact: true })
  await expect(citation.getByRole('link', { name: 'Article MDX and authored lab reference', exact: true }))
    .toHaveAttribute('href', articleSource)
  await expect(locator).toHaveCSS('overflow-wrap', 'anywhere')
  expect(await locator.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await noPageOverflow(page)

  const reading = page.getByRole('region', { name: 'Comfort, within the page.', exact: true })
  const preferences = reading.getByRole('group', { name: 'Reading sample preferences', exact: true })
  const size = preferences.getByRole('slider', { name: 'Text size', exact: true })
  await size.focus()
  await page.keyboard.press('End')
  await expect(size).toHaveValue('24')
  await expect(size).toHaveAttribute('aria-valuetext', '24 px')
  await preferences.getByRole('combobox', { name: 'Line length', exact: true }).selectOption('wide')
  await preferences.getByRole('checkbox', { name: 'Show reading note', exact: true }).uncheck()
  await expect(reading.getByRole('complementary', { name: 'Reading note', exact: true })).toHaveCount(0)
  await noPageOverflow(page)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await capture(page, testInfo, 'gallery-view-folio-workbench-light-320x740-long-content-max-type.png',
    'Real long title and locator; 24px reading text, wide measure, optional note hidden', true)
  await preferences.getByRole('button', { name: 'Reset reading sample', exact: true }).click()
  await expect(size).toHaveValue('19')
  await expect(preferences.getByRole('combobox', { name: 'Line length', exact: true })).toHaveValue('comfortable')
  await expect(preferences.getByRole('checkbox', { name: 'Show reading note', exact: true })).toBeChecked()
  await expect(reading.getByRole('complementary', { name: 'Reading note', exact: true })).toBeVisible()

  await test.step('Synthetic long-title stress keeps the complete heading scrollable and Close reachable', async () => {
    await page.setViewportSize({ width: 320, height: 480 })
    const opener = entries(page).getByRole('button', { name: `Inspect Article: ${articleTitle}`, exact: true })
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = surface(page).getByRole('dialog')
    await expect(dialog).toHaveAccessibleName(articleTitle)
    const heading = dialog.getByRole('heading', { level: 2 })
    const close = dialog.getByRole('button', { name: 'Close inspector', exact: true })
    const syntheticTitle = 'Layout stress fixture — deliberately extended title for wrapping, keyboard access and a persistent Close control in a short, narrow viewport. This text is synthetic and does not describe an article or scientific result.'
    // Deliberately mutate only this browser fixture; no source data or component
    // contract is replaced. The synthetic status stays visible in the title.
    await heading.evaluate((element, text) => { element.textContent = text }, syntheticTitle)
    await expect(dialog).toHaveAccessibleName(syntheticTitle)
    await expect(heading).toHaveText(syntheticTitle)
    const titleOverflow = await heading.evaluate(element => ({
      horizontal: element.scrollWidth - element.clientWidth,
      vertical: element.scrollHeight - element.clientHeight,
    }))
    expect(titleOverflow.horizontal).toBeLessThanOrEqual(1)
    expect(titleOverflow.vertical).toBeLessThanOrEqual(1)
    await expect(close).toBeInViewport({ ratio: 1 })
    const position = await close.boundingBox()
    await capture(page, testInfo, 'gallery-view-folio-workbench-light-320x480-synthetic-title-stress.png',
      'Synthetic layout stress only: the artificially extended h2 is not an article title or scientific evidence')
    const disclosure = dialog.getByText('Identity and original tags', { exact: true })
    await disclosure.focus()
    await page.keyboard.press('Enter')
    await dialog.getByText('fixture:blog:every-wire-is-an-rlc-circuit', { exact: true }).scrollIntoViewIfNeeded()
    await expect.poll(() => dialog.locator(':scope > div').evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    await expect(close).toBeInViewport({ ratio: 1 })
    const scrolled = await close.boundingBox()
    expect(position).not.toBeNull()
    expect(scrolled).not.toBeNull()
    expect(Math.abs(scrolled!.y - position!.y)).toBeLessThanOrEqual(1)
    await noPageOverflow(page)
    await heading.evaluate((element, text) => { element.textContent = text }, articleTitle)
    await close.click()
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })
})

test('reduced motion and forced colors preserve selection, keyboard focus and honest recovery states', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
  await openWorkbench(page)
  await setWorkbenchTheme(page, 'dark')
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  const discovery = entries(page)
  const selected = discovery.getByRole('article', { name: studyTitle, exact: true })
  await expect(selected).toHaveAttribute('data-selected', 'true')
  await expect(selected.getByText('Selected', { exact: true })).toBeVisible()
  await expect(selected).toHaveCSS('border-inline-start-width', '3px')
  await expect(selected).toHaveCSS('forced-color-adjust', 'auto')
  const search = discovery.getByRole('searchbox', { name: 'Find a source-backed entry', exact: true })
  await search.fill('rlc')
  await search.focus()
  await page.keyboard.press('Tab')
  const clear = discovery.getByRole('button', { name: 'Clear search', exact: true })
  await expect(clear).toBeFocused()
  await expect(clear).toHaveCSS('outline-style', 'solid')
  await expect(clear).toHaveCSS('outline-width', '2px')
  await expect(clear).toHaveCSS('transition-duration', '0s')
  await page.keyboard.press('Enter')
  await expect(search).toBeFocused()

  const recovery = page.getByRole('region', { name: 'Leave a way forward.', exact: true })
  const state = recovery.getByRole('combobox', { name: 'Preview a specimen state', exact: true })
  await state.selectOption('loading')
  await expect(recovery.getByRole('heading', { name: 'Loading source records', exact: true })).toBeVisible()
  const skeleton = recovery.locator('[data-state="loading"] [aria-hidden="true"]')
  await expect(skeleton).toHaveCount(1)
  await expect(skeleton.locator('span')).toHaveCount(3)
  await expect(skeleton.locator('span').first()).toHaveCSS('animation-name', 'none')
  await expect(recovery.getByRole('button', { name: 'Show ready specimen', exact: true })).toHaveCount(0)
  await state.selectOption('error')
  await expect(recovery.getByRole('heading', { name: 'Source records could not be loaded', exact: true })).toBeVisible()
  await expect(recovery.getByText('Specimen only. No network request, retry or data import is performed.', { exact: true })).toBeVisible()
  for (const sourceState of ['missing', 'unavailable', 'unchecked']) {
    await expect(recovery.locator(`[data-source-state="${sourceState}"]`).getByRole('link')).toHaveCount(0)
  }
  await recovery.scrollIntoViewIfNeeded()
  await capture(page, testInfo, 'gallery-view-folio-workbench-dark-390x844-forced-colors-error.png',
    'Forced colors and reduced motion; explicit failed-request specimen and distinct missing/unavailable/unchecked sources')
  await recovery.getByRole('button', { name: 'Show ready specimen', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(recovery.getByRole('heading', { name: 'The original context is still here.', exact: true })).toBeVisible()
  await expectRootAndSelection(page, `SVG study: ${studyTitle}`)
  await noPageOverflow(page)
})
