'use client'

import { useState } from 'react'
import { Check, Link2, ListChecks, ArrowDownToLine } from 'lucide-react'
import { ActionMenu } from '@/components/gamma/ActionMenu'
import { markReviewed, useStudyProgress } from './progress'

/**
 * Chapter-level gamma ActionMenu: copy a link to this chapter, mark the packet
 * reviewed (localStorage), and jump to the self-test. Mirrors the Equation
 * component's copy-menu pattern — feedback lives outside the closing menu.
 */
export function ChapterActions({ chapterId, hasQuiz }: { chapterId: string; hasQuiz: boolean }) {
  const stored = useStudyProgress()
  const [copied, setCopied] = useState(false)
  const [justMarked, setJustMarked] = useState(false)
  const reviewed = justMarked || Boolean(stored[chapterId]?.reviewedAt)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function markReviewedNow() {
    markReviewed(chapterId)
    setJustMarked(true)
  }

  function jumpToQuiz() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('self-test')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="relative inline-flex items-center">
      <ActionMenu
        label="Chapter actions"
        align="start"
        groups={[
          {
            id: 'chapter',
            items: [
              {
                id: 'copy-link',
                label: 'Copy link',
                description: 'chapter URL',
                icon: <Link2 size={14} />,
                onSelect: () => void copyLink(),
              },
              {
                id: 'mark-reviewed',
                label: 'Mark packet reviewed',
                description: 'saved in this browser',
                icon: <Check size={14} />,
                selected: reviewed,
                onSelect: markReviewedNow,
              },
              {
                id: 'jump-quiz',
                label: 'Jump to self-test',
                icon: <ArrowDownToLine size={14} />,
                disabled: !hasQuiz,
                onSelect: jumpToQuiz,
              },
            ],
          },
        ]}
        trigger={
          <>
            <ListChecks size={14} />
            <span>Actions</span>
          </>
        }
      />
      <span role="status" aria-live="polite" className="ml-2 font-mono text-[11px] text-muted-foreground">
        {copied ? 'Link copied' : justMarked ? 'Marked reviewed' : ''}
      </span>
    </div>
  )
}
