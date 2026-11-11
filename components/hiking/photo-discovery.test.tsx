// @vitest-environment jsdom
import React, {useState} from 'react'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {HikeGallery} from './hike-gallery'
import {HikeJourney} from './hike-journey'
import {hikes} from '@/content/hiking'
import type {Asset} from '@/lib/gen/content'
import {reviewedSharedAssetIds} from '@/lib/hiking/gallery-source-review'
import type * as Storage from '@/lib/admin/storage'
vi.mock('@/lib/admin/storage', async importOriginal => ({...await importOriginal<typeof Storage>(),manifestUrl:(_type:string,slug:string)=>`https://example.test/manifest/${slug}.json`,cacheBust:(url:string)=>url}))
vi.mock('./journey-map',()=>({JourneyMap:({active,onSelect}:{active:string|null;onSelect:(s:string|null)=>void})=><button onClick={()=>onSelect('No photos here')}>Map selection {active}</button>}))
const photo=(id:string,slot='',lat=0,lng=0):Asset=>({id,url:`/photos/${id}.webp`,thumb:'',alt:`Photo ${id}`,caption:'',slot,lat,lng,width:1200,height:800,takenAt:''})
const gallery=[photo('a','First place',46,12),photo('b','Second place',46.1,12),photo('c','',46.101,12),photo('d','First place')]
function View({initial=null}:{initial?:string|null}) {const [active,setActive]=useState(initial);return <HikeGallery hike={hikes[0]} gallery={gallery} active={active} onSelect={setActive}/>}
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('photo location discovery',()=>{
 it('reserves original dimensions and puts paired navigation inside the image with a separate count',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Photo a'}));const dialog=screen.getByRole('dialog'),image=within(dialog).getByRole('img',{name:'Photo a'})
  expect(image.getAttribute('width')).toBe('1200');expect(image.getAttribute('height')).toBe('800')
  const navigation=within(dialog).getByRole('group',{name:'Photo navigation'});expect(navigation.closest('[data-photo-frame]')).toBe(image.parentElement);expect(navigation.textContent).not.toContain('1 /');expect(dialog.textContent).toContain('1 /  of 4');fireEvent.click(within(navigation).getByRole('button',{name:'Previous photo'}));expect(dialog.getAttribute('aria-label')).toContain('photo 4 of 4')
 })

 it('preserves focus on the next arrow across image changes and recovers with visible navigation after image failure',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Photo a'}));const dialog=screen.getByRole('dialog'),next=within(dialog).getByRole('button',{name:'Next photo'})
  act(()=>next.focus());fireEvent.click(next);expect(document.activeElement).toBe(next);expect(dialog.getAttribute('aria-label')).toContain('photo 2 of 4')
  const image=within(dialog).getByRole('img',{name:'Photo b'});fireEvent.error(image)
  expect(next.closest('[data-photo-frame]')?.getAttribute('data-photo-failed')).toBe('true');fireEvent.click(next)
  expect(within(dialog).getByRole('img',{name:'Photo c'})).toBeTruthy();expect(document.activeElement).toBe(next);expect(next.closest('[data-photo-frame]')?.hasAttribute('data-photo-failed')).toBe(false)
 })
 it('does not turn an arrow-button touch into a swipe plus click',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Photo a'}));const next=within(screen.getByRole('dialog')).getByRole('button',{name:'Next photo'})
  fireEvent.touchStart(next,{touches:[{clientX:200,clientY:100}]});fireEvent.touchEnd(next,{changedTouches:[{clientX:100,clientY:100}]});fireEvent.click(next)
  expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('photo 2 of 4')
 })
 it('uses the loaded original aspect ratio when dimensions are missing, without changing photo identity',()=>{
  render(<HikeGallery hike={hikes[0]} gallery={[{...photo('portrait'),width:0,height:0}]} active={null} onSelect={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Photo portrait'}))
  const image=within(screen.getByRole('dialog')).getByRole('img',{name:'Photo portrait'});Object.defineProperty(image,'naturalWidth',{value:800});Object.defineProperty(image,'naturalHeight',{value:1200});fireEvent.load(image)
  expect((image.parentElement as HTMLElement).style.getPropertyValue('--photo-ratio')).toBe(String(2/3));expect(image.getAttribute('src')).toBe('/photos/portrait.webp');expect(screen.queryByRole('group',{name:'Photo navigation'})).toBeNull()
 })

 it('places the original-file expander beside the arrows and updates its destination without changing the current photo on touch',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Photo a'}));const dialog=screen.getByRole('dialog'),expand=within(dialog).getByRole('link',{name:'Open full-size photo (new tab)'})
  expect(expand.closest('[data-photo-frame]')).toBe(within(dialog).getByRole('img',{name:'Photo a'}).parentElement)
  expect(expand.getAttribute('href')).toBe('/photos/a.webp');expect(expand.getAttribute('target')).toBe('_blank');expect(expand.getAttribute('rel')).toBe('noopener noreferrer')
  fireEvent.touchStart(expand,{touches:[{clientX:200,clientY:100}]});fireEvent.touchEnd(expand,{changedTouches:[{clientX:100,clientY:100}]});expect(dialog.getAttribute('aria-label')).toContain('photo 1 of 4')
  fireEvent.click(within(dialog).getByRole('button',{name:'Next photo'}));expect(expand.getAttribute('href')).toBe('/photos/b.webp')
 })
 it('retains an accessible expander for a single photo and image-error recovery',()=>{
  render(<HikeGallery hike={hikes[0]} gallery={[photo('single')]} active={null} onSelect={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Photo single'}));const dialog=screen.getByRole('dialog'),expand=within(dialog).getByRole('link',{name:'Open full-size photo (new tab)'})
  expect(within(dialog).queryByRole('group',{name:'Photo navigation'})).toBeNull();act(()=>expand.focus());fireEvent.error(within(dialog).getByRole('img',{name:'Photo single'}))
  expect(document.activeElement).toBe(expand);expect(expand.getAttribute('href')).toBe('/photos/single.webp');expect(expand.closest('[data-photo-frame]')?.getAttribute('data-photo-failed')).toBe('true')
  fireEvent.keyDown(expand,{key:'Tab'});expect(document.activeElement).toBe(within(dialog).getByRole('button',{name:'Close'}))
 })

 it('withholds known cross-hike copies without deleting source data, and restores corrected photos',()=>{
  const ambiguous={...photo('reviewed'),alt:'',url:`https://storage.googleapis.com/benebsworth-hiking/assets/${reviewedSharedAssetIds[0]}.webp`}
  const view=render(<HikeGallery hike={hikes[0]} gallery={[ambiguous]} active={null} onSelect={()=>{}}/>)
  expect(screen.getByLabelText('Photo source review').textContent).toContain('assignment to Alta Via 1 is unverified')
  expect(screen.queryByRole('button',{name:'Published gallery photo 1 — open'})).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('0 photos')
  expect(screen.getByText('No verified photographs are available for this hike yet.')).toBeTruthy()
  expect(document.querySelector('img')).toBeNull()
  expect(ambiguous.url).toContain(reviewedSharedAssetIds[0])
  view.rerender(<HikeGallery hike={hikes[0]} gallery={[{...ambiguous,url:'/corrected.webp'}]} active={null} onSelect={()=>{}}/>)
  expect(screen.queryByLabelText('Photo source review')).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('1 photo')
  expect(document.querySelector('img')?.getAttribute('src')).toBe('/corrected.webp')
 })
 it('filters existing places, unlabelled metadata and coordinates, then clears all filters',()=>{
  render(<View/>);fireEvent.change(screen.getByLabelText('Place'),{target:{value:'place:First place'}})
  expect(screen.getByRole('status').textContent).toBe('2 photos of 4')
  expect(screen.queryByRole('button',{name:'Photo b'})).toBeNull()
  fireEvent.change(screen.getByLabelText('Location metadata'),{target:{value:'recorded'}})
  expect(screen.getByRole('status').textContent).toBe('1 photo of 4')
  fireEvent.change(screen.getByLabelText('Place'),{target:{value:'unlabelled'}})
  expect(screen.getByRole('button',{name:'Photo c'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}))
  expect(screen.getByRole('status').textContent).toBe('4 photos')
 })
 it('keeps place labels visible for discovery but avoids repeating a selected place over every photograph',()=>{
  render(<View/>);expect(within(screen.getByRole('button',{name:'Photo a'})).getByText('First place')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Place'),{target:{value:'place:First place'}})
  expect(within(screen.getByRole('button',{name:'Photo a'})).queryByText('First place')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}))
  expect(within(screen.getByRole('button',{name:'Photo a'})).getByText('First place')).toBeTruthy()
 })
 it('uses approximate area groups without adding coordinate output or guessed place names',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Area 2, 2 photographs'}))
  expect(screen.getByRole('status').textContent).toBe('2 photos of 4')
  expect(screen.getByRole('button',{name:'Photo b'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'Photo c'})).toBeTruthy()
  expect(document.body.textContent).not.toContain('46.101')
  expect(document.querySelector('a[href*="maps"]')).toBeNull()
  fireEvent.change(screen.getByLabelText('Place'),{target:{value:'place:First place'}})
  expect(screen.getByText(/No photographs match these filters for First place/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}))
  expect(screen.getByRole('status').textContent).toBe('4 photos')
 })
 it('does not silently show all photographs for a selected map waypoint without photographs',()=>{
  render(<View initial="No photos here"/>);expect(screen.queryByRole('button',{name:'Photo a'})).toBeNull()
  expect(screen.getByText(/No photographs match these filters for No photos here/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));expect(screen.getByRole('button',{name:'Photo a'})).toBeTruthy()
 })
 it('makes an all-unlabelled GPS gallery discoverable without redundant GPS filtering',()=>{
  render(<HikeGallery hike={hikes[0]} gallery={gallery.slice(0,3).map(p=>({...p,slot:''}))} active={null} onSelect={()=>{}}/>)
  expect(screen.queryByLabelText('Place')).toBeNull();expect(screen.queryByLabelText('Location metadata')).toBeNull()
  expect(screen.getByText(/no published place labels yet/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Area 2, 2 photographs'}));expect(screen.getByRole('status').textContent).toBe('2 photos of 3')
 })
 it('contains keyboard focus, closes on Escape and closes stale lightboxes after parent selection changes',()=>{
  const view=render(<HikeGallery hike={hikes[0]} gallery={gallery} active={null} onSelect={()=>{}}/>)
  const opener=screen.getByRole('button',{name:'Photo a'});act(()=>opener.focus());fireEvent.click(opener)
  const dialog=screen.getByRole('dialog');fireEvent.keyDown(dialog,{key:'Tab',shiftKey:true})
  expect(document.activeElement).toBe(within(dialog).getByRole('button',{name:'Go to photo 4'}))
  fireEvent.keyDown(document.activeElement!,{key:'Tab'});expect(document.activeElement).toBe(within(dialog).getByRole('button',{name:'Close'}))
  fireEvent.keyDown(dialog,{key:'Escape'});expect(document.activeElement).toBe(opener)
  fireEvent.click(opener);view.rerender(<HikeGallery hike={hikes[0]} gallery={gallery} active="Second place" onSelect={()=>{}}/>)
  expect(screen.queryByRole('dialog')).toBeNull();expect(document.body.style.overflow).not.toBe('hidden');expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gallery'}))
 })
 it('keeps vertical scrolling distinct from a deliberate horizontal photo swipe',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Photo a'}))
  const stage=within(screen.getByRole('dialog')).getByRole('img',{name:'Photo a'}).parentElement!
  fireEvent.touchStart(stage,{touches:[{clientX:200,clientY:100}]})
  fireEvent.touchEnd(stage,{changedTouches:[{clientX:140,clientY:300}]})
  expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('photo 1 of 4')
  fireEvent.touchStart(stage,{touches:[{clientX:200,clientY:100}]})
  fireEvent.touchEnd(stage,{changedTouches:[{clientX:110,clientY:120}]})
  expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('photo 2 of 4')
  fireEvent.touchStart(stage,{touches:[{clientX:200,clientY:100}]})
  fireEvent.touchCancel(stage)
  fireEvent.touchEnd(stage,{changedTouches:[{clientX:100,clientY:100}]})
  expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('photo 2 of 4')
 })
 it('recovers from a failed full image by navigating to the next photograph',()=>{
  render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Photo a'}))
  fireEvent.error(within(screen.getByRole('dialog')).getByRole('img',{name:'Photo a'}))
  expect(within(screen.getByRole('dialog')).getByRole('status').textContent).toContain('could not be loaded')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Next photo'}))
  expect(within(screen.getByRole('dialog')).getByRole('img',{name:'Photo b'})).toBeTruthy()
 })
 it('reports failed thumbnails without substituting an invented photograph',()=>{
  render(<View/>);fireEvent.error(within(screen.getByRole('button',{name:'Photo a'})).getByRole('img'))
  expect(within(screen.getByRole('button',{name:'Photo a'})).getByText('Preview unavailable')).toBeTruthy()
 })
})
describe('published gallery loading',()=>{
 it('distinguishes request failure from empty content and retries successfully',async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok:true,status:200,json:async()=>({gallery})});vi.stubGlobal('fetch',fetcher)
  render(<HikeJourney hike={hikes[0]}/>);expect(screen.getByRole('status').textContent).toContain('Loading')
  await screen.findByRole('alert');expect(screen.queryByText(/No gallery photographs/)).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByRole('button',{name:'Photo a'});expect(fetcher).toHaveBeenCalledTimes(2)
 })
 it.each([{ok:false,status:404,json:async()=>null},{ok:true,status:200,json:async()=>({gallery:[]})}])('keeps missing/empty published galleries honest',async response=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response));render(<HikeJourney hike={hikes[0]}/>);await screen.findByText('No gallery photographs are available to display.');expect(screen.queryByRole('alert')).toBeNull()
 })
 it.each([{ok:false,status:503,json:async()=>null},{ok:true,status:200,json:async()=>({gallery:'broken'})},{ok:true,status:200,json:async()=>{throw new Error('invalid JSON')}}])('does not misreport a broken response as no photos',async response=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response));render(<HikeJourney hike={hikes[0]}/>);await screen.findByRole('alert');expect(screen.queryByText(/No gallery photographs/)).toBeNull()
 })
 it('clears old gallery/filter state on hike change and ignores a stale request',async()=>{
  let resolveFirst!:(value:unknown)=>void
  const fetcher=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve})).mockResolvedValue({ok:true,status:200,json:async()=>({gallery:[photo('new','New place')]})})
  vi.stubGlobal('fetch',fetcher);const view=render(<HikeJourney hike={hikes[0]}/>);view.rerender(<HikeJourney hike={hikes[1]}/>)
  await screen.findByRole('button',{name:'Photo new'})
  await act(async()=>resolveFirst({ok:true,status:200,json:async()=>({gallery})}))
  expect(screen.queryByRole('button',{name:'Photo a'})).toBeNull();expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:/Map selection/}));expect(screen.getByRole('status').textContent).toBe('0 photos of 1')
  view.rerender(<HikeJourney hike={hikes[2]}/>);await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('1 photo'))
 })
})
