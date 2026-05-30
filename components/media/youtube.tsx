'use client'

import { useState } from 'react'

type YouTubeProps = {
  /** YouTube video id */
  id: string
  title: string
  /** accent color for the play button glow (defaults to project purple) */
  accent?: string
}

/**
 * Lightweight "facade" YouTube embed (performance pattern). Until the user
 * clicks, only the thumbnail JPEG is in the DOM — no iframe, no YouTube JS, so
 * initial load stays fast. On click we swap in the privacy-friendly
 * youtube-nocookie iframe with autoplay.
 *
 * Static-export safe: the facade is a plain server-renderable thumbnail + a
 * real <button>, so the markup (i.ytimg.com img + play button) is present in
 * the exported HTML.
 */
export function YouTube({ id, title, accent = '#7c5cff' }: YouTubeProps) {
  const [playing, setPlaying] = useState(false)
  // maxresdefault isn't guaranteed to exist; start optimistic and fall back to
  // hqdefault (always present) via onError.
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${title}`}
      className="group/yt relative block aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black"
    >
      <img
        src={thumb}
        onError={() => setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
        alt={`${title} — video thumbnail`}
        width={1280}
        height={720}
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover/yt:opacity-100"
      />
      {/* readability scrim toward the bottom */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10"
      />
      {/* play button */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 backdrop-blur-sm transition duration-300 motion-safe:group-hover/yt:scale-110"
        style={{
          backgroundColor: `color-mix(in srgb, ${accent} 88%, black)`,
          boxShadow: `0 10px 36px -10px color-mix(in srgb, ${accent} 80%, transparent)`,
        }}
      >
        {/* triangle, nudged right for optical centering */}
        <svg
          viewBox="0 0 24 24"
          className="ml-0.5 size-7 fill-white"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  )
}
