import { afterEach, describe, expect, it, vi } from 'vitest'

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  vi.resetModules()
})
const load = async () => { vi.resetModules(); return import('./sound') }

describe('sound opt-in under unavailable storage', () => {
  it('imports muted when the localStorage property getter throws', async () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError') } })
    const sound = await load()
    expect(sound.soundEnabled()).toBe(false)
    const listener = vi.fn()
    const unsubscribe = sound.onSoundChange(listener)
    expect(() => sound.setSoundEnabled(true)).not.toThrow()
    expect(sound.soundEnabled()).toBe(true)
    expect(listener).toHaveBeenCalledWith(true)
    unsubscribe()
    sound.setSoundEnabled(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })
  it('imports muted when getItem throws and keeps explicit choice in memory if writes fail', async () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') },
    } })
    const sound = await load()
    expect(sound.soundEnabled()).toBe(false)
    sound.setSoundEnabled(true)
    expect(sound.soundEnabled()).toBe(true)
    sound.setSoundEnabled(false)
    expect(sound.soundEnabled()).toBe(false)
  })
  it.each([null, 'off', 'true', 'unexpected'])('defaults muted for stored %s', async (value) => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => value } })
    expect((await load()).soundEnabled()).toBe(false)
  })
  it('honors only the explicit on preference and persists later opt-out', async () => {
    const getItem = vi.fn(() => 'on'), setItem = vi.fn()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem, setItem } })
    const sound = await load()
    expect(sound.soundEnabled()).toBe(true)
    expect(getItem).toHaveBeenCalledWith('spec01:sound')
    sound.setSoundEnabled(false)
    expect(setItem).toHaveBeenCalledWith('spec01:sound', 'off')
  })
})
