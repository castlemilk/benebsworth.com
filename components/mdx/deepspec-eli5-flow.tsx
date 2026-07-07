'use client'

import { useMemo, useState } from 'react'

type StageId = 'serial' | 'guess' | 'dspark'

const accent = 'var(--color-blog)'
const green = '#34d399'
const amber = '#f5a623'
const red = '#f87171'

const stages: Array<{
  id: StageId
  button: string
  kicker: string
  title: string
  summary: string
  problem: string
  move: string
  result: string
  targetCalls: string
  accepted: string
  wasted: string
}> = [
  {
    id: 'serial',
    button: 'One token at a time',
    kicker: 'Baseline',
    title: 'Pay the big model every step',
    summary: 'One expensive forward pass produces one token. It is simple, exact, and painfully serial.',
    problem: 'The target model cannot move the cursor more than one token per pass.',
    move: 'Nothing is guessed. The big model owns every decision.',
    result: 'Quality is clean, but latency stacks up token by token.',
    targetCalls: '4 target passes',
    accepted: '4 accepted',
    wasted: '0 guessed',
  },
  {
    id: 'guess',
    button: 'Guess ahead',
    kicker: 'Speculation',
    title: 'Guess four tokens, verify once',
    summary: 'A small drafter races ahead. The target checks the whole block and accepts the longest prefix that still matches.',
    problem: 'Bad suffixes are expensive guesses because they still enter the verification batch.',
    move: 'Speed comes from replacing several target passes with one target verification pass.',
    result: 'Great when the draft is right. Wasteful when later guesses decay.',
    targetCalls: '1 target pass',
    accepted: '2 accepted',
    wasted: '2 rejected',
  },
  {
    id: 'dspark',
    button: 'DSpark',
    kicker: 'Scheduled speculation',
    title: 'Schedule only the useful prefix',
    summary: 'DSpark keeps the fast parallel draft, adds a tiny sequential coherence head, then verifies only the prefix whose confidence pays for itself.',
    problem: 'The hard part is not guessing. It is deciding which guessed tokens deserve target-model capacity.',
    move: 'Parallel draft stays fast; the confidence scheduler trims weak suffix tokens before verification.',
    result: 'The target sees less low-value work, especially when the serving engine is busy.',
    targetCalls: '1 target pass',
    accepted: '3 accepted',
    wasted: '1 trimmed',
  },
]

const tokenRows: Record<StageId, Array<{ label: string; state: 'prompt' | 'target' | 'draft' | 'accepted' | 'rejected' | 'trimmed' }>> = {
  serial: [
    { label: 'A', state: 'prompt' },
    { label: 'B', state: 'prompt' },
    { label: 'C', state: 'prompt' },
    { label: 'D', state: 'target' },
    { label: 'E', state: 'target' },
    { label: 'F', state: 'target' },
    { label: 'G', state: 'target' },
  ],
  guess: [
    { label: 'A', state: 'prompt' },
    { label: 'B', state: 'prompt' },
    { label: 'C', state: 'prompt' },
    { label: 'D', state: 'accepted' },
    { label: 'E', state: 'accepted' },
    { label: 'F', state: 'rejected' },
    { label: 'G', state: 'rejected' },
  ],
  dspark: [
    { label: 'A', state: 'prompt' },
    { label: 'B', state: 'prompt' },
    { label: 'C', state: 'prompt' },
    { label: 'D', state: 'accepted' },
    { label: 'E', state: 'accepted' },
    { label: 'F', state: 'accepted' },
    { label: 'G', state: 'trimmed' },
  ],
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'accent' | 'green' | 'red' }) {
  const tones = {
    accent: 'border-blog/30 bg-blog/10',
    green: 'border-emerald-400/25 bg-emerald-400/10',
    red: 'border-red-400/25 bg-red-400/10',
  }

  return (
    <div className={classNames('rounded-lg border p-3', tones[tone])}>
      <p className="font-mono text-[0.68rem] uppercase text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-fg">{value}</p>
    </div>
  )
}

function FlowSvg({ stage }: { stage: StageId }) {
  const isSerial = stage === 'serial'
  const isGuess = stage === 'guess'
  const isDSpark = stage === 'dspark'

  const targetStroke = isSerial ? accent : 'var(--color-border)'
  const draftStroke = isGuess || isDSpark ? amber : 'var(--color-border)'
  const schedulerStroke = isDSpark ? accent : 'var(--color-border)'

  return (
    <svg viewBox="0 0 760 360" role="img" aria-label="Progressive decoding diagrams from serial generation to DSpark scheduling" className="h-auto w-full">
      <defs>
        <marker id="eli5-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={accent} />
        </marker>
      </defs>

      <rect x="30" y="46" width="170" height="112" rx="14" fill="var(--color-bg)" stroke={targetStroke} strokeWidth={isSerial ? 2.5 : 1.2} />
      <text x="55" y="82" fill="currentColor" fontSize="16" fontWeight="700">Target model</text>
      <text x="55" y="108" fill="var(--color-muted)" fontSize="12">slow, trusted</text>
      <text x="55" y="135" fill="currentColor" fontSize="12">{isSerial ? 'called every token' : 'verifies a block'}</text>

      <rect x="292" y="46" width="176" height="112" rx="14" fill="var(--color-bg)" stroke={draftStroke} strokeWidth={isGuess || isDSpark ? 2.5 : 1.2} opacity={isSerial ? 0.36 : 1} />
      <text x="317" y="82" fill="currentColor" fontSize="16" fontWeight="700">Draft model</text>
      <text x="317" y="108" fill="var(--color-muted)" fontSize="12">fast, fallible</text>
      <text x="317" y="135" fill="currentColor" fontSize="12">{isSerial ? 'not used yet' : 'guesses D E F G'}</text>

      <rect x="560" y="46" width="170" height="112" rx="14" fill="var(--color-bg)" stroke={schedulerStroke} strokeWidth={isDSpark ? 2.5 : 1.2} opacity={isDSpark ? 1 : 0.42} />
      <text x="584" y="82" fill="currentColor" fontSize="16" fontWeight="700">Scheduler</text>
      <text x="584" y="108" fill="var(--color-muted)" fontSize="12">cost aware</text>
      <text x="584" y="135" fill="currentColor" fontSize="12">{isDSpark ? 'cuts weak suffixes' : 'missing'}</text>

      <path d="M205 102 C238 102 250 102 286 102" stroke={accent} strokeWidth="2.5" fill="none" markerEnd="url(#eli5-arrow)" opacity={isSerial ? 0.22 : 0.9} />
      <path d="M472 102 C508 102 520 102 554 102" stroke={accent} strokeWidth="2.5" fill="none" markerEnd="url(#eli5-arrow)" opacity={isDSpark ? 0.9 : 0.22} />
      <path d="M646 162 C646 236 126 230 126 164" stroke={accent} strokeWidth="2.5" fill="none" markerEnd="url(#eli5-arrow)" opacity={isDSpark ? 0.85 : 0.18} />

      <g transform="translate(72 218)">
        <text x="0" y="-22" fill="var(--color-muted)" fontSize="12" fontFamily="monospace">cursor movement</text>
        {tokenRows[stage].map((token, index) => {
          const x = index * 72
          const fill =
            token.state === 'accepted' ? green :
              token.state === 'rejected' ? red :
                token.state === 'trimmed' ? 'currentColor' :
                  token.state === 'target' ? accent :
                    token.state === 'draft' ? amber :
                      'var(--color-muted)'
          const opacity = token.state === 'trimmed' ? 0.35 : 1
          return (
            <g key={`${token.label}-${index}`} transform={`translate(${x} 0)`} opacity={opacity}>
              <rect x="0" y="0" width="46" height="46" rx="10" fill={fill} fillOpacity={token.state === 'prompt' ? 0.08 : 0.18} stroke={fill} strokeOpacity={token.state === 'prompt' ? 0.35 : 0.9} />
              <text x="23" y="29" textAnchor="middle" fill="currentColor" fontSize="15" fontFamily="monospace">{token.label}</text>
              {token.state === 'rejected' ? <text x="23" y="68" textAnchor="middle" fill={red} fontSize="11">reject</text> : null}
              {token.state === 'trimmed' ? <text x="23" y="68" textAnchor="middle" fill="var(--color-muted)" fontSize="11">trim</text> : null}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export function DeepSpecEli5Flow() {
  const [stageId, setStageId] = useState<StageId>('serial')
  const stage = stages.find((item) => item.id === stageId) ?? stages[0]

  const activeIndex = useMemo(() => stages.findIndex((item) => item.id === stage.id), [stage.id])

  return (
    <section
      data-testid="deepspec-eli5-flow"
      className="not-prose my-9 overflow-hidden rounded-xl border border-[var(--color-border)] bg-surface text-fg shadow-sm"
      aria-label="ELI5 walkthrough of serial decoding, speculative decoding, and DSpark"
    >
      <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-muted">Build the idea</p>
            <h3 className="mt-1 text-xl font-semibold leading-tight text-fg">From one-token decoding to scheduled speculation</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stages.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={stage.id === item.id}
                onClick={() => setStageId(item.id)}
                className={classNames(
                  'rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors',
                  stage.id === item.id
                    ? 'border-blog bg-blog/15 text-fg'
                    : 'border-[var(--color-border)] bg-bg text-muted hover:border-fg/25 hover:text-fg',
                )}
              >
                <span className="block font-mono text-[0.65rem] text-muted">Step {index + 1}</span>
                {item.button}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.45fr_0.95fr]">
        <div className="border-b border-[var(--color-border)] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <FlowSvg stage={stage.id} />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Target work" value={stage.targetCalls} tone="accent" />
            <Metric label="Progress" value={stage.accepted} tone="green" />
            <Metric label="Waste" value={stage.wasted} tone="red" />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-mono text-xs uppercase text-muted">{stage.kicker}</p>
          <h4 className="mt-1 text-lg font-semibold leading-tight text-fg">{stage.title}</h4>
          <p className="mt-3 text-sm leading-6 text-fg/78">{stage.summary}</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-bg p-4">
              <p className="font-mono text-xs uppercase text-muted">The bottleneck</p>
              <p className="mt-2 text-sm leading-6 text-fg/78">{stage.problem}</p>
            </div>
            <div className="rounded-lg border border-blog/25 bg-blog/10 p-4">
              <p className="font-mono text-xs uppercase text-muted">The move</p>
              <p className="mt-2 text-sm leading-6 text-fg/78">{stage.move}</p>
            </div>
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4">
              <p className="font-mono text-xs uppercase text-muted">What changes</p>
              <p className="mt-2 text-sm leading-6 text-fg/78">{stage.result}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2" aria-label="Walkthrough progress">
            {stages.map((item, index) => (
              <span
                key={item.id}
                className={classNames(
                  'h-2 rounded-full transition-all',
                  index <= activeIndex ? 'bg-blog' : 'bg-fg/12',
                  index === activeIndex ? 'w-10' : 'w-5',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
