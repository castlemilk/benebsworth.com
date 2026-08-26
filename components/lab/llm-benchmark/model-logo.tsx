import type { BenchmarkModel } from '@/lib/lab/llm-benchmark/types'

type LogoKey =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'moonshot'
  | 'nvidia'
  | 'alibaba'
  | 'cohere'
  | 'poolside'
  | 'inclusionai'
  | 'deepseek'
  | 'ollama'
  | 'chirpchirp'
  | 'generic'

interface LogoDef {
  key: LogoKey
  label: string
  bg: string
  fg: string
  border: string
  accent: string
  src?: string
}

const LOGOS: Record<LogoKey, LogoDef> = {
  anthropic: {
    key: 'anthropic',
    label: 'Anthropic',
    bg: '#ffffff',
    fg: '#191919',
    border: '#e5e7eb',
    accent: '#d97757',
    src: '/logos/anthropic.svg',
  },
  openai: {
    key: 'openai',
    label: 'OpenAI',
    bg: '#ffffff',
    fg: '#000000',
    border: '#e5e7eb',
    accent: '#10a37f',
    src: '/logos/openai.svg',
  },
  google: {
    key: 'google',
    label: 'Google',
    bg: '#ffffff',
    fg: '#4285F4',
    border: '#e5e7eb',
    accent: '#4285f4',
    src: '/logos/google.svg',
  },
  moonshot: {
    key: 'moonshot',
    label: 'Moonshot',
    bg: '#ffffff',
    fg: '#000000',
    border: '#e5e7eb',
    accent: '#38bdf8',
    src: '/logos/moonshot.png',
  },
  nvidia: {
    key: 'nvidia',
    label: 'NVIDIA',
    bg: '#ffffff',
    fg: '#76B900',
    border: '#e5e7eb',
    accent: '#76b900',
    src: '/logos/nvidia.svg',
  },
  alibaba: {
    key: 'alibaba',
    label: 'Alibaba',
    bg: '#ffffff',
    fg: '#FF6A00',
    border: '#e5e7eb',
    accent: '#ff6a00',
    src: '/logos/alibabacloud.svg',
  },
  cohere: {
    key: 'cohere',
    label: 'Cohere',
    bg: '#ffffff',
    fg: '#39594e',
    border: '#e5e7eb',
    accent: '#39594e',
    src: '/logos/cohere.png',
  },
  poolside: {
    key: 'poolside',
    label: 'Poolside',
    bg: '#ffffff',
    fg: '#6366f1',
    border: '#e5e7eb',
    accent: '#6366f1',
    src: '/logos/poolside.png',
  },
  inclusionai: {
    key: 'inclusionai',
    label: 'InclusionAI',
    bg: '#ffffff',
    fg: '#ff7e00',
    border: '#e5e7eb',
    accent: '#ff7e00',
    src: '/logos/inclusion.png',
  },
  deepseek: {
    key: 'deepseek',
    label: 'DeepSeek',
    bg: '#ffffff',
    fg: '#4d6bfe',
    border: '#e5e7eb',
    accent: '#4d6bfe',
    src: '/logos/deepseek.svg',
  },
  ollama: {
    key: 'ollama',
    label: 'Ollama',
    bg: '#ffffff',
    fg: '#000000',
    border: '#e5e7eb',
    accent: '#000000',
    src: '/logos/ollama.svg',
  },
  chirpchirp: {
    key: 'chirpchirp',
    label: 'Ornith',
    bg: '#ffffff',
    fg: '#f43f5e',
    border: '#e5e7eb',
    accent: '#f43f5e',
    src: '/logos/ornith.png',
  },
  generic: {
    key: 'generic',
    label: '•',
    bg: '#7c5cff',
    fg: '#fff',
    border: '#a78bfa',
    accent: '#7c5cff',
  },
}

// Company/provider → logo key
const COMPANY_MAP: Record<string, LogoKey> = {
  Anthropic: 'anthropic',
  OpenAI: 'openai',
  Google: 'google',
  'Moonshot AI': 'moonshot',
  NVIDIA: 'nvidia',
  Alibaba: 'alibaba',
  Cohere: 'cohere',
  Poolside: 'poolside',
  inclusionAI: 'inclusionai',
  DeepSeek: 'deepseek',
  ChirpChirp: 'chirpchirp',
  Ollama: 'ollama',
}

const PROVIDER_MAP: Record<string, LogoKey> = {
  Anthropic: 'anthropic',
  OpenAI: 'openai',
  Google: 'google',
  'Moonshot AI': 'moonshot',
  OpenRouter: 'generic',
  Agy: 'generic',
  Codex: 'openai',
  OpenCode: 'deepseek',
  Ollama: 'ollama',
}

function resolveLogoKey(model: BenchmarkModel): LogoKey {
  if (model.company && COMPANY_MAP[model.company]) return COMPANY_MAP[model.company]
  if (model.provider && PROVIDER_MAP[model.provider]) {
    if (model.provider === 'OpenRouter' && model.company) {
      return COMPANY_MAP[model.company] ?? 'generic'
    }
    if (model.provider === 'Agy' && model.company) {
      return COMPANY_MAP[model.company] ?? 'generic'
    }
    return PROVIDER_MAP[model.provider]
  }
  if (model.family?.startsWith('Nemotron')) return 'nvidia'
  if (model.family?.startsWith('Laguna')) return 'poolside'
  if (model.family?.startsWith('Gemma')) return 'google'
  if (model.family?.startsWith('Qwen')) return 'alibaba'
  if (model.family?.startsWith('Ornith')) return 'chirpchirp'
  if (model.family?.startsWith('Ling')) return 'inclusionai'
  if (model.family?.startsWith('North')) return 'cohere'
  if (model.family?.startsWith('GPT-OSS') || model.family?.startsWith('GPT')) return 'openai'
  return 'generic'
}

export function getModelLogo(model: BenchmarkModel): LogoDef {
  return LOGOS[resolveLogoKey(model)]
}

// Fallback generic mark for unknown
function GenericMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path d="M12 3l2.5 5.5H20l-4.5 3.5 1.7 5.5L12 14l-5.2 3.5 1.7-5.5L4 8.5h5.5L12 3z" fill="currentColor" />
    </svg>
  )
}

function LogoImg({ src, alt, size }: { src: string; alt: string; size: number }) {
  // Use <img> for real fetched logos (public/logos/*) — Next.js will serve from /logos/
  // For SVG, object-contain ensures 16px favicons scale cleanly to 18-20px
  const isPng = src.endsWith('.png')
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{
        width: isPng ? size - 4 : size,
        height: isPng ? size - 4 : size,
        objectFit: 'contain',
        imageRendering: isPng ? ('-webkit-optimize-contrast' as const) : undefined,
      }}
      loading="lazy"
      decoding="async"
    />
  )
}

export function ModelLogo({
  model,
  size = 36,
  showBorder = true,
  className,
}: {
  model: BenchmarkModel
  size?: number
  showBorder?: boolean
  className?: string
}) {
  const def = getModelLogo(model)

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-xl ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: def.bg,
        borderColor: showBorder ? def.border : 'transparent',
        borderWidth: showBorder ? 1 : 0,
        boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 4px 12px color-mix(in srgb, ${def.accent} 18%, transparent)`,
      }}
      aria-hidden
      title={`${def.label} — ${model.company ?? model.provider}`}
    >
      {def.src ? (
        <LogoImg src={def.src} alt={def.label} size={size >= 36 ? 20 : 16} />
      ) : (
        <GenericMark className={size >= 36 ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
      )}
      {model.provider === 'Ollama' && def.key !== 'ollama' && (
        <span
          className="absolute -bottom-1 -right-1 flex h-[14px] w-[14px] items-center justify-center rounded-full border bg-white text-[8px] font-bold leading-none shadow-sm"
          style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#111' }}
          aria-hidden
        >
          ◐
        </span>
      )}
    </span>
  )
}

export function ModelLogoBadge({
  model,
  size = 40,
}: {
  model: BenchmarkModel
  size?: number
}) {
  const def = getModelLogo(model)

  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-xl border bg-white"
      style={{
        width: size,
        height: size,
        backgroundColor: def.bg,
        borderColor: def.border,
        boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 6px 18px color-mix(in srgb, ${def.accent} 14%, transparent)`,
      }}
      aria-hidden
      title={`${def.label} — ${model.company ?? model.provider}`}
    >
      {def.src ? (
        <LogoImg src={def.src} alt={def.label} size={size >= 40 ? 22 : size >= 36 ? 18 : 16} />
      ) : (
        <GenericMark className={size >= 40 ? 'h-[20px] w-[20px]' : size >= 36 ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
      )}
      {model.provider === 'Ollama' && def.key !== 'ollama' && (
        <span
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white text-[9px] shadow-sm"
          style={{ borderColor: 'white' }}
          aria-hidden
        >
          <span className="text-[8px]">◐</span>
        </span>
      )}
    </span>
  )
}
