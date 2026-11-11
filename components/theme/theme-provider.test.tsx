// @vitest-environment jsdom
import { act } from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './theme-provider'
import { THEME_SCRIPT } from './theme-script'
import { setTheme } from './theme-store'
import { useTheme } from './use-theme'

// The page tree must never re-render because the theme resolved or changed:
// a root-level update straight after hydration is what left blog posts on the
// loading skeleton (docs/postmortem/0009). The end-to-end guard is
// e2e/post-hydration-latency.spec.ts.

let pageRenders = 0
function Page() {
  pageRenders++
  return <p>page</p>
}

function Reader() {
  const { resolvedTheme } = useTheme()
  return <output>{resolvedTheme ?? 'unknown'}</output>
}

const app = (
  <ThemeProvider>
    <Page />
    <Reader />
  </ThemeProvider>
)

beforeEach(() => {
  localStorage.clear()
  window.matchMedia = vi.fn(() => ({ matches: false, media: '(prefers-color-scheme: dark)', addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)
  pageRenders = 0
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ThemeProvider', () => {
  it('puts the pre-paint script ahead of the page', () => {
    const html = renderToString(app)
    expect(html).toContain(`<script>${THEME_SCRIPT}</script>`)
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<p>page</p>'))
    expect(html).toContain('<output>unknown</output>')
  })

  it('hydrates cleanly, then re-renders only theme readers when the theme resolves or changes', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(app)
    document.body.appendChild(container)
    pageRenders = 0
    const onRecoverableError = vi.fn()

    await act(async () => {
      hydrateRoot(container, app, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.querySelector('output')?.textContent).toBe('light')

    await act(async () => setTheme('dark'))
    expect(container.querySelector('output')?.textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(pageRenders).toBe(1)
  })
})
