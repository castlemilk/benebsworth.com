'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ControlSpec, Params, ParamValue } from '@/lib/lab/types'
import { decodeParams, encodeParams } from '@/lib/lab/url-params'

export function useUrlParams(defaults: Params, specs: ControlSpec[]) {
  const [params, setParams] = useState<Params>(defaults)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    setParams(decodeParams(window.location.search, defaults, specs))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cancel any pending URL write on unmount so a stale debounce can't fire on the next route.
  useEffect(() => () => clearTimeout(timer.current), [])

  const sync = useCallback((p: Params) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const qs = encodeParams(p)
      window.history.replaceState(null, '', `${window.location.pathname}?${qs}`)
    }, 150)
  }, [])

  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => { const nextP = { ...prev, [key]: value }; sync(nextP); return nextP })
  }, [sync])

  const reset = useCallback(() => {
    clearTimeout(timer.current)
    setParams(defaults)
    window.history.replaceState(null, '', window.location.pathname)
  }, [defaults])

  const permalink = useCallback(() => `${window.location.origin}${window.location.pathname}?${encodeParams(params)}`, [params])

  return { params, setParam, reset, permalink }
}
