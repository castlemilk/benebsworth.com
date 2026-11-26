'use client'

import { useId, useState } from 'react'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '@ui-sdk/react/slider'
import { Radio, RadioGroup } from '@ui-sdk/react/radio'
import { BarChart } from '@/components/charts/bar-chart'
import { Bar } from '@/components/charts/bar'
import { BarYAxis } from '@/components/charts/bar-y-axis'
import { cacheBudget, routeToyToken } from '@/lib/study/kolibri-explorers'
import { useReducedMotion } from './use-reduced-motion'
import styles from './kolibri-explorers.module.css'

const stages = [
  { id: 'embed', label: 'Embed', value: '2,560 values', detail: 'The token ID looks up a 2,560-wide vector. This becomes the position’s starting state in the residual stream.' },
  { id: 'attend', label: 'Attend', value: '48 query heads · 4 KV heads', detail: 'The token reads earlier positions. Each group of 12 query heads shares keys and values. Four layers read a bounded window, then every fifth layer reads the full causal prefix.' },
  { id: 'route', label: 'Route', value: '6 routed experts + 1 shared', detail: 'Attention updates the token’s state. The router scores that state and selects six routed experts. The shared expert also runs. Their outputs update the same residual stream.' },
  { id: 'predict', label: 'Predict', value: '128,000 vocabulary logits', detail: 'After 50 blocks, the output projection scores every vocabulary entry. Generation chooses one token, appends it, and repeats.' },
] as const

type Stage = (typeof stages)[number]

function TokenStack({ active }: { active: Stage['id'] }) {
  return (
    <svg viewBox="0 0 292 220" className={styles.stack} aria-hidden="true">
      <path className={styles.returnPath} d="M 248 80 H 256 V 128 H 248" />
      <text x="263" y="108">×50</text>
      {[...stages].reverse().map((stage, index) => (
        <g key={stage.id} transform={`translate(0 ${150 - 46 * index})`} data-active={stage.id === active}>
          <path className={styles.faceSide} d="M 30 20 L 98 43 L 166 20 V 29 L 98 52 L 30 29 Z" />
          <path className={styles.faceTop} d="M 30 20 L 98 0 L 166 20 L 98 43 Z" />
          <path className={styles.traceLine} d="M 98 7 L 128 17 L 98 27 L 67 17 Z" />
          <path className={styles.traceLine} d="M 166 20 H 192" />
          <text x="198" y="24">{stage.label}</text>
        </g>
      ))}
    </svg>
  )
}

function TokenPath() {
  const [active, setActive] = useState<Stage['id']>('embed')
  return (
    <Tabs value={active} onValueChange={(value) => { if (value) setActive(value) }}>
      <TabsList aria-label="Token stages" className={styles.stageList}>
        {stages.map((stage) => <TabsTab key={stage.id} value={stage.id} className={styles.stageTab}>{stage.label}</TabsTab>)}
      </TabsList>
      <div className={styles.tokenGrid}>
        <TokenStack active={active} />
        {stages.map((stage) => (
          <TabsPanel key={stage.id} value={stage.id} className={styles.stageReadout}>
            <div className={styles.measure}>{stage.value}</div>
            <p>{stage.detail}</p>
          </TabsPanel>
        ))}
      </div>
    </Tabs>
  )
}

function ExpertRouter() {
  const [bias, setBias] = useState(0)
  const experts = routeToyToken(bias)
  const selected = experts.filter((expert) => expert.selected)
  return (
    <div>
      <p className={styles.intro}>Increase C’s selection bias. Watch which two experts run and which number sets their contribution.</p>
      <Slider value={bias} onValueChange={setBias} min={0} max={3} step={0.25} className={styles.slider}>
        <div className={styles.sliderHeading}>
          <span>Expert C selection bias</span>
          <output>{bias.toFixed(2)}</output>
        </div>
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label="Expert C selection bias" />
          </SliderTrack>
        </SliderControl>
      </Slider>
      <ul className={styles.experts} aria-label="Toy expert scores">
        {experts.map((expert) => (
          <li key={expert.id} data-selected={expert.selected} className={styles.expert}>
            <div className={styles.expertHeading}><strong>{expert.id}</strong><span>{expert.selected ? 'Runs' : 'Idle'}</span></div>
            <dl>
              <div><dt>Raw logit</dt><dd>{expert.logit.toFixed(2)}</dd></div>
              <div><dt>Selection score</dt><dd>{expert.score.toFixed(2)}</dd></div>
              <div><dt>Output weight</dt><dd>{expert.selected ? expert.weight.toFixed(2) : '—'}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <p className={styles.result} aria-live="polite">
        <strong>{selected.map((expert) => expert.id).join(' + ')} + shared</strong>
        <span>Routed weights sum to {selected.reduce((total, expert) => total + expert.weight, 0).toFixed(2)}. The sigmoid weights use the raw logits.</span>
      </p>
      <p className={styles.note}>Toy router: two of three experts. Kolibri uses six of 384, plus one shared expert.</p>
    </div>
  )
}

const contexts = [
  { id: '4096', label: '4k' },
  { id: '16384', label: '16k' },
  { id: '65536', label: '64k' },
  { id: '262144', label: '256k' },
  { id: '1048576', label: '1M' },
] as const
const precisionOptions = [{ id: '1', label: 'FP8' }, { id: '2', label: 'BF16' }] as const

function CacheControls({ label, options, value, onChange }: {
  label: string
  options: readonly { id: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div>
      <div id={id} className={styles.controlLabel}>{label}</div>
      <RadioGroup value={value} onValueChange={(next) => { if (next) onChange(next) }} aria-labelledby={id} className={styles.choices}>
        {options.map((option) => (
          <Radio key={option.id} value={option.id} className={styles.choice}>{option.label}</Radio>
        ))}
      </RadioGroup>
    </div>
  )
}

function AttentionCache() {
  const [context, setContext] = useState('262144')
  const [precision, setPrecision] = useState('1')
  const reducedMotion = useReducedMotion()
  const { hybrid, local, global, full } = cacheBudget(Number(context), precision === '1' ? 1 : 2)
  const data = [
    { name: 'Kolibri', local, global },
    { name: 'All full', local: 0, global: full },
  ]
  return (
    <div>
      <p className={styles.intro}>Change context length or precision. Compare Kolibri with the same 50 layers and KV heads using full attention throughout.</p>
      <div className={styles.cacheControls}>
        <CacheControls label="Live context" options={contexts} value={context} onChange={setContext} />
        <CacheControls label="KV precision" options={precisionOptions} value={precision} onChange={setPrecision} />
      </div>
      <div role="img" aria-label={`KV cache comparison in GiB. Kolibri ${hybrid.toFixed(2)}, all full ${full.toFixed(2)}.`} className={styles.chart}>
        <BarChart data={data} orientation="horizontal" xDataKey="name" stacked aspectRatio="auto" margin={{ top: 8, right: 12, bottom: 8, left: 73 }} animationDuration={reducedMotion ? 0 : 250}>
          <Bar dataKey="global" fill="var(--diagram-strong)" />
          <Bar dataKey="local" fill="var(--diagram-local)" />
          <BarYAxis />
        </BarChart>
      </div>
      <dl aria-live="polite" className={styles.cacheReadout}>
        <div><dt>Kolibri</dt><dd>{hybrid.toFixed(2)} GiB</dd></div>
        <div><dt>All full</dt><dd>{full.toFixed(2)} GiB</dd></div>
        <div><dt>40 local layers</dt><dd>{local.toFixed(3)} GiB</dd></div>
      </dl>
      <p className={styles.note}>Teal = full layers. Amber = local layers capped at 513 entries each. Estimates assume local eviction and count only KV tensors. 1M is an extrapolation beyond the 256k training length.</p>
    </div>
  )
}

export function KolibriExplorers() {
  const heading = useId()
  return (
    <section aria-labelledby={heading} className={`not-prose ${styles.explorer}`}>
      <h2 id={heading}>Explore Kolibri</h2>
      <Tabs defaultValue="token">
        <TabsList aria-label="Kolibri diagrams" className={styles.tabList}>
          <TabsTab value="token" className={styles.tab}>Token path</TabsTab>
          <TabsTab value="router" className={styles.tab}>Expert router</TabsTab>
          <TabsTab value="cache" className={styles.tab}>Attention cache</TabsTab>
        </TabsList>
        <TabsPanel value="token"><TokenPath /></TabsPanel>
        <TabsPanel value="router" keepMounted><ExpertRouter /></TabsPanel>
        <TabsPanel value="cache" keepMounted><AttentionCache /></TabsPanel>
      </Tabs>
    </section>
  )
}
