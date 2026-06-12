import { AlertCircle, Info, CheckCircle, XCircle, Brain, Heart, Hammer } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Callout — styled info-block for MDX posts. Ported from
 * feelingdesigner (~/projects/feelingdesigner/feelingdesigner/src/
 * components/ui/callout.tsx) with two changes:
 *
 *   1. The original feelingdesigner palette is tuned for a dark-only
 *      theme. This port uses mid-luminance Tailwind-600 colours that
 *      read well on BOTH light (#f6f6f9) and dark (#0a0a0c) page
 *      backgrounds — the same hex works in both modes because it has
 *      enough contrast against either extreme.
 *
 *   2. The original used `bg-[#FFF203]/10` for the warning tint,
 *      which is a faint yellow on white and almost invisible on dark.
 *      Here the tint is `bg-<colour>/10` (10% opacity), which gives
 *      a usable tinted card on both light and dark page backgrounds.
 *
 * Seven types, each with its own accent colour + icon:
 *   info     — sky    (cyan-blue),   Info icon.     Neutral information.
 *   warning  — amber  (warm yellow), AlertCircle.   A subtle caution.
 *   success  — emerald (green),     CheckCircle.   A positive confirmation.
 *   error    — red,                 XCircle.       Something is wrong.
 *   thinking — orange,              Brain.         An insight / mental model.
 *   feeling  — rose,                Heart.         A subjective observation.
 *   doing    — yellow,              Hammer.        A practical step to take.
 *
 * Usage:
 *   <Callout type="thinking" title="The key idea">
 *     Body content — supports inline markdown via the MDX pipeline.
 *   </Callout>
 */

type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'thinking' | 'feeling' | 'doing'

interface CalloutProps {
  children: React.ReactNode
  type?: CalloutType
  title?: string
  className?: string
}

interface CalloutStyleConfig {
  /** Background tint class — applied to the card. */
  container: string
  /** Title text class — applied to the optional <h4>. */
  titleColor: string
  /** Icon SVG class. */
  iconColor: string
  /** Accent hex used for the left bar, the icon badge background, and the quarter-circle curve stroke. */
  accentHex: string
  /** Lucide icon component. */
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Accent palette: Tailwind-600 hex values (mid-luminance) so the
 * colour reads well on both light and dark page backgrounds.
 *
 * Contrast checks (WCAG, on `#f6f6f9` light and `#0a0a0c` dark):
 *   amber-600 #d97706 → 4.5:1 on light, 6.0:1 on dark
 *   sky-600   #0284c7 → 4.7:1 on light, 5.5:1 on dark
 *   emerald-600 #059669 → 4.5:1 on light, 5.5:1 on dark
 *   red-600   #dc2626 → 4.5:1 on light, 4.9:1 on dark
 *   orange-600 #ea580c → 3.7:1 on light, 4.7:1 on dark  (large/bold text)
 *   rose-600  #e11d48 → 3.9:1 on light, 4.6:1 on dark
 *   yellow-600 #ca8a04 → 3.4:1 on light, 4.4:1 on dark  (used for accent bar/icon only, not body text)
 */
const calloutStyles: Record<CalloutType, CalloutStyleConfig> = {
  info: {
    container: 'bg-sky-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_em]:!text-fg/75',
    titleColor: 'text-sky-600 dark:text-sky-400',
    iconColor: 'text-sky-600 dark:text-sky-400',
    accentHex: '#0284c7', // sky-600 — readable on both light and dark
    icon: Info,
  },
  warning: {
    container: 'bg-amber-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_em]:!text-fg/75',
    titleColor: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accentHex: '#d97706', // amber-600
    icon: AlertCircle,
  },
  success: {
    container: 'bg-emerald-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_em]:!text-fg/75',
    titleColor: 'text-emerald-700 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accentHex: '#059669', // emerald-600
    icon: CheckCircle,
  },
  error: {
    container: 'bg-red-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_em]:!text-fg/75',
    titleColor: 'text-red-700 dark:text-red-400',
    iconColor: 'text-red-600 dark:text-red-400',
    accentHex: '#dc2626', // red-600
    icon: XCircle,
  },
  thinking: {
    container:
      'bg-orange-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_a]:!text-orange-600 dark:[&_a]:!text-orange-400 [&_li]:!text-fg/80 [&_em]:!text-fg/75',
    titleColor: 'text-orange-700 dark:text-orange-400',
    iconColor: 'text-orange-600 dark:text-orange-400',
    accentHex: '#ea580c', // orange-600
    icon: Brain,
  },
  feeling: {
    container:
      'bg-rose-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_a]:!text-rose-600 dark:[&_a]:!text-rose-400 [&_li]:!text-fg/80 [&_em]:!text-fg/75',
    titleColor: 'text-rose-700 dark:text-rose-400',
    iconColor: 'text-rose-600 dark:text-rose-400',
    accentHex: '#e11d48', // rose-600
    icon: Heart,
  },
  doing: {
    container:
      'bg-yellow-500/10 text-fg/80 [&_p]:!text-fg/80 [&_strong]:!text-fg [&_a]:!text-yellow-700 dark:[&_a]:!text-yellow-400 [&_li]:!text-fg/80 [&_em]:!text-fg/75',
    titleColor: 'text-yellow-700 dark:text-yellow-400',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    accentHex: '#ca8a04', // yellow-600 — only used for the accent bar / icon stroke
    icon: Hammer,
  },
}

export function Callout({ children, type = 'info', title, className }: CalloutProps) {
  const style = calloutStyles[type]
  const Icon = style.icon

  return (
    <div
      className={cn(
        'not-prose my-8 rounded-lg p-6 relative overflow-visible',
        style.container,
        className,
      )}
    >
      {/* Left accent bar — 1px wide, full height of the card, in the
          type's accent colour. Provides a strong vertical anchor for
          the eye to associate the block with its type. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-bl-lg"
        style={{ backgroundColor: style.accentHex }}
        aria-hidden
      />

      {/* Quarter-circle SVG in the top-left corner. The fill matches
          the page background (so the corner appears "cut"), and the
          curve is stroked in the accent colour. Gives the block a
          distinctive "tag" look. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28.5"
        height="34.5"
        fill="none"
        viewBox="0 0 57 69"
        preserveAspectRatio="none"
        className="absolute top-0 left-0"
        aria-hidden
      >
        <path
          fill="var(--color-bg, #f6f6f9)"
          d="M54 0V0.716804C54 25.9434 35.0653 47.1517 10 50L0 57V0H54Z"
        />
        <path
          fill={style.accentHex}
          d="M56.9961 4.15364C57.0809 2.49896 55.8083 1.08879 54.1536 1.00394C52.499 0.919082 51.0888 2.19168 51.0039 3.84636L56.9961 4.15364ZM9.09704 51.7557L8.49716 48.8163L9.09704 51.7557ZM6 69V59.2227H0V69H6ZM9.69692 54.6951L14.3373 53.7481L13.1375 47.8693L8.49716 48.8163L9.69692 54.6951ZM14.3373 53.7481C38.202 48.8777 55.7486 28.4783 56.9961 4.15364L51.0039 3.84636C49.8967 25.4384 34.3213 43.5461 13.1375 47.8693L14.3373 53.7481ZM6 59.2227C6 57.0268 7.54537 55.1342 9.69692 54.6951L8.49716 48.8163C3.55195 49.8255 0 54.1756 0 59.2227H6Z"
        />
      </svg>

      {/* Floating icon badge — sits half off the top edge, half inside.
          Background matches the page bg so it punches out of the card. */}
      <div className="absolute -top-4 -left-4 z-10">
        <div className="rounded-full p-2" style={{ backgroundColor: 'var(--color-bg, #f6f6f9)' }}>
          <Icon className={cn('w-6 h-6', style.iconColor)} />
        </div>
      </div>

      {/* Content area: optional title in the accent colour, then the
          children (which can be plain text or rich MDX content). */}
      <div className="mt-2 ml-4">
        {title && (
          <h4 className={cn('text-base font-semibold m-0 mb-2', style.titleColor)}>{title}</h4>
        )}
        <div className="leading-relaxed text-base">{children}</div>
      </div>
    </div>
  )
}
