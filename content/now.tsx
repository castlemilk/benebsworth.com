import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * The /now page (nownownow.com convention): what I'm focused on at this point
 * in time — not a feed, just the handful of things that are front-of-mind.
 * Edit the entries and bump UPDATED / UPDATED_ISO whenever the focus moves.
 */
export const NOW_UPDATED = 'June 2026'
export const NOW_UPDATED_ISO = '2026-06-01'

export type NowEntry = { id: string; label: string; body: ReactNode; text: string }

const link = 'underline decoration-fg/30 underline-offset-4 transition-colors hover:decoration-fg/70'

export const NOW: NowEntry[] = [
  {
    id: 'work',
    label: 'Work',
    text: 'Senior Software Engineer at Atlassian, in the Micros platform team — building and operating the internal platform, developer tooling and orchestration that thousands of Atlassian services deploy and run on, on top of AWS.',
    body: (
      <>
        Senior Software Engineer at <strong>Atlassian</strong>, in the Micros platform team — building and
        operating the internal platform, developer tooling and orchestration that thousands of Atlassian
        services deploy and run on, on top of AWS.
      </>
    ),
  },
  {
    id: 'building',
    label: 'Building',
    text: 'Pouring spare cycles into this site — an interactive lab of parameterised simulations and a from-scratch circuit simulator. Each lab piece is a working model you can drag, tune and share.',
    body: (
      <>
        Pouring spare cycles into this site — an{' '}
        <Link href="/lab/" className={link}>interactive lab</Link> of parameterised simulations and a
        from-scratch <Link href="/lab/circuit-sim/" className={link}>circuit simulator</Link>. Each lab
        piece is a working model you can drag, tune and share.
      </>
    ),
  },
  {
    id: 'learning',
    label: 'Going deep on',
    text: 'AI-native engineering — treating LLMs, agents and MCP as core toolchain rather than a bolt-on. Coding agents, retrieval, and evals, pointed at real production work.',
    body: (
      <>
        AI-native engineering — treating LLMs, agents and MCP as core toolchain rather than a bolt-on.
        Coding agents, retrieval, and evals, pointed at real production work.
      </>
    ),
  },
  {
    id: 'writing',
    label: 'Writing',
    text: 'Long-form essays on the blog — distributed systems, signal processing, and the physics hiding inside everyday things. The lab sketches are usually where a post starts.',
    body: (
      <>
        Long-form essays on the <Link href="/blog/" className={link}>blog</Link> — distributed systems,
        signal processing, and the physics hiding inside everyday things. The lab sketches are usually
        where a post starts.
      </>
    ),
  },
]
