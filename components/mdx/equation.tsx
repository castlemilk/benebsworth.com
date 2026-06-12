'use client'

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

/**
 * <Equation> — a labeled display-math block with a number, optional
 * caption, stable id for cross-references, and a hover-revealed
 * copy-to-clipboard menu in the top-right corner.
 *
 *   <Equation id="eqn:smith" number="1" caption="Reflection coefficient." latex="\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}">
 *     $$\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}$$
 *   </Equation>
 *
 * The `latex` prop is the raw LaTeX source string the copy button grabs. It
 * is NOT used for rendering — `children` is rendered by rehype-katex as
 * HTML, then KaTeX styles it. The `latex` prop only feeds the copy menu
 * and the `.md` sibling (where KaTeX HTML is stripped). If `latex` is
 * omitted, the copy button is hidden.
 *
 * The copy UI is a single ⧉ icon in the top-right corner of the figure.
 * On hover (or focus, or after a copy), the icon expands to reveal the
 * two copy options as a vertical menu. After a copy, the menu stays open
 * for 1.5s showing the "Copied" confirmation, then collapses.
 */
export function Equation({
  id,
  number,
  caption,
  latex,
  children,
}: {
  /** Optional DOM id for cross-references via `#anchor`. */
  id?: string
  /** Explicit equation number, e.g. (3.2). Defaults to a chapter-style number. */
  number?: string
  /** Optional short caption shown below the equation. */
  caption?: ReactNode
  /** Raw LaTeX source — what the copy button puts on the clipboard. */
  latex?: string
  /** The math expression, e.g. `<div>$$\Gamma = ...$$</div>` or raw KaTeX HTML. */
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'latex' | 'text' | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup the "copied" toast timer on unmount.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const handleCopy = useCallback(async (mode: 'latex' | 'text') => {
    if (!latex) return
    // For 'latex' mode keep the $$ fences so the user can paste straight
    // into a Markdown block. For 'text' mode strip them — useful for
    // pasting into a REPL, a notebook cell, or a KaTeX snippet.
    const text = mode === 'latex'
      ? `$$\n${latex.trim()}\n$$`
      : latex.trim()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(mode)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard API not available (older browsers, insecure context);
      // fall back to a hidden textarea + execCommand.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* swallow */ }
      document.body.removeChild(ta)
      setCopied(mode)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), 1500)
    }
  }, [latex])

  // Listen for Escape globally so keyboard users can dismiss the menu
  // even when the focus is on a menu item inside the menu (not the
  // figure itself).
  useEffect(() => {
    if (!open) return
    function onDocKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onDocKey)
    return () => document.removeEventListener('keydown', onDocKey)
  }, [open])

  // The menu is shown when the cursor is over the icon itself, the menu
  // itself, or the "Copied" toast is active. The wrapper div's
  // `onPointerEnter` / `onPointerLeave` keep the menu open while the
  // cursor moves from icon to menu (no gap between them).
  const showMenu = (open || copied) && latex

  return (
    <figure
      id={id}
      data-equation
      data-latex={latex}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        // Only close if focus moved outside the figure.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
      className="not-prose group/eq relative my-8 flex flex-col items-center text-center"
    >
      {/* Math: rendered KaTeX HTML. The wrapper is what rehype-katex
          targets with its .katex-display class, and the overflow-x:auto
          keeps long equations from breaking the layout. The right padding
          leaves space for the copy button so it doesn't overlap tall
          equations. */}
      <div className="text-fg/95 max-w-full overflow-x-auto pr-10">
        {children}
      </div>

      {/* Caption. Stays centred and monospace; the copy menu doesn't
          crowd it because the menu lives in the top-right corner. */}
      {(number || caption) && (
        <figcaption className="mt-3 font-mono text-xs text-fg/60">
          {number && <span className="mr-2 font-semibold text-fg/75">({number})</span>}
          {caption}
        </figcaption>
      )}

      {/* Copy menu — top-right of the figure. The icon is the only
          visible element until the figure is hovered or the menu has
          focus; then the panel expands below the icon showing the two
          copy options. After a copy, the panel stays open for 1.5s with
          a "Copied" confirmation. */}
      {latex && (
        <div
          className="absolute right-2 top-1 z-10 flex flex-col items-end"
          // The figure has pointer events through it; only enable the
          // copy button area to capture pointer events.
          onClick={(e) => e.stopPropagation()}
          // Hover the wrapper (icon + menu) keeps the menu open. Mouse
          // enters the icon, then the menu expands below it, and the
          // cursor moves from icon onto the menu — `onPointerEnter` /
          // `onPointerLeave` on this div handle the transition without
          // a flicker.
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => {
            // Don't collapse while the "Copied" toast is still visible.
            if (copied) return
            setOpen(false)
          }}
        >
          <button
            type="button"
            aria-label="Copy equation to clipboard"
            aria-haspopup="menu"
            aria-expanded={showMenu ? true : false}
            title="Copy equation (LaTeX source)"
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-fg/70 transition-all duration-200 hover:border-fg/40 hover:bg-fg/10 hover:text-fg/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 dark:bg-fg/10 dark:hover:bg-fg/20 ${
              open || copied
                ? 'border-fg/30 bg-fg/10 opacity-100'
                : 'border-transparent bg-transparent opacity-0 group-hover/eq:border-fg/15 group-hover/eq:bg-fg/5 group-hover/eq:opacity-100'
            }`}
          >
            <CopyIcon className="h-3.5 w-3.5" />
          </button>

          {/* The expanding panel. `max-h-0` + `opacity-0` collapsed,
              `max-h-40` + `opacity-100` expanded. The `overflow:hidden`
              + `max-height` transition gives the smooth height-grow
              effect, and the parallel opacity transition gives the
              fade. A pointer-events-none / auto pair ensures the panel
              doesn't intercept clicks while collapsed. */}
          <div
            role="menu"
            aria-label="Copy equation"
            className={`mt-1 flex w-44 flex-col gap-0.5 rounded-lg border border-fg/15 bg-[var(--color-bg,#f6f6f9)] p-1 text-left shadow-lg transition-all duration-200 dark:border-fg/20 ${
              showMenu
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-1 opacity-0'
            }`}
            style={{ overflow: 'hidden' }}
          >
            <MenuItem
              onClick={() => handleCopy('latex')}
              copied={copied === 'latex'}
              label="Copy LaTeX"
              hint="with $$ delimiters"
            />
            <MenuItem
              onClick={() => handleCopy('text')}
              copied={copied === 'text'}
              label="Copy math"
              hint="expression only"
            />
          </div>
        </div>
      )}
    </figure>
  )
}

function MenuItem({
  onClick,
  copied,
  label,
  hint,
}: {
  onClick: () => void
  copied: boolean
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-fg/10 focus:outline-none focus-visible:bg-fg/10"
    >
      <span className="flex items-center gap-1.5">
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5 text-fg/60" />
        )}
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg/85">
          {copied ? 'Copied' : label}
        </span>
      </span>
      <span className="font-mono text-[10px] text-fg/45">{hint}</span>
    </button>
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

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
