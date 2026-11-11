'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// Diagrams for the "USB Wi-Fi driver with no driver" post. Three small
// figures, all data-driven from the event-horizon handover doc so the numbers
// on screen are the numbers the hardware produced.

const AMBER = '#f5a623'

function FigureShell({
  eyebrow,
  title,
  caption,
  children,
}: {
  eyebrow: string
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <figure className="not-prose my-10 overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">{eyebrow}</span>
        <span className="font-mono text-[0.72rem] text-fg/70">{title}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      {caption && (
        <figcaption className="border-t border-[var(--color-border)] px-4 py-3 font-sans text-[0.82rem] leading-relaxed text-fg/65 sm:px-5">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/* ------------------------------------------------------------------ */
/* 1. The USB identity chain                                           */
/* ------------------------------------------------------------------ */

const IDENTITIES = [
  {
    id: 'a69c:5723',
    name: 'ZeroCD',
    kind: 'USB mass storage',
    detail:
      'The dongle enumerates as a 3.7 MB FAT16 volume holding a Windows installer. On Windows the installer runs and switches the device. On macOS a disk image mounts and nothing else happens.',
    transition: 'SCSI START/STOP eject',
    note: 'the same trick 3G modems used',
  },
  {
    id: 'a69c:8d80',
    name: 'Boot ROM',
    kind: 'waiting for firmware',
    detail:
      'A bare boot ROM that accepts raw LMAC memory writes. Four firmware blobs (about 360 KB in total) are uploaded here over bulk endpoints, then the ROM is told to jump to the reset vector.',
    transition: 'upload 4 blobs, jump to 0x1201A5',
    note: 'about 26 s over USB',
  },
  {
    id: '368b:8d85',
    name: 'Operational',
    kind: 'the real product identity',
    detail:
      'The running firmware re-enumerates under a completely different vendor ID. This is the identity the Windows INF binds. Commands go out on bulk OUT ep2; everything comes back on the single bulk IN.',
    transition: null,
    note: 'only leaves this state on unplug',
  },
] as const

export function UsbIdentityChain() {
  const [active, setActive] = useState(2)
  return (
    <FigureShell
      eyebrow="fig. 1"
      title="one dongle, three USB identities"
      caption="The device is three different USB products over its life, and only the last one is the Wi-Fi adapter. Tap a stage to read what happens there."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {IDENTITIES.map((s, i) => {
          const isActive = i === active
          return (
            <div key={s.id} className="flex flex-1 flex-col sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className={cn(
                  'flex w-full flex-col rounded-lg border px-3 py-3 text-left transition-colors',
                  isActive
                    ? 'border-[#f5a623]/70 bg-[#f5a623]/10'
                    : 'border-[var(--color-border)] hover:border-fg/30',
                )}
              >
                <span className="font-mono text-[0.95rem] font-semibold tracking-tight text-fg">{s.id}</span>
                <span className="mt-0.5 font-sans text-[0.8rem] font-medium text-fg/85">{s.name}</span>
                <span className="font-sans text-[0.72rem] text-muted">{s.kind}</span>
              </button>
              {s.transition && (
                <div className="flex items-center justify-center py-1 sm:w-28 sm:flex-col sm:px-1 sm:py-0">
                  <svg viewBox="0 0 40 16" className="hidden h-4 w-10 shrink-0 sm:block" aria-hidden="true">
                    <path d="M0 8h34M28 2l7 6-7 6" fill="none" stroke={AMBER} strokeWidth="1.5" />
                  </svg>
                  <svg viewBox="0 0 16 24" className="h-6 w-4 shrink-0 sm:hidden" aria-hidden="true">
                    <path d="M8 0v18M2 12l6 7 6-7" fill="none" stroke={AMBER} strokeWidth="1.5" />
                  </svg>
                  <span className="ml-2 text-center font-mono text-[0.62rem] leading-tight text-fg/60 sm:ml-0 sm:mt-1">
                    {s.transition}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3">
        <p className="font-sans text-[0.85rem] leading-relaxed text-fg/80">{IDENTITIES[active].detail}</p>
        <p className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">{IDENTITIES[active].note}</p>
      </div>
    </FigureShell>
  )
}

/* ------------------------------------------------------------------ */
/* 2. What the kernel normally does for you                            */
/* ------------------------------------------------------------------ */

const LAYERS = [
  { layer: 'IP', does: 'DHCP client, ARP, utun bridge', normally: 'the whole network stack', who: 'kernel' },
  { layer: '802.11 to Ethernet', does: 'MPDU header, LLC/SNAP, strip the CCMP header', normally: '802.11 stack', who: 'kernel' },
  { layer: 'WPA2 4-way handshake', does: 'EAPOL-Key, PMK to PTK, RFC 3394 unwrap, GTK', normally: 'wpa_supplicant', who: 'user' },
  { layer: 'Scan and associate', does: 'probe, auth, assoc, SM_CONNECT_REQ', normally: 'CoreWLAN', who: 'kernel' },
  { layer: 'MAC bring-up', does: 'reset, me_config, chan_config, start, coex, add_if', normally: '802.11 stack', who: 'kernel' },
  { layer: 'RF / PHY calibration', does: 'per-chip RF tables, tx power level and offset', normally: 'vendor kext', who: 'kernel' },
  { layer: 'LMAC control plane', does: 'MM/ME/SM messages, TLV config, sequence-ID ACKs', normally: 'vendor kext', who: 'kernel' },
  { layer: 'Firmware bootstrap', does: 'ZeroCD eject, boot ROM upload, reset vector', normally: 'vendor kext', who: 'kernel' },
  { layer: 'USB transport', does: 'bulk endpoints, record framing, resync', normally: 'kernel USB stack', who: 'kernel' },
] as const

export function DriverLayerStack() {
  return (
    <FigureShell
      eyebrow="fig. 2"
      title="nine layers, all in one Go process"
      caption="Shaded rows are things the kernel (or a vendor kernel extension) would normally own. Here every one of them is ordinary user-space code talking to libusb at the bottom and a utun at the top."
    >
      <ol className="flex flex-col gap-1">
        {LAYERS.map((l, i) => (
          <li
            key={l.layer}
            className={cn(
              'grid grid-cols-[1.1fr_1.6fr_1fr] items-center gap-3 rounded-md px-3 py-2 text-[0.8rem]',
              l.who === 'kernel' ? 'bg-[#f5a623]/8' : 'bg-transparent',
            )}
            style={l.who === 'kernel' ? { boxShadow: `inset 3px 0 0 ${AMBER}` } : { boxShadow: 'inset 3px 0 0 var(--color-border)' }}
          >
            <span className="font-sans font-medium text-fg">
              <span className="mr-2 font-mono text-[0.65rem] text-muted">{String(LAYERS.length - i).padStart(2, '0')}</span>
              {l.layer}
            </span>
            <span className="font-mono text-[0.72rem] leading-snug text-fg/70">{l.does}</span>
            <span className="text-right font-sans text-[0.74rem] text-muted">{l.normally}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center gap-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: AMBER }} /> kernel normally does this
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--color-border)]" /> user space anyway
        </span>
      </div>
    </FigureShell>
  )
}

/* ------------------------------------------------------------------ */
/* 3. The bring-up timeline                                            */
/* ------------------------------------------------------------------ */

const STAGES = [
  { name: 'flash', ms: 344, note: 'ZeroCD eject, boot ROM handshake' },
  { name: 'firmware upload', ms: 26500, note: 'four blobs over bulk OUT, then the reset vector' },
  { name: 'associate', ms: 2290, note: 'stack_start, RF calibration, scan, SM_CONNECT' },
  { name: 'WPA2 handshake', ms: 107, note: 'four EAPOL frames, PTK and GTK installed' },
  { name: 'DHCP + bridge', ms: 3050, note: 'lease, ARP the gateway, bring up utun, add route' },
] as const

const TOTAL_MS = STAGES.reduce((a, s) => a + s.ms, 0)
const TOTAL_S = (TOTAL_MS / 1000).toFixed(1)
// A square-root scale keeps the 107 ms handshake visible next to a 26.5 s upload.
const WEIGHTS = STAGES.map((s) => Math.sqrt(s.ms))
const WSUM = WEIGHTS.reduce((a, b) => a + b, 0)
const SHARES = WEIGHTS.map((w) => w / WSUM)
const LAST = STAGES.length - 1

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s` : `${ms} ms`
}

export function BringupTimeline() {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <FigureShell
      eyebrow="fig. 3"
      title={"cold replug to routed traffic in " + TOTAL_S + " s"}
      caption="Measured on the run that first reached the Starlink terminal. Bar widths are on a square-root scale so the short stages stay visible. The firmware upload is over 80% of the wall-clock time. Hover a segment for what happens in it."
    >
      <div className="flex h-9 w-full overflow-hidden rounded-md border border-[var(--color-border)]">
        {STAGES.map((s, i) => (
          <div
            key={s.name}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            role="img"
            aria-label={`${s.name}: ${fmtMs(s.ms)}`}
            className="relative flex items-center justify-center border-r border-[var(--color-bg)] last:border-r-0 transition-opacity"
            style={{
              width: (SHARES[i] * 100).toFixed(2) + "%",
              background: AMBER,
              opacity: hover === null ? 0.35 + 0.5 * (i * (1 / LAST)) : hover === i ? 1 : 0.25,
            }}
          >
            {SHARES[i] > 0.08 && (
              <span className="truncate px-1 font-mono text-[0.62rem] font-semibold text-black/80">{fmtMs(s.ms)}</span>
            )}
          </div>
        ))}
      </div>
      <ol className="mt-3 grid gap-1 sm:grid-cols-5">
        {STAGES.map((s, i) => (
          <li
            key={s.name}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              'rounded-md px-2 py-1.5 transition-colors',
              hover === i ? 'bg-[#f5a623]/12' : 'bg-transparent',
            )}
          >
            <div className="font-sans text-[0.78rem] font-medium text-fg">
              <span className="mr-1.5 font-mono text-[0.62rem] text-muted">{i + 1}</span>
              {s.name}
            </div>
            <div className="font-mono text-[0.66rem] leading-snug text-fg/60">{s.note}</div>
          </li>
        ))}
      </ol>
    </FigureShell>
  )
}
