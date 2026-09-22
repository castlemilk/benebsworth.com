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
export function normalizeCarbonOrigin(value: string): string {
  return new URL(value).origin
}

export function isValidCarbonHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 200 && value <= 20_000
}

const CARBON_ORIGIN = normalizeCarbonOrigin(
  process.env.NEXT_PUBLIC_CARBON_URL ?? 'https://carbon.benebsworth.com',
)
const EMBED_URL = `${CARBON_ORIGIN}/?embed=1`

export function createCarbonMessageHandler(
  getFrameWindow: () => Window | null | undefined,
  setHeight: (height: number) => void,
): (event: MessageEvent) => void {
  return (event) => {
    if (event.origin !== CARBON_ORIGIN) return
    if (event.source !== getFrameWindow()) return
    const data = event.data as { type?: string; height?: number }
    if (data?.type === 'carbon:height' && isValidCarbonHeight(data.height)) {
      setHeight(data.height)
    }
  }
}

export function CarbonEmbed() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(720)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const onMessage = createCarbonMessageHandler(
      () => frameRef.current?.contentWindow,
      setHeight,
    )
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="relative">
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-24" aria-hidden>
          <span className="type-label animate-pulse text-[var(--color-fg)]/30">loading research platform…</span>
        </div>
      )}
      <iframe
        ref={frameRef}
        src={EMBED_URL}
        title="Carbon Capture Research platform"
        onLoad={() => setLoaded(true)}
        style={{ height }}
        className={`block w-full border-0 bg-transparent transition-[height,opacity] duration-300 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        allow="fullscreen"
        frameBorder="0"
        scrolling="no"
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
