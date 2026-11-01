// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { controls as waveControls, defaults as waveDefaults } from './effects/wave-superposition'
import { Controls } from './controls'
import type { ControlSpec } from '@/lib/lab/types'
afterEach(cleanup)
const specs: ControlSpec[] = [
  { key:'amplitude',label:'Amplitude',type:'range',min:0,max:1,step:.1 },
  { key:'components',label:'Show components',type:'toggle' },
]
describe('Editorial instrument controls', () => {
  it('keeps authored bounds and keyboard-native controls with clear actions', () => {
    const change = vi.fn(), reset = vi.fn(), copy = vi.fn()
    const ui = render(<Controls variant="editorial" specs={specs} params={{amplitude:.6,components:true}} onChange={change} onReset={reset} onCopy={copy} />)
    expect(ui.getByText('Parameters')).toBeTruthy()
    const range = ui.getByRole('slider', {name:'Amplitude'})
    expect(range.getAttribute('max')).toBe('1')
    expect(range.getAttribute('step')).toBe('0.1')
    expect(range.getAttribute('aria-valuetext')).toBe('0.6')
    fireEvent.change(range, {target:{value:'0.7'}})
    expect(change).toHaveBeenCalledWith('amplitude', .7)
    fireEvent.click(ui.getByLabelText('Show components'))
    expect(change).toHaveBeenCalledWith('components', false)
    fireEvent.click(ui.getByRole('button',{name:'Reset'}))
    fireEvent.click(ui.getByRole('button',{name:'Copy link'}))
    expect(reset).toHaveBeenCalledOnce()
    expect(copy).toHaveBeenCalledOnce()
  })
  it('does not invent a copy action when the consumer supplies none', () => {
    const ui = render(<Controls variant="editorial" specs={specs} params={{amplitude:.6,components:false}} onChange={()=>{}} onReset={()=>{}} />)
    expect(ui.queryByRole('button',{name:'Copy link'})).toBeNull()
  })
  it('uses authored groups and units without copying the concept amplitude scale', () => {
    const ui = render(<Controls variant="editorial" title="Wave Superposition" specs={waveControls} params={waveDefaults} onChange={()=>{}} onReset={()=>{}} />)
    expect(ui.getByRole('heading',{name:'Waves'})).toBeTruthy()
    expect(ui.getByRole('heading',{name:'Appearance'})).toBeTruthy()
    expect(ui.getByRole('slider',{name:'Frequency 1'}).getAttribute('aria-valuetext')).toBe('2 Hz')
    expect(ui.getByRole('slider',{name:'Amplitude'}).getAttribute('max')).toBe('1')
    const reset = ui.getByRole('button',{name:'Reset'})
    expect(ui.getByRole('slider',{name:'Amplitude'}).compareDocumentPosition(reset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

})
