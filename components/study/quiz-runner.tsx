'use client'

import { useEffect, useState } from 'react'
import { GammaButton } from '@/components/gamma/GammaButton'
import { cn } from '@/lib/utils'
import { recordQuiz } from './progress'

/**
 * Interactive self-test runner for /study chapter pages.
 * MCQs are auto-scored; Feynman + numeric questions reveal a model answer and
 * the learner marks themselves — the book's own quizzes work the same way.
 * Question bodies arrive pre-rendered to HTML by the server page.
 */

export type PreparedOption = { id: string; labelHtml: string }

export type PreparedQuestion = {
  id: string
  kind: 'MCQ' | 'FEYNMAN' | 'NUMERIC'
  source: 'BOOK' | 'ORIGINAL'
  promptHtml: string
  options: PreparedOption[]
  correctOptionId?: string
  modelAnswerHtml?: string
  explanationHtml?: string
}

export type PreparedQuiz = {
  title: string
  questions: PreparedQuestion[]
}

type AnswerState = {
  selected?: string
  revealed?: boolean
  self?: 'got' | 'missed'
}

const KIND_LABEL = { MCQ: 'multiple choice', FEYNMAN: 'explain back', NUMERIC: 'worked numeric' } as const
const SOURCE_LABEL = { BOOK: 'book bank', ORIGINAL: 'original' } as const

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={cn('prose-sm max-w-none [&_code]:font-normal [&_p]:my-0', className)} dangerouslySetInnerHTML={{ __html: html }} />
}

export function QuizRunner({ quiz, chapterId }: { quiz: PreparedQuiz; chapterId: string }) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [recorded, setRecorded] = useState(false)

  const total = quiz.questions.length
  const resolved = quiz.questions.filter((q) => {
    const a = answers[q.id]
    return a && (q.kind === 'MCQ' ? a.selected !== undefined : a.self !== undefined)
  }).length
  const correct = quiz.questions.filter((q) => {
    const a = answers[q.id]
    if (!a) return false
    return q.kind === 'MCQ' ? a.selected === q.correctOptionId : a.self === 'got'
  }).length
  const done = resolved === total
  const pct = done ? Math.round((correct / total) * 100) : 0

  // localStorage write must live in an effect — inside render it double-fires
  // under StrictMode and bumps quizAttempts twice.
  useEffect(() => {
    if (done && !recorded) {
      recordQuiz(chapterId, pct)
      setRecorded(true)
    }
  }, [done, recorded, chapterId, pct])

  const pass = pct >= 80
  const summary = done
    ? pass
      ? 'Above the 80% bar: ready to review for the post.'
      : 'Under the 80% bar: revisit the flagged sections and retake.'
    : ''

  const select = (q: PreparedQuestion, optionId: string) =>
    setAnswers((s) => (s[q.id]?.selected ? s : { ...s, [q.id]: { ...s[q.id], selected: optionId } }))

  const reveal = (q: PreparedQuestion) =>
    setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], revealed: true } }))

  const selfMark = (q: PreparedQuestion, mark: 'got' | 'missed') =>
    setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], revealed: true, self: mark } }))

  const reset = () => {
    setAnswers({})
    setRecorded(false)
  }

  return (
    <div className="not-prose space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {resolved}/{total} answered · {correct} correct
        </div>
        {resolved > 0 && (
          <GammaButton variant="quiet" size="sm" onClick={reset} className="font-mono text-xs">
            reset
          </GammaButton>
        )}
      </div>

      {quiz.questions.map((q, i) => {
        const a = answers[q.id] ?? {}
        const answeredMcq = q.kind === 'MCQ' && a.selected !== undefined
        return (
          <div key={q.id} className="rounded-xl border border-border/60 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>Q{i + 1}</span>
              <span aria-hidden>·</span>
              <span>{KIND_LABEL[q.kind]}</span>
              <span aria-hidden>·</span>
              <span>{SOURCE_LABEL[q.source]}</span>
            </div>

            <Html html={q.promptHtml} className="text-[15px] leading-relaxed" />

            {q.kind === 'MCQ' && (
              <div className="mt-3 grid gap-2">
                {q.options.map((opt) => {
                  const isCorrect = opt.id === q.correctOptionId
                  const isPicked = a.selected === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={answeredMcq}
                      onClick={() => select(q, opt.id)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        !answeredMcq && 'border-border/60 hover:border-foreground/40 hover:bg-muted/40',
                        answeredMcq && isCorrect && 'border-emerald-500/60 bg-emerald-500/10',
                        answeredMcq && isPicked && !isCorrect && 'border-red-500/60 bg-red-500/10',
                        answeredMcq && !isPicked && !isCorrect && 'border-border/40 opacity-60',
                      )}
                    >
                      <Html html={opt.labelHtml} className="[&_p]:my-0" />
                    </button>
                  )
                })}
              </div>
            )}

            {q.kind !== 'MCQ' && !a.revealed && (
              <GammaButton variant="secondary" size="sm" className="mt-3" onClick={() => reveal(q)}>
                Reveal model answer
              </GammaButton>
            )}

            {q.kind !== 'MCQ' && a.revealed && q.modelAnswerHtml && (
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">model answer</div>
                <Html html={q.modelAnswerHtml} className="text-sm [&_p+p]:mt-2" />
                {a.self === undefined && (
                  <div className="mt-3 flex gap-2">
                    <GammaButton size="sm" onClick={() => selfMark(q, 'got')}>Got it</GammaButton>
                    <GammaButton size="sm" variant="secondary" onClick={() => selfMark(q, 'missed')}>Missed it</GammaButton>
                  </div>
                )}
              </div>
            )}

            {answeredMcq && q.explanationHtml && (
              <div className={cn('mt-3 rounded-lg border p-3', a.selected === q.correctOptionId ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5')}>
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {a.selected === q.correctOptionId ? 'correct' : 'not quite'}
                </div>
                <Html html={q.explanationHtml} className="text-sm" />
              </div>
            )}

            {q.kind !== 'MCQ' && a.self && (
              <div className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                self-marked: {a.self === 'got' ? 'got it' : 'missed — revisit the packet section'}
              </div>
            )}
          </div>
        )
      })}

      {done && (
        <div className={cn('rounded-xl border p-4 text-center', pass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 bg-amber-500/5')}>
          <div className="text-2xl font-semibold">{pct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">{summary} Score saved locally.</div>
        </div>
      )}
    </div>
  )
}
