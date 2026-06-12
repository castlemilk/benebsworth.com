'use client'

/**
 * Per-architecture wrappers around the NeuralGraph primitive. These exist
 * so each architecture can be registered as its own PascalCase MDX tag in
 * `mdx-components.tsx` (kebab-case tags don't get auto-mapped) without
 * having to thread the `arch` prop through the post body.
 *
 *   <FfnnFlow />         — feed-forward
 *   <RnnFlow />          — recurrent
 *   <LstmFlow />         — long short-term memory
 *   <VaeFlow />          — variational autoencoder
 *   <GanFlow />          — generative adversarial network
 *   <TransformerFlow />  — multi-head self-attention
 *
 * Each takes the same optional props as NeuralGraph: `label`, `input`,
 * `seed`, `paused`, `initialSpeed`, `initialWeightScale`.
 */

import { NeuralGraph, type NeuralGraphProps } from './neural-graph'

type FlowProps = Omit<NeuralGraphProps, 'arch'>

export function FfnnFlow(props: FlowProps) {
  return <NeuralGraph arch="ffnn" {...props} />
}

export function RnnFlow(props: FlowProps) {
  return <NeuralGraph arch="rnn" {...props} />
}

export function LstmFlow(props: FlowProps) {
  return <NeuralGraph arch="lstm" {...props} />
}

export function VaeFlow(props: FlowProps) {
  return <NeuralGraph arch="vae" {...props} />
}

export function GanFlow(props: FlowProps) {
  return <NeuralGraph arch="gan" {...props} />
}

export function TransformerFlow(props: FlowProps) {
  return <NeuralGraph arch="transformer" {...props} />
}
