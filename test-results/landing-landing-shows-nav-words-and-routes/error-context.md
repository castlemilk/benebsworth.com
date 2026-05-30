# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> landing shows nav words and routes
- Location: e2e/landing.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('blog')
    - locator resolved to <a href="/blog/" aria-label="blog">…</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  54 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <svg width="498" height="415" role="navigation" aria-label="Primary" viewBox="0 0 498 415">…</svg> intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - navigation "Primary" [ref=e3]:
      - link "blog" [ref=e24] [cursor=pointer]:
        - /url: /blog/
        - generic [ref=e25]:
          - generic [ref=e26]: B
          - generic [ref=e27]: L
          - generic [ref=e28]: O
          - generic [ref=e29]: G
      - link "project" [ref=e30] [cursor=pointer]:
        - /url: /projects/
        - generic [ref=e31]:
          - generic [ref=e32]: P
          - generic [ref=e33]: R
          - generic [ref=e34]: O
          - generic [ref=e35]: J
          - generic [ref=e36]: E
          - generic [ref=e37]: C
          - generic [ref=e38]: T
      - link "about" [ref=e39] [cursor=pointer]:
        - /url: /about/
        - generic [ref=e40]:
          - generic [ref=e41]: A
          - generic [ref=e42]: B
          - generic [ref=e43]: O
          - generic [ref=e44]: U
          - generic [ref=e45]: T
      - 'link "{ } github →" [ref=e46] [cursor=pointer]':
        - /url: https://github.com/castlemilk
        - generic [ref=e47]:
          - generic [ref=e49]: "{ }"
          - generic [ref=e50]: github →
      - link "↳ NEW latest post latest post →" [ref=e51] [cursor=pointer]:
        - /url: /blog/
        - generic [ref=e52]:
          - generic [ref=e54]: ↳ NEW
          - generic [ref=e55]: latest
          - generic [ref=e56]: post
          - generic [ref=e57]: latest post →
      - link "⌘ the old site →" [ref=e58] [cursor=pointer]:
        - /url: /archive/
        - generic [ref=e59]:
          - generic [ref=e61]: ⌘
          - generic [ref=e62]: the old site →
      - link "generative →" [ref=e63] [cursor=pointer]:
        - /url: /lab/
        - generic [ref=e70]: generative →
    - button "↻ shuffle" [ref=e71]
  - alert [ref=e72]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('landing shows nav words and routes', async ({ page }) => {
  4  |   await page.goto('/')
  5  |   await expect(page.getByLabel('Primary')).toBeVisible()
> 6  |   await page.getByLabel('blog').click()
     |                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  7  |   await expect(page).toHaveURL(/\/blog\/?$/)
  8  | })
  9  | 
  10 | test('reduced motion still renders words', async ({ browser }) => {
  11 |   const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  12 |   const page = await ctx.newPage()
  13 |   await page.goto('/')
  14 |   await expect(page.getByLabel('Primary')).toBeVisible()
  15 | })
  16 | 
```