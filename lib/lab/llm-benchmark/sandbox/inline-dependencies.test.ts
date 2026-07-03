import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { inlineDependenciesAsync } from './inline-dependencies'

describe('inlineDependenciesAsync', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('three.min.js')) {
        return new Response('window.THREE = { Revision: "128" };', { status: 200 })
      }
      if (url.includes('OrbitControls.js')) {
        return new Response('window.THREE.OrbitControls = function() {};', { status: 200 })
      }
      if (url.includes('tailwindcss')) {
        return new Response('.tailwind { display: block; }', { status: 200 })
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  it('inlines classic Three.js script tags', async () => {
    const html = `
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
          <script src="https://evil.com/tracker.js"></script>
        </head>
        <body></body>
      </html>
    `
    const result = await inlineDependenciesAsync(html)
    expect(result.output).toContain('window.THREE = { Revision: "128" }')
    expect(result.output).not.toContain('cdnjs.cloudflare.com')
    expect(result.output).not.toContain('evil.com')
    expect(result.inlined.length).toBe(1)
    expect(result.removed.length).toBe(1)
  })

  it('rewrites module imports to globals and injects Three.js', async () => {
    const html = `
      <html>
        <head>
          <script type="importmap">
            { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
          </script>
        </head>
        <body>
          <script type="module">
            import * as THREE from 'three';
            console.log(THREE);
          </script>
        </body>
      </html>
    `
    const result = await inlineDependenciesAsync(html)
    expect(result.output).toContain('window.THREE = { Revision: "128" }')
    expect(result.output).toContain('const THREE = window.THREE;')
    expect(result.output).not.toContain('type="importmap"')
    expect(result.output).not.toContain('type="module"')
    expect(result.output).not.toContain('unpkg.com')
  })

  it('rewrites addon module imports and injects the addon global', async () => {
    const html = `
      <html>
        <body>
          <script type="module">
            import * as THREE from 'three';
            import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
            const controls = new OrbitControls();
          </script>
        </body>
      </html>
    `
    const result = await inlineDependenciesAsync(html)
    expect(result.output).toContain('window.THREE = { Revision: "128" }')
    expect(result.output).toContain('window.THREE.OrbitControls = function() {}')
    expect(result.output).toContain('const { OrbitControls }')
    expect(result.output).toContain('window.THREE.OrbitControls')
    expect(result.inlined.length).toBe(2)
  })

  it('inlines Tailwind stylesheets', async () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.tailwindcss.com">
        </head>
      </html>
    `
    const result = await inlineDependenciesAsync(html)
    expect(result.output).toContain('.tailwind { display: block; }')
    expect(result.output).not.toContain('cdn.tailwindcss.com')
    expect(result.inlined.length).toBe(1)
  })

  it('strips Google Fonts and preconnect links', async () => {
    const html = `
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit&display=swap">
        </head>
      </html>
    `
    const result = await inlineDependenciesAsync(html)
    expect(result.output).not.toContain('fonts.googleapis.com')
    expect(result.removed.length).toBe(2)
  })

  it('strips external CSS @imports', async () => {
    const html = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit&display=swap');
            body { color: red; }
          </style>
        </head>
      </html>
    `
    const result = await inlineDependenciesAsync(html)
    expect(result.output).not.toContain('@import')
    expect(result.output).not.toContain('fonts.googleapis.com')
    expect(result.output).toContain('body { color: red; }')
  })

  it('leaves plain text untouched', async () => {
    const text = 'Just some plain prose answer.'
    const result = await inlineDependenciesAsync(text)
    expect(result.output).toBe(text)
    expect(result.inlined).toEqual([])
    expect(result.removed).toEqual([])
  })
})
