import {readFileSync} from 'node:fs'
import {describe,it,expect} from 'vitest'
import postcss from 'postcss'
const css=postcss.parse(readFileSync(new URL('../../app/editorial.css',import.meta.url),'utf8'))
function value(selector:string,property:string){let result='';css.walkRules(selector,r=>{r.walkDecls(property,d=>{result=d.value})});return result}
function luminance(hex:string){const rgb=hex.match(/[a-f\d]{2}/gi)!.map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
describe('red annotation handwriting',()=>{
 it('keeps readable red ink on paper and supported dark surfaces',()=>{
  const light=value('.research-article,.folio-archive,.folio-study','--folio-handwriting')
  const dark=value('.dark .research-article,.dark .folio-archive','--folio-handwriting')
  expect(light).toBe('#b32624');expect(dark).toBe('#ffaaa5')
  for(const bg of ['#f4f1e9','#f6f6f9'])expect(contrast(light,bg)).toBeGreaterThan(4.5)
  expect(contrast(dark,'#0a0a0c')).toBeGreaterThan(4.5)
 })
 it('matches annotation lines to the handwriting without recolouring scientific diagrams',()=>{
  expect(value('.folio-study .handwritten-note,.research-article .handwritten-note,.folio-focus-note,.folio-note-label,.folio-note[data-kind=caution] .folio-note-label,.folio-archive-note>p','color')).toBe('var(--folio-handwriting,#b32624)')
  expect(value('.annotation-connector-layer','color')).toBe('var(--folio-handwriting,#b32624)')
  expect(value('.annotation-mark,.folio-archive-note>.annotation-mark,.margin-note>.annotation-mark,.folio-focus-note .folio-connector,.folio-note-label .annotation-mark,.hand-underline>svg','color')).toBe('var(--folio-handwriting,#b32624)')
  expect(value('.folio-study','--folio-note')).toBe('#345675')
  for(const property of ['fill','stroke'])expect(value('.annotation-layout svg [data-annotation-anchor]',property)).toBe('var(--folio-handwriting,#b32624)')
 })
})
