import type { Page } from '@playwright/test'

/**
 * Navigate, then wait for React to finish swapping streamed content into place.
 *
 * A streamed page briefly holds a second, hidden copy of late content in a
 * `<div hidden id="S:n">` container. On a slow runner a locator can resolve while
 * both copies exist and fail strict mode, even though readers only ever see one.
 */
export async function gotoSettled(page: Page, url: string) {
  await page.goto(url)
  await waitForSettled(page)
}

/**
 * Wait until streamed content is in place and, on pages with the site header,
 * until the header has hydrated. Its effect publishes `--site-nav-height`.
 *
 * The page's Suspense boundaries hydrate at normal priority after the shell
 * (docs/postmortem/0009 removed the root re-render that used to force them),
 * so on a slow runner the header's buttons can be painted but not yet live for
 * a second or so after `load`. A click in that window is lost, which a reader
 * would simply repeat; a test must wait instead.
 */
export async function waitForSettled(page: Page) {
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'))
  await page.waitForFunction(() => !document.querySelector('[data-site-nav]') || document.documentElement.style.getPropertyValue('--site-nav-height') !== '')
}
