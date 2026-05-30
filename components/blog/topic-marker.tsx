import { cn } from '@/lib/utils'
import type { Topic } from '@/lib/topics'

type TopicMarkerProps = {
  topic: Topic
  /** marker glyph size in px (the icon sits in a square chip) */
  size?: number
  className?: string
}

/**
 * Refined topic *marker* — a small accent-tinted chip carrying the original
 * topic glyph + a mono label. Deliberately NOT a big rounded hero icon: it reads
 * as an editorial category tag, color-coded by topic. Plain <img> keeps the
 * asset path in the statically-exported HTML and avoids CLS (fixed dimensions).
 */
export function TopicMarker({ topic, size = 16, className }: TopicMarkerProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3',
        'font-mono text-[0.62rem] uppercase tracking-[0.18em]',
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${topic.accent} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${topic.accent} 9%, transparent)`,
        color: topic.accent,
      }}
    >
      <span
        className="grid place-items-center rounded-full"
        style={{
          width: size + 8,
          height: size + 8,
          backgroundColor: `color-mix(in srgb, ${topic.accent} 14%, transparent)`,
        }}
      >
        <img
          src={topic.icon}
          alt=""
          aria-hidden
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
        />
      </span>
      {topic.label}
    </span>
  )
}
