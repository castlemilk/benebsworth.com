/** Numeric/source checks only; not rendered contrast, reflow or device acceptance. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('../workbench.css', import.meta.url), 'utf8')
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '')
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16) / 255)
  const linear = rgb.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]
}
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
const colour = (block, name) => block.match(new RegExp(`--bm-${name}:\\s*(#[0-9a-f]{6})`))[1]
const blocks = [css.slice(css.indexOf('[data-blog-motion05] {'), css.indexOf('[data-blog-motion05] *')), css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('@media (prefers-reduced-motion'))]

test('declared text, focus and input boundaries have sufficient contrast in both theme palettes', () => {
  for (const block of blocks) {
    const paper = colour(block, 'paper')
    for (const key of ['ink', 'muted', 'red']) assert.ok(ratio(colour(block, key), paper) >= 4.5, `${key} on ${paper}`)
    for (const key of ['focus', 'control']) assert.ok(ratio(colour(block, key), paper) >= 3, `${key} on ${paper}`)
  }
})

test('feedback, focus and forced-colour contracts are explicit and scoped', () => {
  assert.match(css, /\[data-blog-motion05\] \[data-motion-decoration\] \{ pointer-events: none; opacity: 1; transform: none;/)
  assert.match(css, /:focus-visible \{ outline: 3px solid var\(--bm-focus\)/)
  assert.match(css, /@media \(forced-colors: active\)/)
  assert.match(css, /--bm-control: ButtonText/)
  assert.match(css, /border-inline-start: 3px double Highlight/)
  assert.doesNotMatch(declarations, /forced-color-adjust:\s*none|transition:\s*all|@keyframes|@view-transition|scroll-behavior:\s*smooth|:root/)
})
