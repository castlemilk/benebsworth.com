// @vitest-environment jsdom
import React,{useRef,useState} from 'react'
import {render,screen,fireEvent,act,cleanup,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {PhotoMarkerControls} from './photo-marker-controls'
import {fitViewport} from '@/lib/hiking/route-geography'
import type {PhotoMarkerGroup} from '@/lib/hiking/photo-markers'
import type {TrailPhotoArea} from '@/lib/hiking/photo-trail'
const areas:TrailPhotoArea[]=Array.from({length:3},(_,i)=>({id:`area-${i}`,number:i+1,center:[146,-42],bounds:{west:145.99,east:146.01,south:-42.01,north:-41.99},photos:[{id:`photo-${i}`,url:`/synthetic-${i}.webp`,thumb:'',caption:'',alt:'',slot:'',takenAt:'',width:600,height:400,lat:-42,lng:146}]}))
const group:PhotoMarkerGroup={id:'group',areas,anchor:areas[1]},viewport=fitViewport({west:145.9,east:146.2,south:-42.1,north:-41.6},360,600)
function View(){const [selected,setSelected]=useState<string|null>(null),fallback=useRef<HTMLDivElement>(null);return <><div ref={fallback} tabIndex={-1}/><PhotoMarkerControls groups={[group]} viewport={viewport} selected={selected} onSelect={setSelected} fallback={fallback} onOpenChange={()=>{}}/><button>After map</button></>}
beforeEach(()=>vi.stubGlobal('requestAnimationFrame',(callback:()=>void)=>setTimeout(callback,0)))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('offers every grouped area with radio semantics and keyboard selection, then restores the trigger',async()=>{
 render(<View/>);const trigger=screen.getByRole('button',{name:'Choose from 3 photo areas'});act(()=>trigger.focus());fireEvent.keyDown(trigger,{key:'ArrowDown'})
 const menu=screen.getByRole('menu',{name:'Choose a photo area'}),items=within(menu).getAllByRole('menuitemradio')
 expect(items).toHaveLength(3);expect(document.activeElement).toBe(items[0]);fireEvent.keyDown(menu,{key:'End'});expect(document.activeElement).toBe(items[2]);fireEvent.keyDown(menu,{key:'ArrowDown'});expect(document.activeElement).toBe(items[0]);fireEvent.keyDown(menu,{key:'ArrowUp'});expect(document.activeElement).toBe(items[2])
 fireEvent.click(items[2]);await waitFor(()=>expect(document.activeElement).toBe(trigger));expect(screen.queryByRole('menu')).toBeNull()
 fireEvent.click(trigger);expect(document.activeElement?.getAttribute('aria-checked')).toBe('true');fireEvent.keyDown(screen.getByRole('menu'),{key:'Escape'});await waitFor(()=>expect(document.activeElement).toBe(trigger));expect(screen.queryByRole('menu')).toBeNull()
})
it('preserves the selector after failed photos and dismisses outside without stealing focus',()=>{
 render(<View/>);const trigger=screen.getByRole('button',{name:'Choose from 3 photo areas'});for(const image of trigger.querySelectorAll('img'))fireEvent.error(image)
 expect(trigger.querySelectorAll('img')).toHaveLength(0);fireEvent.click(trigger);expect(screen.getAllByRole('menuitemradio')).toHaveLength(3)
 const outside=screen.getByRole('button',{name:'After map'});act(()=>outside.focus());fireEvent.pointerDown(outside);expect(screen.queryByRole('menu')).toBeNull();expect(document.activeElement).toBe(outside)
})
it('closes on Tab without cancelling the browser onward key event',()=>{
 render(<View/>);const trigger=screen.getByRole('button',{name:'Choose from 3 photo areas'});fireEvent.click(trigger)
 expect(fireEvent.keyDown(screen.getByRole('menu'),{key:'Tab'})).toBe(true);expect(screen.queryByRole('menu')).toBeNull();expect(document.activeElement).toBe(trigger)
})
it('selects a singleton directly with no menu and preserves its coarse label',()=>{
 const select=vi.fn();render(<PhotoMarkerControls groups={[{id:'single',areas:[areas[0]],anchor:areas[0]}]} viewport={viewport} selected={null} onSelect={select} fallback={{current:null}} onOpenChange={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Select photo area 1, 1 photograph'}));expect(select).toHaveBeenCalledWith('area-0');expect(screen.queryByRole('menu')).toBeNull()
})

it('contains its chooser in a small visual viewport and preserves all rows for scrolling',()=>{
 vi.stubGlobal('visualViewport',{width:260,height:250,offsetLeft:20,offsetTop:40,addEventListener:vi.fn(),removeEventListener:vi.fn()})
 render(<View/>);fireEvent.click(screen.getByRole('button',{name:'Choose from 3 photo areas'}))
 const menu=screen.getByRole('menu');expect(menu.style.width).toBe('236px');expect(menu.style.maxHeight).toBe('226px');expect(Number.parseFloat(menu.style.left)).toBeGreaterThanOrEqual(32);expect(Number.parseFloat(menu.style.top)).toBeGreaterThanOrEqual(52);expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(3)
})


it('identifies only the selected area’s marker, including a grouped area, for location return',()=>{
 const props={groups:[group],viewport,onSelect:vi.fn(),fallback:{current:null},onOpenChange:()=>{}}
 const view=render(<PhotoMarkerControls {...props} selected={areas[1].id}/>)
 const marker=screen.getByRole('button',{name:'Choose from 3 photo areas'})
 expect(document.querySelectorAll('[data-selected-photo-area]')).toHaveLength(1)
 expect(marker.getAttribute('data-selected-photo-area')).toBe(areas[1].id)
 expect(marker.hasAttribute('data-photo-focus-target')).toBe(true)
 expect(marker.getAttribute('aria-description')).toBe('Includes selected photo area 2')
 view.rerender(<PhotoMarkerControls {...props} selected={null}/>)
 expect(document.querySelector('[data-selected-photo-area]')).toBeNull()
 expect(marker.hasAttribute('aria-description')).toBe(false)
 view.rerender(<PhotoMarkerControls {...props} selected="unlinked"/>)
 expect(document.querySelector('[data-selected-photo-area]')).toBeNull()
})
