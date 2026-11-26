import { ChapterStatus, VolumeState } from '@/lib/gen/study'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<ChapterStatus, string> = {
  [ChapterStatus.CHAPTER_STATUS_UNSPECIFIED]: 'unread',
  [ChapterStatus.PACKET]: 'packet',
  [ChapterStatus.REVIEWED]: 'reviewed',
  [ChapterStatus.QUIZZED]: 'quizzed',
  [ChapterStatus.POSTED]: 'posted',
  [ChapterStatus.UNRECOGNIZED]: 'unread',
}

const STATUS_CLASS: Record<ChapterStatus, string> = {
  [ChapterStatus.CHAPTER_STATUS_UNSPECIFIED]: 'text-muted-foreground',
  [ChapterStatus.PACKET]: 'border-amber-500/50 text-amber-600 dark:text-amber-400',
  [ChapterStatus.REVIEWED]: 'border-sky-500/50 text-sky-600 dark:text-sky-400',
  [ChapterStatus.QUIZZED]: 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
  [ChapterStatus.POSTED]: 'border-violet-500/50 text-violet-600 dark:text-violet-400',
  [ChapterStatus.UNRECOGNIZED]: 'text-muted-foreground',
}

export function StatusChip({ status, className }: { status: ChapterStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      title="Packet progress in the author's study loop"
      className={cn('font-mono uppercase tracking-wide', STATUS_CLASS[status], className)}
    >
      loop · {STATUS_LABEL[status]}
    </Badge>
  )
}

const VOLUME_LABEL: Record<VolumeState, string | null> = {
  [VolumeState.VOLUME_STATE_UNSPECIFIED]: null,
  [VolumeState.ACTIVE]: null,
  [VolumeState.PREVIEW]: 'preview',
  [VolumeState.IN_PREPARATION]: 'in preparation',
  [VolumeState.UNRECOGNIZED]: null,
}

export function VolumeStateChip({ state }: { state: VolumeState }) {
  const label = VOLUME_LABEL[state]
  if (!label) return null
  return (
    <Badge variant="outline" className="font-mono uppercase tracking-wide text-muted-foreground">
      {label}
    </Badge>
  )
}
