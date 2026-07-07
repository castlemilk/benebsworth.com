'use client'

import { useMemo, useState } from 'react'

type StepId = 'anchor' | 'draft' | 'verify' | 'system'
type LoadId = 'light' | 'balanced' | 'heavy'

const accent = 'var(--color-blog)'
const green = '#34d399'
const amber = '#f5a623'
const red = '#f87171'

const steps: Array<{ id: StepId; label: string; title: string; detail: string }> = [
  {
    id: 'anchor',
    label: 'Anchor',
    title: 'The target model pays for one real token',
    detail: 'Prompt tokens A B C go through the full model once. The produced token D becomes the anchor for the next draft block.',
  },
  {
    id: 'draft',
    label: 'Parallel draft',
    title: 'A heavy parallel pass proposes the whole block',
    detail: 'The DFlash-style backbone predicts all draft positions together, while a tiny sequential head injects local token-to-token dependence.',
  },
  {
    id: 'verify',
    label: 'Verify prefix',
    title: 'The scheduler keeps only the prefix worth verifying',
    detail: 'Confidence scores are multiplied into prefix survival probabilities. The target model verifies the selected prefix in one batch.',
  },
  {
    id: 'system',
    label: 'System view',
    title: 'The right prefix length depends on live engine load',
    detail: 'When target capacity is loose, verify more. When many users are active, trim risky suffix tokens before they consume batch slots.',
  },
]

const draftTokens = [
  { token: 'E', confidence: 0.96, accepted: true },
  { token: 'F', confidence: 0.88, accepted: true },
  { token: 'G', confidence: 0.62, accepted: false },
  { token: 'H', confidence: 0.18, accepted: false },
]

const loadProfiles: Record<LoadId, { label: string; budget: number; note: string }> = {
  light: {
    label: 'Light load',
    budget: 4,
    note: 'Light load verifies more because spare target capacity makes the marginal suffix cheap.',
  },
  balanced: {
    label: 'Balanced load',
    budget: 3,
    note: 'Balanced load keeps the prefix whose expected accepted tokens still justify a target pass.',
  },
  heavy: {
    label: 'Heavy load',
    budget: 2,
    note: 'Under heavy load trims earlier because low-confidence suffixes compete with other active requests.',
  },
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function TokenPill({
  label,
  tone = 'neutral',
  muted = false,
}: {
  label: string
  tone?: 'neutral' | 'accent' | 'green' | 'amber' | 'red'
  muted?: boolean
}) {
  const tones = {
    neutral: 'border-[var(--color-border)] bg-bg text-fg',
    accent: 'border-blog/55 bg-blog/15 text-fg',
    green: 'border-emerald-400/45 bg-emerald-400/15 text-fg',
    amber: 'border-amber-400/45 bg-amber-400/15 text-fg',
    red: 'border-red-400/45 bg-red-400/15 text-fg',
  }

  return (
    <span
      className={classNames(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-mono text-sm font-semibold',
        tones[tone],
        muted && 'opacity-40',
      )}
    >
      {label}
    </span>
  )
}

function SurvivalBars({ budget }: { budget: number }) {
  let running = 1
  const rows = draftTokens.map((item, index) => {
    running *= item.confidence
    return {
      ...item,
      survival: running,
      keep: index < budget,
    }
  })

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.token} className="grid grid-cols-[2rem_1fr_3.5rem] items-center gap-3">
          <span className="font-mono text-sm text-fg">{row.token}</span>
          <div className="h-2 overflow-hidden rounded-full bg-fg/10" aria-hidden>
            <div
              className={classNames('h-full rounded-full', row.keep ? 'bg-blog' : 'bg-fg/25')}
              style={{ width: `${Math.round(row.survival * 100)}%` }}
            />
          </div>
          <span className={classNames('text-right font-mono text-xs', row.keep ? 'text-fg' : 'text-muted')}>
            {Math.round(row.survival * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export function DeepSpecArchitecture() {
  const [step, setStep] = useState<StepId>('draft')
  const [load, setLoad] = useState<LoadId>('balanced')

  const activeStep = steps.find((item) => item.id === step) ?? steps[1]
  const profile = loadProfiles[load]
  const keepCount = step === 'system' ? profile.budget : 3
  const kept = draftTokens.slice(0, keepCount).map((item) => item.token)
  const dropped = draftTokens.slice(keepCount).map((item) => item.token)

  const activeIndex = steps.findIndex((item) => item.id === step)

  const linkOpacity = useMemo(() => {
    return {
      anchorToDraft: activeIndex >= 0 ? 1 : 0.3,
      draftToScheduler: activeIndex >= 1 ? 1 : 0.3,
      schedulerToTarget: activeIndex >= 2 ? 1 : 0.3,
    }
  }, [activeIndex])

  return (
    <section
      data-testid="deepspec-architecture"
      className="not-prose my-9 overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface text-fg shadow-sm"
      aria-label="DeepSpec DSpark architecture walkthrough"
    >
      <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-muted">DeepSpec / DSpark</p>
            <h3 className="mt-1 text-xl font-semibold leading-tight text-fg">Speculate, score, then verify only the useful prefix</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {steps.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={step === item.id}
                onClick={() => setStep(item.id)}
                className={classNames(
                  'rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors',
                  step === item.id
                    ? 'border-blog bg-blog/15 text-fg'
                    : 'border-[var(--color-border)] bg-bg text-muted hover:border-fg/25 hover:text-fg',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.65fr_0.95fr]">
        <div className="border-b border-[var(--color-border)] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <svg viewBox="0 0 760 420" role="img" aria-label="DSpark decoding cycle from target anchor through draft, scheduler and verification" className="h-auto w-full">
            <defs>
              <marker id="dspark-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={accent} />
              </marker>
              <linearGradient id="dspark-backbone" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={accent} stopOpacity="0.22" />
                <stop offset="1" stopColor={amber} stopOpacity="0.22" />
              </linearGradient>
            </defs>

            <rect x="22" y="42" width="148" height="126" rx="14" fill="var(--color-bg)" stroke="var(--color-border)" />
            <text x="44" y="76" fill="currentColor" fontSize="15" fontWeight="700">Target model</text>
            <text x="44" y="101" fill="var(--color-muted)" fontSize="12">real forward pass</text>
            {['A', 'B', 'C'].map((token, index) => (
              <g key={token}>
                <rect x={43 + index * 33} y="122" width="25" height="25" rx="5" fill="var(--color-surface)" stroke="var(--color-border)" />
                <text x={55.5 + index * 33} y="140" textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="monospace">{token}</text>
              </g>
            ))}
            <rect x="129" y="122" width="25" height="25" rx="5" fill={accent} fillOpacity="0.18" stroke={accent} />
            <text x="141.5" y="140" textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="monospace">D</text>

            <path d="M173 106 C220 106 218 106 252 106" stroke={accent} strokeWidth="2.5" fill="none" markerEnd="url(#dspark-arrow)" opacity={linkOpacity.anchorToDraft} />

            <rect x="256" y="30" width="246" height="158" rx="16" fill="url(#dspark-backbone)" stroke={step === 'draft' ? accent : 'var(--color-border)'} strokeWidth={step === 'draft' ? 2.5 : 1.2} />
            <text x="282" y="67" fill="currentColor" fontSize="16" fontWeight="700">Parallel drafter</text>
            <text x="282" y="91" fill="var(--color-muted)" fontSize="12">one backbone pass over the block</text>
            <rect x="281" y="113" width="196" height="37" rx="9" fill="var(--color-bg)" fillOpacity="0.7" stroke="var(--color-border)" />
            <text x="379" y="136" textAnchor="middle" fill="currentColor" fontSize="13">D + mask + mask + mask</text>
            <rect x="305" y="158" width="148" height="18" rx="9" fill={green} fillOpacity="0.22" />
            <text x="379" y="172" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">sequential head</text>

            <path d="M505 106 C548 106 548 106 585 106" stroke={accent} strokeWidth="2.5" fill="none" markerEnd="url(#dspark-arrow)" opacity={linkOpacity.draftToScheduler} />

            <rect x="589" y="42" width="149" height="126" rx="14" fill="var(--color-bg)" stroke={step === 'verify' || step === 'system' ? accent : 'var(--color-border)'} strokeWidth={step === 'verify' || step === 'system' ? 2.5 : 1.2} />
            <text x="612" y="74" fill="currentColor" fontSize="15" fontWeight="700">Confidence scheduler</text>
            <text x="612" y="98" fill="var(--color-muted)" fontSize="12">prefix survival</text>
            {[0.96, 0.84, 0.52, 0.09].map((value, index) => (
              <g key={index}>
                <rect x="613" y={116 + index * 11} width="86" height="6" rx="3" fill="currentColor" opacity="0.08" />
                <rect x="613" y={116 + index * 11} width={86 * value} height="6" rx="3" fill={index < keepCount ? accent : 'currentColor'} opacity={index < keepCount ? 0.95 : 0.22} />
              </g>
            ))}

            <path d="M663 173 C663 234 557 236 502 257" stroke={accent} strokeWidth="2.5" fill="none" markerEnd="url(#dspark-arrow)" opacity={linkOpacity.schedulerToTarget} />

            <rect x="247" y="243" width="266" height="137" rx="16" fill="var(--color-bg)" stroke="var(--color-border)" />
            <text x="276" y="276" fill="currentColor" fontSize="16" fontWeight="700">Target verification</text>
            <text x="276" y="300" fill="var(--color-muted)" fontSize="12">batch check, accept longest prefix</text>
            {draftTokens.map((item, index) => {
              const x = 281 + index * 48
              const fill = index < keepCount ? (item.accepted ? green : red) : 'currentColor'
              const opacity = index < keepCount ? 0.25 : 0.08
              return (
                <g key={item.token}>
                  <rect x={x} y="325" width="31" height="31" rx="7" fill={fill} fillOpacity={opacity} stroke={index < keepCount ? fill : 'var(--color-border)'} />
                  <text x={x + 15.5} y="346" textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="monospace">{item.token}</text>
                </g>
              )
            })}
            <rect x="474" y="325" width="31" height="31" rx="7" fill={red} fillOpacity="0.18" stroke={red} />
            <text x="489.5" y="346" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace">G*</text>
          </svg>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-mono text-xs uppercase text-muted">{activeStep.label}</p>
          <h4 className="mt-1 text-lg font-semibold leading-tight text-fg">{activeStep.title}</h4>
          <p className="mt-3 text-sm leading-6 text-fg/78">{activeStep.detail}</p>

          <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-bg p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TokenPill label="A" />
              <TokenPill label="B" />
              <TokenPill label="C" />
              <span className="font-mono text-muted">-&gt;</span>
              <TokenPill label="D" tone="accent" />
              <span className="font-mono text-muted">-&gt;</span>
              {draftTokens.map((item, index) => (
                <TokenPill
                  key={item.token}
                  label={item.token}
                  tone={index < keepCount ? (item.accepted ? 'green' : 'amber') : 'red'}
                  muted={index >= keepCount}
                />
              ))}
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3">
                <p className="font-mono text-xs uppercase text-emerald-300">Keep {kept.join(' ')}</p>
                <p className="mt-1 text-fg/75">Highest expected return for this pass.</p>
              </div>
              <div className="rounded-md border border-red-400/25 bg-red-400/10 p-3">
                <p className="font-mono text-xs uppercase text-red-300">Drop {dropped.join(' ') || 'nothing'}</p>
                <p className="mt-1 text-fg/75">Avoid spending target capacity on weak suffixes.</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-xs uppercase text-muted">Prefix survival</p>
              <span className="rounded-full border border-[var(--color-border)] px-2 py-1 font-mono text-xs text-muted">budget {keepCount}</span>
            </div>
            <SurvivalBars budget={keepCount} />
          </div>

          {step === 'system' ? (
            <div className="mt-5">
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(loadProfiles) as LoadId[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={load === key}
                    onClick={() => setLoad(key)}
                    className={classNames(
                      'rounded-md border px-2 py-2 text-xs font-semibold transition-colors',
                      load === key
                        ? 'border-blog bg-blog/15 text-fg'
                        : 'border-[var(--color-border)] bg-bg text-muted hover:text-fg',
                    )}
                  >
                    {loadProfiles[key].label}
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-lg border border-[var(--color-border)] bg-bg p-3 text-sm leading-6 text-fg/78">
                {profile.note}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Light load verifies more; heavy load trims earlier so batch slots stay available for other requests.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
