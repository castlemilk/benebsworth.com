import type { LabEffect } from '@/lib/gen/content'
import type { EffectModule, ControlSpec, Params } from './types'
import { orbits } from '@/components/lab/effects/orbits'
import { flowField } from '@/components/lab/effects/flow-field'
import { starfield } from '@/components/lab/effects/starfield'
import { cyclicAutomaton } from '@/components/lab/effects/cyclic-automaton'
import { rippleGrid } from '@/components/lab/effects/ripple-grid'

export type LabEntry = LabEffect & {
  module: EffectModule
  controls: ControlSpec[]
  defaults: Params
}

function entry(meta: LabEffect, module: EffectModule): LabEntry {
  return { ...meta, module, controls: module.controls, defaults: module.defaults }
}

export const LAB_EFFECTS: LabEntry[] = [
  entry({ slug: 'orbits', title: 'Orbits', blurb: 'Bodies tracing a shared circle, leaving light trails.', tags: ['trails', 'trig'], homeEmbedSafe: true }, orbits),
  entry({ slug: 'flow-field', title: 'Flow Field', blurb: 'Particles advected by a value-noise vector field.', tags: ['noise', 'particles'], homeEmbedSafe: false }, flowField),
  entry({ slug: 'starfield', title: 'Starfield', blurb: 'Parallax warp toward a vanishing point.', tags: ['3d', 'parallax'], homeEmbedSafe: true }, starfield),
  entry({ slug: 'cyclic-automaton', title: 'Cyclic Automaton', blurb: 'Cells advancing in a colour cycle when enough neighbours lead.', tags: ['automata', 'grid'], homeEmbedSafe: false }, cyclicAutomaton),
  entry({ slug: 'ripple-grid', title: 'Ripple Grid', blurb: 'A dot grid pulsing with summed sine-wave interference.', tags: ['waves', 'grid'], homeEmbedSafe: true }, rippleGrid),
]

export function getEffect(slug: string): LabEntry | undefined {
  return LAB_EFFECTS.find((e) => e.slug === slug)
}
export const HOME_EMBED_EFFECTS = LAB_EFFECTS.filter((e) => e.homeEmbedSafe)
