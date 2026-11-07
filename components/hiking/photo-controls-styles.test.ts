import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import postcss, {type Rule} from 'postcss'

// Source-contract tests only: real pointer/focus modality still needs a browser.
const css=postcss.parse(readFileSync('components/hiking/photo-discovery.module.css','utf8'))
function matching(selector:string) {
 const rules:Rule[]=[]
 css.walkRules(rule=>{if(rule.selectors.includes(selector))rules.push(rule)})
 return rules
}
function declarations(rule:Rule) {
 const values:Record<string,string>={}
 rule.walkDecls(declaration=>{values[declaration.prop]=declaration.value})
 return values
}

describe('photo toolbar visibility contract',()=>{
 it('scrolls photo content separately without shrinking the persistent viewer header',()=>{
  const modal=matching('.lightbox').find(rule=>'overflow' in declarations(rule))!
  expect(declarations(modal)).toMatchObject({overflow:'hidden','flex-direction':'column'})
  expect(declarations(matching('.lightboxHeader')[0])).toMatchObject({'flex-shrink':'0'})
  expect(declarations(matching('.lightboxContent')[0])).toMatchObject({'min-height':'0','overflow-y':'auto','scroll-padding-block':'.75rem',flex:'1','flex-direction':'column'})
 })
 it('hides at desktop rest and does not let pointer-retained focus pin the toolbar open',()=>{
  const resting=matching('.lightboxNavigation').find(rule=>rule.parent?.type==='root')!
  expect(declarations(resting)).toMatchObject({opacity:'0','pointer-events':'none'})
  expect(declarations(matching('.lightboxFrame:hover .lightboxNavigation')[0])).toMatchObject({opacity:'1','pointer-events':'auto'})
  expect(matching('.lightboxFrame:focus-within .lightboxNavigation')).toHaveLength(0)
 })
 it('reveals keyboard-focused controls instantly without removing their native focus',()=>{
  const focusRules=matching('.lightboxFrame:has(:focus-visible) .lightboxNavigation')
  expect(focusRules.map(declarations)).toContainEqual({opacity:'1','pointer-events':'auto'})
  expect(focusRules.map(declarations)).toContainEqual({transition:'none'})
 })
 it('keeps controls available on narrow/touch/hybrid layouts and during image recovery',()=>{
  const touch=matching('.lightboxNavigation').find(rule=>rule.parent?.type==='atrule'&&rule.parent.name==='media'&&rule.parent.params.includes('any-pointer:coarse'))!
  expect(touch.parent).toHaveProperty('params','(hover:none),(pointer:coarse),(any-pointer:coarse),(max-width:600px)')
  expect(declarations(touch)).toMatchObject({opacity:'1','pointer-events':'auto'})
  expect(declarations(matching('.lightboxFrame[data-photo-failed] .lightboxNavigation')[0])).toMatchObject({opacity:'1','pointer-events':'auto'})
 })
})
