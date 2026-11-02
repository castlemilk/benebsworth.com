'use client'

import { useState, useRef, useEffect, useId, type ReactNode } from 'react'
import { ActionMenu } from '@/components/gamma/ActionMenu'

/** Display children are rendered by the production KaTeX pipeline.
 * `latex` is only the copy source; omitting it hides the existing copy actions.
 */
export function Equation({ id, number, caption, latex, children }: {
  id?: string
  /** Explicit number without surrounding parentheses. No number is inferred. */
  number?: string
  caption?: ReactNode
  latex?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<'latex' | 'text' | 'error' | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef(0)
  const captionId = useId()
  const copyError = 'Copy unavailable. Select math manually or retry.'

  useEffect(() => () => {
    request.current += 1
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // A dispatched system clipboard write cannot be cancelled. Invalidate only
  // its UI result and fallback when the copy source changes.
  useEffect(() => {
    request.current += 1
    if (timer.current) clearTimeout(timer.current)
    setFeedback(null)
  }, [latex])

  async function handleCopy(mode: 'latex' | 'text') {
    if (!latex) return
    const currentRequest = ++request.current
    if (timer.current) clearTimeout(timer.current)
    setFeedback(null)
    // Preserve the existing public payload contract exactly.
    const text = mode === 'latex' ? `$$\n${latex.trim()}\n$$` : latex.trim()
    const selection = window.getSelection()
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : []
    let success = false
    try {
      await navigator.clipboard.writeText(text)
      success = true
    } catch {
      // Let Gamma finish closing and returning focus, including a missing API
      // that throws synchronously before the first awaited clipboard promise.
      await Promise.resolve()
      // Do not run a stale fallback after source change, unmount or a newer action.
      if (currentRequest !== request.current) return
      const active = document.activeElement as HTMLElement | null
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.readOnly = true
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        success = document.execCommand('copy') === true
      } catch {
        success = false
      } finally {
        textarea.remove()
        active?.focus({ preventScroll: true })
        if (selection) {
          selection.removeAllRanges()
          ranges.forEach(range => selection.addRange(range))
        }
      }
    }
    if (currentRequest !== request.current) return
    setFeedback(success ? mode : 'error')
    // Feedback resets without hiding a focused action. Errors remain for recovery.
    if (success) timer.current = setTimeout(() => setFeedback(null), 1500)
  }

  return (
    <figure id={id} data-equation data-latex={latex} className="not-prose equation relative my-8 text-center">
      {latex && <div className="equation-controls" data-pagefind-ignore>
        <div className="equation-feedback">
          {/* Reserve only the actual recovery message's wrapping footprint.
              Both feedback states share it, so neither moves the mathematics. */}
          <span className="equation-feedback-reserve" aria-hidden="true">{copyError}</span>
          <div role="status" aria-live="polite" aria-atomic="true" className="equation-copy-status">
            {feedback === 'error' ? copyError : feedback ? 'Copied' : ''}
          </div>
        </div>
        <ActionMenu label="Copy equation to clipboard" align="end" open={open} onOpenChange={setOpen}
          trigger={<><CopyIcon /><span>Copy</span></>}
          groups={[{ id: 'source', items: [
            { id: 'latex', label: 'Copy LaTeX', description: 'with $$ delimiters', icon: <CopyIcon />, onSelect: () => { void handleCopy('latex') } },
            { id: 'text', label: 'Copy math', description: 'expression only', icon: <CopyIcon />, onSelect: () => { void handleCopy('text') } },
          ] }]} />
      </div>}
      <div className="equation-math" tabIndex={0} role="region" aria-label={number ? `Equation (${number})` : 'Equation'}
        aria-describedby={number || caption ? captionId : undefined}>
        {children}
      </div>
      {(number || caption) && <figcaption id={captionId} className="equation-caption mt-3 font-mono text-xs text-fg/60">
        {number && <span className="equation-number mr-2 font-semibold text-fg/75">({number})</span>}
        {caption}
      </figcaption>}
    </figure>
  )
}

function CopyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

