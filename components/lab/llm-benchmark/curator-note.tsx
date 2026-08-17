import { ThumbsDown, ThumbsUp } from 'lucide-react'

import { parseBenchRef } from '@/lib/lab/llm-benchmark/bench-ref'
import type { CuratorFeedback } from '@/lib/lab/llm-benchmark/feedback'

/**
 * The curator's judgment of one record, rendered beside its numbers.
 *
 * The scorer says whether the board plays. This says whether the artifact is
 * any good — the one signal the board cannot compute — and it is DISCLOSED as
 * one person's opinion on every row, because the site is a static export and
 * there is no reader-rating path (a visitor-writable rating needs a Worker,
 * KV and abuse handling; deferred, TODO #14). The label is load-bearing: no
 * count, no average, nothing that could be read as a crowd.
 *
 * Renders NOTHING when a record has no entry. An unrated artifact is the
 * normal case — most of the board is unrated — and "no curator note" beside
 * every model would be noise pretending to be information.
 */
export function CuratorNotes({
  entries,
  className = '',
}: {
  entries: CuratorFeedback[]
  className?: string
}) {
  if (entries.length === 0) return null
  return (
    <ul data-curator-note className={`space-y-1.5 ${className}`}>
      {entries.map((entry) => (
        <CuratorNoteRow key={entry.ref} entry={entry} />
      ))}
    </ul>
  )
}

function CuratorNoteRow({ entry }: { entry: CuratorFeedback }) {
  const parsed = parseBenchRef(entry.ref)
  const iteration = parsed.ok ? parsed.ref.iterationIndex : undefined
  const positive = entry.rating === 'positive'
  const Glyph = positive ? ThumbsUp : ThumbsDown

  return (
    <li className="flex gap-2 text-xs leading-relaxed">
      <Glyph
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${positive ? 'text-emerald-500' : 'text-rose-500'}`}
        aria-hidden
      />
      <p className="text-fg/70">
        {/* The subject first when it is narrower than the record: a note about
            iteration 2 must not read as a verdict on all five. */}
        {iteration !== undefined && (
          <span className="mr-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
            iteration {iteration}
          </span>
        )}
        {entry.note}
        <span className="ml-1.5 whitespace-nowrap font-mono text-[0.65rem] uppercase tracking-wider text-muted">
          — curator note
        </span>
        <span className="sr-only">
          {' '}
          ({positive ? 'positive' : 'negative'} rating by the site maintainer, not a reader poll)
        </span>
      </p>
    </li>
  )
}

/**
 * Every curator note on ONE TASK, grouped by model — the always-rendered
 * surface.
 *
 * The comparison panes below carry the same notes, but only for the two models
 * a reader has selected; a judgment nobody sees until they pick the right
 * dropdown entry is a judgment that was not published. This panel sits with
 * the results table and the related-runs panel — the same grain, the same
 * build-time-snapshot honesty — and renders nothing when no model on this task
 * has been rated, which is most tasks.
 */
export function CuratorNotesPanel({
  entries,
  modelName,
}: {
  entries: CuratorFeedback[]
  /** Display name for a model id — the registry lookup stays with the caller. */
  modelName: (modelId: string) => string
}) {
  const groups = new Map<string, CuratorFeedback[]>()
  for (const entry of entries) {
    const parsed = parseBenchRef(entry.ref)
    if (!parsed.ok) continue
    const list = groups.get(parsed.ref.modelId) ?? []
    list.push(entry)
    groups.set(parsed.ref.modelId, list)
  }
  if (groups.size === 0) return null

  return (
    <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Curator notes</h3>
        <p className="mt-1 text-xs text-fg/60">
          One person&rsquo;s judgment of these artifacts — mine, written while reviewing them, and
          committed alongside the results. These are not reader ratings: the site is a static
          export and has no way to collect them.
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {[...groups.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([modelId, items]) => (
            <li key={modelId} className="px-5 py-4">
              <p className="font-mono text-xs font-medium text-fg/80">{modelName(modelId)}</p>
              <CuratorNotes entries={items} className="mt-2" />
            </li>
          ))}
      </ul>
    </div>
  )
}

/**
 * The per-model tally — `curator: 1 positive · 2 negative`.
 *
 * Same disclosure rule, with the word "curator" doing the work: these are
 * counts of REFS one person rated, never votes. Renders nothing at zero.
 */
export function CuratorTally({
  tally,
  className = '',
}: {
  tally: { positive: number; negative: number }
  className?: string
}) {
  if (tally.positive + tally.negative === 0) return null
  const segments = [
    ...(tally.positive > 0 ? [`${tally.positive} positive`] : []),
    ...(tally.negative > 0 ? [`${tally.negative} negative`] : []),
  ]
  return (
    <p
      data-curator-tally
      title="Ratings recorded by the site maintainer during review — not reader votes."
      className={`font-mono text-[0.65rem] uppercase tracking-wider text-muted ${className}`}
    >
      curator: {segments.join(' · ')}
    </p>
  )
}
