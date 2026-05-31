import { cn } from '@/lib/utils'

type ProjectEmblemProps = {
  src: string
  alt: string
  /** accent color keying the tinted backdrop */
  accent: string
  className?: string
  /** rendered size of the centered emblem in px (logos are 128² natives) */
  emblemSize?: number
}

/**
 * Frames a small square project logo as a designed *emblem* on a tinted radial
 * panel keyed to the accent — rather than stretching a 128² asset to a blurry
 * full-bleed "screenshot". The <img> keeps its native dimensions (no upscale
 * blur, no CLS) and the panel is the aspect box.
 *
 * Pure presentational / server-renderable: emits a plain <img>, so the asset
 * path is present in the statically-exported HTML.
 */
export function ProjectEmblem({
  src,
  alt,
  accent,
  className,
  emblemSize = 128,
}: ProjectEmblemProps) {
  return (
    <div
      className={cn(
        'relative grid place-items-center overflow-hidden bg-surface',
        className,
      )}
    >
      {/* tinted radial backdrop */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 70% at 50% 38%, color-mix(in srgb, ${accent} 22%, transparent), transparent 72%)`,
        }}
      />
      {/* faint technical grid for texture */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(70% 70% at 50% 50%, black, transparent 75%)',
        }}
      />
      <img
        src={src}
        alt={alt}
        width={emblemSize}
        height={emblemSize}
        className="relative drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        style={{ width: emblemSize, height: emblemSize }}
      />
    </div>
  )
}
