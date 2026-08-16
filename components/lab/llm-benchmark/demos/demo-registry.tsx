'use client'

import type { BenchmarkTask } from '@/lib/lab/llm-benchmark/types'
import { pluginDemos } from '@/lib/lab/llm-benchmark/plugins'
import {
  NBodyFieldDemo,
  MiniPlatformerDemo,
  CryptoHashRaceDemo,
  LandingPageMorphDemo,
  EquationSolverDemo,
  PhysicsPendulumWaveDemo,
  CircuitBuilderTeaserDemo,
} from './index'

// Built-in demos first; plugin demos merge in by name (plugins win on
// collision, matching the registry's "later registration wins" rule).
const DEMO_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  NBodyFieldDemo,
  MiniPlatformerDemo,
  CryptoHashRaceDemo,
  LandingPageMorphDemo,
  EquationSolverDemo,
  PhysicsPendulumWaveDemo,
  CircuitBuilderTeaserDemo,
  ...pluginDemos(),
}

export function BenchmarkDemo({
  task,
  className = '',
}: {
  task: BenchmarkTask
  className?: string
}) {
  const Component = DEMO_COMPONENTS[task.demoComponentName]
  if (!Component) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)] p-8 text-sm text-[var(--color-muted)] ${className}`}
      >
        Demo not found for {task.demoComponentName}
      </div>
    )
  }
  return <Component className={className} />
}
