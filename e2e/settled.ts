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
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'))
}
