'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Host-side half of the carbon microfrontend handshake.
 *
 * The child app (carbon) posts `{ type: 'carbon:height', height }` on load and
 * whenever its content resizes; we size the iframe to match so nothing inside
 * ever scrolls — the page scrolls natively instead. The child renders
 * chrome-less when loaded with `?embed=1` (cookie-persisted via middleware).
 */
const CARBON_ORIGIN = process.env.NEXT_PUBLIC_CARBON_URL ?? 'https://carbon.benebsworth.com'
const EMBED_URL = `${CARBON_ORIGIN}/?embed=1`

export function CarbonEmbed() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(720)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CARBON_ORIGIN) return
      const data = e.data as { type?: string; height?: number }
      if (data?.type === 'carbon:height' && typeof data.height === 'number' && data.height > 200) {
        setHeight(data.height)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="type-label animate-pulse text-[var(--color-fg)]/40">loading research platform…</span>
        </div>
      )}
      <iframe
        ref={frameRef}
        src={EMBED_URL}
        title="Carbon Capture Research platform"
        onLoad={() => setLoaded(true)}
        style={{ height }}
        className="w-full bg-transparent transition-[height] duration-300 ease-out"
        allow="fullscreen"
      />
      <noscript>
        <p className="p-4 type-body text-sm text-[var(--color-fg)]/60">
          The embedded platform needs JavaScript.{' '}
          <a href={CARBON_ORIGIN} className="underline">Open it directly →</a>
        </p>
      </noscript>
    </div>
  )
}
