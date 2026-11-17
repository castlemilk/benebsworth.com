'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TranscriptEquation, TranscriptSegment } from '@/lib/gen/study'

export interface AudioOverviewProps {
  /** Audio file URL, e.g. /study-audio/vol1/01-introduction.m4a */
  src: string
  /** Karaoke segments. Pass directly (study pages) or via `transcriptSrc` (MDX). */
  segments?: TranscriptSegment[]
  /** Display names keyed by speaker id ({A:'Marcus',B:'Iris'}). Overrides
   *  transcriptSrc names when both are present. */
  hosts?: Record<string, string>
  /** URL of a transcript.json ({hosts,segments:[…]}) — fetched client-side so
   *  MDX posts can use <AudioOverview src transcriptSrc> without embedding data. */
  transcriptSrc?: string
  /** Caption label, e.g. "audio overview · ch1". */
  title?: string
  /** When set, transcript equations link to `#<prefix><eq.id>` (study pages
   *  pass "eq-" to jump to the Key-equations figure). */
  eqAnchorPrefix?: string
}

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const SPEEDS = [1, 1.25, 1.5, 2]

/** KaTeX-rendered equation chip inside a transcript bubble. Lazy-loads katex
 *  so transcripts without equations cost nothing. */
function SegmentEquation({ eq, href }: { eq: TranscriptEquation; href?: string }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    import('katex')
      .then((k) => {
        if (alive) setHtml(k.default.renderToString(eq.latex, { throwOnError: false, displayMode: true }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [eq.latex])
  const body = (
    <>
      {eq.title && <span className="ao-eq-title">{eq.title}</span>}
      {html ? <span className="ao-eq-math" dangerouslySetInnerHTML={{ __html: html }} /> : <code className="ao-eq-raw">{eq.latex}</code>}
    </>
  )
  return href ? (
    <a className="ao-eq" href={href} onClick={(e) => e.stopPropagation()}>
      {body}
      <span className="ao-eq-jump" aria-hidden="true">↗</span>
    </a>
  ) : (
    <span className="ao-eq">{body}</span>
  )
}

/**
 * Audio player with a karaoke read-along transcript. Each transcript segment
 * is one TTS utterance; the active one fills left-to-right as it plays and the
 * list auto-scrolls. Clicking a segment seeks. Speakers get named hues; turns
 * that discuss an equation carry a KaTeX chip under the utterance.
 */
export function AudioOverview(props: AudioOverviewProps) {
  const identity = JSON.stringify([props.src, props.transcriptSrc, props.segments, props.hosts])
  return <AudioOverviewSession key={identity} {...props} />
}

function AudioOverviewSession({ src, segments: initial, hosts: hostsProp, transcriptSrc, title, eqAnchorPrefix }: AudioOverviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const [segments, setSegments] = useState<TranscriptSegment[]>(initial ?? [])
  const [hosts, setHosts] = useState<Record<string, string>>(hostsProp ?? {})
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(false)

  useEffect(() => {
    if (initial || !transcriptSrc) return
    let alive = true
    fetch(transcriptSrc)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hosts?: Record<string, string>; segments?: TranscriptSegment[] } | null) => {
        if (!alive || !d) return
        if (d.segments) setSegments(d.segments)
        if (d.hosts && !hostsProp) setHosts(d.hosts)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [transcriptSrc, initial, hostsProp])

  const hostName = (id: string) => hosts[id] ?? (id === 'A' ? 'Host one' : 'Host two')
  const hostInitial = (id: string) => (hosts[id]?.[0] ?? id).toUpperCase()

  const active = useMemo(
    () => segments.findIndex((s) => time >= s.start && time < s.end),
    [segments, time],
  )

  // Auto-scroll: keep the active segment centred inside the transcript's own
  // scroll box (never scrolls the page; disabled in full-height mode).
  useEffect(() => {
    if (active < 0 || !open || full) return
    const list = listRef.current
    const el = list?.children[active] as HTMLElement | undefined
    if (!list || !el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2
    list.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }, [active, open, full])

  // Karaoke line-sweep, split into measure + paint: getComputedStyle and
  // clientHeight are layout reads, so they're re-measured only when the
  // segment or its wrapping changes (resize / font load / new active) — never
  // on the ~4Hz timeupdate path, which only writes the three CSS vars.
  const textRefs = useRef<(HTMLElement | null)[]>([])
  const karaokeMetrics = useRef({ lh: 24, lines: 1 })

  const measureKaraoke = useCallback(() => {
    if (active < 0 || !open) return
    const el = textRefs.current[active]
    if (!el) return
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24
    karaokeMetrics.current = { lh, lines: Math.max(1, Math.round(el.clientHeight / lh)) }
  }, [active, open])

  const paintKaraoke = useCallback(() => {
    if (active < 0 || !open) return
    const el = textRefs.current[active]
    const seg = segments[active]
    if (!el || !seg) return
    const { lh, lines } = karaokeMetrics.current
    const p = Math.min(1, Math.max(0, (time - seg.start) / Math.max(seg.end - seg.start, 0.01)))
    const sweep = p * lines
    const done = Math.min(Math.floor(sweep), lines - 1)
    const frac = Math.max(0, Math.min(100, (sweep - done) * 100))
    el.style.setProperty('--ao-done', `${done * lh}px`)
    el.style.setProperty('--ao-lh', `${lh}px`)
    el.style.setProperty('--ao-frac', `${frac}%`)
  }, [active, time, segments, open])

  useEffect(() => {
    measureKaraoke()
    paintKaraoke()
  }, [measureKaraoke, paintKaraoke])

  useEffect(() => {
    const remeasure = () => {
      measureKaraoke()
      paintKaraoke()
    }
    window.addEventListener('resize', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => {})
    return () => window.removeEventListener('resize', remeasure)
  }, [measureKaraoke, paintKaraoke])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play()
    else a.pause()
  }

  const seek = (t: number) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = t
    setTime(t)
    if (a.paused) void a.play()
  }

  const total = duration || segments.at(-1)?.end || 0

  return (
    <figure className="audio-overview" data-pagefind-ignore="all">
      <figcaption className="ao-caption">
        <span className="ao-label">{title ?? 'audio overview'}</span>
        <span className="ao-legend">
          <i className="ao-dot ao-dot--a" /> {hostName('A')}
          <i className="ao-dot ao-dot--b" /> {hostName('B')}
        </span>
      </figcaption>

      <div className="ao-controls">
        <button type="button" className="ao-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
          {playing ? (
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="0.8"/><rect x="9.5" y="2" width="3.5" height="12" rx="0.8"/></svg>
          ) : (
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.5 2.5v11a.7.7 0 0 0 1.06.6l8.3-5.5a.7.7 0 0 0 0-1.2l-8.3-5.5a.7.7 0 0 0-1.06.6Z"/></svg>
          )}
        </button>
        <span className="ao-time" aria-hidden="true">{fmt(time)}</span>
        <input
          type="range"
          className="ao-scrub"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(time, total || 1)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          style={{ ['--ao-fill' as string]: `${(100 * Math.min(time, total || 1)) / (total || 1)}%` }}
        />
        <span className="ao-time ao-time--total" aria-hidden="true">{fmt(total)}</span>
        <select
          className="ao-speed"
          value={speed}
          onChange={(e) => {
            const v = Number(e.target.value)
            setSpeed(v)
            if (audioRef.current) audioRef.current.playbackRate = v
          }}
          aria-label="Playback speed"
        >
          {SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}
        </select>
        {segments.length > 0 && (
          <button
            type="button"
            className="ao-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Hide transcript' : 'Show transcript'}
          >
            transcript <span className="ao-toggle-count">{segments.length}</span>
            <svg className="ao-chevron" data-open={open || undefined} viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {segments.length > 0 && (
        <div className="ao-transcript-wrap">
          {open && (
            <button type="button" className="ao-expand" onClick={() => setFull((f) => !f)} aria-pressed={full}>
              {full ? 'scroll box' : 'expand full'}
            </button>
          )}
          <ol className={`ao-transcript${full ? ' ao-transcript--full' : ''}`} ref={listRef} hidden={!open}>
            {segments.map((seg, i) => {
              const on = i === active
              return (
                <li key={i} className={`ao-seg ao-seg--${seg.speaker.toLowerCase()}${on ? ' is-active' : ''}`}>
                  {/* div[role=button], not <button>: the equation chip holds a
                      real <a>, and interactive children can't nest in buttons. */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="ao-seg-btn"
                    onClick={() => seek(seg.start)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        seek(seg.start)
                      }
                    }}
                    aria-label={`${hostName(seg.speaker)}, ${fmt(seg.start)} — play from here`}
                  >
                    <span className="ao-chip" aria-hidden="true">{hostInitial(seg.speaker)}</span>
                    <span className="ao-seg-body">
                      <span
                        className="ao-seg-text"
                        ref={(el) => {
                          textRefs.current[i] = el
                        }}
                      >
                        {seg.text}
                      </span>
                      {seg.eq && (
                        <SegmentEquation eq={seg.eq} href={eqAnchorPrefix ? `#${eqAnchorPrefix}${seg.eq.id}` : undefined} />
                      )}
                    </span>
                    <span className="ao-seg-time" aria-hidden="true">{fmt(seg.start)}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </figure>
  )
}
