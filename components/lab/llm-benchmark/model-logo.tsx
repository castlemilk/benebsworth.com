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
}

const LOGOS: Record<LogoKey, LogoDef> = {
  anthropic: {
    key: 'anthropic',
    label: 'A',
    bg: '#d97757',
    fg: '#fff',
    border: '#e8a090',
    accent: '#d97757',
  },
  openai: {
    key: 'openai',
    label: 'OAI',
    bg: '#0a0a0a',
    fg: '#10a37f',
    border: '#2a2a2a',
    accent: '#10a37f',
  },
  google: {
    key: 'google',
    label: 'G',
    bg: '#4285f4',
    fg: '#fff',
    border: '#6ea0ff',
    accent: '#4285f4',
  },
  moonshot: {
    key: 'moonshot',
    label: 'K',
    bg: '#0f172a',
    fg: '#38bdf8',
    border: '#1e3a5a',
    accent: '#38bdf8',
  },
  nvidia: {
    key: 'nvidia',
    label: 'NV',
    bg: '#76b900',
    fg: '#fff',
    border: '#a3d900',
    accent: '#76b900',
  },
  alibaba: {
    key: 'alibaba',
    label: 'Q',
    bg: '#ff6a00',
    fg: '#fff',
    border: '#ff8c33',
    accent: '#ff6a00',
  },
  cohere: {
    key: 'cohere',
    label: 'C',
    bg: '#39594e',
    fg: '#d8f3dc',
    border: '#4a7568',
    accent: '#39594e',
  },
  poolside: {
    key: 'poolside',
    label: 'P',
    bg: '#6366f1',
    fg: '#fff',
    border: '#818cf8',
    accent: '#6366f1',
  },
  inclusionai: {
    key: 'inclusionai',
    label: 'L',
    bg: '#1a1a1a',
    fg: '#ff7e00',
    border: '#333',
    accent: '#ff7e00',
  },
  deepseek: {
    key: 'deepseek',
    label: 'DS',
    bg: '#4d6bfe',
    fg: '#fff',
    border: '#7a8cff',
    accent: '#4d6bfe',
  },
  ollama: {
    key: 'ollama',
    label: '🦙',
    bg: '#fff',
    fg: '#000',
    border: '#e5e7eb',
    accent: '#000',
  },
  chirpchirp: {
    key: 'chirpchirp',
    label: 'O',
    bg: '#f43f5e',
    fg: '#fff',
    border: '#fb7185',
    accent: '#f43f5e',
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
  OpenRouter: 'generic', // will fallback to company if present
  Agy: 'generic',
  Codex: 'openai',
  OpenCode: 'deepseek',
  Ollama: 'ollama',
}

function resolveLogoKey(model: BenchmarkModel): LogoKey {
  // Prefer company (vendor) over provider — for OpenRouter/Agy/Ollama we want the actual lab
  if (model.company && COMPANY_MAP[model.company]) return COMPANY_MAP[model.company]
  if (model.provider && PROVIDER_MAP[model.provider]) {
    // For OpenRouter/Agy, if we have a company fallback to generic would hide it — try company again
    if (model.provider === 'OpenRouter' && model.company) {
      return COMPANY_MAP[model.company] ?? 'generic'
    }
    if (model.provider === 'Agy' && model.company) {
      return COMPANY_MAP[model.company] ?? 'generic'
    }
    return PROVIDER_MAP[model.provider]
  }
  // Family fallback (e.g. Nemotron without company, Laguna via family)
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

// --- Inline SVG marks (24x24) — clean at small sizes ---

function AnthropicMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path
        d="M12 3L3 20h18L12 3z M12 8l-4 8h8l-4-8z"
        fill="currentColor"
        opacity={0.95}
      />
      <circle cx={12} cy={15} r={1.5} fill="white" opacity={0.9} />
    </svg>
  )
}

function OpenAIMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path
        d="M12 2.5L19.5 7v10L12 21.5 4.5 17V7L12 2.5z M12 2.5L4.5 7 12 11.5 19.5 7 12 2.5z M4.5 7v10L12 21.5V11.5 L4.5 7z M19.5 7L12 11.5V21.5L19.5 17V7z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={11.5} r={1.8} fill="currentColor" />
    </svg>
  )
}

function GoogleMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path
        d="M12 5.5c1.9 0 3.6.7 4.9 1.8l2.1-2.1C17.5 3.7 15 2.8 12 2.8 7.3 2.8 3.2 5.5 1.4 9.4l2.5 1.9C4.7 8.2 7.9 5.5 12 5.5z"
        fill="#EA4335"
      />
      <path
        d="M21.1 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.1c-.2 1.2-.9 2.2-1.9 2.9l2.5 1.9c1.5-1.4 2.4-3.4 2.4-5.8v-.8z"
        fill="#4285F4"
      />
      <path
        d="M3.9 11.3C3.7 10.6 3.6 9.9 3.6 9.1s.1-1.5.3-2.2L1.4 4.9C.5 6.7 0 8.8 0 11s.5 4.3 1.4 6.1l2.5-1.9c-.2-.7-.3-1.4-.3-2.2 0-.7.1-1.4.3-1.9z"
        fill="#FBBC05"
      />
      <path
        d="M12 21.2c3 0 5.5-1 7.3-2.7l-2.5-1.9c-.7.5-1.6.9-2.5 1.1-.9.2-1.8.1-2.6-.2-1.3-.5-2.4-1.5-3.1-2.8L3.9 17c1.8 3.9 5.9 6.6 10.6 6.6 1 0 2-.1 2.9-.4l-1.5-1.2c-.6.2-1.2.3-1.9.3-2.1 0-3.9-1.4-4.5-3.3l-2.5 1.9c.8 1.9 2.4 3.4 4.4 4.1z"
        fill="#34A853"
      />
    </svg>
  )
}

function GoogleSimpleMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="currentColor">
      <path d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l2.5 1.9C19.2 17.2 20 14.8 20 12.2c0-.7-.1-1.3-.2-1.9H12z M3.9 11.3c-.2.7-.3 1.4-.3 2.2s.1 1.5.3 2.2L1.4 17.8C.5 16 0 13.7 0 11.1s.5-4.9 1.4-6.7l2.5 1.9c-.2.7-.3 1.4-.3 2.2z" />
      <path d="M12 5.5c1.9 0 3.6.7 4.9 1.8l2.1-2.1C19.0 3.2 15 2.8 12 2.8 7.3 2.8 3.2 5.5 1.4 9.4l2.5 1.9C4.7 8.2 7.9 5.5 12 5.5z" opacity={0.9} />
    </svg>
  )
}

function MoonshotMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path
        d="M14.5 3a9 9 0 1 0 5 16.5A9 9 0 0 0 14.5 3z"
        fill="currentColor"
        opacity={0.95}
      />
      <circle cx={15.5} cy={9} r={1.2} fill="white" opacity={0.5} />
      <circle cx={17} cy={12.5} r={0.8} fill="white" opacity={0.35} />
      <path d="M8 14c1.5 1.2 3.5 1.8 5.5 1.2" stroke="white" strokeWidth={1} strokeLinecap="round" opacity={0.5} />
    </svg>
  )
}

function NvidiaMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path
        d="M2 12c4-4 8-6 10-6s6 2 10 6c-4 4-8 6-10 6S6 16 2 12z"
        fill="currentColor"
      />
      <circle cx={12} cy={12} r={3.2} fill="white" />
      <circle cx={12} cy={12} r={1.4} fill="currentColor" />
    </svg>
  )
}

function AlibabaMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path
        d="M4 12c0-3.5 2.5-6 8-6s8 2.5 8 6-2.5 6-8 6-8-2.5-8-6z M12 6c-3 0-5 1.5-5 4s2 4 5 4 5-1.5 5-4-2-4-5-4z"
        fill="currentColor"
      />
      <text x={12} y={14.5} textAnchor="middle" fontSize={8} fontWeight={800} fill="white" fontFamily="sans-serif">
        Q
      </text>
    </svg>
  )
}

function CohereMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z M12 6c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6z" fill="currentColor" opacity={0.9} />
      <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" fill="currentColor" />
    </svg>
  )
}

function PoolsideMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path d="M3 12c2-3 5-5 9-5s7 2 9 5-5 5-9 5-7-2-9-5z" fill="currentColor" opacity={0.9} />
      <path d="M7 12c2 1.5 4 2 5 0s3-1.5 5 0" stroke="white" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  )
}

function InclusionMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <rect x={5} y={5} width={14} height={14} rx={3} fill="currentColor" />
      <path d="M8 12h8M12 8v8" stroke="white" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function DeepSeekMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path d="M12 3L5 8v8l7 5 7-5V8L12 3z" fill="currentColor" />
      <path d="M12 8v8M8 10l4 3 4-3" stroke="white" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OllamaMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.1} />
      <path
        d="M9 9c0-1.5 1.3-3 3-3s3 1.5 3 3c0 3-3 6-3 6s-3-3-3-6z M9 9c-1 0-2 .5-2 1.5S8 12 9 12 M15 9c1 0 2 .5 2 1.5S16 12 15 12 M10 11.5c0 .3.4.5.8.5 M13.2 11.5c0 .3.4.5.8.5"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function ChirpMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path
        d="M12 4c-3 0-6 2-6 5 0 2 1 3 2 4l-1 5 5-3c3 0 6-2 6-5s-3-5-6-5z"
        fill="currentColor"
      />
      <circle cx={12} cy={9} r={1.4} fill="white" />
      <path d="M15 12c.8-.3 1.5-.2 2 .3" stroke="white" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
    </svg>
  )
}

function GenericMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden fill="none">
      <path d="M12 3l2.5 5.5H20l-4.5 3.5 1.7 5.5L12 14l-5.2 3.5 1.7-5.5L4 8.5h5.5L12 3z" fill="currentColor" />
    </svg>
  )
}

const MARK_MAP: Record<LogoKey, React.ComponentType<{ className?: string }>> = {
  anthropic: AnthropicMark,
  openai: OpenAIMark,
  google: GoogleSimpleMark,
  moonshot: MoonshotMark,
  nvidia: NvidiaMark,
  alibaba: AlibabaMark,
  cohere: CohereMark,
  poolside: PoolsideMark,
  inclusionai: InclusionMark,
  deepseek: DeepSeekMark,
  ollama: OllamaMark,
  chirpchirp: ChirpMark,
  generic: GenericMark,
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
  const Mark = MARK_MAP[def.key] ?? GenericMark

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-xl ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: def.bg,
        color: def.fg,
        borderColor: showBorder ? def.border : 'transparent',
        borderWidth: showBorder ? 1 : 0,
        boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 4px 12px color-mix(in srgb, ${def.accent} 18%, transparent)`,
      }}
      aria-hidden
      title={`${def.label} — ${model.company ?? model.provider}`}
    >
      <Mark className={size >= 36 ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
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
  const Mark = MARK_MAP[def.key] ?? GenericMark

  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-xl border"
      style={{
        width: size,
        height: size,
        backgroundColor: def.bg,
        color: def.fg,
        borderColor: def.border,
        boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 6px 18px color-mix(in srgb, ${def.accent} 14%, transparent)`,
      }}
      aria-hidden
    >
      <Mark className={size >= 40 ? 'h-[20px] w-[20px]' : size >= 36 ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
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
