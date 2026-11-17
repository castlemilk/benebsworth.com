// @vitest-environment jsdom
import * as React from 'react'
import type * as D3 from 'd3-force'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { KnowledgeGraph } from '@/lib/knowledge/graph'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@ui-sdk/react/field', () => ({ Field: ({children}: React.PropsWithChildren) => <div>{children}</div>, FieldLabel: ({children}: React.PropsWithChildren) => <label>{children}</label> }))
vi.mock('@ui-sdk/react/input', () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props}/> }))
vi.mock('@/components/ui/display', () => ({ Display: ({children}: React.PropsWithChildren) => <div>{children}</div> }))
vi.mock('@/components/ui/lcd', () => ({ Lcd: ({children}: React.PropsWithChildren) => <div>{children}</div>, LcdDigits: ({value}: {value:string}) => <span>{value}</span> }))
vi.mock('@/components/ui/hardware/button', () => ({ Button: ({children,onClick,...props}: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button onClick={onClick} aria-pressed={props['aria-pressed']}>{children}</button> }))
vi.mock('@/components/ui/hardware/badge', () => ({ Badge: ({children}: React.PropsWithChildren) => <span>{children}</span> }))
vi.mock('@/components/ui/switch', () => ({ Switch: ({label,defaultChecked,onCheckedChange}: {label:string;defaultChecked:boolean;onCheckedChange:(v:boolean)=>void}) => <label>{label}<input type="checkbox" defaultChecked={defaultChecked} onChange={e=>onCheckedChange(e.target.checked)}/></label> }))
vi.mock('@/components/ui/item-list', () => ({ ItemList: ({label,rows,onValueChange}: {label:string;rows:{id:string;label:string}[];onValueChange:(id:string)=>void}) => <div role="group" aria-label={label}>{rows.map(n=><button key={n.id} onClick={()=>onValueChange(n.id)}>{n.label}</button>)}</div> }))
vi.mock('@/components/ui/dpad', () => ({ DPad: () => null }))
vi.mock('@/components/ui/slider', () => ({ Slider: ({onValueChange}: {onValueChange:(v:number)=>void}) => <button onClick={()=>onValueChange(2)}>manual zoom</button> }))
vi.mock('@/components/ui/bar-graph', () => ({ BarGraph: () => null }))
vi.mock('@/components/ui/segmented-control', () => ({ Segmented: ({onValueChange}: {onValueChange:(v:string)=>void}) => <button onClick={()=>onValueChange('lanes')}>lanes mode</button> }))
import { KnowledgeConsole } from './knowledge-console'

const graph: KnowledgeGraph = {
  nodes: [
    {id:'blog:one',kind:'blog',label:'Shared post',href:'/blog/one'},
    {id:'lab:one',kind:'lab',label:'Shared lab',href:'/lab/one'},
    {id:'tag:shared',kind:'tag',label:'Shared hub'},
  ],
  edges: [{source:'blog:one',target:'tag:shared',kind:'tag'}, {source:'lab:one',target:'tag:shared',kind:'tag'}],
}

// Real force engine with spies; SDK shells and canvas drawing are test doubles.
// These are behavioral lifecycle checks, not browser/rendering evidence.
const probe = vi.hoisted(() => ({ sims: [] as D3.Simulation<D3.SimulationNodeDatum, undefined>[] }))
vi.mock('d3-force', async (importOriginal) => {
  const actual = await importOriginal<typeof D3>()
  return {...actual, forceSimulation: (...args: Parameters<typeof actual.forceSimulation>) => {
    const sim = actual.forceSimulation(...args)
    vi.spyOn(sim, 'restart'); vi.spyOn(sim, 'stop'); vi.spyOn(sim, 'alphaTarget')
    probe.sims.push(sim)
    return sim
  }}
})
let media: {matches:boolean;addEventListener:ReturnType<typeof vi.fn>;removeEventListener:ReturnType<typeof vi.fn>}
let frames: Map<number, FrameRequestCallback>
let frameId: number
let ctx: CanvasRenderingContext2D
const box = {x:0,y:0,left:0,top:0,width:800,height:600,right:800,bottom:600,toJSON:()=>({})}
beforeEach(() => {
  probe.sims.length=0; push.mockReset(); frames=new Map(); frameId=0
  media={matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('ResizeObserver', class {observe() {} disconnect() {}})
  vi.stubGlobal('requestAnimationFrame', (cb:FrameRequestCallback) => {frames.set(++frameId,cb);return frameId})
  vi.stubGlobal('cancelAnimationFrame', (id:number) => frames.delete(id))
  const methods = new Map<string, ReturnType<typeof vi.fn>>()
  ctx = new Proxy({}, {get:(_,name:string)=>{if(!methods.has(name)) methods.set(name,vi.fn());return methods.get(name)},set:()=>true}) as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx)
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue(box)
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId:number; constructor(type:string, init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??0} })
  Object.defineProperty(HTMLCanvasElement.prototype,'setPointerCapture',{configurable:true,value:vi.fn()})
})
afterEach(() => { cleanup(); for(const s of probe.sims)s.stop(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).setPointerCapture })
const sim = () => probe.sims.at(-1)!
const paint = () => act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(16))})
const changeMotion = (matches:boolean) => act(()=>{media.matches=matches;const listener=media.addEventListener.mock.calls.find(c=>c[0]==='change')![1];listener()})
const selectHub = () => fireEvent.click(within(screen.getByRole('group',{name:'biggest hubs'})).getByText('Shared hub'))
const pointer = (canvas:HTMLElement,type:string,id:number,x:number,y:number) => fireEvent(canvas,new PointerEvent(type,{bubbles:true,pointerId:id,clientX:x,clientY:y}))

describe('knowledge motion and pointer lifecycle regressions',()=>{
  it('never restarts with initial reduced motion, including selection and layout changes',()=>{
    media.matches=true;render(<KnowledgeConsole graph={graph}/>);expect(sim().restart).not.toHaveBeenCalled()
    selectHub();fireEvent.click(screen.getByText('lanes mode'));expect(sim().restart).not.toHaveBeenCalled()
  })
  it('honors live reduced-motion updates and removes the listener on unmount',()=>{
    const {unmount}=render(<KnowledgeConsole graph={graph}/>);expect(sim().restart).toHaveBeenCalled()
    vi.mocked(sim().restart).mockClear();changeMotion(true);selectHub();fireEvent.click(screen.getByText('lanes mode'))
    expect(sim().stop).toHaveBeenCalled();expect(sim().restart).not.toHaveBeenCalled()
    changeMotion(false);expect(sim().restart).toHaveBeenCalled()
    const listener=media.addEventListener.mock.calls[0][1];unmount();expect(media.removeEventListener).toHaveBeenCalledWith('change',listener);expect(frames.size).toBe(0)
  })
  it('keeps a user pause through selection, layout, layer rebuild and preference changes',()=>{
    render(<KnowledgeConsole graph={graph}/>);fireEvent.click(screen.getByText('Pause layout'))
    vi.mocked(sim().restart).mockClear();selectHub();fireEvent.click(screen.getByText('lanes mode'));expect(sim().restart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox',{name:'lab 1'}));expect(sim().restart).not.toHaveBeenCalled()
    changeMotion(true);changeMotion(false);expect(sim().restart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Resume layout'));expect(sim().restart).toHaveBeenCalled()
  })
  it.each(['pointercancel','lostpointercapture'])('cleans up drag on %s without selecting, ignores foreign pointers',type=>{
    media.matches=true;render(<KnowledgeConsole graph={graph}/>);const canvas=screen.getByRole('img');const node=sim().nodes()[0]
    const x=node.x!+400,y=node.y!+300
    pointer(canvas,'pointerdown',1,x,y);expect(node.fx).not.toBeNull()
    const initial=node.fx;pointer(canvas,'pointerdown',2,x+100,y);pointer(canvas,'pointermove',2,x+100,y);pointer(canvas,type,2,x,y);expect(node.fx).toBe(initial)
    pointer(canvas,'pointermove',1,x+20,y+10);expect(node.fx).toBeCloseTo(node.x!)
    pointer(canvas,type,1,x+20,y+10);expect(node.fx).toBeNull();expect(node.fy).toBeNull();expect(sim().alphaTarget).toHaveBeenLastCalledWith(0)
    const after=node.x;pointer(canvas,'pointermove',1,x+80,y);pointer(canvas,'pointerup',1,x,y);expect(node.x).toBe(after);expect(screen.getByText(/nothing selected/)).toBeTruthy()
    pointer(canvas,'pointerdown',3,node.x!+400,node.y!+300);expect(node.fx).not.toBeNull()
  })
  it.each(['slider','keyboard','wheel'])('manual %s zoom cancels a pending focus fly before the next paint',method=>{
    render(<KnowledgeConsole graph={graph}/>);selectHub();const canvas=screen.getByRole('img')
    if(method==='slider') fireEvent.click(screen.getByText('manual zoom'))
    if(method==='keyboard') fireEvent.keyDown(canvas,{key:'+'})
    if(method==='wheel') fireEvent.wheel(canvas,{deltaY:-1,clientX:400,clientY:300})
    const expected=method==='slider'?2:method==='keyboard'?1.2:1.12
    paint();expect(ctx.scale).toHaveBeenLastCalledWith(expected,expected);expect(ctx.translate).toHaveBeenLastCalledWith(400,300)
    paint();expect(ctx.scale).toHaveBeenLastCalledWith(expected,expected);expect(ctx.translate).toHaveBeenLastCalledWith(400,300)
  })
})
