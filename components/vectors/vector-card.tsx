'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Copy, Check, Eye, Download, Sparkles } from 'lucide-react'
import type { VectorItem } from '@/lib/vectors/registry'
import { cn } from '@/lib/utils'

interface VectorCardProps {
  item: VectorItem
  previewBg: 'dark' | 'blueprint' | 'light' | 'checker' | 'tint'
  scaleSize: 'sm' | 'md' | 'lg'
  onInspect: (item: VectorItem) => void
}

export function VectorCard({ item, previewBg, scaleSize, onInspect }: VectorCardProps) {
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleCopySvg = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(item.svgPath)
      if (!res.ok) throw new Error('Failed to fetch SVG')
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: copy path
      await navigator.clipboard.writeText(item.svgPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = (e: React.MouseEvent, ext: 'svg' | 'png') => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = ext === 'svg' ? item.svgPath : item.pngPath
    link.download = `${item.filename_stem}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const bgClasses = {
    dark: 'bg-[#0e0f14] border-white/5',
    blueprint: 'bg-[#0d121f] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] border-blue-500/20',
    light: 'bg-[#ffffff] border-black/10',
    checker: 'bg-[#181920] bg-[repeating-conic-gradient(#22232d_0%_25%,#181920_0%_50%)] [background-size:16px_16px] border-white/10',
    tint: 'bg-[#0f141c] border-current/20',
  }[previewBg]

  const iconSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
  }[scaleSize]

  return (
    <div
      onClick={() => onInspect(item)}
      className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-border)] hover:shadow-xl hover:shadow-[var(--color-surface-2)]/50"
      style={{
        // @ts-expect-error custom css variable for dynamic accent
        '--card-accent': item.accentColor,
      }}
    >
      {/* Top Bar: Role badge & Quick Actions */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          style={{ color: item.accentColor, borderColor: `${item.accentColor}33` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.accentColor }} />
          {item.semantic_role}
        </span>

        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCopySvg}
            title="Copy SVG Code"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-muted-foreground transition-colors hover:border-[var(--color-fg)] hover:text-[var(--color-fg)]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => handleDownload(e, 'svg')}
            title="Download SVG"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-muted-foreground transition-colors hover:border-[var(--color-fg)] hover:text-[var(--color-fg)]"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Vector Stage */}
      <div
        className={cn(
          'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border transition-all duration-300',
          bgClasses,
        )}
      >
        {/* Subtle radial aura */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15 transition-opacity duration-300 group-hover:opacity-35"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${item.accentColor} 0%, transparent 70%)`,
          }}
        />

        {/* Vector Image */}
        <div className={cn('relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105', iconSizes)}>
          {!imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.svgPath}
              alt={item.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-contain drop-shadow-md"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
              <Sparkles className="mb-1 h-6 w-6 opacity-40" />
              <span>Generating...</span>
            </div>
          )}
        </div>

        {/* Quick View Pill on Hover */}
        <div className="absolute bottom-2 flex translate-y-2 items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <Eye className="h-3 w-3" />
          <span>Inspect Vector</span>
        </div>
      </div>

      {/* Item Footer */}
      <div className="mt-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-tight text-[var(--color-fg)]">
            {item.name}
          </h3>
          <span className="font-mono text-[10px] text-muted-foreground">
            #{item.grid_index + 1}
          </span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>
    </div>
  )
}
