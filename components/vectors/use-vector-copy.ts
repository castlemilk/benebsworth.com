'use client'

import { useEffect, useRef, useState } from 'react'

/** Read the real SVG bytes, rejecting error pages without rewriting artwork. */
export async function readVectorSource(path: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error('SVG request failed')
  const source = await response.text()
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg'
    || document.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg') {
    throw new Error('Response is not an SVG document')
  }
  return source
}

type Format = 'SVG' | 'JSX'
type Feedback = { status: 'idle' | 'copying' | 'copied' | 'error'; format: Format }

/** One copy at a time, with feedback scoped to the mounted vector. */
export function useVectorCopy() {
  const [feedback, setFeedback] = useState<Feedback>({ status: 'idle', format: 'SVG' })
  const active = useRef(false)
  const pending = useRef<AbortController | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      pending.current?.abort()
      pending.current = null
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const copy = async (format: Format, getSource: (signal: AbortSignal) => string | Promise<string>) => {
    if (pending.current) return
    const request = new AbortController()
    pending.current = request
    if (timer.current) clearTimeout(timer.current)
    setFeedback({ status: 'copying', format })
    const current = () => active.current && pending.current === request && !request.signal.aborted
    try {
      const source = await getSource(request.signal)
      if (!current()) return
      await navigator.clipboard.writeText(source)
      if (!current()) return
      setFeedback({ status: 'copied', format })
      timer.current = setTimeout(() => {
        if (active.current) setFeedback({ status: 'idle', format })
      }, 2000)
    } catch {
      if (current()) setFeedback({ status: 'error', format })
    } finally {
      if (pending.current === request) pending.current = null
    }
  }

  return { feedback, copy }
}
