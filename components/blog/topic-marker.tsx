import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Topic } from '@/lib/topics'

type TopicMarkerProps = {
  topic: Topic
  /** marker glyph size in px (the icon sits in a circular ink well) */
  size?: number
  className?: string
}

/**
 * Refined topic *marker* — a small accent-tinted chip carrying the original
 * topic glyph + a readable label. Deliberately NOT a big rounded hero icon: it reads
 * as an editorial category tag, color-coded by topic. Plain <img> keeps the
 * asset path in the statically-exported HTML and avoids CLS (fixed dimensions).
 */
export function TopicMarker({ topic, size = 16, className }: TopicMarkerProps) {
  return (
    <span
      className={cn(
        'topic-lozenge topic-lozenge--primary',
        className,
      )}
      style={{
        '--ink': topic.accent,
        borderColor: `color-mix(in srgb, ${topic.accent} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${topic.accent} 9%, transparent)`,
      } as CSSProperties}
    >
      <TopicGlyph topic={topic} size={size} />
      <span>{topic.label}</span>
    </span>
  )
}

/** Brand images retain their colours; reviewed custom SVGs inherit theme ink. */
export function TopicGlyph({ topic, size = 16 }: { topic: Topic; size?: number }) {
  return <span aria-hidden="true" className="topic-lozenge__glyph" style={{ width: size, height: size }}>
    {topic.renderMode === 'mask' ? <span style={{ display: 'block', width: size, height: size,
      backgroundColor: 'currentColor', mask: `url("${topic.icon}") center / contain no-repeat`,
      WebkitMask: `url("${topic.icon}") center / contain no-repeat` }} /> :
      <img src={topic.icon} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />}
  </span>
}
