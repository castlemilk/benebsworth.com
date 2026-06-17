'use client'
import { useEffect, useState } from 'react'
import type { EffectModule } from './types'
import { EFFECT_LOADERS } from './registry'

const cache = new Map<string, EffectModule>()

export function useEffectModule(slug: string): EffectModule | undefined {
  const [module, setModule] = useState<EffectModule | undefined>(() => cache.get(slug))

  useEffect(() => {
    if (cache.has(slug)) {
      setModule(cache.get(slug))
      return
    }
    const loader = EFFECT_LOADERS[slug]
    if (!loader) return
    let cancelled = false
    loader().then((mod) => {
      if (cancelled) return
      cache.set(slug, mod)
      setModule(mod)
    })
    return () => { cancelled = true }
  }, [slug])

  return module
}
