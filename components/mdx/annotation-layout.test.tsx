// @vitest-environment jsdom
import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,render,waitFor} from '@testing-library/react'
import {AnnotationLayout} from './annotation-layout'
import {HandUnderline} from './hand-underline'
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
function setup(){
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>setTimeout(()=>fn(0),0))
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>clearTimeout(id))
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 Object.defineProperty(window,'innerWidth',{value:1200,writable:true,configurable:true})
 vi.spyOn(Element.prototype,'getBoundingClientRect').mockImplementation(function(this:Element){
  const narrow=window.innerWidth<=760
  const box=narrow?(this.hasAttribute('data-annotation-target')?[0,150,280,200]:this.hasAttribute('data-annotation-note')?[100,0,180,80]:this.hasAttribute('data-annotation-anchor')?[Number(this.getAttribute('cx')||200),250,6,6]:[0,0,Math.max(250,window.innerWidth-48),350]):this.hasAttribute('data-annotation-target')?[0,0,500,300]:this.hasAttribute('data-annotation-note')?[550,50,150,80]:this.hasAttribute('data-annotation-anchor')?[Number(this.getAttribute('cx')||300),100,6,6]:[0,0,720,350]
  return new DOMRect(...box as [number,number,number,number])
 })
}
describe('annotation measurement lifecycle',()=>{
 it('remeasures a moving figure anchor and retains the connector across the viewport breakpoint',async()=>{
  setup();const {container}=render(<AnnotationLayout><div data-annotation-target><svg><circle data-annotation-anchor cx="300"/></svg></div><aside data-annotation-note>Look here</aside></AnnotationLayout>)
  await waitFor(()=>expect(container.querySelector('.annotation-connector-layer path')?.getAttribute('d')).toContain('303 103'))
  container.querySelector('circle')!.setAttribute('cx','340')
  await waitFor(()=>expect(container.querySelector('.annotation-connector-layer path')?.getAttribute('d')).toContain('343 103'))
  for(const width of [761,760,706,390,320,760,761,1200]){
   window.innerWidth=width;window.dispatchEvent(new Event('resize'))
   await waitFor(()=>expect(container.querySelector('.annotation-connector-layer path')?.getAttribute('d')).toContain(width<=760?'343 253':'343 103'))
  }
  expect(container.textContent).toContain('Look here')
 })
 it('keeps a native underline fallback until measured fragments become available',async()=>{
  setup();vi.spyOn(document,'createRange').mockReturnValue({selectNodeContents(){},getClientRects(){return [new DOMRect(0,0,180,24),new DOMRect(0,30,90,24)]}} as unknown as Range)
  const {container}=render(<HandUnderline>Wrapped meaningful text</HandUnderline>)
  await waitFor(()=>expect(container.querySelectorAll('.hand-underline path')).toHaveLength(2))
  expect(container.querySelector('.hand-underline')?.getAttribute('data-measured')).toBe('true')
  expect(container.textContent).toBe('Wrapped meaningful text')
 })
})
