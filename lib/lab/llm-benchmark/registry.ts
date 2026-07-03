import type {
  BenchmarkCategory,
  BenchmarkModel,
  BenchmarkTask,
  BenchmarkResult,
} from './types'
import resultsJson from './results.json'

// ── Categories ─────────────────────────────────────────────────────────
export const BENCHMARK_CATEGORIES: BenchmarkCategory[] = [
  { slug: '3d-physics-animation', label: '3D Physics & Animation', glyph: '◉', accent: '#3b82f6', blurb: 'Rigid-body and particle simulations, real-time animation constraints.' },
  { slug: 'advanced-game-building', label: 'Advanced Game Building', glyph: '◆', accent: '#8b5cf6', blurb: 'End-to-end game logic, collision handling, and state machines.' },
  { slug: 'security-tasks', label: 'Security Tasks', glyph: '◼', accent: '#10b981', blurb: 'Cryptographic reasoning, secure code review, and threat modeling.' },
  { slug: 'ui-building', label: 'UI Building', glyph: '▣', accent: '#f59e0b', blurb: 'Component layout, interaction design, and visual polish.' },
  { slug: 'advanced-mathematics', label: 'Advanced Mathematics', glyph: '∫', accent: '#ef4444', blurb: 'Symbolic algebra, calculus, and theorem-like problem solving.' },
  { slug: 'advanced-physics', label: 'Advanced Physics', glyph: 'ψ', accent: '#06b6d4', blurb: 'Classical mechanics, waves, and continuum simulations.' },
  { slug: 'advanced-electronics', label: 'Advanced Electronics', glyph: '⚡', accent: '#f97316', blurb: 'Circuit analysis, signal integrity, and embedded logic.' },
]

// ── Models ─────────────────────────────────────────────────────────────
export const BENCHMARK_MODELS: BenchmarkModel[] = [
  { id: 'claude-4', name: 'Claude 4', provider: 'Anthropic', costPer1kInputUsd: 0.003, costPer1kOutputUsd: 0.015, contextWindow: 200000, capabilities: 'Strong reasoning, long context, excellent code generation' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', costPer1kInputUsd: 0.0025, costPer1kOutputUsd: 0.010, contextWindow: 128000, capabilities: 'General purpose, fast, broad knowledge' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', costPer1kInputUsd: 0.00125, costPer1kOutputUsd: 0.010, contextWindow: 1000000, capabilities: 'Massive context, multimodal, strong STEM' },
  { id: 'kimi-k2.7', name: 'Kimi K2.7', provider: 'Moonshot AI', apiModelId: 'kimi-k2-7', costPer1kInputUsd: 0.0005, costPer1kOutputUsd: 0.002, contextWindow: 256000, capabilities: 'Long-context reasoning, strong coding and instruction following' },
  { id: 'gemini-3.5-flash-agy', name: 'Gemini 3.5 Flash (agy)', provider: 'Agy', apiModelId: 'Gemini 3.5 Flash (High)', costPer1kInputUsd: 0.00035, costPer1kOutputUsd: 0.00105, contextWindow: 1000000, capabilities: 'Fast, cost-efficient multimodal reasoning via Agy CLI' },
  { id: 'codex-gpt-5.5', name: 'Codex GPT-5.5', provider: 'Codex', apiModelId: 'gpt-5.5', costPer1kInputUsd: 0.001, costPer1kOutputUsd: 0.003, contextWindow: 128000, capabilities: 'OpenAI Codex CLI agent, agentic coding workflow' },
]

// ── Tasks ──────────────────────────────────────────────────────────────
export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: 'n-body-field',
    category: '3d-physics-animation',
    title: 'N-Body Field',
    blurb: 'Generate a self-contained Three.js n-body gravity field that runs at 60fps.',
    prompt: 'Write a single-file HTML page using Three.js that simulates 200 mutually gravitating particles in 3D, with softening and velocity-colour mapping. No external assets.',
    runtimeHint: 'Browser, WebGL, ~16ms/frame target',
    iterationsDefault: 5,
    methodNotes: 'Scores by frame stability, visual coherence, and correct gravitational integration.',
    demoComponentName: 'NBodyFieldDemo',
    slug: 'n-body-field',
  },
  {
    id: 'mini-platformer',
    category: 'advanced-game-building',
    title: 'Mini Platformer',
    blurb: 'Build a playable platformer level with physics, collectibles, and win state.',
    prompt: 'Create a single-file HTML/Canvas platformer with a player that can run, jump, collect coins, and reach a goal flag. Include a reset button and a simple parallax background.',
    runtimeHint: 'Browser, Canvas 2D, 60fps',
    iterationsDefault: 5,
    methodNotes: 'Scores by playability, collision correctness, and absence of game-breaking bugs.',
    demoComponentName: 'MiniPlatformerDemo',
    slug: 'mini-platformer',
  },
  {
    id: 'crypto-hash-race',
    category: 'security-tasks',
    title: 'Crypto Hash Race',
    blurb: 'Implement and verify a constant-time comparison and a salted hash chain.',
    prompt: 'Write a Python module that provides constant-time string comparison, PBKDF2-based password hashing with a random salt, and a verify function. Include unit tests.',
    runtimeHint: 'CPython, local execution',
    iterationsDefault: 5,
    methodNotes: 'Scores by timing-attack resistance, correct salt handling, and test coverage.',
    demoComponentName: 'CryptoHashRaceDemo',
    slug: 'crypto-hash-race',
  },
  {
    id: 'landing-page-morph',
    category: 'ui-building',
    title: 'Landing Page Morph',
    blurb: 'Generate a responsive marketing landing page with theme-aware transitions.',
    prompt: 'Build a single-file React + Tailwind landing page with a hero, feature grid, pricing cards, and dark/light theme toggle. Use only built-in browser APIs and inline styles if Tailwind is unavailable.',
    runtimeHint: 'Browser, React 19, CSS transitions',
    iterationsDefault: 5,
    methodNotes: 'Scores by responsive layout, accessibility landmarks, and visual consistency.',
    demoComponentName: 'LandingPageMorphDemo',
    slug: 'landing-page-morph',
  },
  {
    id: 'equation-solver',
    category: 'advanced-mathematics',
    title: 'Equation Solver',
    blurb: 'Solve a system of non-linear equations and explain each step.',
    prompt: 'Solve the system x^2 + y^2 = 25 and x*y = 12 over the reals. List every solution pair and justify the algebraic steps.',
    runtimeHint: 'Text output, symbolic reasoning',
    iterationsDefault: 5,
    methodNotes: 'Scores by mathematical correctness, completeness of roots, and clarity of derivation.',
    demoComponentName: 'EquationSolverDemo',
    slug: 'equation-solver',
  },
  {
    id: 'physics-pendulum-wave',
    category: 'advanced-physics',
    title: 'Physics Pendulum Wave',
    blurb: 'Simulate a pendulum wave desk toy and visualise beat patterns.',
    prompt: 'Write a single-file HTML/Canvas simulation of a pendulum wave: N pendulums with slightly different lengths that produce visual beats. Expose sliders for N and gravity.',
    runtimeHint: 'Browser, Canvas 2D, 60fps',
    iterationsDefault: 5,
    methodNotes: 'Scores by physical accuracy of periods, stable integration, and visual clarity of beats.',
    demoComponentName: 'PhysicsPendulumWaveDemo',
    slug: 'physics-pendulum-wave',
  },
  {
    id: 'circuit-builder-teaser',
    category: 'advanced-electronics',
    title: 'Circuit Builder Teaser',
    blurb: 'Build a minimal interactive RLC circuit solver with live plots.',
    prompt: 'Create a single-file HTML/Canvas page that lets the user adjust R, L, C values and plots the step response of a series RLC circuit in real time.',
    runtimeHint: 'Browser, Canvas 2D, numeric integration',
    iterationsDefault: 5,
    methodNotes: 'Scores by correctness of damping classification and stability of the numeric solver.',
    demoComponentName: 'CircuitBuilderTeaserDemo',
    slug: 'circuit-builder-teaser',
  },
]

// ── Results ────────────────────────────────────────────────────────────
// Results are persisted in results.json so they can be updated by the
// harness without editing TypeScript. Run `npm run benchmark:run` to
// execute live API calls and regenerate this file.
export const BENCHMARK_RESULTS: BenchmarkResult[] = resultsJson as BenchmarkResult[]

// ── Getters ────────────────────────────────────────────────────────────
export function getCategory(slug: string): BenchmarkCategory | undefined {
  return BENCHMARK_CATEGORIES.find((c) => c.slug === slug)
}

export function getTask(slug: string): BenchmarkTask | undefined {
  return BENCHMARK_TASKS.find((t) => t.slug === slug)
}

export function getModel(id: string): BenchmarkModel | undefined {
  return BENCHMARK_MODELS.find((m) => m.id === id)
}

export function tasksByCategory(categorySlug: string): BenchmarkTask[] {
  return BENCHMARK_TASKS.filter((t) => t.category === categorySlug)
}

export function resultsForTask(taskId: string): BenchmarkResult[] {
  return BENCHMARK_RESULTS.filter((r) => r.taskId === taskId)
}

export function resultsForModel(modelId: string): BenchmarkResult[] {
  return BENCHMARK_RESULTS.filter((r) => r.modelId === modelId)
}
