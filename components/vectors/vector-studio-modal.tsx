'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X, Copy, Check, Download, ExternalLink, Code2 } from 'lucide-react'
import type { VectorItem, VectorBatchManifest } from '@/lib/vectors/registry'
import { STAGE_CLASSES, type CopyState, type StageBg } from '@/components/vectors/vector-card'
import { cn } from '@/lib/utils'

interface VectorStudioModalProps {
  item: VectorItem | null
  batch?: VectorBatchManifest
  onClose: () => void
}

type OpticalSize = '24' | '64' | '128' | '256' | '512'
type ViewTab = 'preview' | 'code' | 'prompt'
type SourceState = { status: 'loading' } | { status: 'ready'; text: string } | { status: 'failed' }

const SIZE_CLASSES: Record<OpticalSize, string> = {
  '24': 'h-6 w-6',
  '64': 'h-16 w-16',
  '128': 'h-32 w-32',
  '256': 'h-64 w-64',
  '512': 'h-[400px] w-[400px] max-w-full',
}

const TABS: { key: ViewTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'code', label: 'SVG / JSX' },
  { key: 'prompt', label: 'Prompt' },
]

const BATCH_RULES = [
  'Coherent futuristic tech aesthetic: glowing cyan, electric violet, and deep indigo accents on transparent background.',
  'Clean geometric strokes with consistent optical weight and softly rounded stroke terminals.',
  'Bold, crisp, and legible at 24px and 256px without any text or labels.',
]

const COPY_LABEL: Record<CopyState, { svg: string; jsx: string }> = {
  idle: { svg: 'Copy SVG', jsx: 'Copy JSX' },
  copied: { svg: 'SVG copied', jsx: 'JSX copied' },
  failed: { svg: 'Copy failed', jsx: 'Copy failed' },
}

/** Wrap the fetched markup as a typed React component; the geometry is untouched. */
export function reactSnippet(name: string, svgSource: string): string {
  const cleanSvg = svgSource.replace(/<\?xml.*?\?>/g, '').replace(/<!DOCTYPE.*?>/g, '').trim()
  return `export function ${name.replace(/[^a-zA-Z0-9]/g, '')}Icon(props: React.SVGProps<SVGSVGElement>) {\n  return (\n    ${cleanSvg.replace('<svg', '<svg {...props}')}\n  );\n}`
}

const segment = (active: boolean) =>
  cn(
    'min-h-9 rounded px-2.5 text-xs transition-colors',
    active ? 'bg-[var(--color-fg)] font-medium text-[var(--color-bg)]' : 'text-muted-foreground hover:text-[var(--color-fg)]',
  )
const quietButton =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Inspect one mark in a native modal dialog: the top layer contains focus,
 * Escape and the backdrop close it, and focus returns to the card that opened
 * it. Copy reports what actually happened; a source that failed to load says
 * so instead of leaving a loader or a disabled-looking success.
 */
export function VectorStudioModal({ item, batch, onClose }: VectorStudioModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [stageBg, setStageBg] = useState<StageBg>('dark')
  const [opticalSize, setOpticalSize] = useState<OpticalSize>('256')
  const [viewTab, setViewTab] = useState<ViewTab>('preview')
  const [source, setSource] = useState<SourceState>({ status: 'loading' })
  const [copy, setCopy] = useState<{ svg: CopyState; jsx: CopyState }>({ svg: 'idle', jsx: 'idle' })
  const timers = useRef<{ svg?: number; jsx?: number }>({})

  // Open and close the native dialog with the inspected item, locking page scroll while open.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !item) return
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      if (dialog.open) dialog.close()
    }
  }, [item])

  // Load the markup for the code tab and copy actions; report failure honestly.
  useEffect(() => {
    if (!item) return
    let cancelled = false
    setSource({ status: 'loading' })
    setViewTab('preview')
    setCopy({ svg: 'idle', jsx: 'idle' })
    fetch(item.svgPath)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setSource({ status: 'ready', text })
      })
      .catch(() => {
        if (!cancelled) setSource({ status: 'failed' })
      })
    return () => {
      cancelled = true
    }
  }, [item])

  useEffect(() => {
    const pending = timers.current
    return () => {
      window.clearTimeout(pending.svg)
      window.clearTimeout(pending.jsx)
    }
  }, [])

  const copyText = async (kind: 'svg' | 'jsx', text: string) => {
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      ok = false
    }
    setCopy((current) => ({ ...current, [kind]: ok ? 'copied' : 'failed' }))
    window.clearTimeout(timers.current[kind])
    timers.current[kind] = window.setTimeout(() => setCopy((current) => ({ ...current, [kind]: 'idle' })), 2500)
  }

  const svgText = source.status === 'ready' ? source.text : null
  const close = () => dialogRef.current?.close()

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) close()
      }}
      className="m-auto max-h-[92vh] w-[min(100%-2rem,64rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-0 text-[var(--color-fg)] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      {item && (
        <div className="flex max-h-[92vh] min-h-0 flex-col" data-vector-studio>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-semibold">
                {item.name}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.category} · {item.semantic_role} · {item.filename_stem}.svg
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="View" className="flex rounded-md border border-[var(--color-border)] p-0.5">
                {TABS.map((tab) => (
                  <button key={tab.key} type="button" aria-pressed={viewTab === tab.key} onClick={() => setViewTab(tab.key)} className={segment(viewTab === tab.key)}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] text-muted-foreground hover:border-[var(--color-fg)] hover:text-[var(--color-fg)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
            <div className="flex flex-1 flex-col items-center justify-center border-b border-[var(--color-border)] p-5 sm:p-6 lg:border-r lg:border-b-0">
              {viewTab === 'preview' && (
                <div className="flex w-full max-w-xl flex-col items-center gap-4">
                  <div className={cn('relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border', STAGE_CLASSES[stageBg])}>
                    <div className={cn('flex items-center justify-center', SIZE_CLASSES[opticalSize])}>
                      <img src={item.svgPath} alt={item.description} className="h-full w-full object-contain" />
                    </div>
                    <p className="absolute right-3 bottom-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/80">
                      {opticalSize} × {opticalSize} px
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs">
                    <div role="group" aria-label="Matte" className="flex items-center gap-2">
                      <span className="text-muted-foreground">Matte</span>
                      <div className="flex rounded-md border border-[var(--color-border)] p-0.5">
                        {(['dark', 'blueprint', 'light', 'checker', 'tint'] as StageBg[]).map((bg) => (
                          <button key={bg} type="button" aria-pressed={stageBg === bg} onClick={() => setStageBg(bg)} className={cn(segment(stageBg === bg), 'capitalize')}>
                            {bg}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div role="group" aria-label="Scale" className="flex items-center gap-2">
                      <span className="text-muted-foreground">Scale</span>
                      <div className="flex rounded-md border border-[var(--color-border)] p-0.5">
                        {(['24', '64', '128', '256', '512'] as OpticalSize[]).map((size) => (
                          <button key={size} type="button" aria-pressed={opticalSize === size} onClick={() => setOpticalSize(size)} className={segment(opticalSize === size)}>
                            {size}px
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewTab === 'code' && (
                <div className="flex w-full flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {source.status === 'ready' ? `SVG source (${source.text.length.toLocaleString('en-AU')} bytes)` : source.status === 'loading' ? 'Loading SVG source…' : 'SVG source unavailable'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={!svgText} onClick={() => svgText && copyText('svg', svgText)} className={quietButton}>
                        {copy.svg === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        {COPY_LABEL[copy.svg].svg}
                      </button>
                      <button type="button" disabled={!svgText} onClick={() => svgText && copyText('jsx', reactSnippet(item.name, svgText))} className={quietButton}>
                        {copy.jsx === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Code2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        {COPY_LABEL[copy.jsx].jsx}
                      </button>
                    </div>
                  </div>
                  <pre className="max-h-[380px] w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[#0c0d12] p-4 font-mono text-xs leading-relaxed text-zinc-300">
                    {source.status === 'ready' ? source.text : source.status === 'loading' ? 'Loading SVG source…' : `The SVG at ${item.svgPath} could not be loaded.`}
                  </pre>
                </div>
              )}

              {viewTab === 'prompt' && (
                <div className="flex w-full flex-col gap-5 text-sm">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground">Generation prompt</h3>
                    <p className="mt-1.5 leading-relaxed">&ldquo;{item.generation_prompt}&rdquo;</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground">Batch consistency rules</h3>
                    <ul className="mt-1.5 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
                      {BATCH_RULES.map((rule) => <li key={rule}>{rule}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex w-full flex-col justify-between gap-6 p-5 sm:p-6 lg:w-80 lg:min-w-[20rem]">
              <div className="flex flex-col gap-5 text-sm">
                <p className="leading-relaxed">{item.description}</p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-[var(--color-border)] pt-4 text-xs">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{item.category}</dd>
                  <dt className="text-muted-foreground">Semantic role</dt>
                  <dd className="font-mono">{item.semantic_role}</dd>
                  <dt className="text-muted-foreground">Grid index</dt>
                  <dd className="font-mono">#{item.grid_index + 1} of {batch?.items.length ?? '—'}</dd>
                  <dt className="text-muted-foreground">Formats</dt>
                  <dd className="font-mono">SVG · PNG (512px)</dd>
                  <dt className="text-muted-foreground">Engine</dt>
                  <dd>BrandBrain icon-set flow</dd>
                  {batch?.sessionId && (
                    <>
                      <dt className="text-muted-foreground">Session</dt>
                      <dd className="truncate font-mono" title={batch.sessionId}>{batch.sessionId}</dd>
                    </>
                  )}
                </dl>
                {batch?.canvasUrl && (
                  <a href={batch.canvasUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-xs underline underline-offset-4">
                    Open in BrandBrain Canvas <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!svgText}
                  onClick={() => svgText && copyText('svg', svgText)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-fg)] px-4 text-sm font-medium text-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.svg === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {source.status === 'failed' ? 'SVG source unavailable' : COPY_LABEL[copy.svg].svg}
                </button>
                <div className="flex gap-2">
                  <a href={item.svgPath} download={`${item.filename_stem}.svg`} className={cn(quietButton, 'flex-1')}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download SVG
                  </a>
                  <a href={item.pngPath} download={`${item.filename_stem}.png`} className={cn(quietButton, 'flex-1')}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download PNG
                  </a>
                </div>
                <p role="status" aria-live="polite" className="h-4 text-xs text-muted-foreground">
                  {copy.svg === 'failed' || copy.jsx === 'failed' ? 'Copy failed — download the file instead.' : copy.svg === 'copied' ? 'SVG copied to clipboard.' : copy.jsx === 'copied' ? 'React component copied to clipboard.' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
