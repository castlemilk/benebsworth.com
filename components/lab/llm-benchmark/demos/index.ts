export { NBodyFieldDemo } from './n-body-field-demo'
export { MiniPlatformerDemo } from './mini-platformer-demo'
export { CryptoHashRaceDemo } from './crypto-hash-race-demo'
export { LandingPageMorphDemo } from './landing-page-morph-demo'
export { EquationSolverDemo } from './equation-solver-demo'
export { PhysicsPendulumWaveDemo } from './physics-pendulum-wave-demo'
export { CircuitBuilderTeaserDemo } from './circuit-builder-teaser-demo'

import { NBodyFieldDemo } from './n-body-field-demo'
import { MiniPlatformerDemo } from './mini-platformer-demo'
import { CryptoHashRaceDemo } from './crypto-hash-race-demo'
import { LandingPageMorphDemo } from './landing-page-morph-demo'
import { EquationSolverDemo } from './equation-solver-demo'
import { PhysicsPendulumWaveDemo } from './physics-pendulum-wave-demo'
import { CircuitBuilderTeaserDemo } from './circuit-builder-teaser-demo'

export const BENCHMARK_DEMOS: Record<string, React.ComponentType<{ className?: string }>> = {
  NBodyFieldDemo,
  MiniPlatformerDemo,
  CryptoHashRaceDemo,
  LandingPageMorphDemo,
  EquationSolverDemo,
  PhysicsPendulumWaveDemo,
  CircuitBuilderTeaserDemo,
}
