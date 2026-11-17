// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Segmented } from './segmented-control'
vi.mock('@/lib/haptics', () => ({ haptic: vi.fn() }))

// Render the real wrapper and SDK controls; only browser layout/capture APIs
// are simulated. This is not a native-browser capture or visual audit.
let captured: Set<number>
beforeEach(() => {
  captured = new Set()
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 0 }
  })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  for (const [name, value] of Object.entries({
    setPointerCapture: vi.fn((id:number) => captured.add(id)),
    hasPointerCapture: vi.fn((id:number) => captured.has(id)),
    releasePointerCapture: vi.fn((id:number) => { if (!captured.has(id)) throw new Error('Invalid pointer'); captured.delete(id) }),
  })) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, value})
})
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  for (const name of ['setPointerCapture','hasPointerCapture','releasePointerCapture']) delete (HTMLElement.prototype as unknown as Record<string,unknown>)[name]
})
const pointer = (root: HTMLElement, type:string, id:number, x:number) => fireEvent(root, new PointerEvent(type, {bubbles:true, pointerId:id, clientX:x, button:0}))
function setup() {
  const onValueChange=vi.fn()
  const {container}=render(<Segmented label="layout" options={['drift','lanes','orbit']} defaultValue="drift" onValueChange={onValueChange}/>)
  const root=container.querySelector<HTMLElement>('[data-kit="segmented"]')!
  for(const [i,segment] of [...root.querySelectorAll<HTMLElement>('[data-kit="segment"]')].entries()) {
    Object.defineProperty(segment,'offsetLeft',{configurable:true,value:i*100})
    Object.defineProperty(segment,'offsetWidth',{configurable:true,value:100})
  }
  return {root,onValueChange}
}
function begin(root:HTMLElement,id=1) { pointer(root,'pointerdown',id,10); pointer(root,'pointermove',id,150) }
function expectClean(root:HTMLElement) { expect(root.dataset.dragging).toBeUndefined(); expect(root.style.getPropertyValue('--drag-left')).toBe(''); expect(captured.size).toBe(0) }

describe('Segmented real-wrapper pointer ownership',()=>{
  it('keeps the first pointer owner when a second pointer presses, moves and releases',()=>{
    const {root,onValueChange}=setup();begin(root)
    expect(captured.has(1)).toBe(true);expect(root.style.getPropertyValue('--drag-left')).toBe('100px')
    onValueChange.mockClear()
    pointer(root,'pointerdown',2,250);pointer(root,'pointermove',2,280);pointer(root,'pointerup',2,280);pointer(root,'pointercancel',2,280)
    expect(captured.has(1)).toBe(true);expect(root.style.getPropertyValue('--drag-left')).toBe('100px');expect(onValueChange).not.toHaveBeenCalled()
    pointer(root,'pointermove',1,250);expect(onValueChange).toHaveBeenLastCalledWith('orbit')
    pointer(root,'pointerup',1,250);expectClean(root)
  })
  it.each(['pointerup','pointercancel','lostpointercapture'])('clears capture and visual drag state on %s and allows a new gesture',type=>{
    const {root,onValueChange}=setup();begin(root)
    if(type==='lostpointercapture') captured.delete(1)
    pointer(root,type,1,150);expectClean(root)
    onValueChange.mockClear();pointer(root,'pointermove',1,250);expect(onValueChange).not.toHaveBeenCalled()
    begin(root,3);expect(captured.has(3)).toBe(true);pointer(root,'pointercancel',3,150);expectClean(root)
  })
  it('ignores foreign lost capture and leaves ordinary click selection working',()=>{
    const {root,onValueChange}=setup();begin(root);pointer(root,'lostpointercapture',2,150)
    expect(captured.has(1)).toBe(true);pointer(root,'pointercancel',1,150);expectClean(root)
    fireEvent.click(root.querySelector<HTMLElement>('[data-value="orbit"]')!);expect(onValueChange).toHaveBeenLastCalledWith('orbit')
  })
})
