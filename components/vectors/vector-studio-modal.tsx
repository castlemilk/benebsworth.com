'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, Download, ExternalLink, Code2, Layers, Sparkles, Sliders } from 'lucide-react'
import type { VectorItem, VectorBatchManifest } from '@/lib/vectors/registry'
import { cn } from '@/lib/utils'

interface VectorStudioModalProps {
  item: VectorItem | null
  batch?: VectorBatchManifest
  onClose: () => void
}

type StageBg = 'dark' | 'blueprint' | 'light' | 'checker' | 'tint'
type OpticalSize = '24' | '64' | '128' | '256' | '512'

export function VectorStudioModal({ item, batch, onClose }: VectorStudioModalProps) {
  const [stageBg, setStageBg] = useState<StageBg>('dark')
  const [opticalSize, setOpticalSize] = useState<OpticalSize>('256')
  const [svgSource, setSvgSource] = useState<string>('')
  const [copiedSvg, setCopiedSvg] = useState(false)
  const [copiedReact, setCopiedReact] = useState(false)
  const [viewTab, setViewTab] = useState<'preview' | 'code' | 'prompt'>('preview')

  useEffect(() => {
    if (!item) return

    const loadSource = async () => {
      try {
        const res = await fetch(item.svgPath)
        if (res.ok) {
          const text = await res.text()
          setSvgSource(text)
        }
      } catch (err) {
        console.error('Failed to load SVG source:', err)
      }
    }
    loadSource()
  }, [item])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!item) return null

  const handleCopySvg = async () => {
    if (!svgSource) return
    await navigator.clipboard.writeText(svgSource)
    setCopiedSvg(true)
    setTimeout(() => setCopiedSvg(false), 2000)
  }

  const handleCopyReact = async () => {
    if (!svgSource) return
    // Convert basic svg to simple react component
    const cleanSvg = svgSource
      .replace(/<\?xml.*?\?>/g, '')
      .replace(/<!DOCTYPE.*?>/g, '')
      .trim()
    const reactSnippet = `export function ${item.name.replace(/[^a-zA-Z0-9]/g, '')}Icon(props: React.SVGProps<SVGSVGElement>) {\n  return (\n    ${cleanSvg.replace('<svg', '<svg {...props}')}\n  );\n}`
    await navigator.clipboard.writeText(reactSnippet)
    setCopiedReact(true)
    setTimeout(() => setCopiedReact(false), 2000)
  }

  const handleDownload = (ext: 'svg' | 'png') => {
    const link = document.createElement('a')
    link.href = ext === 'svg' ? item.svgPath : item.pngPath
    link.download = `${item.filename_stem}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const bgClasses: Record<StageBg, string> = {
    dark: 'bg-[#0a0a0c] border-white/10',
    blueprint: 'bg-[#0d1322] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:14px_14px] border-blue-500/30',
    light: 'bg-[#ffffff] border-black/10',
    checker: 'bg-[#181920] bg-[repeating-conic-gradient(#242531_0%_25%,#181920_0%_50%)] [background-size:16px_16px] border-white/10',
    tint: 'bg-[#0e1622] border-cyan-500/30',
  }

  const sizePixelMap: Record<OpticalSize, string> = {
    '24': 'w-[24px] h-[24px]',
    '64': 'w-[64px] h-[64px]',
    '128': 'w-[128px] h-[128px]',
    '256': 'w-[256px] h-[256px]',
    '512': 'w-[400px] h-[400px] max-w-full',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-xs font-bold"
              style={{
                borderColor: `${item.accentColor}44`,
                backgroundColor: `${item.accentColor}15`,
                color: item.accentColor,
              }}
            >
              {batch?.glyph ?? '◈'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[var(--color-fg)]">
                  {item.name}
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {item.semantic_role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.category} · {item.filename_stem}.svg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewTab('preview')}
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-colors',
                  viewTab === 'preview'
                    ? 'bg-[var(--color-surface)] text-[var(--color-fg)] shadow-sm'
                    : 'text-muted-foreground hover:text-[var(--color-fg)]',
                )}
              >
                Studio Preview
              </button>
              <button
                type="button"
                onClick={() => setViewTab('code')}
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-colors',
                  viewTab === 'code'
                    ? 'bg-[var(--color-surface)] text-[var(--color-fg)] shadow-sm'
                    : 'text-muted-foreground hover:text-[var(--color-fg)]',
                )}
              >
                SVG / JSX
              </button>
              <button
                type="button"
                onClick={() => setViewTab('prompt')}
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-colors',
                  viewTab === 'prompt'
                    ? 'bg-[var(--color-surface)] text-[var(--color-fg)] shadow-sm'
                    : 'text-muted-foreground hover:text-[var(--color-fg)]',
                )}
              >
                Prompt Spec
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-muted-foreground hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* Main Stage Panel */}
          <div className="flex flex-1 flex-col items-center justify-center border-b border-[var(--color-border)] p-6 lg:border-b-0 lg:border-r">
            {viewTab === 'preview' ? (
              <div className="flex w-full flex-col items-center gap-4">
                {/* Visual Stage Container */}
                <div
                  className={cn(
                    'relative flex aspect-[4/3] w-full max-w-xl items-center justify-center overflow-hidden rounded-xl border shadow-inner transition-all duration-300',
                    bgClasses[stageBg],
                  )}
                >
                  {/* Vector Element */}
                  <div
                    className={cn(
                      'flex items-center justify-center transition-all duration-300 drop-shadow-lg',
                      sizePixelMap[opticalSize],
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.svgPath}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* Corner Optical Size Indicator */}
                  <div className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/70 backdrop-blur-sm">
                    {opticalSize} × {opticalSize} px
                  </div>
                </div>

                {/* Stage Controls: Backgrounds & Sizes */}
                <div className="flex flex-wrap items-center justify-between gap-4 w-full max-w-xl text-xs">
                  {/* Background Mode */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">Stage:</span>
                    <div className="flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
                      {(['dark', 'blueprint', 'light', 'checker', 'tint'] as StageBg[]).map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setStageBg(bg)}
                          className={cn(
                            'rounded px-2 py-1 font-mono text-[10px] capitalize transition-colors',
                            stageBg === bg
                              ? 'bg-[var(--color-surface)] text-[var(--color-fg)] font-semibold shadow-xs'
                              : 'text-muted-foreground hover:text-[var(--color-fg)]',
                          )}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optical Scale Mode */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">Scale:</span>
                    <div className="flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
                      {(['24', '64', '128', '256', '512'] as OpticalSize[]).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setOpticalSize(sz)}
                          className={cn(
                            'rounded px-2 py-1 font-mono text-[10px] transition-colors',
                            opticalSize === sz
                              ? 'bg-[var(--color-surface)] text-[var(--color-fg)] font-semibold shadow-xs'
                              : 'text-muted-foreground hover:text-[var(--color-fg)]',
                          )}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : viewTab === 'code' ? (
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    SVG Source Markup ({svgSource.length} bytes)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySvg}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium hover:text-[var(--color-fg)]"
                    >
                      {copiedSvg ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedSvg ? 'Copied' : 'Copy SVG'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyReact}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium hover:text-[var(--color-fg)]"
                    >
                      {copiedReact ? <Check className="h-3 w-3 text-emerald-400" /> : <Code2 className="h-3 w-3" />}
                      <span>{copiedReact ? 'Copied React' : 'Copy JSX'}</span>
                    </button>
                  </div>
                </div>
                <pre className="max-h-[380px] w-full overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0c0d12] p-4 font-mono text-xs leading-relaxed text-zinc-300">
                  {svgSource || 'Loading SVG source...'}
                </pre>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-4">
                <div>
                  <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Canonical Generation Prompt
                  </h4>
                  <p className="mt-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm leading-relaxed text-[var(--color-fg)]">
                    &ldquo;{item.generation_prompt}&rdquo;
                  </p>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Batch Consistency Rules
                  </h4>
                  <ul className="mt-1.5 flex flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs leading-relaxed text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Coherent futuristic tech aesthetic: glowing cyan, electric violet, and deep indigo accents on transparent background.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Clean geometric strokes with consistent optical weight and softly rounded stroke terminals.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Bold, crisp, and legible at 24px and 256px without any text or labels.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Details & Actions */}
          <div className="flex w-full flex-col justify-between p-6 lg:w-80 lg:min-w-[320px]">
            <div className="flex flex-col gap-5">
              {/* Description */}
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-fg)]">
                  {item.description}
                </p>
              </div>

              {/* Vector Specification */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium text-[var(--color-fg)]">{item.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semantic Role:</span>
                  <span className="font-mono text-[11px] text-[var(--color-fg)]">{item.semantic_role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grid Index:</span>
                  <span className="font-mono text-[11px] text-[var(--color-fg)]">#{item.grid_index + 1} of 5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formats:</span>
                  <span className="font-mono text-[11px] text-emerald-400">SVG (Vector) · PNG (512px)</span>
                </div>
              </div>

              {/* Provenance */}
              <div className="flex flex-col gap-2">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  BrandBrain Flow Provenance
                </h3>
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Engine:</span>
                    <span className="font-mono text-[11px] text-[var(--color-fg)]">BrandBrain Icon-Set v1</span>
                  </div>
                  {batch?.sessionId && (
                    <div className="flex items-center justify-between">
                      <span>Session:</span>
                      <span className="font-mono text-[10px] text-[var(--color-fg)]">
                        {batch.sessionId.slice(0, 16)}...
                      </span>
                    </div>
                  )}
                  {batch?.canvasUrl && (
                    <a
                      href={batch.canvasUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:underline"
                    >
                      <span>Open in BrandBrain Canvas</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopySvg}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-fg)] py-2.5 text-sm font-semibold text-[var(--color-bg)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {copiedSvg ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copiedSvg ? 'SVG Copied to Clipboard!' : 'Copy SVG Code'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload('svg')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-medium hover:bg-[var(--color-surface-2)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download SVG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('png')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-medium hover:bg-[var(--color-surface-2)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
