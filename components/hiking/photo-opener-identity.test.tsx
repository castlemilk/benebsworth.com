// @vitest-environment jsdom
import React from 'react'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {HikeGallery} from './hike-gallery'
import {hikes} from '@/content/hiking'
import type {Asset} from '@/lib/gen/content'

const photos:Asset[]=Array.from({length:9},(_,i)=>({id:'',url:`/photos/${i+1}.webp`,thumb:'',alt:`Photo ${i+1}`,caption:'',slot:'One place',lat:0,lng:0,width:1200,height:800,takenAt:''}))
let width=350
const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
function resize(next:number){
  width=next
  act(()=>{for(const observer of observers)observer.callback([...observer.targets].map(target=>({target,contentRect:{width:next}} as ResizeObserverEntry)),{} as ResizeObserver)})
}
function gallery(items=photos,active:string|null=null){return <HikeGallery hike={hikes[0]} gallery={items} active={active} onSelect={()=>{}}/>}
function open(number=3,focus=true){
  const button=screen.getByRole('button',{name:`Photo ${number}`})
  if(focus)act(()=>button.focus())
  fireEvent.click(button)
  return button
}
beforeEach(()=>{
  width=350
  vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>width)
  vi.stubGlobal('ResizeObserver',class{
    record:{callback:ResizeObserverCallback;targets:Set<Element>}
    constructor(callback:ResizeObserverCallback){this.record={callback,targets:new Set()};observers.add(this.record)}
    observe(target:Element){this.record.targets.add(target)}
    disconnect(){observers.delete(this.record)}
  })
})
afterEach(()=>{cleanup();observers.clear();vi.restoreAllMocks();vi.unstubAllGlobals();document.body.style.overflow=''})

describe('photo opener identity across responsive gallery regrouping',()=>{
  it('keeps focus inside the open viewer during StrictMode effect replay',()=>{
    render(<React.StrictMode>{gallery()}</React.StrictMode>);open()
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    expect(document.body.style.overflow).toBe('hidden')
    resize(640)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Photo 3'}))
    expect(document.body.style.overflow).toBe('')
  })
  it.each(['Close','Escape','backdrop'])('returns to the remounted opener after %s dismissal',method=>{
    render(gallery());const original=open();const dialog=screen.getByRole('dialog')
    resize(640)
    const replacement=screen.getByRole('button',{name:'Photo 3'})
    expect(original.isConnected).toBe(false);expect(replacement).not.toBe(original)
    expect(document.activeElement).toBe(dialog);expect(document.body.style.overflow).toBe('hidden')
    if(method==='Close')fireEvent.click(within(dialog).getByRole('button',{name:'Close'}))
    else if(method==='Escape')fireEvent.keyDown(dialog,{key:'Escape'})
    else fireEvent.click(dialog)
    expect(document.activeElement).toBe(replacement);expect(document.body.style.overflow).toBe('')
  })
  it('returns to the activated photo even when a pointer click did not focus its tile',()=>{
    render(gallery());const opener=open(3,false)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(document.activeElement).toBe(opener)
  })
  it('waits for scrollbar-width regrouping before restoring focus',()=>{
    width=456
    vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>document.body.style.overflow==='hidden'?466:456)
    render(gallery());open();resize(466)
    const beforeUnlock=screen.getByRole('button',{name:'Photo 3'})
    expect(beforeUnlock.parentElement?.children.length).toBe(3)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    const afterUnlock=screen.getByRole('button',{name:'Photo 3'})
    expect(beforeUnlock.isConnected).toBe(false)
    expect(afterUnlock.parentElement?.children.length).toBe(2)
    expect(document.activeElement).toBe(afterUnlock)
    resize(456)
    expect(document.activeElement).toBe(afterUnlock)
  })
  it('uses the same width precision when a fractional resize notification follows close',()=>{
    width=462.3
    vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>Math.floor(document.body.style.overflow==='hidden'?472.3:width))
    render(gallery());open();resize(472.3)
    width=462.3
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    const returned=screen.getByRole('button',{name:'Photo 3'})
    expect(returned.parentElement?.children.length).toBe(2)
    expect(document.activeElement).toBe(returned)
    resize(462.3)
    expect(screen.getByRole('button',{name:'Photo 3'})).toBe(returned)
    expect(document.activeElement).toBe(returned)
  })
  it('keeps opening identity separate from navigation through arrows and filmstrip',()=>{
    render(gallery());open();const dialog=screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button',{name:'Next photo'}))
    fireEvent.click(within(dialog).getByRole('button',{name:'Go to photo 8'}))
    resize(640);resize(350);resize(640)
    expect(dialog.getAttribute('aria-label')).toContain('photo 8 of 9')
    fireEvent.keyDown(dialog,{key:'Escape'})
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Photo 3'}))
  })
  it('survives the initial unmeasured grid becoming justified rows',()=>{
    width=0;render(gallery());const original=open();resize(640)
    expect(original.isConnected).toBe(false)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Photo 3'}))
  })
  it('updates the opener on the next visit instead of retaining the previous photo',()=>{
    render(gallery());open();resize(640)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    open(8);resize(350)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Photo 8'}))
  })
  it('matches literal photo URLs without treating punctuation as a CSS selector',()=>{
    const items=photos.map((photo,index)=>index===2?{...photo,url:'/photos/[3]"quoted.webp?label=a%20b&size=2'}:photo)
    render(gallery(items));open();resize(640)
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Photo 3'}))
  })
  it('falls back to the heading when a filter replaces the result session, even if it retains the opener URL',()=>{
    const view=render(gallery());const original=open();view.rerender(gallery(photos,'One place'))
    expect(original.isConnected).toBe(false);expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button',{name:'Photo 3'})).not.toBe(original)
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gallery'}))
  })
  it('does not substitute the old numeric index if the original photo is removed',()=>{
    const view=render(gallery());open();view.rerender(gallery(photos.filter(p=>p.alt!=='Photo 3')))
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gallery'}))
  })
  it('restores the heading if an update removes the last viewed photo and its opener',()=>{
    const view=render(gallery());open(9);view.rerender(gallery(photos.slice(0,2)))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gallery'}))
    expect(document.body.style.overflow).toBe('')
  })
})
