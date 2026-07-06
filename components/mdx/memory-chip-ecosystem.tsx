'use client'

import {
  BarChart3,
  Expand,
  Filter,
  Focus,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Route,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import {
  calcAiMemoryFootprint,
  calcBandwidth,
  dramChargeAt,
  normalizeShare,
  type AiMemoryInput,
} from '@/lib/memory-chip-ecosystem'
import {
  MEMORY_CHIP_GRAPH,
  buildSankeyFlows,
  findTraversalPath,
  type GraphConfidence,
  type GraphEdge,
  type GraphMetric,
  type GraphNodeType,
  type GraphSource,
} from '@/lib/memory-chip-knowledge-graph'

const TEAL = 'var(--color-blog)'
const PURPLE = '#7c5cff'
const ORANGE = '#ff7a59'
const AMBER = '#f5a623'
const GREEN = '#34d399'
const BLUE = '#60a5fa'
const RED = '#f87171'

const fmt = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })

function FigureShell({
  title,
  eyebrow,
  children,
  wide = false,
}: {
  title: string
  eyebrow: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <figure
      className={`not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface ${
        wide
          ? 'relative ml-[-1.5rem] w-screen max-w-none rounded-none border-x-0 sm:ml-[-2rem] sm:rounded-2xl sm:border-x lg:ml-[calc((min(100vw,72rem)-100vw)/2-2rem)]'
          : ''
      }`}
    >
      <div className="border-b border-[var(--color-border)] bg-surface-2/45 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-blog">{eyebrow}</div>
        <div className="mt-1 font-display text-lg font-semibold leading-tight tracking-[-0.015em] text-fg">
          {title}
        </div>
      </div>
      {children}
    </figure>
  )
}

type Tier = {
  name: string
  role: string
  latencyNs: number
  bandwidthGbps: number
  capacityGb: number
  color: string
}

const TIERS: Tier[] = [
  { name: 'SRAM', role: 'registers and cache', latencyNs: 1, bandwidthGbps: 20000, capacityGb: 0.05, color: PURPLE },
  { name: 'HBM', role: 'accelerator working set', latencyNs: 120, bandwidthGbps: 8000, capacityGb: 192, color: TEAL },
  { name: 'DDR5', role: 'server system memory', latencyNs: 80, bandwidthGbps: 500, capacityGb: 2048, color: BLUE },
  { name: 'CXL', role: 'pooled expansion memory', latencyNs: 250, bandwidthGbps: 128, capacityGb: 8192, color: AMBER },
  { name: 'NAND', role: 'persistent storage', latencyNs: 80000, bandwidthGbps: 28, capacityGb: 245000, color: ORANGE },
]

const WORKLOADS = {
  train: {
    label: 'training',
    pattern: 'high reuse inside the GPU: activations, gradients, optimizer state',
    emphasis: ['SRAM', 'HBM'],
  },
  infer: {
    label: 'inference',
    pattern: 'weights stream once, KV cache grows every generated token',
    emphasis: ['HBM', 'DDR5'],
  },
  search: {
    label: 'retrieval',
    pattern: 'cold data sits in NAND, hot vectors migrate toward DRAM and HBM',
    emphasis: ['NAND', 'DDR5', 'HBM'],
  },
}

export function MemoryHierarchyChart() {
  const [workload, setWorkload] = useState<keyof typeof WORKLOADS>('infer')
  const active = WORKLOADS[workload]

  return (
    <FigureShell title="The memory hierarchy is a map of compromise" eyebrow="interactive chart">
      <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {Object.entries(WORKLOADS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setWorkload(key as keyof typeof WORKLOADS)}
                aria-pressed={key === workload}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  key === workload
                    ? 'border-transparent bg-fg text-bg'
                    : 'border-[var(--color-border)] text-muted hover:text-fg'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {TIERS.map((tier) => {
              const width = `${Math.max(8, Math.log10(tier.bandwidthGbps + 1) * 23)}%`
              const dim = !active.emphasis.includes(tier.name)
              return (
                <div key={tier.name} className={dim ? 'opacity-45 transition-opacity' : 'transition-opacity'}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div>
                      <span className="font-display text-base font-semibold text-fg">{tier.name}</span>
                      <span className="ml-2 font-mono text-[0.62rem] uppercase tracking-wider text-muted">
                        {tier.role}
                      </span>
                    </div>
                    <div className="font-mono text-[0.62rem] tabular-nums text-muted">
                      {tier.latencyNs >= 1000 ? `${fmt.format(tier.latencyNs / 1000)} us` : `${tier.latencyNs} ns`}
                    </div>
                  </div>
                  <div className="h-7 overflow-hidden rounded-lg border border-[var(--color-border)] bg-bg">
                    <div
                      className="flex h-full items-center justify-end px-2 font-mono text-[0.58rem] tabular-nums text-[#050506]"
                      style={{ width, background: tier.color }}
                    >
                      {tier.bandwidthGbps >= 1000
                        ? `${fmt.format(tier.bandwidthGbps / 1000)} TB/s`
                        : `${tier.bandwidthGbps} GB/s`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-surface p-4 sm:p-5">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">current lens</div>
          <p className="mt-3 font-sans text-base leading-7 text-fg/80">{active.pattern}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Metric label="fastest" value="SRAM" accent={PURPLE} />
            <Metric label="fattest pipe" value="HBM" accent={TEAL} />
            <Metric label="cheapest bits" value="NAND" accent={ORANGE} />
            <Metric label="elastic pool" value="CXL" accent={AMBER} />
          </div>
        </div>
      </div>
    </FigureShell>
  )
}

export function DramRefreshCell() {
  const [elapsed, setElapsed] = useState(18)
  const state = dramChargeAt({ elapsedMs: elapsed, refreshMs: 64 })
  const readDisturb = Math.min(1, state.charge + 0.18)

  return (
    <FigureShell title="A DRAM bit is charge with a deadline" eyebrow="interactive chart">
      <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-surface p-5">
          <svg viewBox="0 0 360 240" className="h-auto w-full" role="img" aria-label="DRAM cell with access transistor, capacitor charge and sense amplifier.">
            <defs>
              <linearGradient id="dram-fill" x1="0" x2="0" y1="1" y2="0">
                <stop stopColor={TEAL} />
                <stop offset="1" stopColor={GREEN} />
              </linearGradient>
            </defs>
            <line x1="42" x2="318" y1="76" y2="76" stroke="var(--color-border)" strokeWidth="2" />
            <text x="42" y="58" className="fill-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>word line</text>
            <line x1="142" x2="142" y1="30" y2="210" stroke="var(--color-border)" strokeWidth="2" />
            <text x="154" y="34" className="fill-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>bit line</text>

            <rect x="108" y="64" width="68" height="24" rx="4" fill={state.needsRefresh ? RED : PURPLE} opacity="0.7" />
            <text x="142" y="81" textAnchor="middle" className="fill-fg" style={{ fontSize: 10, fontFamily: 'monospace' }}>access FET</text>

            <line x1="142" x2="142" y1="88" y2="134" stroke="var(--color-fg)" strokeOpacity="0.55" strokeWidth="2" />
            <rect x="108" y="134" width="68" height="78" rx="8" fill="var(--color-bg)" stroke="var(--color-border)" />
            <rect
              x="114"
              y={206 - state.charge * 64}
              width="56"
              height={state.charge * 64}
              rx="5"
              fill="url(#dram-fill)"
              opacity="0.88"
            />
            <text x="142" y="229" textAnchor="middle" className="fill-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>capacitor</text>

            <path d={`M214 80 C244 ${80 - readDisturb * 34}, 264 ${80 + readDisturb * 34}, 300 80`} fill="none" stroke={state.needsRefresh ? RED : TEAL} strokeWidth="3" />
            <rect x="238" y="116" width="78" height="44" rx="8" fill="var(--color-surface-2)" stroke="var(--color-border)" />
            <text x="277" y="142" textAnchor="middle" className="fill-fg" style={{ fontSize: 10, fontFamily: 'monospace' }}>sense amp</text>
            <text x="28" y="222" className="fill-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>
              charge: {Math.round(state.charge * 100)}%
            </text>
          </svg>
        </div>

        <div className="bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">time since refresh</div>
              <div className="mt-1 font-display text-3xl font-semibold tabular-nums text-fg">{elapsed} ms</div>
            </div>
            <div
              className="rounded-lg border px-3 py-2 font-mono text-[0.62rem] uppercase tracking-wider"
              style={{ borderColor: state.needsRefresh ? RED : TEAL, color: state.needsRefresh ? RED : TEAL }}
            >
              {state.label}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={64}
            step={1}
            value={elapsed}
            onChange={(event) => setElapsed(Number(event.target.value))}
            className="mt-6 w-full accent-[var(--color-blog)]"
            aria-label="Time since last DRAM refresh"
          />

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric label="store" value="charge" accent={TEAL} />
            <Metric label="read" value="sense" accent={PURPLE} />
            <Metric label="repair" value="refresh" accent={ORANGE} />
          </div>

          <p className="mt-5 font-sans text-sm leading-6 text-fg/75">
            A read does not politely inspect the cell. It shares the tiny cell charge with the bit line,
            the sense amplifier guesses the side, and the row is written back. Refresh is just that
            destructive read/restore cycle on a schedule.
          </p>
        </div>
      </div>
    </FigureShell>
  )
}

const PACKAGES = {
  consumer: {
    label: 'consumer GPU',
    memory: 'GDDR7',
    package: 'discrete chips on PCB',
    busBits: 512,
    pinGbps: 28,
    capacity: '32 GB',
    color: ORANGE,
    note: 'cheap volume memory, long board traces, good enough bandwidth for gaming and local AI',
  },
  accelerator: {
    label: 'hyperscaler GPU',
    memory: 'HBM3E',
    package: 'stacks on interposer',
    busBits: 8192,
    pinGbps: 8,
    capacity: '192 GB',
    color: TEAL,
    note: 'wide, short links; expensive CoWoS-class packaging; bandwidth per watt beats board memory',
  },
  hbm4: {
    label: 'next stack',
    memory: 'HBM4',
    package: '2048-bit stack interface',
    busBits: 2048,
    pinGbps: 8,
    capacity: '24-48 GB per stack',
    color: PURPLE,
    note: 'per-stack channels double; custom base dies move memory closer to hyperscaler ASICs',
  },
}

export function MemoryPackagingTradeoff() {
  const [mode, setMode] = useState<keyof typeof PACKAGES>('accelerator')
  const pkg = PACKAGES[mode]
  const bw = calcBandwidth({ busBits: pkg.busBits, pinGbps: pkg.pinGbps })
  const chips = mode === 'consumer' ? 8 : mode === 'accelerator' ? 8 : 1

  return (
    <FigureShell title="Consumer cards buy pins cheaply; AI accelerators buy proximity" eyebrow="interactive chart">
      <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-[1fr_0.82fr]">
        <div className="bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {Object.entries(PACKAGES).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key as keyof typeof PACKAGES)}
                aria-pressed={key === mode}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  key === mode
                    ? 'border-transparent text-[#050506]'
                    : 'border-[var(--color-border)] text-muted hover:text-fg'
                }`}
                style={key === mode ? { background: item.color } : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>

          <svg viewBox="0 0 560 320" className="h-auto w-full" role="img" aria-label={`${pkg.label} package layout using ${pkg.memory}.`}>
            <rect x="36" y="54" width="488" height="214" rx="18" fill="var(--color-bg)" stroke="var(--color-border)" />
            <rect x="204" y="112" width="152" height="96" rx="14" fill="var(--color-surface-2)" stroke="var(--color-border)" />
            <text x="280" y="164" textAnchor="middle" className="fill-fg" style={{ fontSize: 15, fontFamily: 'monospace' }}>compute die</text>

            {Array.from({ length: chips }).map((_, index) => {
              const angle = (index / chips) * Math.PI * 2
              const radiusX = mode === 'consumer' ? 205 : 160
              const radiusY = mode === 'consumer' ? 98 : 74
              const x = 280 + Math.cos(angle) * radiusX
              const y = 160 + Math.sin(angle) * radiusY
              return (
                <g key={`${mode}-${index}`}>
                  <line x1="280" y1="160" x2={x} y2={y} stroke={pkg.color} strokeOpacity={mode === 'consumer' ? 0.22 : 0.48} strokeWidth={mode === 'consumer' ? 1.5 : 4} />
                  <rect x={x - 35} y={y - 24} width="70" height="48" rx="8" fill={pkg.color} opacity={mode === 'consumer' ? 0.55 : 0.78} />
                </g>
              )
            })}

            {mode !== 'consumer' && (
              <rect x="86" y="82" width="388" height="160" rx="20" fill="none" stroke={TEAL} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 5" />
            )}

            <text x="42" y="294" className="fill-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {pkg.package}
            </text>
          </svg>
        </div>

        <div className="bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="memory" value={pkg.memory} accent={pkg.color} />
            <Metric label="capacity" value={pkg.capacity} accent={BLUE} />
            <Metric label="bus" value={`${pkg.busBits}-bit`} accent={PURPLE} />
            <Metric label="bandwidth" value={`${bw.tbPerSecond} TB/s`} accent={TEAL} />
          </div>
          <p className="mt-5 font-sans text-sm leading-6 text-fg/75">{pkg.note}</p>
        </div>
      </div>
    </FigureShell>
  )
}

const AI_PRESETS: Record<string, AiMemoryInput & { label: string }> = {
  small: {
    label: '8B edge model',
    paramsB: 8,
    weightBits: 4,
    layers: 32,
    kvHeads: 8,
    headDim: 128,
    contextTokens: 8192,
    batch: 4,
    kvBytes: 2,
  },
  mid: {
    label: '70B serving pool',
    paramsB: 70,
    weightBits: 4,
    layers: 80,
    kvHeads: 8,
    headDim: 128,
    contextTokens: 32768,
    batch: 4,
    kvBytes: 2,
  },
  frontier: {
    label: 'dense 400B shard',
    paramsB: 400,
    weightBits: 8,
    layers: 120,
    kvHeads: 16,
    headDim: 128,
    contextTokens: 65536,
    batch: 8,
    kvBytes: 2,
  },
}

const TARGETS = [
  { name: 'RTX 5090', gb: 32, color: ORANGE },
  { name: 'H200', gb: 141, color: BLUE },
  { name: 'B200', gb: 192, color: TEAL },
  { name: 'B300', gb: 288, color: PURPLE },
]

export function AiMemorySizer() {
  const [presetKey, setPresetKey] = useState<keyof typeof AI_PRESETS>('mid')
  const [context, setContext] = useState(AI_PRESETS.mid.contextTokens)
  const [batch, setBatch] = useState(AI_PRESETS.mid.batch)
  const preset = AI_PRESETS[presetKey]
  const input = { ...preset, contextTokens: context, batch }
  const footprint = calcAiMemoryFootprint(input)
  const maxBar = Math.max(footprint.totalGb, ...TARGETS.map((target) => target.gb))

  const choosePreset = (next: keyof typeof AI_PRESETS) => {
    setPresetKey(next)
    setContext(AI_PRESETS[next].contextTokens)
    setBatch(AI_PRESETS[next].batch)
  }

  return (
    <FigureShell title="For inference, the second model is the cache" eyebrow="interactive chart">
      <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(AI_PRESETS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => choosePreset(key as keyof typeof AI_PRESETS)}
                aria-pressed={key === presetKey}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  key === presetKey
                    ? 'border-transparent bg-fg text-bg'
                    : 'border-[var(--color-border)] text-muted hover:text-fg'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-5">
            <Slider label="context" value={context} min={2048} max={131072} step={2048} unit="tok" onChange={setContext} />
            <Slider label="batch" value={batch} min={1} max={32} step={1} unit="req" onChange={setBatch} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Metric label="weights" value={`${footprint.weightsGb} GB`} accent={PURPLE} />
            <Metric label="KV cache" value={`${footprint.kvCacheGb} GB`} accent={TEAL} />
            <Metric label="total" value={`${footprint.totalGb} GB`} accent={ORANGE} />
          </div>
        </div>

        <div className="bg-surface p-4 sm:p-5">
          <div className="mb-4 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">fit check</div>
          <div className="space-y-3">
            <StackedBar
              label="workload"
              total={footprint.totalGb}
              max={maxBar}
              segments={[
                { value: footprint.weightsGb, color: PURPLE, label: 'weights' },
                { value: footprint.kvCacheGb, color: TEAL, label: 'KV' },
              ]}
            />
            {TARGETS.map((target) => (
              <div key={target.name}>
                <div className="mb-1 flex justify-between font-mono text-[0.62rem] tabular-nums text-muted">
                  <span>{target.name}</span>
                  <span>{target.gb} GB</span>
                </div>
                <div className="h-5 overflow-hidden rounded-md border border-[var(--color-border)] bg-bg">
                  <div className="h-full" style={{ width: `${(target.gb / maxBar) * 100}%`, background: target.color, opacity: target.gb >= footprint.totalGb ? 0.75 : 0.28 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 font-sans text-sm leading-6 text-fg/75">
            Quantized weights make the model fit. Long context and batching make the cache fight back.
            Every generated token appends key and value vectors in every layer, so throughput is often a
            memory-capacity scheduling problem before it is a matrix-multiply problem.
          </p>
        </div>
      </div>
    </FigureShell>
  )
}

const MARKETS = {
  dram: {
    label: 'DRAM revenue, 1Q26',
    source: 'TrendForce, June 2026',
    items: [
      { label: 'Samsung', value: 38.5, color: TEAL },
      { label: 'SK hynix', value: 28.8, color: PURPLE },
      { label: 'Micron', value: 22.4, color: ORANGE },
      { label: 'others', value: 10.3, color: BLUE },
    ],
    pressure: 'server DRAM and HBM absorb the best wafers; PC and phone buyers get the leftovers',
  },
  nand: {
    label: 'NAND revenue, 1Q26',
    source: 'TrendForce, May 2026',
    items: [
      { label: 'Samsung', value: 31.6, color: TEAL },
      { label: 'SK group', value: 17.6, color: PURPLE },
      { label: 'Kioxia', value: 13.9, color: BLUE },
      { label: 'Micron', value: 13.9, color: ORANGE },
      { label: 'SanDisk', value: 13.9, color: AMBER },
      { label: 'others', value: 9.1, color: '#94a3b8' },
    ],
    pressure: 'enterprise QLC SSD demand pulls NAND toward datacenters while client SSDs get price shock',
  },
}

export function MemoryMarketBars() {
  const [market, setMarket] = useState<keyof typeof MARKETS>('dram')
  const active = MARKETS[market]
  const shares = useMemo(() => normalizeShare(active.items), [active])

  return (
    <FigureShell title="Supply is concentrated, and allocation is the product" eyebrow="interactive chart">
      <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-[1fr_0.85fr]">
        <div className="bg-surface p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap gap-1.5">
            {Object.entries(MARKETS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMarket(key as keyof typeof MARKETS)}
                aria-pressed={key === market}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  key === market
                    ? 'border-transparent bg-fg text-bg'
                    : 'border-[var(--color-border)] text-muted hover:text-fg'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-bg">
            <div className="flex h-16">
              {shares.map((item) => (
                <div
                  key={item.label}
                  title={`${item.label}: ${item.rawValue}%`}
                  style={{ width: `${item.percent}%`, background: active.items.find((x) => x.label === item.label)?.color }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {shares.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-surface-2/35 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: active.items.find((x) => x.label === item.label)?.color }}
                  />
                  <span className="font-mono text-[0.62rem] uppercase tracking-wider text-fg/85">{item.label}</span>
                </div>
                <span className="font-mono text-[0.62rem] tabular-nums text-muted">{item.rawValue}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface p-4 sm:p-5">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">{active.source}</div>
          <p className="mt-3 font-sans text-base leading-7 text-fg/80">{active.pressure}</p>
          <div className="mt-5 space-y-2">
            <Pressure label="AI servers" value={92} color={TEAL} />
            <Pressure label="PC OEMs" value={48} color={ORANGE} />
            <Pressure label="phones" value={42} color={BLUE} />
            <Pressure label="retail modules" value={30} color={AMBER} />
          </div>
        </div>
      </div>
    </FigureShell>
  )
}

const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  equipment: 'equipment',
  foundry: 'foundry',
  memory: 'memory',
  accelerator: 'accelerator',
  cloud: 'cloud',
  technology: 'technology',
}

const NODE_TYPE_COLORS: Record<GraphNodeType, string> = {
  equipment: AMBER,
  foundry: BLUE,
  memory: TEAL,
  accelerator: PURPLE,
  cloud: ORANGE,
  technology: GREEN,
}

const EDGE_COLORS: Record<GraphEdge['kind'], string> = {
  supplies_equipment_to: AMBER,
  fabricates_for: BLUE,
  packages_with: GREEN,
  supplies_memory_to: TEAL,
  sells_accelerators_to: PURPLE,
  buys_compute_for: ORANGE,
  competes_with: RED,
  depends_on: GREEN,
}

const EVIDENCE_STYLES: Record<GraphConfidence, { label: string; color: string }> = {
  direct: { label: 'direct', color: GREEN },
  inferred: { label: 'inferred', color: AMBER },
  modeled: { label: 'modeled', color: BLUE },
}

type VisualGraphNodeType = GraphNodeType | 'software' | 'materials' | 'server' | 'ecosystem'
type GraphClusterId = 'equipment' | 'software' | 'foundry' | 'materials' | 'memory' | 'accelerator' | 'cloud' | 'server' | 'ecosystem'

type ForceGraphNode = {
  id: string
  label: string
  type: VisualGraphNodeType
  cluster: GraphClusterId
  core: boolean
  seed: { x: number; y: number }
  weight: number
}

type ForceGraphEdge = {
  id: string
  from: string
  to: string
  label: string
  kind: GraphEdge['kind'] | 'context'
  confidence: GraphConfidence | 'context'
  strength: 'very strong' | 'strong' | 'medium' | 'weak' | 'informational'
  sourceEdge?: GraphEdge
}

type VisibleGraphProfileNode = {
  id: string
  label: string
  type: VisualGraphNodeType
  region: string
  summary: string
  metrics?: GraphMetric[]
}

type VisibleGraphProfile = {
  node: VisibleGraphProfileNode
  upstream: ForceGraphEdge[]
  downstream: ForceGraphEdge[]
  peers: ForceGraphEdge[]
  metrics: GraphMetric[]
  sources: GraphSource[]
}

type GraphGroupRegion = {
  id: Exclude<GraphClusterId, 'ecosystem'>
  label: string
  shortLabel: string
  x: number
  y: number
  width: number
  height: number
  accent: string
}

type GraphGroupBounds = {
  x: number
  y: number
  width: number
  height: number
}

const VISUAL_NODE_TYPE_LABELS: Record<VisualGraphNodeType, string> = {
  ...NODE_TYPE_LABELS,
  software: 'software / IP',
  materials: 'materials',
  server: 'systems',
  ecosystem: 'ecosystem',
}

const VISUAL_NODE_TYPE_COLORS: Record<VisualGraphNodeType, string> = {
  ...NODE_TYPE_COLORS,
  software: '#8b8f9a',
  materials: '#a8a29e',
  server: '#64748b',
  ecosystem: '#9ca3af',
}

const GRAPH_GROUP_REGIONS: GraphGroupRegion[] = [
  { id: 'equipment', label: 'Equipment suppliers', shortLabel: 'Equipment', x: 5.5, y: 16, width: 23, height: 47, accent: AMBER },
  { id: 'software', label: 'Ecosystem / IP / software', shortLabel: 'IP / SW', x: 5.5, y: 66, width: 23, height: 27, accent: '#8b8f9a' },
  { id: 'foundry', label: 'Foundry / packaging', shortLabel: 'Foundry', x: 31, y: 15, width: 26, height: 48, accent: BLUE },
  { id: 'materials', label: 'Substrates / materials', shortLabel: 'Materials', x: 28.5, y: 68, width: 22.5, height: 24, accent: '#a8a29e' },
  { id: 'accelerator', label: 'Accelerator / chip', shortLabel: 'Accelerator', x: 52, y: 49, width: 18, height: 27, accent: PURPLE },
  { id: 'memory', label: 'Memory manufacturers', shortLabel: 'Memory', x: 60.5, y: 15, width: 32.5, height: 35, accent: TEAL },
  { id: 'cloud', label: 'Hyperscalers / cloud', shortLabel: 'Cloud', x: 76, y: 54, width: 19, height: 38, accent: ORANGE },
  { id: 'server', label: 'System OEMs / servers', shortLabel: 'Servers', x: 50.5, y: 79, width: 19, height: 16, accent: '#64748b' },
]

const GRAPH_GROUP_REGION_BY_ID = new Map<GraphClusterId, GraphGroupRegion>(
  GRAPH_GROUP_REGIONS.map((region) => [region.id, region]),
)

const GRAPH_NODE_SEEDS = {
  asml: { x: 21.5, y: 36, cluster: 'equipment' },
  tsmc: { x: 44, y: 43, cluster: 'foundry' },
  cowos: { x: 43, y: 57, cluster: 'foundry' },
  'sk-hynix': { x: 74, y: 28, cluster: 'memory' },
  micron: { x: 84, y: 34, cluster: 'memory' },
  samsung: { x: 64, y: 31, cluster: 'memory' },
  nvidia: { x: 64.4, y: 60, cluster: 'accelerator' },
  amazon: { x: 86, y: 64, cluster: 'cloud' },
  google: { x: 83, y: 74, cluster: 'cloud' },
  microsoft: { x: 78, y: 60, cluster: 'cloud' },
  meta: { x: 82, y: 84, cluster: 'cloud' },
} satisfies Record<string, { x: number; y: number; cluster: GraphClusterId }>

const GRAPH_CONTEXT_NODES: ForceGraphNode[] = [
  { id: 'applied-materials', label: 'Applied Materials', type: 'equipment', cluster: 'equipment', core: false, seed: { x: 11, y: 29 }, weight: 0.76 },
  { id: 'lam-research', label: 'Lam Research', type: 'equipment', cluster: 'equipment', core: false, seed: { x: 14, y: 42 }, weight: 0.72 },
  { id: 'kla', label: 'KLA', type: 'equipment', cluster: 'equipment', core: false, seed: { x: 10, y: 53 }, weight: 0.58 },
  { id: 'tokyo-electron', label: 'Tokyo Electron', type: 'equipment', cluster: 'equipment', core: false, seed: { x: 19, y: 57 }, weight: 0.62 },
  { id: 'synopsys', label: 'Synopsys', type: 'software', cluster: 'software', core: false, seed: { x: 11, y: 70 }, weight: 0.56 },
  { id: 'cadence', label: 'Cadence', type: 'software', cluster: 'software', core: false, seed: { x: 17, y: 78 }, weight: 0.56 },
  { id: 'arm', label: 'Arm', type: 'software', cluster: 'software', core: false, seed: { x: 9, y: 87 }, weight: 0.52 },
  { id: 'intel-foundry', label: 'Intel Foundry', type: 'foundry', cluster: 'foundry', core: false, seed: { x: 52, y: 27 }, weight: 0.72 },
  { id: 'samsung-foundry', label: 'Samsung Foundry', type: 'foundry', cluster: 'foundry', core: false, seed: { x: 38, y: 26 }, weight: 0.66 },
  { id: 'shin-etsu', label: 'Shin-Etsu Chemical', type: 'materials', cluster: 'materials', core: false, seed: { x: 30, y: 78 }, weight: 0.48 },
  { id: 'sumco', label: 'SUMCO', type: 'materials', cluster: 'materials', core: false, seed: { x: 36, y: 85 }, weight: 0.46 },
  { id: 'siltronic', label: 'Siltronic', type: 'materials', cluster: 'materials', core: false, seed: { x: 43, y: 80 }, weight: 0.46 },
  { id: 'dell', label: 'Dell Technologies', type: 'server', cluster: 'server', core: false, seed: { x: 55, y: 85 }, weight: 0.54 },
  { id: 'supermicro', label: 'Supermicro', type: 'server', cluster: 'server', core: false, seed: { x: 63, y: 87 }, weight: 0.54 },
  { id: 'hpe', label: 'HPE', type: 'server', cluster: 'server', core: false, seed: { x: 60, y: 94 }, weight: 0.44 },
]

const GRAPH_CONTEXT_NODE_DETAILS: Record<string, Pick<VisibleGraphProfileNode, 'type' | 'region' | 'summary'>> = {
  'applied-materials': {
    type: 'equipment',
    region: 'United States',
    summary: 'Wafer fabrication equipment supplier across deposition, materials engineering, inspection, and advanced packaging process steps.',
  },
  'lam-research': {
    type: 'equipment',
    region: 'United States',
    summary: 'Etch and deposition equipment supplier used across logic, DRAM, NAND, and advanced packaging process flows.',
  },
  kla: {
    type: 'equipment',
    region: 'United States',
    summary: 'Process control and inspection equipment supplier that helps fabs find yield defects across lithography, etch, deposition, and metrology steps.',
  },
  'tokyo-electron': {
    type: 'equipment',
    region: 'Japan',
    summary: 'Semiconductor production equipment supplier spanning coat/develop, deposition, etch, cleaning, and test-adjacent fab processes.',
  },
  synopsys: {
    type: 'software',
    region: 'United States',
    summary: 'EDA and IP supplier whose design tools and interface IP help chipmakers turn accelerator and memory-interface designs into manufacturable silicon.',
  },
  cadence: {
    type: 'software',
    region: 'United States',
    summary: 'EDA and systems design software supplier supporting chip, package, PCB, and multiphysics design flows for AI hardware.',
  },
  arm: {
    type: 'software',
    region: 'United Kingdom',
    summary: 'CPU IP and platform ecosystem supplier used across mobile, server, embedded, and custom silicon designs.',
  },
  'intel-foundry': {
    type: 'foundry',
    region: 'United States',
    summary: 'Advanced logic foundry effort positioned as an alternative manufacturing path for leading-edge AI and infrastructure silicon.',
  },
  'samsung-foundry': {
    type: 'foundry',
    region: 'South Korea',
    summary: 'Logic foundry and advanced packaging business adjacent to Samsung Memory, competing for custom AI accelerator and infrastructure silicon.',
  },
  'shin-etsu': {
    type: 'materials',
    region: 'Japan',
    summary: 'Semiconductor wafer and materials supplier upstream of logic and memory fab capacity.',
  },
  sumco: {
    type: 'materials',
    region: 'Japan',
    summary: 'Silicon wafer supplier whose substrates sit at the base of logic, DRAM, NAND, and specialty semiconductor production.',
  },
  siltronic: {
    type: 'materials',
    region: 'Germany',
    summary: 'Silicon wafer supplier serving semiconductor manufacturers across memory, logic, and specialty device markets.',
  },
  dell: {
    type: 'server',
    region: 'United States',
    summary: 'System OEM integrating GPUs, CPUs, memory, networking, storage, and cooling into enterprise and AI server platforms.',
  },
  supermicro: {
    type: 'server',
    region: 'United States',
    summary: 'Server OEM and integrator focused on GPU-dense AI systems, rack-scale platforms, and fast-turn infrastructure designs.',
  },
  hpe: {
    type: 'server',
    region: 'United States',
    summary: 'Enterprise infrastructure supplier integrating AI servers, networking, storage, and services for datacenter deployments.',
  },
}

const GRAPH_CANVAS_EDGE_IDS = [
  'asml-to-tsmc',
  'asml-to-memory',
  'asml-to-micron',
  'tsmc-to-cowos',
  'tsmc-to-nvidia',
  'cowos-to-nvidia',
  'sk-hynix-to-nvidia',
  'micron-to-nvidia',
  'samsung-to-nvidia',
  'nvidia-to-amazon',
  'nvidia-to-google',
  'nvidia-to-microsoft',
  'nvidia-to-meta',
]

const GRAPH_CONTEXT_EDGES: ForceGraphEdge[] = [
  { id: 'applied-to-tsmc', from: 'applied-materials', to: 'tsmc', label: 'process tools', kind: 'context', confidence: 'context', strength: 'medium' },
  { id: 'lam-to-tsmc', from: 'lam-research', to: 'tsmc', label: 'etch and deposition tools', kind: 'context', confidence: 'context', strength: 'medium' },
  { id: 'kla-to-tsmc', from: 'kla', to: 'tsmc', label: 'inspection and metrology', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'tel-to-tsmc', from: 'tokyo-electron', to: 'tsmc', label: 'wafer process tools', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'synopsys-to-nvidia', from: 'synopsys', to: 'nvidia', label: 'EDA and IP ecosystem', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'cadence-to-nvidia', from: 'cadence', to: 'nvidia', label: 'EDA ecosystem', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'arm-to-nvidia', from: 'arm', to: 'nvidia', label: 'CPU IP ecosystem', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'intel-to-cloud', from: 'intel-foundry', to: 'microsoft', label: 'alternative foundry path', kind: 'context', confidence: 'context', strength: 'informational' },
  { id: 'samsung-foundry-to-cloud', from: 'samsung-foundry', to: 'google', label: 'alternative foundry path', kind: 'context', confidence: 'context', strength: 'informational' },
  { id: 'shin-etsu-to-tsmc', from: 'shin-etsu', to: 'tsmc', label: 'wafer materials', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'sumco-to-tsmc', from: 'sumco', to: 'tsmc', label: 'silicon wafers', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'siltronic-to-tsmc', from: 'siltronic', to: 'tsmc', label: 'silicon wafers', kind: 'context', confidence: 'context', strength: 'weak' },
  { id: 'nvidia-to-dell', from: 'nvidia', to: 'dell', label: 'AI server platforms', kind: 'context', confidence: 'context', strength: 'medium' },
  { id: 'nvidia-to-supermicro', from: 'nvidia', to: 'supermicro', label: 'AI server platforms', kind: 'context', confidence: 'context', strength: 'medium' },
  { id: 'nvidia-to-hpe', from: 'nvidia', to: 'hpe', label: 'AI server platforms', kind: 'context', confidence: 'context', strength: 'weak' },
]

const GRAPH_RELATIONSHIPS = [
  { from: 'ASML', to: 'TSMC', label: 'EUV tools', color: AMBER },
  { from: 'TSMC', to: 'NVIDIA', label: 'logic and package', color: BLUE },
  { from: 'SK hynix / Micron', to: 'NVIDIA', label: 'HBM', color: TEAL },
  { from: 'NVIDIA', to: 'clouds', label: 'GPU platforms', color: PURPLE },
]

const GRAPH_ZOOM_FIT = 0.92
const GRAPH_ZOOM_MIN = 0.68
const GRAPH_ZOOM_MAX = 1.56
const GRAPH_ZOOM_STEP = 0.08
const GRAPH_GROUP_TITLE_HEIGHT = 24
const GRAPH_GROUP_TITLE_GAP = 6
const GRAPH_GROUP_TITLE_OFFSET = -(GRAPH_GROUP_TITLE_HEIGHT + GRAPH_GROUP_TITLE_GAP)

const CAPEX_EDGE_IDS = [
  'alphabet-2026-capex',
  'amazon-2026-capex',
  'meta-2026-capex',
  'microsoft-q3-fy26-capex',
]

const FINANCIAL_CANVAS_EDGE_IDS = [
  'tsmc-to-nvidia',
  'cowos-to-nvidia',
  'sk-hynix-to-nvidia',
  'micron-to-nvidia',
  'samsung-to-nvidia',
  'nvidia-to-amazon',
  'nvidia-to-google',
  'nvidia-to-microsoft',
  'nvidia-to-meta',
  ...CAPEX_EDGE_IDS,
]

const TRACE_PRESETS = [
  { id: 'asml-microsoft', label: 'ASML -> Azure', from: 'asml', to: 'microsoft', note: 'tools to cloud GPU capacity' },
  { id: 'asml-amazon', label: 'ASML -> AWS', from: 'asml', to: 'amazon', note: 'tools to AWS GPU demand' },
  { id: 'tsmc-google', label: 'TSMC -> Google', from: 'tsmc', to: 'google', note: 'foundry to cloud accelerator use' },
  { id: 'sk-hynix-meta', label: 'SK hynix -> Meta', from: 'sk-hynix', to: 'meta', note: 'HBM supplier to AI cluster buyer' },
  { id: 'micron-microsoft', label: 'Micron -> Azure', from: 'micron', to: 'microsoft', note: 'HBM supplier to Azure demand' },
] as const

type TracePresetId = (typeof TRACE_PRESETS)[number]['id']
type GraphPanelMode = 'profile' | 'financial' | 'trace'

const graphNodesById = new Map(MEMORY_CHIP_GRAPH.nodes.map((node) => [node.id, node]))
const graphSourcesById = new Map(MEMORY_CHIP_GRAPH.sources.map((source) => [source.id, source]))
const graphEdgesById = new Map(MEMORY_CHIP_GRAPH.edges.map((edge) => [edge.id, edge]))

const FORCE_GRAPH_NODES: ForceGraphNode[] = [
  ...MEMORY_CHIP_GRAPH.nodes.map((node) => {
    const seed = GRAPH_NODE_SEEDS[node.id as keyof typeof GRAPH_NODE_SEEDS] ?? { x: 50, y: 50, cluster: 'ecosystem' }
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      cluster: seed.cluster,
      core: true,
      seed: { x: seed.x, y: seed.y },
      weight: node.type === 'accelerator' ? 1.18 : node.type === 'cloud' ? 0.9 : 0.98,
    }
  }),
  ...GRAPH_CONTEXT_NODES,
]

const FORCE_GRAPH_EDGES: ForceGraphEdge[] = [
  ...Array.from(new Set([...GRAPH_CANVAS_EDGE_IDS, ...CAPEX_EDGE_IDS]))
    .map((edgeId) => graphEdgesById.get(edgeId))
    .filter((edge): edge is GraphEdge => Boolean(edge))
    .map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      kind: edge.kind,
      confidence: edge.confidence,
      strength: edge.confidence === 'direct' ? 'very strong' : 'strong',
      sourceEdge: edge,
    }) satisfies ForceGraphEdge),
  ...GRAPH_CONTEXT_EDGES,
]

const forceGraphNodesById = new Map(FORCE_GRAPH_NODES.map((node) => [node.id, node]))

function getVisibleProfileNode(nodeId: string): VisibleGraphProfileNode | null {
  const graphNode = graphNodesById.get(nodeId)
  if (graphNode) return graphNode

  const forceNode = forceGraphNodesById.get(nodeId)
  if (!forceNode) return null

  const details = GRAPH_CONTEXT_NODE_DETAILS[nodeId]
  return {
    id: forceNode.id,
    label: forceNode.label,
    type: details?.type ?? forceNode.type,
    region: details?.region ?? 'Ecosystem',
    summary:
      details?.summary ??
      `${forceNode.label} is a supporting ${VISUAL_NODE_TYPE_LABELS[forceNode.type].toLowerCase()} node in the memory market graph.`,
  }
}

function buildVisibleGraphProfile(nodeId: string): VisibleGraphProfile {
  const node = getVisibleProfileNode(nodeId)
  if (!node) {
    throw new Error(`Unknown visible graph node: ${nodeId}`)
  }

  const upstream = FORCE_GRAPH_EDGES.filter((edge) => edge.to === nodeId)
  const downstream = FORCE_GRAPH_EDGES.filter((edge) => edge.from === nodeId)
  const peers = FORCE_GRAPH_EDGES.filter(
    (edge) => edge.kind === 'competes_with' && (edge.from === nodeId || edge.to === nodeId),
  )
  const sourceIdsForProfile = new Set<string>([
    ...(node.metrics ?? []).map((metric) => metric.sourceId),
    ...upstream.flatMap((edge) => edge.sourceEdge?.sourceIds ?? []),
    ...downstream.flatMap((edge) => edge.sourceEdge?.sourceIds ?? []),
  ])

  return {
    node,
    upstream,
    downstream,
    peers,
    metrics: node.metrics ?? [],
    sources: Array.from(sourceIdsForProfile)
      .map((sourceId) => graphSourcesById.get(sourceId))
      .filter((source): source is GraphSource => Boolean(source)),
  }
}

const FORCE_LAYOUT_POSITIONS = computeForceLayout(FORCE_GRAPH_NODES, FORCE_GRAPH_EDGES)

export function MemoryKnowledgeGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState('nvidia')
  const [panelMode, setPanelMode] = useState<GraphPanelMode>('profile')
  const [tracePresetId, setTracePresetId] = useState<TracePresetId>('asml-microsoft')
  const [zoom, setZoom] = useState(GRAPH_ZOOM_FIT)
  const fitZoom = useResponsiveGraphFitZoom()
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const selectedProfile = useMemo(() => buildVisibleGraphProfile(selectedNodeId), [selectedNodeId])
  const sankey = useMemo(() => buildSankeyFlows(MEMORY_CHIP_GRAPH, CAPEX_EDGE_IDS), [])
  const activeTracePreset = TRACE_PRESETS.find((preset) => preset.id === tracePresetId) ?? TRACE_PRESETS[0]
  const trace = useMemo(
    () => findTraversalPath(MEMORY_CHIP_GRAPH, activeTracePreset.from, activeTracePreset.to),
    [activeTracePreset.from, activeTracePreset.to],
  )
  const connectedEdgeIds = useMemo(
    () =>
      new Set(
        FORCE_GRAPH_EDGES
          .filter((edge) => edge.from === selectedNodeId || edge.to === selectedNodeId)
          .map((edge) => edge.id),
      ),
    [selectedNodeId],
  )
  const activeEdgeIds = useMemo(() => {
    if (panelMode === 'trace' && trace) return new Set(trace.edges.map((edge) => edge.id))
    if (panelMode === 'financial') return new Set(FINANCIAL_CANVAS_EDGE_IDS)
    return connectedEdgeIds
  }, [connectedEdgeIds, panelMode, trace])
  const relatedNodeIds = useMemo(() => {
    const ids = new Set<string>([selectedNodeId])
    if (panelMode === 'trace' && trace) {
      trace.nodes.forEach((node) => ids.add(node.id))
      return ids
    }
    if (panelMode === 'financial') {
      FINANCIAL_CANVAS_EDGE_IDS.forEach((edgeId) => {
        const edge = MEMORY_CHIP_GRAPH.edges.find((item) => item.id === edgeId)
        if (edge) {
          ids.add(edge.from)
          ids.add(edge.to)
        }
      })
      ids.add('nvidia')
      return ids
    }
    FORCE_GRAPH_EDGES.forEach((edge) => {
      if (edge.from === selectedNodeId || edge.to === selectedNodeId) {
        ids.add(edge.from)
        ids.add(edge.to)
      }
    })
    return ids
  }, [panelMode, selectedNodeId, trace])
  const matchingNodeIds = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return new Set(FORCE_GRAPH_NODES.map((node) => node.id))
    return new Set(
      FORCE_GRAPH_NODES.filter((node) => {
        const typeLabel = VISUAL_NODE_TYPE_LABELS[node.type]
        return `${node.label} ${typeLabel} ${node.cluster}`.toLowerCase().includes(normalized)
      }).map((node) => node.id),
    )
  }, [query])
  const zoomPercent = Math.round(zoom * 100)

  const selectNode = (nodeId: string) => {
    if (!forceGraphNodesById.has(nodeId)) return
    setSelectedNodeId(nodeId)
    setPanelMode('profile')
  }
  const setGraphZoom = (value: number) => setZoom(clampGraphZoom(value))
  const zoomBy = (delta: number) => setZoom((value) => clampGraphZoom(value + delta))
  const zoomIn = () => setZoom((value) => clampGraphZoom(value + GRAPH_ZOOM_STEP))
  const zoomOut = () => setZoom((value) => clampGraphZoom(value - GRAPH_ZOOM_STEP))

  useEffect(() => {
    setZoom((value) => (Math.abs(value - GRAPH_ZOOM_FIT) < 0.01 ? fitZoom : value))
  }, [fitZoom])

  useEffect(() => {
    if (!expanded) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  const explorerProps = {
    activeEdgeIds,
    matchingNodeIds,
    panelMode,
    query,
    relatedNodeIds,
    sankey,
    selectedNodeId,
    selectedProfile,
    trace,
    tracePresetId,
    zoom,
    zoomPercent,
    onExpand: () => setExpanded(true),
    onModeChange: setPanelMode,
    onQueryChange: setQuery,
    onSelectNode: selectNode,
    onTracePresetChange: setTracePresetId,
    onZoomFit: () => setZoom(fitZoom),
    onZoomChange: setGraphZoom,
    onZoomDelta: zoomBy,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
  }

  return (
    <FigureShell title="Memory market knowledge graph" eyebrow="interactive graph" wide>
      <div data-testid="memory-knowledge-graph" className="relative z-[65] scroll-mt-32 bg-surface">
        <GraphExplorer {...explorerProps} expanded={false} />
      </div>
      {expanded && (
        <div
          role="dialog"
          aria-label="Memory market graph expanded"
          aria-modal="true"
          className="fixed inset-0 z-[80] bg-bg/96 p-2 backdrop-blur-md sm:p-4"
        >
          <div data-testid="knowledge-graph-fullscreen" className="h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface shadow-2xl">
            <GraphExplorer {...explorerProps} expanded onClose={() => setExpanded(false)} />
          </div>
        </div>
      )}
    </FigureShell>
  )
}

function clampGraphZoom(value: number) {
  return Math.min(GRAPH_ZOOM_MAX, Math.max(GRAPH_ZOOM_MIN, Number(value.toFixed(2))))
}

function useResponsiveGraphFitZoom() {
  const [fitZoom, setFitZoom] = useState(GRAPH_ZOOM_FIT)

  useEffect(() => {
    const updateFitZoom = () => {
      if (window.innerWidth < 520) {
        setFitZoom(0.76)
        return
      }
      if (window.innerWidth < 900) {
        setFitZoom(0.84)
        return
      }
      setFitZoom(GRAPH_ZOOM_FIT)
    }

    updateFitZoom()
    window.addEventListener('resize', updateFitZoom)
    return () => window.removeEventListener('resize', updateFitZoom)
  }, [])

  return fitZoom
}

function useMeasuredGraphGroupBounds(
  layerRef: RefObject<HTMLDivElement | null>,
  zoom: number,
  expanded: boolean,
) {
  const [bounds, setBounds] = useState<Partial<Record<GraphClusterId, GraphGroupBounds>>>({})

  const measure = useCallback(() => {
    const layer = layerRef.current
    if (!layer || zoom <= 0) return

    const layerRect = layer.getBoundingClientRect()
    const layerWidth = layerRect.width / zoom
    const layerHeight = layerRect.height / zoom
    if (layerWidth <= 0 || layerHeight <= 0) return

    const grouped = new Map<
      GraphClusterId,
      { minX: number; minY: number; maxX: number; maxY: number; count: number }
    >()

    layer.querySelectorAll<HTMLElement>('[data-graph-node-id][data-graph-cluster]').forEach((element) => {
      const cluster = element.dataset.graphCluster as GraphClusterId | undefined
      if (!cluster || !GRAPH_GROUP_REGION_BY_ID.has(cluster)) return

      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const item = grouped.get(cluster) ?? {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        count: 0,
      }

      item.minX = Math.min(item.minX, (rect.left - layerRect.left) / zoom)
      item.minY = Math.min(item.minY, (rect.top - layerRect.top) / zoom)
      item.maxX = Math.max(item.maxX, (rect.right - layerRect.left) / zoom)
      item.maxY = Math.max(item.maxY, (rect.bottom - layerRect.top) / zoom)
      item.count += 1
      grouped.set(cluster, item)
    })

    const next: Partial<Record<GraphClusterId, GraphGroupBounds>> = {}
    grouped.forEach((item, cluster) => {
      const region = GRAPH_GROUP_REGION_BY_ID.get(cluster)
      if (!region || item.count === 0) return

      const compact = layerWidth < 640
      const horizontalPadding = compact ? 0 : expanded ? 16 : 10
      const topPadding = compact ? 8 : expanded ? 16 : 10
      const bottomPadding = compact ? 5 : expanded ? 12 : 6
      const minWidth = Math.min(layerWidth, compact ? 42 : expanded ? 128 : 104)
      const minHeight = Math.min(layerHeight, compact ? 54 : expanded ? 104 : 86)

      let x = item.minX - horizontalPadding
      let y = item.minY - topPadding
      let width = item.maxX - item.minX + horizontalPadding * 2
      let height = item.maxY - item.minY + topPadding + bottomPadding

      if (width < minWidth) {
        x -= (minWidth - width) / 2
        width = minWidth
      }

      if (height < minHeight) {
        y -= (minHeight - height) / 2
        height = minHeight
      }

      width = Math.min(width, layerWidth)
      height = Math.min(height, layerHeight)
      const horizontalOverscan = horizontalPadding + 8
      const verticalOverscan = Math.max(topPadding, bottomPadding) + 8
      x = clamp(x, -horizontalOverscan, Math.max(0, layerWidth - width) + horizontalOverscan)
      y = clamp(y, -verticalOverscan, Math.max(0, layerHeight - height) + verticalOverscan)

      next[cluster] = {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
      }
    })

    setBounds((current) => (areGraphGroupBoundsEqual(current, next) ? current : next))
  }, [expanded, layerRef, zoom])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return undefined

    let frame = 0
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measure)
    }

    scheduleMeasure()

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure)
    observer?.observe(layer)
    layer.querySelectorAll<HTMLElement>('[data-graph-node-id][data-graph-cluster]').forEach((element) => {
      observer?.observe(element)
    })
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [layerRef, measure])

  return bounds
}

function areGraphGroupBoundsEqual(
  a: Partial<Record<GraphClusterId, GraphGroupBounds>>,
  b: Partial<Record<GraphClusterId, GraphGroupBounds>>,
) {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])) as GraphClusterId[]
  return keys.every((key) => {
    const left = a[key]
    const right = b[key]
    if (!left || !right) return left === right
    return (
      Math.abs(left.x - right.x) < 0.5 &&
      Math.abs(left.y - right.y) < 0.5 &&
      Math.abs(left.width - right.width) < 0.5 &&
      Math.abs(left.height - right.height) < 0.5
    )
  })
}

function GraphExplorer({
  activeEdgeIds,
  expanded,
  matchingNodeIds,
  onClose,
  onExpand,
  onModeChange,
  onQueryChange,
  onSelectNode,
  onTracePresetChange,
  onZoomChange,
  onZoomDelta,
  onZoomFit,
  onZoomIn,
  onZoomOut,
  panelMode,
  query,
  relatedNodeIds,
  sankey,
  selectedNodeId,
  selectedProfile,
  trace,
  tracePresetId,
  zoom,
  zoomPercent,
}: {
  activeEdgeIds: Set<string>
  expanded: boolean
  matchingNodeIds: Set<string>
  onClose?: () => void
  onExpand: () => void
  onModeChange: (mode: GraphPanelMode) => void
  onQueryChange: (value: string) => void
  onSelectNode: (nodeId: string) => void
  onTracePresetChange: (presetId: TracePresetId) => void
  onZoomChange: (value: number) => void
  onZoomDelta: (delta: number) => void
  onZoomFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  panelMode: GraphPanelMode
  query: string
  relatedNodeIds: Set<string>
  sankey: ReturnType<typeof buildSankeyFlows>
  selectedNodeId: string
  selectedProfile: VisibleGraphProfile
  trace: ReturnType<typeof findTraversalPath>
  tracePresetId: TracePresetId
  zoom: number
  zoomPercent: number
}) {
  const selectedNode = forceGraphNodesById.get(selectedNodeId)
  const firstCoreMatch = FORCE_GRAPH_NODES.find((node) => node.core && matchingNodeIds.has(node.id))
  const summary =
    panelMode === 'trace'
      ? 'Supplier and buyer route trace'
      : panelMode === 'financial'
        ? 'Financial anchors and capex pull'
        : `${selectedNode?.label ?? 'Selected company'} drilldown`

  return (
    <div className={expanded ? 'flex h-full min-h-0 flex-col bg-surface' : 'bg-surface'}>
      <div className="flex flex-col flex-wrap gap-3 border-b border-[var(--color-border)] bg-surface px-3 py-3 sm:px-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <div className="font-display text-base font-semibold leading-tight text-fg sm:text-lg">Memory market graph</div>
            <div className="mt-0.5 truncate font-mono text-[0.55rem] uppercase tracking-wider text-muted">{summary}</div>
          </div>
        </div>

        <label className="relative min-w-0 flex-1 lg:max-w-[430px]">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <span className="sr-only">Search graph</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && firstCoreMatch) onSelectNode(firstCoreMatch.id)
            }}
            placeholder="Search companies, technologies, suppliers..."
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-bg pl-9 pr-3 font-sans text-sm text-fg outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-[var(--color-muted)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-blog)_18%,transparent)]"
          />
        </label>

        <div className="w-full sm:w-[260px]">
          <GraphZoomControls
            onZoomFit={onZoomFit}
            onZoomChange={onZoomChange}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            zoomPercent={zoomPercent}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GraphStat label="Nodes" value={FORCE_GRAPH_NODES.length} />
          <GraphStat label="Edges" value={FORCE_GRAPH_EDGES.length} />
          <GraphStat label="Sources" value={MEMORY_CHIP_GRAPH.sources.length} />
          {expanded ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close expanded graph"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-bg px-3 py-2 font-mono text-[0.62rem] uppercase tracking-wider text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.96] motion-reduce:transition-none"
            >
              <X aria-hidden className="h-4 w-4" />
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand graph"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-fg px-3 py-2 font-mono text-[0.62rem] uppercase tracking-wider text-bg transition-[box-shadow,transform] duration-200 hover:shadow-md active:scale-[0.96] motion-reduce:transition-none"
            >
              <Expand aria-hidden className="h-4 w-4" />
              Expand
            </button>
          )}
        </div>
      </div>

      <div
        className={
          expanded
            ? 'grid min-h-0 flex-1 gap-px overflow-hidden bg-[var(--color-border)] lg:grid-cols-[224px_minmax(0,1fr)_380px]'
            : 'grid items-start gap-px bg-surface xl:grid-cols-[224px_minmax(0,1fr)_380px]'
        }
      >
        <GraphControlRail
          expanded={expanded}
          onModeChange={onModeChange}
          onZoomFit={onZoomFit}
          panelMode={panelMode}
        />

        <main className={expanded ? 'min-h-0 overflow-hidden bg-surface p-3' : 'min-w-0 self-start bg-surface p-3 sm:p-4'}>
          <GraphForceCanvas
            activeEdgeIds={activeEdgeIds}
            expanded={expanded}
            matchingNodeIds={matchingNodeIds}
            onSelectNode={onSelectNode}
            onZoomChange={onZoomChange}
            onZoomDelta={onZoomDelta}
            panelMode={panelMode}
            relatedNodeIds={relatedNodeIds}
            selectedNodeId={selectedNodeId}
            zoom={zoom}
          />
          {!expanded && <GraphRelationshipStrip />}
        </main>

        <GraphInspector
          expanded={expanded}
          panelMode={panelMode}
          sankey={sankey}
          selectedNodeId={selectedNodeId}
          selectedProfile={selectedProfile}
          trace={trace}
          tracePresetId={tracePresetId}
          onTracePresetChange={onTracePresetChange}
        />
      </div>

      <GraphBottomLegend expanded={expanded} />
    </div>
  )
}

function GraphStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-bg px-3 py-2 font-mono text-[0.58rem] uppercase tracking-wider text-muted">
      <span>{label}</span>
      <span className="rounded-md bg-surface px-1.5 py-0.5 text-fg tabular-nums">{value}</span>
    </div>
  )
}

function GraphControlRail({
  expanded,
  onModeChange,
  onZoomFit,
  panelMode,
}: {
  expanded: boolean
  onModeChange: (mode: GraphPanelMode) => void
  onZoomFit: () => void
  panelMode: GraphPanelMode
}) {
  return (
    <aside className={expanded ? 'hidden min-h-0 overflow-y-auto bg-surface p-3 lg:block' : 'self-start bg-surface p-2 sm:p-3 xl:p-4'}>
      <div className={expanded ? 'space-y-3' : 'hidden space-y-3 xl:block'}>
        <GraphModePanel onModeChange={onModeChange} panelMode={panelMode} />
        <div className="rounded-2xl border border-[var(--color-border)] bg-bg/75 p-3">
          <GraphNodeTypeLegend />
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-bg/75 p-3">
          <GraphEdgeStrengthLegend />
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-bg/75 p-2">
          <GraphFocusButton onZoomFit={onZoomFit} />
        </div>

        <GraphMiniMap />
      </div>

      {!expanded && (
        <div className="space-y-2 xl:hidden">
          <div className="grid gap-1.5 sm:grid-cols-3">
            <GraphModeButton
              active={panelMode === 'profile'}
              icon={<Network aria-hidden className="h-3.5 w-3.5" />}
              onClick={() => onModeChange('profile')}
            >
              Drilldown
            </GraphModeButton>
            <GraphModeButton
              active={panelMode === 'financial'}
              icon={<BarChart3 aria-hidden className="h-3.5 w-3.5" />}
              onClick={() => onModeChange('financial')}
            >
              Finance
            </GraphModeButton>
            <GraphModeButton
              active={panelMode === 'trace'}
              icon={<Route aria-hidden className="h-3.5 w-3.5" />}
              onClick={() => onModeChange('trace')}
            >
              Routes
            </GraphModeButton>
          </div>
          <details className="group rounded-2xl border border-[var(--color-border)] bg-bg/75">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-wider text-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Filter aria-hidden className="h-3.5 w-3.5" />
                Legend and controls
              </span>
              <span className="text-[0.52rem] group-open:hidden">Open</span>
              <span className="hidden text-[0.52rem] group-open:inline">Close</span>
            </summary>
            <div className="grid gap-4 border-t border-[var(--color-border)] px-3 py-3 sm:grid-cols-2">
              <GraphNodeTypeLegend />
              <GraphEdgeStrengthLegend />
              <div className="sm:col-span-2">
                <GraphFocusButton onZoomFit={onZoomFit} />
              </div>
            </div>
          </details>
        </div>
      )}
    </aside>
  )
}

function GraphModePanel({
  onModeChange,
  panelMode,
}: {
  onModeChange: (mode: GraphPanelMode) => void
  panelMode: GraphPanelMode
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-bg/75 p-2">
      <GraphModeButton
        active={panelMode === 'profile'}
        icon={<Network aria-hidden className="h-3.5 w-3.5" />}
        onClick={() => onModeChange('profile')}
      >
        Company Drilldown
      </GraphModeButton>
      <div className="mt-1.5 grid gap-1.5">
        <GraphModeButton
          active={panelMode === 'financial'}
          icon={<BarChart3 aria-hidden className="h-3.5 w-3.5" />}
          onClick={() => onModeChange('financial')}
        >
          Financial Flow
        </GraphModeButton>
        <GraphModeButton
          active={panelMode === 'trace'}
          icon={<Route aria-hidden className="h-3.5 w-3.5" />}
          onClick={() => onModeChange('trace')}
        >
          Route Trace
        </GraphModeButton>
      </div>
    </div>
  )
}

function GraphNodeTypeLegend() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-wider text-muted">
        <Filter aria-hidden className="h-3.5 w-3.5" />
        Node types
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {(['equipment', 'foundry', 'memory', 'accelerator', 'cloud', 'software', 'materials', 'server'] as VisualGraphNodeType[]).map((type) => (
          <div key={type} className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-wider text-muted">
            <span
              aria-hidden
              className="h-2.5 w-4 rounded-full"
              style={{ background: VISUAL_NODE_TYPE_COLORS[type] }}
            />
            <span>{VISUAL_NODE_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GraphEdgeStrengthLegend() {
  return (
    <div>
      <div className="mb-3 font-mono text-[0.58rem] uppercase tracking-wider text-muted">edge strength</div>
      {['very strong', 'strong', 'medium', 'weak', 'informational'].map((strength, index) => (
        <div key={strength} className="mb-2 flex items-center gap-3 last:mb-0">
          <span
            aria-hidden
            className="h-px flex-1 rounded-full bg-fg"
            style={{
              opacity: 0.82 - index * 0.13,
              borderTop: strength === 'informational' ? '1px dashed currentColor' : undefined,
              height: strength === 'very strong' ? 3 : strength === 'strong' ? 2 : 1,
            }}
          />
          <span className="w-24 font-mono text-[0.52rem] uppercase tracking-wider text-muted">{strength}</span>
        </div>
      ))}
    </div>
  )
}

function GraphFocusButton({ onZoomFit }: { onZoomFit: () => void }) {
  return (
    <button
      type="button"
      onClick={onZoomFit}
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-surface px-3 py-2 font-mono text-[0.58rem] uppercase tracking-wider text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.96] motion-reduce:transition-none"
    >
      <Focus aria-hidden className="h-3.5 w-3.5" />
      Focus selection
    </button>
  )
}

function GraphZoomControls({
  displayLabel = 'Zoom',
  fitLabel = 'Fit graph',
  onZoomChange,
  onZoomFit,
  onZoomIn,
  onZoomOut,
  sliderLabel = 'Graph zoom',
  zoomInLabel = 'Zoom In',
  zoomOutLabel = 'Zoom Out',
  zoomPercent,
}: {
  displayLabel?: string
  fitLabel?: string
  onZoomChange: (value: number) => void
  onZoomFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  sliderLabel?: string
  zoomInLabel?: string
  zoomOutLabel?: string
  zoomPercent: number
}) {
  return (
    <div className="inline-flex min-h-10 w-full items-center gap-1 rounded-xl border border-[var(--color-border)] bg-surface p-1 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-fg)_8%,transparent)]">
      <button
        type="button"
        onClick={onZoomOut}
        aria-label={zoomOutLabel}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.96] motion-reduce:transition-none"
      >
        <Minus aria-hidden className="h-4 w-4" />
      </button>
      <div className="min-w-[96px] flex-1 px-1">
        <div className="text-center font-mono text-[0.58rem] uppercase tracking-wider text-muted tabular-nums">
          {displayLabel} {zoomPercent}%
        </div>
        <input
          aria-label={sliderLabel}
          type="range"
          min={Math.round(GRAPH_ZOOM_MIN * 100)}
          max={Math.round(GRAPH_ZOOM_MAX * 100)}
          step={1}
          value={zoomPercent}
          onChange={(event) => onZoomChange(Number(event.target.value) / 100)}
          className="mt-1 block h-1 w-full accent-[var(--color-blog)]"
        />
      </div>
      <button
        type="button"
        onClick={onZoomFit}
        aria-label={fitLabel}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.96] motion-reduce:transition-none"
      >
        <Maximize2 aria-hidden className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label={zoomInLabel}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.96] motion-reduce:transition-none"
      >
        <Plus aria-hidden className="h-4 w-4" />
      </button>
    </div>
  )
}

function GraphModeButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-10 w-full items-center justify-start gap-2 rounded-xl border px-3 py-2 font-mono text-[0.62rem] uppercase tracking-wider transition-[background-color,border-color,box-shadow,color,transform] duration-200 active:scale-[0.96] motion-reduce:transition-none ${
        active
          ? 'border-transparent bg-fg text-bg shadow-sm'
          : 'border-[var(--color-border)] bg-bg/70 text-muted hover:border-[var(--color-muted)] hover:text-fg'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function GraphForceCanvas({
  activeEdgeIds,
  expanded,
  matchingNodeIds,
  onSelectNode,
  onZoomChange,
  onZoomDelta,
  panelMode,
  relatedNodeIds,
  selectedNodeId,
  zoom,
}: {
  activeEdgeIds: Set<string>
  expanded: boolean
  matchingNodeIds: Set<string>
  onSelectNode: (nodeId: string) => void
  onZoomChange: (value: number) => void
  onZoomDelta: (delta: number) => void
  panelMode: GraphPanelMode
  relatedNodeIds: Set<string>
  selectedNodeId: string
  zoom: number
}) {
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const graphLayerRef = useRef<HTMLDivElement | null>(null)
  const measuredGroupBounds = useMeasuredGraphGroupBounds(graphLayerRef, zoom, expanded)
  const selectedPosition = FORCE_LAYOUT_POSITIONS[selectedNodeId] ?? { x: 50, y: 50 }
  const activeNodeIds = new Set<string>(relatedNodeIds)
  activeEdgeIds.forEach((edgeId) => {
    const edge = FORCE_GRAPH_EDGES.find((item) => item.id === edgeId)
    if (edge) {
      activeNodeIds.add(edge.from)
      activeNodeIds.add(edge.to)
    }
  })

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const first = touches.item(0)
    const second = touches.item(1)
    if (!first || !second) return 0
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
  }

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    onZoomDelta(-event.deltaY * 0.0025)
  }

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return
    pinchRef.current = { distance: getTouchDistance(event.touches), zoom }
  }

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!pinchRef.current || event.touches.length !== 2) return
    event.preventDefault()
    const distance = getTouchDistance(event.touches)
    if (distance <= 0 || pinchRef.current.distance <= 0) return
    onZoomChange(pinchRef.current.zoom * (distance / pinchRef.current.distance))
  }

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) pinchRef.current = null
  }

  return (
    <div
      data-testid="knowledge-graph-canvas"
      onTouchCancel={() => {
        pinchRef.current = null
      }}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
      onWheel={onWheel}
      className={`relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-bg shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-fg)_8%,transparent)] ${
        expanded ? 'h-full min-h-[520px]' : 'min-h-[460px] sm:min-h-[600px] xl:min-h-[640px]'
      }`}
      style={{ containerType: 'inline-size', touchAction: 'pan-y' } as CSSProperties}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--color-fg) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-fg) 7%, transparent) 1px, transparent 1px)',
          backgroundSize: expanded ? '64px 64px' : '54px 54px',
        }}
      />

      <div
        ref={graphLayerRef}
        className="absolute inset-5 sm:inset-8"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: `${selectedPosition.x}% ${selectedPosition.y}%`,
        }}
      >
        <GraphGroupRegions bounds={measuredGroupBounds} />

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <marker id="kg-arrow" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3">
              <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
            </marker>
          </defs>
          {FORCE_GRAPH_EDGES.map((edge) => (
            <GraphForceEdge
              key={edge.id}
              active={activeEdgeIds.has(edge.id)}
              edge={edge}
              muted={(activeEdgeIds.size > 0 && !activeEdgeIds.has(edge.id)) || !matchingNodeIds.has(edge.from) || !matchingNodeIds.has(edge.to)}
            />
          ))}
        </svg>

        {FORCE_GRAPH_NODES.filter((node) => !node.core).map((node) => (
          <GraphForceNode
            key={node.id}
            active={activeNodeIds.has(node.id)}
            matched={matchingNodeIds.has(node.id)}
            node={node}
            onSelectNode={onSelectNode}
            panelMode={panelMode}
            selected={node.id === selectedNodeId}
          />
        ))}
        {FORCE_GRAPH_NODES.filter((node) => node.core).map((node) => (
          <GraphForceNode
            key={node.id}
            active={activeNodeIds.has(node.id)}
            matched={matchingNodeIds.has(node.id)}
            node={node}
            onSelectNode={onSelectNode}
            panelMode={panelMode}
            selected={node.id === selectedNodeId}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-30 hidden flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-surface/92 px-3 py-2 backdrop-blur sm:flex">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.55rem] uppercase tracking-wider text-muted">
          <span>
            {panelMode === 'trace'
              ? 'highlighting selected route'
              : panelMode === 'financial'
                ? 'highlighting capex and supplier links'
                : `selected: ${forceGraphNodesById.get(selectedNodeId)?.label ?? selectedNodeId}`}
          </span>
          <span className="hidden sm:inline">pinch or ctrl-scroll to zoom</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(EVIDENCE_STYLES).map((evidence) => (
            <span
              key={evidence.label}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-1.5 py-1 font-mono text-[0.5rem] uppercase tracking-wider text-muted"
            >
              <span aria-hidden className="h-1.5 w-3 rounded-full" style={{ background: evidence.color }} />
              {evidence.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function GraphGroupRegions({ bounds }: { bounds: Partial<Record<GraphClusterId, GraphGroupBounds>> }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {GRAPH_GROUP_REGIONS.map((region) => {
        const measured = bounds[region.id]
        const placement = measured
          ? {
              left: `${measured.x}px`,
              top: `${measured.y}px`,
              width: `${measured.width}px`,
              height: `${measured.height}px`,
            }
          : {
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }

        return (
          <div
            key={region.id}
            data-graph-group={region.id}
            className="absolute overflow-visible rounded-2xl border border-dashed shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-fg)_7%,transparent)] transition-[height,left,top,width] duration-300 ease-out motion-reduce:transition-none"
            style={{
              ...placement,
              borderColor: `color-mix(in srgb, ${region.accent} 40%, var(--color-border))`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${region.accent} 10%, transparent), color-mix(in srgb, var(--color-surface) 48%, transparent) 70%)`,
            }}
          >
            <div
              data-graph-group-title={region.id}
              className="absolute left-2 hidden max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-surface/92 px-1.5 font-mono text-[0.42rem] uppercase tracking-wider text-muted shadow-sm backdrop-blur sm:flex sm:text-[0.5rem]"
              style={{ top: GRAPH_GROUP_TITLE_OFFSET, minHeight: GRAPH_GROUP_TITLE_HEIGHT }}
            >
              <span aria-hidden className="h-1.5 w-3 shrink-0 rounded-full" style={{ background: region.accent }} />
              <span className="truncate">
                <span className="sm:hidden">{region.shortLabel}</span>
                <span className="hidden sm:inline">{region.label}</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GraphForceEdge({ active, edge, muted }: { active: boolean; edge: ForceGraphEdge; muted: boolean }) {
  const from = FORCE_LAYOUT_POSITIONS[edge.from]
  const to = FORCE_LAYOUT_POSITIONS[edge.to]
  if (!from || !to) return null

  const hashOffset = ((hashString(edge.id) % 21) - 10) / 10
  const middleX = (from.x + to.x) / 2
  const middleY = (from.y + to.y) / 2 + hashOffset * 4.8
  const d = `M ${from.x} ${from.y} Q ${middleX} ${middleY}, ${to.x} ${to.y}`
  const isContext = edge.kind === 'context'

  return (
    <path
      d={d}
      fill="none"
      markerEnd={active ? 'url(#kg-arrow)' : undefined}
      opacity={active ? 0.92 : muted ? 0.12 : isContext ? 0.22 : 0.36}
      stroke={getForceEdgeColor(edge)}
      strokeDasharray={edge.confidence === 'inferred' || isContext ? '2 2.4' : undefined}
      strokeLinecap="round"
      strokeWidth={active ? getForceEdgeWidth(edge) + 0.85 : getForceEdgeWidth(edge)}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function GraphForceNode({
  active,
  matched,
  node,
  onSelectNode,
  panelMode,
  selected,
}: {
  active: boolean
  matched: boolean
  node: ForceGraphNode
  onSelectNode: (nodeId: string) => void
  panelMode: GraphPanelMode
  selected: boolean
}) {
  const position = FORCE_LAYOUT_POSITIONS[node.id]
  if (!position) return null

  const accent = VISUAL_NODE_TYPE_COLORS[node.type]
  const width = node.core
    ? node.type === 'accelerator'
      ? 'clamp(48px, 13cqw, 136px)'
      : 'clamp(38px, 10.5cqw, 112px)'
    : undefined
  const dimmed = !matched || (!active && panelMode !== 'profile')
  const baseClass = `group relative w-full text-left shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 motion-reduce:transition-none ${
    selected ? 'bg-fg text-bg opacity-100' : node.core ? 'bg-surface/96 text-fg' : 'bg-surface/82 text-fg'
  } ${node.core ? 'min-h-10 px-1.5 py-1.5 sm:min-h-12 sm:px-2.5 sm:py-2' : 'min-h-5 px-0 py-0 xl:min-h-11 xl:px-2.5 xl:py-2'} ${dimmed ? 'opacity-45' : active || selected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`
  const shapeClass =
    node.type === 'accelerator'
      ? 'rounded-[18px]'
      : node.type === 'foundry'
        ? 'rounded-[14px]'
        : node.type === 'cloud'
          ? 'rounded-[16px]'
          : 'rounded-xl'
  const style = {
    borderColor: selected ? accent : active ? 'color-mix(in srgb, var(--color-fg) 26%, var(--color-border))' : 'var(--color-border)',
    boxShadow: selected ? `0 0 0 1px ${accent}, 0 18px 44px color-mix(in srgb, ${accent} 26%, transparent)` : undefined,
  } satisfies CSSProperties

  return (
    <div
      data-graph-cluster={node.cluster}
      data-graph-node-id={node.id}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${node.core ? '' : 'w-5 sm:w-6 lg:w-7 xl:w-[clamp(52px,7.4cqw,78px)]'}`}
      style={{ left: `${position.x}%`, top: `${position.y}%`, ...(width ? { width } : {}) }}
    >
      <button
        type="button"
        onClick={() => onSelectNode(node.id)}
        aria-label={`${node.label} ${node.type === 'accelerator' ? 'accelerator platform' : VISUAL_NODE_TYPE_LABELS[node.type]}`}
        className={`${baseClass} ${shapeClass} border hover:shadow-md active:scale-[0.96]`}
        style={style}
      >
        <GraphNodeInner accent={accent} node={node} selected={selected} />
      </button>
    </div>
  )
}

function getPrimaryFinancialMetric(nodeId: string) {
  const metrics = getVisibleProfileNode(nodeId)?.metrics ?? []
  const capex = metrics.find((metric) => metric.label.toLowerCase().includes('capex'))
  const revenue = metrics.find((metric) => /revenue|sales/.test(metric.label.toLowerCase()))
  return capex ?? revenue ?? metrics[0] ?? null
}

function GraphNodeInner({ accent, node, selected }: { accent: string; node: ForceGraphNode; selected: boolean }) {
  const metric = node.core ? getPrimaryFinancialMetric(node.id) : null

  return (
    <>
      <span
        aria-hidden
        className={`absolute rounded-full ${
          node.core
            ? 'left-1.5 top-1.5 h-1 w-4 sm:left-2 sm:top-2 sm:w-6'
            : 'left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 xl:left-2 xl:top-2 xl:h-1 xl:w-6 xl:translate-x-0 xl:translate-y-0'
        }`}
        style={{ background: selected ? 'currentColor' : accent }}
      />
      <div className={`min-w-0 pt-2 ${node.core ? '' : 'hidden xl:block'}`}>
        <span className="block min-w-0 text-balance font-display text-[0.52rem] font-semibold leading-tight sm:text-[0.76rem] xl:text-[0.82rem]">
          {node.label}
        </span>
      </div>
      <div className={`mt-1.5 truncate font-mono text-[0.42rem] uppercase tracking-wider sm:text-[0.48rem] ${node.core ? 'hidden sm:block' : 'hidden xl:block'} ${selected ? 'text-bg/70' : 'text-muted'}`}>
        {VISUAL_NODE_TYPE_LABELS[node.type]}
      </div>
      {metric && (
        <div
          className={`mt-1.5 hidden max-w-full items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.44rem] uppercase tracking-wider sm:inline-flex sm:text-[0.48rem] ${
            selected ? 'border-bg/25 bg-bg/10 text-bg/80' : 'border-[var(--color-border)] bg-bg/72 text-muted'
          }`}
        >
          <span className="truncate">{formatGraphMetric(metric.value, metric.unit)}</span>
        </div>
      )}
    </>
  )
}

function GraphInspector({
  expanded,
  onTracePresetChange,
  panelMode,
  sankey,
  selectedNodeId,
  selectedProfile,
  trace,
  tracePresetId,
}: {
  expanded: boolean
  onTracePresetChange: (presetId: TracePresetId) => void
  panelMode: GraphPanelMode
  sankey: ReturnType<typeof buildSankeyFlows>
  selectedNodeId: string
  selectedProfile: VisibleGraphProfile
  trace: ReturnType<typeof findTraversalPath>
  tracePresetId: TracePresetId
}) {
  const panelTitle =
    panelMode === 'financial'
      ? 'Financial Flow'
      : panelMode === 'trace'
        ? 'Route Trace'
        : `${selectedProfile.node.label} Details`

  if (expanded) {
    return (
      <aside className="min-h-0 overflow-y-auto bg-surface p-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-bg/70 p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-fg)_7%,transparent)] sm:p-5">
          <GraphInspectorContent
            panelMode={panelMode}
            sankey={sankey}
            selectedNodeId={selectedNodeId}
            selectedProfile={selectedProfile}
            trace={trace}
            tracePresetId={tracePresetId}
            onTracePresetChange={onTracePresetChange}
          />
        </div>
      </aside>
    )
  }

  return (
    <aside className="min-w-0 self-start bg-surface p-3 sm:p-4 xl:p-5">
      <details className="rounded-2xl border border-[var(--color-border)] bg-bg/70 xl:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-mono text-[0.58rem] uppercase tracking-wider text-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
          <span className="truncate">{panelTitle}</span>
          <span className="text-[0.52rem]">Open</span>
        </summary>
        <div className="border-t border-[var(--color-border)] p-4">
          <GraphInspectorContent
            panelMode={panelMode}
            sankey={sankey}
            selectedNodeId={selectedNodeId}
            selectedProfile={selectedProfile}
            trace={trace}
            tracePresetId={tracePresetId}
            onTracePresetChange={onTracePresetChange}
          />
        </div>
      </details>
      <div className="hidden rounded-2xl border border-[var(--color-border)] bg-bg/70 p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-fg)_7%,transparent)] sm:p-5 xl:block xl:max-h-[760px] xl:overflow-y-auto">
        <GraphInspectorContent
          panelMode={panelMode}
          sankey={sankey}
          selectedNodeId={selectedNodeId}
          selectedProfile={selectedProfile}
          trace={trace}
          tracePresetId={tracePresetId}
          onTracePresetChange={onTracePresetChange}
        />
      </div>
    </aside>
  )
}

function GraphInspectorContent({
  onTracePresetChange,
  panelMode,
  sankey,
  selectedNodeId,
  selectedProfile,
  trace,
  tracePresetId,
}: {
  onTracePresetChange: (presetId: TracePresetId) => void
  panelMode: GraphPanelMode
  sankey: ReturnType<typeof buildSankeyFlows>
  selectedNodeId: string
  selectedProfile: VisibleGraphProfile
  trace: ReturnType<typeof findTraversalPath>
  tracePresetId: TracePresetId
}) {
  if (panelMode === 'financial') {
    return <GraphFinancialPanel flows={sankey.items} totalValue={sankey.totalValue} />
  }

  if (panelMode === 'trace' && trace) {
    return (
      <GraphTracePanel
        path={trace}
        presets={TRACE_PRESETS}
        selectedPresetId={tracePresetId}
        onPresetChange={onTracePresetChange}
      />
    )
  }

  return (
    <>
      <GraphCompanyPanel profile={selectedProfile} />
      {selectedNodeId === 'nvidia' && <GraphSpendPreview flows={sankey.items} />}
    </>
  )
}

function GraphSpendPreview({ flows }: { flows: ReturnType<typeof buildSankeyFlows>['items'] }) {
  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-surface/70 p-3">
      <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">spend flow preview</div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="space-y-1.5">
          {['ASML', 'TSMC', 'SK hynix', 'Micron', 'Samsung'].map((label) => (
            <div key={label} className="rounded-md border border-[var(--color-border)] bg-bg px-2 py-1 font-mono text-[0.5rem] uppercase tracking-wider text-muted">
              {label}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-fg px-3 py-7 font-display text-sm font-semibold text-bg">NVIDIA</div>
        <div className="space-y-1.5">
          {flows.map((flow) => (
            <div key={flow.id} className="rounded-md border border-[var(--color-border)] bg-bg px-2 py-1 font-mono text-[0.5rem] uppercase tracking-wider text-muted">
              {graphNodesById.get(flow.from)?.label ?? flow.from}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GraphRelationshipStrip() {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {GRAPH_RELATIONSHIPS.map((relationship) => (
        <div key={`${relationship.from}-${relationship.to}`} className="min-w-0 rounded-xl border border-[var(--color-border)] bg-bg/75 px-3 py-2">
          <div className="flex min-w-0 items-center gap-1 font-mono text-[0.55rem] uppercase tracking-wider text-muted">
            <span className="truncate">{relationship.from}</span>
            <span aria-hidden>-&gt;</span>
            <span className="truncate">{relationship.to}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: relationship.color }} />
          <div className="mt-2 truncate font-mono text-[0.55rem] uppercase tracking-wider text-fg/75">{relationship.label}</div>
        </div>
      ))}
    </div>
  )
}

function GraphMiniMap() {
  return (
    <div className="hidden rounded-2xl border border-[var(--color-border)] bg-bg/75 p-2 lg:block">
      <div className="relative h-20 overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface">
        {FORCE_GRAPH_NODES.map((node) => {
          const position = FORCE_LAYOUT_POSITIONS[node.id]
          if (!position) return null
          return (
            <span
              key={node.id}
              aria-hidden
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                background: VISUAL_NODE_TYPE_COLORS[node.type],
                opacity: node.core ? 0.9 : 0.35,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function GraphBottomLegend({ expanded }: { expanded: boolean }) {
  return (
    <div className={`${expanded ? 'grid' : 'hidden xl:grid'} gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] lg:grid-cols-[1fr_1fr_1fr]`}>
      <div className="bg-surface px-4 py-3">
        <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">legend</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['equipment', 'foundry', 'memory', 'accelerator', 'cloud', 'software'] as VisualGraphNodeType[]).map((type) => (
            <div key={type} className="flex items-center gap-2 font-mono text-[0.52rem] uppercase tracking-wider text-muted">
              <span aria-hidden className="h-2 w-4 rounded-full" style={{ background: VISUAL_NODE_TYPE_COLORS[type] }} />
              {VISUAL_NODE_TYPE_LABELS[type]}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface px-4 py-3">
        <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">relationship types</div>
        <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[0.52rem] uppercase tracking-wider text-muted">
          <span>sells / supplies</span>
          <span>packages / fabricates</span>
          <span>buys / consumes</span>
          <span>context links</span>
        </div>
      </div>
      <div className="bg-surface px-4 py-3">
        <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">time view</div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-[var(--color-border)]">
            <div className="h-full w-[88%] rounded-full bg-fg" />
          </div>
          <button
            type="button"
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-bg px-2 font-mono text-[0.52rem] uppercase tracking-wider text-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.96]"
          >
            <RotateCcw aria-hidden className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

function computeForceLayout(nodes: ForceGraphNode[], edges: ForceGraphEdge[]) {
  const radii = new Map(nodes.map((node) => [node.id, forceGraphNodeRadius(node)]))
  const points = new Map(
    nodes.map((node) => [
      node.id,
      {
        x: node.seed.x,
        y: node.seed.y,
        vx: 0,
        vy: 0,
        seed: node.seed,
        weight: node.weight,
      },
    ]),
  )

  for (let iteration = 0; iteration < 190; iteration += 1) {
    const cooling = 1 - iteration / 220
    for (let i = 0; i < nodes.length; i += 1) {
      const a = points.get(nodes[i].id)
      if (!a) continue
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = points.get(nodes[j].id)
        if (!b) continue
        const dx = a.x - b.x || 0.01
        const dy = a.y - b.y || 0.01
        const distanceSq = Math.max(dx * dx + dy * dy, 24)
        const force = ((nodes[i].weight + nodes[j].weight) * 12.8) / distanceSq
        a.vx += dx * force * cooling
        a.vy += dy * force * cooling
        b.vx -= dx * force * cooling
        b.vy -= dy * force * cooling
      }
    }

    edges.forEach((edge) => {
      const from = points.get(edge.from)
      const to = points.get(edge.to)
      if (!from || !to) return
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.max(Math.hypot(dx, dy), 1)
      const target = edge.strength === 'very strong' ? 18 : edge.strength === 'strong' ? 22 : edge.strength === 'medium' ? 26 : 30
      const pull = ((distance - target) / distance) * (edge.kind === 'context' ? 0.009 : 0.018) * cooling
      from.vx += dx * pull
      from.vy += dy * pull
      to.vx -= dx * pull
      to.vy -= dy * pull
    })

    for (let i = 0; i < nodes.length; i += 1) {
      const a = points.get(nodes[i].id)
      if (!a) continue
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = points.get(nodes[j].id)
        if (!b) continue
        const dx = a.x - b.x || 0.01
        const dy = a.y - b.y || 0.01
        const distance = Math.max(Math.hypot(dx, dy), 0.01)
        const minDistance =
          ((radii.get(nodes[i].id) ?? 5) + (radii.get(nodes[j].id) ?? 5)) *
          (nodes[i].cluster === nodes[j].cluster ? 0.96 : 0.82)
        if (distance >= minDistance) continue
        const push = ((minDistance - distance) / distance) * 0.19 * cooling
        a.vx += dx * push
        a.vy += dy * push
        b.vx -= dx * push
        b.vy -= dy * push
      }
    }

    nodes.forEach((node) => {
      const point = points.get(node.id)
      if (!point) return
      const region = GRAPH_GROUP_REGION_BY_ID.get(node.cluster)
      if (region) {
        const radius = radii.get(node.id) ?? 5
        const centerX = region.x + region.width / 2
        const centerY = region.y + region.height / 2
        const left = region.x + radius * 0.34
        const right = region.x + region.width - radius * 0.34
        const top = region.y + radius * 0.36
        const bottom = region.y + region.height - radius * 0.36
        const centerPull = node.core ? 0.0065 : 0.0105
        const wallPush = node.core ? 0.035 : 0.05

        point.vx += (centerX - point.x) * centerPull * cooling
        point.vy += (centerY - point.y) * centerPull * cooling
        if (point.x < left) point.vx += (left - point.x) * wallPush * cooling
        if (point.x > right) point.vx -= (point.x - right) * wallPush * cooling
        if (point.y < top) point.vy += (top - point.y) * wallPush * cooling
        if (point.y > bottom) point.vy -= (point.y - bottom) * wallPush * cooling
      }
      point.vx += (point.seed.x - point.x) * 0.018
      point.vy += (point.seed.y - point.y) * 0.018
      point.vx += (50 - point.x) * 0.0015
      point.vy += (52 - point.y) * 0.0015
      point.vx *= 0.7
      point.vy *= 0.7
      point.x = clamp(point.x + point.vx, 6, 94)
      point.y = clamp(point.y + point.vy, 9, 91)
    })
  }

  return Object.fromEntries(Array.from(points.entries()).map(([id, point]) => [id, { x: point.x, y: point.y }]))
}

function forceGraphNodeRadius(node: ForceGraphNode) {
  if (node.type === 'accelerator') return 8.4
  if (node.core) return 7.1
  return 6.1
}

function getForceEdgeColor(edge: ForceGraphEdge) {
  if (edge.kind === 'context') return 'color-mix(in srgb, var(--color-fg) 46%, transparent)'
  return EDGE_COLORS[edge.kind]
}

function getForceEdgeWidth(edge: ForceGraphEdge) {
  if (edge.strength === 'very strong') return 2.2
  if (edge.strength === 'strong') return 1.65
  if (edge.strength === 'medium') return 1.15
  if (edge.strength === 'weak') return 0.8
  return 0.65
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}


function GraphCompanyPanel({ profile }: { profile: VisibleGraphProfile }) {
  const visibleEdges = [...profile.upstream, ...profile.downstream].slice(0, 7)

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">
            {VISUAL_NODE_TYPE_LABELS[profile.node.type]} / {profile.node.region}
          </div>
          <h3 className="mt-1 text-balance font-display text-2xl font-semibold leading-tight text-fg">
            {profile.node.label}
          </h3>
        </div>
        <span
          className="rounded-lg border bg-surface/70 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-wider"
          style={{ borderColor: VISUAL_NODE_TYPE_COLORS[profile.node.type], color: VISUAL_NODE_TYPE_COLORS[profile.node.type] }}
        >
          drilldown
        </span>
      </div>

      <p className="mt-4 text-pretty font-sans text-sm leading-6 text-fg/75">{profile.node.summary}</p>

      {profile.metrics.length > 0 && (
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2">
          {profile.metrics.map((metric) => (
            <Metric
              key={`${metric.label}-${metric.period}`}
              label={metric.label}
              value={formatGraphMetric(metric.value, metric.unit)}
              accent={VISUAL_NODE_TYPE_COLORS[profile.node.type]}
            />
          ))}
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">relationships</div>
          <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted tabular-nums">
            {visibleEdges.length} shown
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {visibleEdges.map((edge) => (
            <GraphEdgeRow key={edge.id} edge={edge} />
          ))}
        </div>
      </div>

      <GraphSourceList sources={profile.sources.slice(0, 4)} />
    </div>
  )
}

function getProfileEvidenceStyle(confidence: ForceGraphEdge['confidence']) {
  if (confidence === 'context') return { label: 'context', color: '#9ca3af' }
  return EVIDENCE_STYLES[confidence]
}

function getProfileEdgeColor(edge: ForceGraphEdge) {
  if (edge.kind === 'context') return '#8b8f9a'
  return EDGE_COLORS[edge.kind]
}

function GraphEdgeRow({ edge }: { edge: ForceGraphEdge }) {
  const from = forceGraphNodesById.get(edge.from)
  const to = forceGraphNodesById.get(edge.to)
  const evidence = getProfileEvidenceStyle(edge.confidence)

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface/70 px-3 py-2.5">
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-1" style={{ background: getProfileEdgeColor(edge) }} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 pl-1 font-mono text-[0.62rem] uppercase tracking-wider text-fg/85">
          {from?.label ?? edge.from} -&gt; {to?.label ?? edge.to}
        </span>
        <span
          className="rounded-md border bg-bg/70 px-2 py-0.5 font-mono text-[0.52rem] uppercase tracking-wider"
          style={{ borderColor: evidence.color, color: evidence.color }}
        >
          {evidence.label}
        </span>
      </div>
      <div className="mt-1 pl-1 font-sans text-xs leading-5 text-fg/65">{edge.label}</div>
    </div>
  )
}

function GraphFinancialPanel({ flows, totalValue }: { flows: ReturnType<typeof buildSankeyFlows>['items']; totalValue: number }) {
  const anchorRows = MEMORY_CHIP_GRAPH.nodes
    .map((node) => {
      const metric = getPrimaryFinancialMetric(node.id)
      const source = metric ? graphSourcesById.get(metric.sourceId) : undefined
      return { node, metric, source }
    })
    .filter((row) => row.metric)
  const sourceList = Array.from(
    new Map(anchorRows.flatMap((row) => (row.source ? [[row.source.id, row.source] as const] : []))).values(),
  )

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">financial layer</div>
          <div className="mt-1 font-display text-2xl font-semibold leading-tight text-fg">Financial Flow</div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-surface/70 px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider text-blog tabular-nums">
          USD {totalValue.toLocaleString()}B
        </div>
      </div>
      <p className="mt-4 text-pretty font-sans text-sm leading-6 text-fg/75">
        This layer links hyperscaler capex, accelerator revenue, supplier revenue, and modeled packaging capex. It is
        a source-backed market map, not a purchase-order allocation model.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Metric label="cloud capex anchors" value={`$${fmt.format(totalValue)}B`} accent={ORANGE} />
        <Metric label="nodes with anchors" value={`${anchorRows.length}/${MEMORY_CHIP_GRAPH.nodes.length}`} accent={TEAL} />
      </div>

      <div className="mt-5 space-y-3">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">hyperscaler capex pull</div>
        {flows.map((flow) => (
          <div key={flow.id} className="rounded-xl border border-[var(--color-border)] bg-surface/70 px-3 py-3">
            <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[0.58rem] uppercase tracking-wider text-muted">
              <span className="min-w-0 text-pretty">{flow.label}</span>
              <span className="shrink-0 tabular-nums">{formatGraphMetric(flow.value ?? 0, flow.unit ?? '')}</span>
            </div>
            <div className="h-8 overflow-hidden rounded-lg border border-[var(--color-border)] bg-bg/80">
              <div
                className="flex h-full min-w-8 items-center justify-end px-2 font-mono text-[0.55rem] tabular-nums text-[#050506] transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${flow.width}%`, background: EDGE_COLORS[flow.kind] }}
              >
                {fmt.format(flow.percent)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">company financial anchors</div>
        <div className="mt-3 grid gap-2">
          {anchorRows.map(({ metric, node, source }) => {
            if (!metric) return null
            return (
              <div key={node.id} className="rounded-xl border border-[var(--color-border)] bg-surface/70 px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-semibold leading-tight text-fg">{node.label}</div>
                    <div className="mt-1 truncate font-mono text-[0.52rem] uppercase tracking-wider text-muted">
                      {metric.label} / {metric.period}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg border border-[var(--color-border)] bg-bg/70 px-2 py-1 font-mono text-[0.58rem] uppercase tracking-wider text-fg tabular-nums">
                    {formatGraphMetric(metric.value, metric.unit)}
                  </div>
                </div>
                {source && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block truncate font-mono text-[0.52rem] uppercase tracking-wider text-muted underline decoration-[var(--color-border)] underline-offset-4 transition-colors hover:text-fg"
                  >
                    {source.publisher}: {source.date}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <GraphSourceList sources={sourceList.slice(0, 5)} />
    </div>
  )
}

function GraphTracePanel({
  onPresetChange,
  path,
  presets,
  selectedPresetId,
}: {
  onPresetChange: (presetId: TracePresetId) => void
  path: NonNullable<ReturnType<typeof findTraversalPath>>
  presets: typeof TRACE_PRESETS
  selectedPresetId: TracePresetId
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">path trace</div>
      <div className="mt-1 text-balance font-display text-2xl font-semibold leading-tight text-fg">
        {path.nodes.map((node) => node.label).join(' -> ')}
      </div>
      <div className="mt-3 font-mono text-[0.62rem] uppercase tracking-wider text-muted">
        worst-link evidence: {path.confidence}
      </div>
      <div className="mt-4 grid gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPresetChange(preset.id)}
            aria-pressed={preset.id === selectedPresetId}
            className={`rounded-xl border px-3 py-2 text-left transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] motion-reduce:transition-none ${
              preset.id === selectedPresetId
                ? 'border-transparent bg-fg text-bg'
                : 'border-[var(--color-border)] bg-surface/70 text-fg hover:border-[var(--color-muted)]'
            }`}
          >
            <span className="block font-mono text-[0.58rem] uppercase tracking-wider">{preset.label}</span>
            <span className={`mt-0.5 block font-sans text-xs ${preset.id === selectedPresetId ? 'text-bg/70' : 'text-muted'}`}>
              {preset.note}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {path.edges.map((edge, index) => {
          const evidence = EVIDENCE_STYLES[edge.confidence]
          const sources = edge.sourceIds.map((id) => graphSourcesById.get(id)).filter((source): source is GraphSource => Boolean(source))
          return (
            <div key={edge.id} className="rounded-xl border border-[var(--color-border)] bg-surface/70 px-3 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[0.58rem] text-[#050506] tabular-nums"
                  style={{ background: EDGE_COLORS[edge.kind] }}
                >
                  {index + 1}
                </span>
                <span className="text-pretty font-mono text-[0.62rem] uppercase tracking-wider text-fg/85">{edge.label}</span>
              </div>
              <p className="mt-2 text-pretty font-sans text-xs leading-5 text-fg/65">{edge.note}</p>
              <div
                className="mt-2 inline-flex rounded-md border bg-bg/70 px-2 py-0.5 font-mono text-[0.52rem] uppercase tracking-wider"
                style={{ borderColor: evidence.color, color: evidence.color }}
              >
                {evidence.label}
              </div>
              <div className="mt-2 space-y-1">
                {sources.slice(0, 2).map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden text-ellipsis font-mono text-[0.55rem] uppercase tracking-wider text-muted underline decoration-[var(--color-border)] underline-offset-4 transition-colors hover:text-fg"
                  >
                    {source.publisher}: {source.title}
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GraphSourceList({ sources }: { sources: GraphSource[] }) {
  if (sources.length === 0) return null

  return (
    <div className="mt-5">
      <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">sources</div>
      <div className="mt-3 space-y-1.5">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-[var(--color-border)] bg-surface/70 px-3 py-2 font-mono text-[0.55rem] uppercase tracking-wider text-muted no-underline transition-[border-color,color,transform] duration-200 hover:border-[var(--color-muted)] hover:text-fg active:scale-[0.99] motion-reduce:transition-none"
          >
            {source.publisher} / {source.date}
          </a>
        ))}
      </div>
    </div>
  )
}

function formatGraphMetric(value: number, unit: string) {
  const normalized = unit.toLowerCase()
  if (normalized.startsWith('usd billions')) return `$${fmt.format(value)}B`
  if (normalized.startsWith('eur billions')) return `€${fmt.format(value)}B`
  if (normalized.startsWith('krw trillions')) return `KRW ${fmt.format(value)}T`
  if (normalized.startsWith('ntd billions')) return `NT$${fmt.format(value)}B`
  return `${fmt.format(value)} ${unit}`
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-surface/70 px-3 py-2.5">
      <div className="truncate font-mono text-[0.55rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 break-words font-display text-lg font-semibold leading-tight tabular-nums" style={{ color: accent }}>
        {value}
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-wider text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {value.toLocaleString()} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--color-blog)]"
        aria-label={label}
      />
    </label>
  )
}

function StackedBar({
  label,
  total,
  max,
  segments,
}: {
  label: string
  total: number
  max: number
  segments: { value: number; color: string; label: string }[]
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[0.62rem] tabular-nums text-muted">
        <span>{label}</span>
        <span>{total} GB</span>
      </div>
      <div className="flex h-8 overflow-hidden rounded-lg border border-[var(--color-border)] bg-bg" style={{ width: `${(total / max) * 100}%`, minWidth: '16%' }}>
        {segments.map((segment) => (
          <div
            key={segment.label}
            title={`${segment.label}: ${segment.value} GB`}
            style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }}
          />
        ))}
      </div>
    </div>
  )
}

function Pressure({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[0.58rem] uppercase tracking-wider text-muted">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}
