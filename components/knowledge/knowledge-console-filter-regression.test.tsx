// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
vi.mock('@/components/ui/slider', () => ({ Slider: () => null }))
vi.mock('@/components/ui/bar-graph', () => ({ BarGraph: () => null }))
vi.mock('@/components/ui/mode-dial', () => ({ ModeDial: () => null }))
import { KnowledgeConsole } from './knowledge-console'

const graph: KnowledgeGraph = {
  nodes: [
    {id:'blog:one',kind:'blog',label:'Shared post',href:'/blog/one'},
    {id:'lab:one',kind:'lab',label:'Shared lab',href:'/lab/one'},
    {id:'tag:shared',kind:'tag',label:'Shared hub'},
  ],
  edges: [{source:'blog:one',target:'tag:shared',kind:'tag'}, {source:'lab:one',target:'tag:shared',kind:'tag'}],
}
beforeEach(() => {
  push.mockReset()
  vi.stubGlobal('matchMedia', () => ({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({ setTransform: vi.fn() } as unknown as CanvasRenderingContext2D)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const search = () => fireEvent.change(screen.getByPlaceholderText('search nodes…'), {target:{value:'Shared'}})

describe('knowledge layer-derived selection and discovery', () => {
  it('removes hidden layers from search and restores them on re-enable', () => {
    render(<KnowledgeConsole graph={graph}/>); search()
    expect(within(screen.getByRole('list',{name:'Search results'})).getByText('Shared lab')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox',{name:'lab'}))
    expect(within(screen.getByRole('list',{name:'Search results'})).queryByText('Shared lab')).toBeNull()
    fireEvent.click(screen.getByRole('checkbox',{name:'lab'}))
    expect(within(screen.getByRole('list',{name:'Search results'})).getByText('Shared lab')).toBeTruthy()
  })
  it('counts and lists only visible neighbors of the selected hub', () => {
    render(<KnowledgeConsole graph={graph}/>)
    fireEvent.click(within(screen.getByRole('group',{name:'biggest hubs'})).getByText('Shared hub'))
    expect(screen.getByText('2 links')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox',{name:'lab'}))
    expect(screen.getByText('1 links')).toBeTruthy()
    const linked=screen.getByRole('group',{name:'linked'})
    expect(within(linked).getByText('Shared post')).toBeTruthy()
    expect(within(linked).queryByText('Shared lab')).toBeNull()
  })
  it('clears hidden selection and prevents Enter opening its former destination', () => {
    render(<KnowledgeConsole graph={graph}/>); search()
    fireEvent.click(within(screen.getByRole('list',{name:'Search results'})).getByText('Shared post'))
    fireEvent.click(screen.getByRole('checkbox',{name:'blog'}))
    expect(screen.queryByRole('button',{name:'open →'})).toBeNull()
    expect(screen.getByText(/nothing selected/)).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('img'), {key:'Enter'})
    expect(push).not.toHaveBeenCalled()
  })
})
