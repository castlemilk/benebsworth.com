import { describe, expect, it, vi } from 'vitest'
import { createPagefindLoader } from './pagefind-loader'

describe('Pagefind initialization', () => {
  it('retries after a temporary initialization failure', async () => {
    const pagefind = { search: vi.fn(), options: vi.fn().mockResolvedValue(undefined) }
    const importer = vi.fn().mockRejectedValueOnce(new Error('temporarily unavailable')).mockResolvedValue(pagefind)
    const load = createPagefindLoader(importer)
    expect(await load()).toBeNull()
    expect(await load()).toBe(pagefind)
    expect(importer).toHaveBeenCalledTimes(2)
  })

  it('shares concurrent initialization and caches success', async () => {
    const pagefind = { search: vi.fn(), options: vi.fn().mockResolvedValue(undefined) }
    const importer = vi.fn().mockResolvedValue(pagefind)
    const load = createPagefindLoader(importer)
    expect(await Promise.all([load(), load(), load()])).toEqual([pagefind, pagefind, pagefind])
    expect(await load()).toBe(pagefind)
    expect(importer).toHaveBeenCalledTimes(1)
    expect(pagefind.options).toHaveBeenCalledTimes(1)
  })

  it('retries if options initialization fails', async () => {
    const pagefind = { search: vi.fn(), options: vi.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValue(undefined) }
    const importer = vi.fn().mockResolvedValue(pagefind)
    const load = createPagefindLoader(importer)
    expect(await load()).toBeNull()
    expect(await load()).toBe(pagefind)
    expect(importer).toHaveBeenCalledTimes(2)
  })

  it('retries after a synchronous importer exception', async () => {
    const pagefind = { search: vi.fn() }
    const importer = vi.fn().mockImplementationOnce(() => { throw new Error('not ready') }).mockResolvedValue(pagefind)
    const load = createPagefindLoader(importer)
    expect(await load()).toBeNull()
    expect(await load()).toBe(pagefind)
  })
})
