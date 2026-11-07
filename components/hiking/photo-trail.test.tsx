// @vitest-environment jsdom
import React from 'react'
import {readFileSync} from 'node:fs'
import {webcrypto} from 'node:crypto'
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,within,cleanup,act} from '@testing-library/react'
import {HikeJourney} from './hike-journey'
import {hikes} from '@/content/hiking'
import type {Asset} from '@/lib/gen/content'
import type * as Storage from '@/lib/admin/storage'
vi.mock('@/lib/admin/storage',async original=>({...await original<typeof Storage>(),manifestUrl:(_type:string,slug:string)=>`/manifest/${slug}.json`,cacheBust:(url:string)=>url}))
const source=readFileSync('public/hiking/routes/overland-standard-osm.json','utf8')
const overland=hikes.find(h=>h.slug==='overland-track')!
const asset=(id:string,lng:number,lat:number):Asset=>({id,url:`/test-${id}.webp`,thumb:'',alt:`Synthetic ${id}`,caption:'',slot:'Ronny Creek',takenAt:'',lat,lng,width:1000,height:800})
// Synthetic test assets, not documentary photographs or fixture imports.
const gallery=[asset('near',145.9432,-41.639),asset('missing',0,0),asset('outside',140,-40)]
const routeResponse=()=>({ok:true,status:200,text:async()=>source})
const galleryResponse=()=>({ok:true,status:200,json:async()=>({gallery})})
beforeEach(()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false})))
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('crypto',webcrypto)
 vi.stubGlobal('requestAnimationFrame',(callback:()=>void)=>setTimeout(callback,0))
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>clearTimeout(id))
 HTMLElement.prototype.scrollIntoView=vi.fn()
 vi.stubGlobal('fetch',vi.fn((url:string)=>Promise.resolve(url.includes('/hiking/routes/')?routeResponse():galleryResponse())))
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('photo bank and trail integration',()=>{
 it('keeps one Close control outside the scrollable photograph, caption and filmstrip',async()=>{
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  const opener=screen.getByRole('button',{name:'Synthetic near'})
  act(()=>opener.focus());fireEvent.click(opener)
  const dialog=screen.getByRole('dialog'),content=dialog.querySelector('[data-photo-scroll]')!
  const close=within(dialog).getByRole('button',{name:'Close'})
  expect(content.parentElement).toBe(dialog)
  expect(content.contains(close)).toBe(false)
  expect(content.contains(within(dialog).getByRole('img',{name:'Synthetic near'}))).toBe(true)
  expect(content.contains(within(dialog).getByRole('button',{name:'Go to photo 3'}))).toBe(true)
  fireEvent.scroll(content,{target:{scrollTop:200}})
  expect(within(dialog).getAllByRole('button',{name:'Close'})).toHaveLength(1)
  fireEvent.click(close)
  expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(opener)
 })
 it('uses one in-photo action per purpose without a duplicate footer location link',async()=>{
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  fireEvent.click(screen.getByRole('button',{name:'Synthetic near'}))
  const dialog=screen.getByRole('dialog'),frame=within(dialog).getByRole('img',{name:'Synthetic near'}).parentElement!
  for(const name of ['Show approximate photo area 1 on map','Previous photo','Next photo']){
   const controls=within(dialog).getAllByRole('button',{name})
   expect(controls).toHaveLength(1);expect(frame.contains(controls[0])).toBe(true)
  }
  expect(within(dialog).getAllByRole('link')).toHaveLength(1)
  const expand=within(dialog).getByRole('link',{name:'Open full-size photo (new tab)'})
  expect(frame.contains(expand)).toBe(true);expect(expand.getAttribute('href')).toBe('/test-near.webp')
  expect(within(dialog).queryByRole('link',{name:'Location'})).toBeNull()
  fireEvent.click(within(dialog).getByRole('button',{name:'Next photo'}))
  expect(within(dialog).queryByRole('button',{name:/Show approximate photo area/})).toBeNull()
  expect(within(dialog).getAllByRole('link')).toHaveLength(1)
 })

 it('links selected map area to gallery and an opened photo back to the map with focus',async()=>{
  render(<HikeJourney hike={overland}/>)
  const select=await screen.findByLabelText('Photo area')
  expect(screen.getByRole('heading',{name:'Gallery'}).hasAttribute('data-photo-focus-target')).toBe(true)
  expect(screen.getByRole('figure',{name:'Overland photo areas and walking reference'}).hasAttribute('data-photo-focus-target')).toBe(true)
  expect(screen.getByText(/1 photograph has published locations/)).toBeTruthy()
  fireEvent.change(select,{target:{value:'trail-area-1'}})
  expect(screen.getByRole('button',{name:'Synthetic near'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:'Synthetic outside'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'View 1 photograph'}))
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gallery'})))
  const tile=screen.getByRole('button',{name:'Synthetic near'});act(()=>tile.focus());fireEvent.click(tile)
  const dialog=screen.getByRole('dialog')
  const opener=screen.getByRole('button',{name:'Synthetic near'})
  const restoreSpy=vi.spyOn(opener,'focus')
  const location=within(dialog).getByRole('button',{name:'Show approximate photo area 1 on map'})
  expect(location.textContent).toBe('');expect(location.getAttribute('title')).toBe('Show approximate photo area 1 on map')
  expect(location.closest('[data-photo-frame]')).toBe(within(dialog).getByRole('img',{name:'Synthetic near'}).parentElement)
  const marker=screen.getByRole('button',{name:'Select photo area 1, 1 photograph'}),focusSpy=vi.spyOn(marker,'focus')
  fireEvent.touchStart(location,{touches:[{clientX:200,clientY:100}]});fireEvent.touchEnd(location,{changedTouches:[{clientX:100,clientY:100}]})
  expect(dialog.getAttribute('aria-label')).toContain('photo 1 of 1')
  fireEvent.click(location)
  await waitFor(()=>expect(document.activeElement).toBe(marker))
  expect(screen.queryByRole('dialog')).toBeNull();expect(document.body.style.overflow).not.toBe('hidden');expect(restoreSpy).not.toHaveBeenCalled()
  expect(focusSpy).toHaveBeenCalledWith({preventScroll:true})
  expect(marker.scrollIntoView).toHaveBeenLastCalledWith({block:'center',behavior:'smooth'})
  expect(screen.getByLabelText('Photo area')).toHaveProperty('value','trail-area-1')
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}))
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gallery'})))
  expect(screen.getByRole('button',{name:'Synthetic outside'})).toBeTruthy()
  expect(screen.getByLabelText('Photo area')).toHaveProperty('value','')
 })

 it('returns to the map without animation when reduced motion is requested',async()=>{
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})))
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  fireEvent.click(screen.getByRole('button',{name:'Synthetic near'}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Show approximate photo area 1 on map'}))
  const marker=screen.getByRole('button',{name:'Select photo area 1, 1 photograph'})
  await waitFor(()=>expect(document.activeElement).toBe(marker))
  expect(marker.getAttribute('data-selected-photo-area')).toBe('trail-area-1')
  expect(marker.scrollIntoView).toHaveBeenLastCalledWith({block:'center',behavior:'instant'})
  expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
 })

 it('returns a newly selected grouped photo to its chooser without opening it',async()=>{
  const nearby=[...gallery,asset('nearby',145.963,-41.645)]
  vi.stubGlobal('fetch',vi.fn((url:string)=>Promise.resolve(url.includes('/hiking/routes/')?routeResponse():{ok:true,status:200,json:async()=>({gallery:nearby})})))
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  const group=screen.getByRole('button',{name:'Choose from 2 photo areas'})
  fireEvent.click(screen.getByRole('button',{name:'Synthetic nearby'}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Show approximate photo area 2 on map'}))
  await waitFor(()=>expect(document.activeElement).toBe(group))
  expect(group.getAttribute('data-selected-photo-area')).toBe('trail-area-2')
  expect(group.getAttribute('aria-description')).toBe('Includes selected photo area 2')
  expect(group.scrollIntoView).toHaveBeenLastCalledWith({block:'center',behavior:'smooth'})
  expect(screen.queryByRole('menu')).toBeNull()
  fireEvent.keyDown(group,{key:'ArrowDown'})
  expect(document.activeElement?.getAttribute('aria-checked')).toBe('true')
  expect(document.activeElement?.textContent).toContain('Area 2')
 })

 it('cancels a queued photo return when the journey unmounts',async()=>{
  const request=vi.fn(()=>71),cancel=vi.fn()
  vi.stubGlobal('requestAnimationFrame',request);vi.stubGlobal('cancelAnimationFrame',cancel)
  const view=render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  fireEvent.click(screen.getByRole('button',{name:'Synthetic near'}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Show approximate photo area 1 on map'}))
  expect(request).toHaveBeenCalledTimes(1)
  view.unmount();expect(cancel).toHaveBeenCalledWith(71)
 })

 it('keeps keyboard focus in the viewer when the next photo has no location action',async()=>{
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  fireEvent.click(screen.getByRole('button',{name:'Synthetic near'}))
  const dialog=screen.getByRole('dialog'),location=within(dialog).getByRole('button',{name:'Show approximate photo area 1 on map'})
  act(()=>location.focus());fireEvent.keyDown(location,{key:'ArrowRight'})
  expect(within(dialog).queryByRole('button',{name:/Show approximate photo area/})).toBeNull()
  expect(document.activeElement).toBe(dialog)
  fireEvent.keyDown(dialog,{key:'Tab'});expect(document.activeElement).toBe(within(dialog).getByRole('button',{name:'Close'}))
 })

 it('retains focused place control when a selection clears a trail area',async()=>{
  render(<HikeJourney hike={overland}/>);const selector=await screen.findByLabelText('Photo area')
  fireEvent.change(selector,{target:{value:'trail-area-1'}})
  const places=screen.getByLabelText('Place');act(()=>places.focus())
  fireEvent.change(places,{target:{value:'place:Ronny Creek'}})
  expect(document.activeElement).toBe(places)
  expect(screen.getByLabelText('Photo area')).toHaveProperty('value','')
  expect(screen.getByRole('button',{name:'Synthetic outside'})).toBeTruthy()
 })

 it('preserves unlabelled selection when leaving a trail area, and resets filters only for map selection',async()=>{
  const mixed=gallery.map((photo,index)=>({...photo,slot:index===1?'':photo.slot}))
  vi.stubGlobal('fetch',vi.fn((url:string)=>Promise.resolve(url.includes('/hiking/routes/')?routeResponse():{ok:true,status:200,json:async()=>({gallery:mixed})})))
  render(<HikeJourney hike={overland}/>);const selector=await screen.findByLabelText('Photo area')
  fireEvent.change(selector,{target:{value:'trail-area-1'}})
  const places=screen.getByLabelText('Place');act(()=>places.focus());fireEvent.change(places,{target:{value:'unlabelled'}})
  expect(document.activeElement).toBe(places);expect(places).toHaveProperty('value','unlabelled')
  expect(screen.getByRole('button',{name:'Synthetic missing'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Synthetic near'})).toBeNull()
  fireEvent.change(selector,{target:{value:'trail-area-1'}})
  await waitFor(()=>expect(screen.getByRole('button',{name:'Synthetic near'})).toBeTruthy())
  expect(screen.getByLabelText('Place')).toHaveProperty('value','all')
 })
 it('keeps missing and outside photos discoverable without fabricated map actions',async()=>{
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  fireEvent.click(screen.getByRole('button',{name:'Not linked to reference · 2'}))
  expect(screen.queryByRole('button',{name:'Synthetic near'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Synthetic missing'}))
  expect(within(screen.getByRole('dialog')).queryByRole('button',{name:/Show approximate photo area/})).toBeNull()
  expect(screen.getByText(/No usable published location/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Next photo'}));expect(screen.getByText(/Outside the 2 km reference corridor/)).toBeTruthy()
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull()
 })
 it('does not add exact photo coordinates to the map DOM or source route joins',async()=>{
  render(<HikeJourney hike={overland}/>);await screen.findByLabelText('Photo area')
  const map=screen.getByRole('img',{name:'Overland standard walking reference with approximate photo areas'})
  expect(map.querySelectorAll('[data-source-section]')).toHaveLength(6)
  expect(map.outerHTML).not.toContain('145.9432');expect(map.outerHTML).not.toContain('-41.639')
  expect(screen.getByText('Standard walking reference, not Ben’s recorded trek. Photo areas are approximate. Not for navigation.')).toBeTruthy()
  const disclosure=screen.getByText('About these locations & the route').closest('details')!
  expect(disclosure.open).toBe(false)
  expect(screen.getByText(/unresolved 185 m gap/)).toBeTruthy()
  expect(screen.getByText(/finished by ferry/)).toBeTruthy()
 })
 it('keeps selection labels quiet and source notes available without inventing a failed-gallery count',async()=>{
  const view=render(<HikeJourney hike={overland}/>);const selector=await screen.findByLabelText('Photo area')
  const map=screen.getByRole('img',{name:'Overland standard walking reference with approximate photo areas'})
  expect(map.querySelector('[data-landmark="647695394"]')).toBeTruthy()
  expect(screen.getByRole('button',{name:'Select photo area 1, 1 photograph'})).toHaveProperty('ariaPressed','false')
  fireEvent.change(selector,{target:{value:'trail-area-1'}})
  expect(screen.getByRole('button',{name:'Select photo area 1, 1 photograph'})).toHaveProperty('ariaPressed','true')
  view.unmount()
  vi.stubGlobal('fetch',vi.fn((url:string)=>Promise.resolve(url.includes('/hiking/routes/')?routeResponse():{ok:false,status:503})))
  render(<HikeJourney hike={overland}/>);await screen.findByRole('button',{name:'Try again'})
  await screen.findByText('Photo locations become available after the gallery loads.')
  expect(screen.queryByText(/0 photographs have published locations/)).toBeNull()
  expect(screen.getByRole('link',{name:'OpenStreetMap contributors'})).toBeTruthy()
 })

 it('keeps gallery working when reference bytes fail integrity, then retries',async()=>{
  let attempts=0
  vi.stubGlobal('fetch',vi.fn((url:string)=>Promise.resolve(url.includes('/hiking/routes/')?{...routeResponse(),text:async()=>++attempts===1?source+' ':source}:galleryResponse())))
  render(<HikeJourney hike={overland}/>);await screen.findByRole('button',{name:'Retry walking reference'})
  expect(screen.getByRole('button',{name:'Synthetic near'})).toBeTruthy();expect(screen.queryByLabelText('Photo area')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Retry walking reference'}));await screen.findByLabelText('Photo area')
  expect(attempts).toBe(2)
 })
 it('does not let a late route response attach to a different hike or unverified gallery',async()=>{
  let resolve!:(value:unknown)=>void
  const fetcher=vi.fn((url:string)=>url.includes('/hiking/routes/')?new Promise(r=>{resolve=r}):Promise.resolve(galleryResponse()))
  vi.stubGlobal('fetch',fetcher)
  const view=render(<HikeJourney hike={overland}/>);await screen.findByRole('button',{name:'Synthetic near'})
  view.rerender(<HikeJourney hike={hikes[0]}/>);await screen.findByRole('button',{name:'Synthetic near'})
  await act(async()=>resolve(routeResponse()))
  expect(screen.queryByLabelText('Photo area')).toBeNull()
  expect(fetcher.mock.calls.filter(([url])=>url.includes('/hiking/routes/'))).toHaveLength(1)
 })
})
