'use client'

import { useEffect, useState } from 'react'
import { GammaButton } from '@/components/gamma/GammaButton'
import { cn } from '@/lib/utils'
import { recordQuiz } from './progress'
import './quiz-runner.css'

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

export function QuizRunner(props: { quiz: PreparedQuiz; chapterId: string }) {
  return <QuizSession key={JSON.stringify([props.chapterId, props.quiz])} {...props} />
}

function QuizSession({ quiz, chapterId }: { quiz: PreparedQuiz; chapterId: string }) {
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
    <div className="not-prose study-quiz">
      <div className="study-quiz-progress" aria-label={`Progress: ${resolved} of ${total} answered`}>
        <div className="study-quiz-progress-row">
          <div><span className="study-quiz-progress-count">{resolved}/{total} answered</span></div>
          <div className="study-quiz-progress-actions">
            <span className="study-quiz-correct">{correct} correct</span>
            {resolved > 0 && <GammaButton variant="quiet" size="sm" onClick={reset}>Reset</GammaButton>}
          </div>
        </div>
        <div className="study-quiz-track" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={total} aria-valuenow={resolved}>
          <span style={{ transform: `scaleX(${total ? resolved / total : 0})` }} />
        </div>
      </div>

      {quiz.questions.map((q, i) => {
        const a = answers[q.id] ?? {}
        const answeredMcq = q.kind === 'MCQ' && a.selected !== undefined
        return (
          <article key={q.id} className="study-question" aria-label={`Question ${i + 1}`} >
            <div className="study-question-meta">
              <span className="study-question-number">{String(i + 1).padStart(2, '0')}</span>
              <span aria-hidden>·</span>
              <span>{KIND_LABEL[q.kind]}</span>
              <span aria-hidden>·</span>
              <span>{SOURCE_LABEL[q.source]}</span>
            </div>

            <Html html={q.promptHtml} className="study-question-prompt" />

            {q.kind === 'MCQ' && (
              <div className="study-quiz-options">
                {q.options.map((opt, optionIndex) => {
                  const isCorrect = opt.id === q.correctOptionId
                  const isPicked = a.selected === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={answeredMcq}
                      onClick={() => select(q, opt.id)}
                      className={cn('study-quiz-option', answeredMcq && isCorrect && 'is-correct', answeredMcq && isPicked && !isCorrect && 'is-incorrect', answeredMcq && !isPicked && !isCorrect && 'is-muted')}
                    >
                      <span className="study-quiz-option-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                      <Html html={opt.labelHtml} className="study-quiz-option-copy" />
                      {answeredMcq && (isCorrect || isPicked) && <span className="study-quiz-option-result">{isCorrect ? 'Correct answer' : 'Your answer'}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {q.kind !== 'MCQ' && !a.revealed && (
              <GammaButton variant="secondary" size="sm" className="study-quiz-reveal" onClick={() => reveal(q)}>
                Reveal model answer
              </GammaButton>
            )}

            {q.kind !== 'MCQ' && a.revealed && q.modelAnswerHtml && (
              <div className="study-quiz-feedback study-quiz-model">
                <div className="study-quiz-feedback-label">Model answer</div>
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
              <div className={cn('study-quiz-feedback', a.selected === q.correctOptionId ? 'is-correct' : 'is-incorrect')} role="status">
                <div className="study-quiz-feedback-label">
                  {a.selected === q.correctOptionId ? 'correct' : 'not quite'}
                </div>
                <Html html={q.explanationHtml} className="text-sm" />
              </div>
            )}

            {q.kind !== 'MCQ' && a.self && (
              <div className="study-quiz-self-mark">
                self-marked: {a.self === 'got' ? 'got it' : 'missed — revisit the packet section'}
              </div>
            )}
          </article>
        )
      })}

      {done && (
        <div className={cn('study-quiz-summary', pass ? 'is-correct' : 'is-incorrect')} role="status">
          <div className="text-2xl font-semibold">{pct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">{summary} Score saved locally.</div>
        </div>
      )}
    </div>
  )
}
