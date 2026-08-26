import type {
  BenchmarkCategory,
  BenchmarkModel,
  BenchmarkTask,
} from './types'
import { pluginModels, pluginTasks } from './plugins'

// NOTE: results deliberately do NOT live in this module. This registry is
// imported by 'use client' components, and results.json is ~2.8 MB of
// generated model outputs. Server-side code reads results from ./results.

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
const BUILTIN_MODELS: BenchmarkModel[] = [
  { id: 'claude-4', name: 'Claude 4', provider: 'Anthropic', costPer1kInputUsd: 0.003, costPer1kOutputUsd: 0.015, contextWindow: 200000, capabilities: 'Strong reasoning, long context, excellent code generation' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', costPer1kInputUsd: 0.0025, costPer1kOutputUsd: 0.010, contextWindow: 128000, capabilities: 'General purpose, fast, broad knowledge' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', costPer1kInputUsd: 0.00125, costPer1kOutputUsd: 0.010, contextWindow: 1000000, capabilities: 'Massive context, multimodal, strong STEM' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'OpenRouter', apiModelId: 'google/gemini-3.6-flash', costPer1kInputUsd: 0.0000015, costPer1kOutputUsd: 0.0000075, contextWindow: 1000000, capabilities: 'Latest Gemini Flash tier, fast multimodal', modelCardUrl: 'https://openrouter.ai/google/gemini-3.6-flash', vendorUrl: 'https://deepmind.google/', company: 'Google', family: 'Gemini 3.6', released: '2026-08', tags: ['multimodal', 'flash'], blurb: 'Latest Gemini Flash tier — fast multimodal reasoning via OpenRouter.' },
  { id: 'kimi-k2.7', name: 'Kimi K2.7', provider: 'Moonshot AI', apiModelId: 'kimi-k2-7', costPer1kInputUsd: 0.0005, costPer1kOutputUsd: 0.002, contextWindow: 256000, capabilities: 'Long-context reasoning, strong coding and instruction following' },
  { id: 'kimi-k3', name: 'Kimi K3', provider: 'Moonshot AI', apiModelId: 'k3', costPer1kInputUsd: 0.003, costPer1kOutputUsd: 0.015, contextWindow: 1048576, capabilities: 'Flagship open-weight MoE, 1M context, native vision, always-on reasoning, strong coding/agent' },
  { id: 'gemini-3.5-flash-agy', name: 'Gemini 3.5 Flash (agy)', provider: 'Agy', apiModelId: 'Gemini 3.5 Flash (High)', costPer1kInputUsd: 0.00035, costPer1kOutputUsd: 0.00105, contextWindow: 1000000, capabilities: 'Fast, cost-efficient multimodal reasoning via Agy CLI' },
  { id: 'gemini-3.6-flash-agy', name: 'Gemini 3.6 Flash (agy)', provider: 'Agy', apiModelId: 'Gemini 3.6 Flash (High)', costPer1kInputUsd: 0.00035, costPer1kOutputUsd: 0.00105, contextWindow: 1000000, capabilities: 'Latest Gemini Flash via Agy CLI — fast multimodal reasoning, locally orchestrated (OMEGA harness `external:agy` route)', modelCardUrl: 'https://deepmind.google/', vendorUrl: 'https://deepmind.google/', company: 'Google', family: 'Gemini 3.6', released: '2026-08', tags: ['agy-cli', 'multimodal', 'flash'], blurb: 'Gemini 3.6 Flash via the local agy CLI — the OMEGA harness orchestrates the same CLI via its external:agy route.' },
  { id: 'claude-opus-4-6-thinking-agy', name: 'Claude Opus 4.6 Thinking (agy)', provider: 'Agy', apiModelId: 'Claude Opus 4.6 (Thinking)', costPer1kInputUsd: 0.015, costPer1kOutputUsd: 0.075, contextWindow: 200000, capabilities: 'Claude Opus 4.6 with extended thinking via Agy CLI', modelCardUrl: 'https://www.anthropic.com/', vendorUrl: 'https://www.anthropic.com/', company: 'Anthropic', family: 'Claude Opus 4.6', released: '2026-07', tags: ['agy-cli', 'thinking', 'opus'], blurb: 'Claude Opus 4.6 with thinking enabled via the local agy CLI.' },
  { id: 'gpt-oss-120b-agy', name: 'GPT-OSS 120B (agy)', provider: 'Agy', apiModelId: 'GPT-OSS 120B (Medium)', costPer1kInputUsd: 0.001, costPer1kOutputUsd: 0.003, contextWindow: 128000, capabilities: 'OpenAI GPT-OSS 120B via Agy CLI', modelCardUrl: 'https://openai.com/', vendorUrl: 'https://openai.com/', company: 'OpenAI', family: 'GPT-OSS', released: '2026-06', tags: ['agy-cli', 'open-source'], blurb: 'OpenAI GPT-OSS 120B at medium effort via the local agy CLI.' },
  { id: 'codex-gpt-5.5', name: 'Codex GPT-5.5', provider: 'Codex', apiModelId: 'gpt-5.5', costPer1kInputUsd: 0.001, costPer1kOutputUsd: 0.003, contextWindow: 128000, capabilities: 'OpenAI Codex CLI agent, agentic coding workflow' },
  { id: 'codex-gpt-5.6-sol', name: 'Codex GPT-5.6 Sol', provider: 'Codex', apiModelId: 'gpt-5.6-sol', costPer1kInputUsd: 0, costPer1kOutputUsd: 0, contextWindow: 128000, capabilities: 'OpenAI GPT-5.6 Sol tier via Codex CLI (ChatGPT auth)', modelCardUrl: 'https://openrouter.ai/openai/gpt-5.6-sol', vendorUrl: 'https://openai.com/', company: 'OpenAI', family: 'GPT-5.6', released: '2026-08', tags: ['chatgpt-auth', 'codex-cli'], blurb: 'GPT-5.6 Sol tier — OpenAI flagship, run via local codex CLI with ChatGPT account auth.' },
  { id: 'codex-gpt-5.6-terra', name: 'Codex GPT-5.6 Terra', provider: 'Codex', apiModelId: 'gpt-5.6-terra', costPer1kInputUsd: 0, costPer1kOutputUsd: 0, contextWindow: 128000, capabilities: 'OpenAI GPT-5.6 Terra tier via Codex CLI (ChatGPT auth)', modelCardUrl: 'https://openrouter.ai/openai/gpt-5.6-terra', vendorUrl: 'https://openai.com/', company: 'OpenAI', family: 'GPT-5.6', released: '2026-08', tags: ['chatgpt-auth', 'codex-cli'], blurb: 'GPT-5.6 Terra tier — mid-range, run via local codex CLI with ChatGPT account auth.' },
  { id: 'codex-gpt-5.6-luna', name: 'Codex GPT-5.6 Luna', provider: 'Codex', apiModelId: 'gpt-5.6-luna', costPer1kInputUsd: 0, costPer1kOutputUsd: 0, contextWindow: 128000, capabilities: 'OpenAI GPT-5.6 Luna tier via Codex CLI (ChatGPT auth)', modelCardUrl: 'https://openrouter.ai/openai/gpt-5.6-luna', vendorUrl: 'https://openai.com/', company: 'OpenAI', family: 'GPT-5.6', released: '2026-08', tags: ['chatgpt-auth', 'codex-cli'], blurb: 'GPT-5.6 Luna tier — lightweight/cheap, run via local codex CLI with ChatGPT account auth.' },
  { id: 'deepseek-v4-flash-free', name: 'DeepSeek V4 Flash Free', provider: 'OpenCode', apiModelId: 'opencode/deepseek-v4-flash-free', costPer1kInputUsd: 0, costPer1kOutputUsd: 0, contextWindow: 128000, capabilities: 'DeepSeek V4 Flash free tier via the opencode CLI — fast general coding, locally orchestrated (`opencode run`)', vendorUrl: 'https://deepseek.com/', company: 'DeepSeek', family: 'V4', released: '2026-08', tags: ['opencode-cli', 'free', 'flash'], blurb: 'DeepSeek V4 Flash free tier, run headlessly via the local opencode CLI (`opencode run -m opencode/deepseek-v4-flash-free`) — the same CLI this report is authored with.' },

  // ── Local Ollama (M5 Max 128GB, Ollama Metal — no API cost) ──────
  {
    id: 'qwen3-8b-ollama',
    name: 'Qwen3 8B (local)',
    provider: 'Ollama',
    apiModelId: 'qwen3:8b',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 40960,
    capabilities: 'Local Qwen3 8B Q4_K_M via Ollama Metal on M5 Max 128GB — 81 tok/s, 26ms TTFT, 40960 ctx, thinking-capable',
    modelCardUrl: 'https://ollama.com/library/qwen3:8b',
    vendorUrl: 'https://qwen.ai/',
    company: 'Alibaba',
    family: 'Qwen3',
    released: '2026-04',
    license: 'Apache-2.0',
    params: '8.2B',
    tags: ['local', 'ollama', 'm5-max', 'q4_k_m'],
    blurb: 'Qwen3 8B Q4_K_M — local on M5 Max 128GB via Ollama Metal (81 tok/s, 26ms TTFT).',
  },
  {
    id: 'gemma3-4b-ollama',
    name: 'Gemma 3 4B (local)',
    provider: 'Ollama',
    apiModelId: 'gemma3:4b',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 131072,
    capabilities: 'Local Gemma 3 4B Q4_K_M via Ollama Metal on M5 Max — 132 tok/s, multimodal 128K',
    modelCardUrl: 'https://ollama.com/library/gemma3:4b',
    vendorUrl: 'https://deepmind.google/',
    company: 'Google',
    family: 'Gemma 3',
    released: '2026-03',
    license: 'Gemma Terms',
    params: '4B',
    tags: ['local', 'ollama', 'm5-max', 'multimodal'],
    blurb: 'Gemma 3 4B Q4_K_M — fastest single-GPU local (132 tok/s on M5 Max).',
  },
  {
    id: 'gemma3-12b-ollama',
    name: 'Gemma 3 12B (local)',
    provider: 'Ollama',
    apiModelId: 'gemma3:12b',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 131072,
    capabilities: 'Local Gemma 3 12B Q4_K_M via Ollama Metal on M5 Max — 55 tok/s, 128K ctx',
    modelCardUrl: 'https://ollama.com/library/gemma3:12b',
    vendorUrl: 'https://deepmind.google/',
    company: 'Google',
    family: 'Gemma 3',
    released: '2026-03',
    license: 'Gemma Terms',
    params: '12B',
    tags: ['local', 'ollama', 'm5-max', 'multimodal'],
    blurb: 'Gemma 3 12B Q4_K_M — sweet spot reasoning on M5 Max (55 tok/s).',
  },
  {
    id: 'gemma3-27b-ollama',
    name: 'Gemma 3 27B (local)',
    provider: 'Ollama',
    apiModelId: 'gemma3:27b',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 131072,
    capabilities: 'Local Gemma 3 27B Q4_K_M via Ollama Metal on M5 Max — 24 tok/s, flagship 27B single-GPU',
    modelCardUrl: 'https://ollama.com/library/gemma3:27b',
    vendorUrl: 'https://deepmind.google/',
    company: 'Google',
    family: 'Gemma 3',
    released: '2026-03',
    license: 'Gemma Terms',
    params: '27B',
    tags: ['local', 'ollama', 'm5-max', 'multimodal'],
    blurb: 'Gemma 3 27B Q4_K_M — most capable Gemma on a single GPU (24 tok/s).',
  },
  {
    id: 'qwen3-14b-ollama',
    name: 'Qwen3 14B (local)',
    provider: 'Ollama',
    apiModelId: 'qwen3:14b',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 40960,
    capabilities: 'Local Qwen3 14B Q4_K_M via Ollama Metal on M5 Max — 46 tok/s, 41K ctx',
    modelCardUrl: 'https://ollama.com/library/qwen3:14b',
    vendorUrl: 'https://qwen.ai/',
    company: 'Alibaba',
    family: 'Qwen3',
    released: '2026-04',
    license: 'Apache-2.0',
    params: '14B',
    tags: ['local', 'ollama', 'm5-max', 'q4_k_m'],
    blurb: 'Qwen3 14B Q4_K_M — mid-size dense on M5 Max (46 tok/s).',
  },
  {
    id: 'qwen3.8-27b-mlx-ollama',
    name: 'Qwen3.8 27B MLX (local)',
    provider: 'Ollama',
    apiModelId: 'qwen3.8:27b-mlx',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Local Qwen3.8 27B nvfp4 via Ollama native MLX on M5 Max — 24 tok/s no-think (69.1 avg) vs 31 tok/s with thinking (94.7 avg, 100 n-body/mini), 256K ctx, vision + tools + thinking, 100% GPU',
    modelCardUrl: 'https://ollama.com/library/qwen3.8:27b-mlx',
    vendorUrl: 'https://qwen.ai/',
    company: 'Alibaba',
    family: 'Qwen3.8',
    released: '2026-08',
    license: 'Apache-2.0',
    params: '27.8B · nvfp4',
    tags: ['local', 'ollama', 'm5-max', 'mlx', 'nvfp4', 'thinking'],
    blurb: 'Qwen3.8 27B MLX — native MLX on M5 Max, 94.7 avg with thinking (24 tok/s), 69.1 without — 256K ctx, multimodal, best local quality.',
  },

  // ── OpenRouter free tier (cost $0, served by community providers) ──────
  {
    id: 'nemotron-3-ultra',
    name: 'Nemotron 3 Ultra',
    provider: 'OpenRouter',
    apiModelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 1000000,
    capabilities: 'Open frontier reasoning and orchestration, 1M context',
    modelCardUrl: 'https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b',
    vendorUrl: 'https://www.nvidia.com/',
    company: 'NVIDIA',
    family: 'Nemotron 3',
    released: '2026-06-04',
    license: 'NVIDIA Open Model License',
    params: '550B total · 55B active',
    tags: ['reasoning', 'orchestration', 'coding'],
    blurb: 'Open frontier reasoning and orchestration MoE on a hybrid Transformer-Mamba architecture.',
  },
  {
    id: 'nemotron-3-super',
    name: 'Nemotron 3 Super',
    provider: 'OpenRouter',
    apiModelId: 'nvidia/nemotron-3-super-120b-a12b:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Open hybrid MoE, 120B total / 12B active, multi-agent',
    modelCardUrl: 'https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b',
    vendorUrl: 'https://www.nvidia.com/',
    company: 'NVIDIA',
    family: 'Nemotron 3',
    released: '2026-03-11',
    license: 'NVIDIA Open Model License',
    params: '120B total · 12B active',
    tags: ['reasoning', 'multi-agent', 'coding'],
    blurb: '120B-parameter open hybrid MoE that activates 12B per token for complex multi-agent work.',
  },
  {
    id: 'nemotron-3-nano-30b',
    name: 'Nemotron 3 Nano 30B',
    provider: 'OpenRouter',
    apiModelId: 'nvidia/nemotron-3-nano-30b-a3b:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 256000,
    capabilities: 'Compute-efficient 30B-A3B MoE for agentic systems',
    modelCardUrl: 'https://openrouter.ai/nvidia/nemotron-3-nano-30b-a3b',
    vendorUrl: 'https://www.nvidia.com/',
    company: 'NVIDIA',
    family: 'Nemotron 3',
    released: '2025-12-14',
    license: 'NVIDIA Open Model License',
    params: '30B total · 3B active',
    tags: ['efficient', 'agentic'],
    blurb: 'Small, compute-efficient MoE for building specialized agentic AI systems.',
  },
  {
    id: 'nemotron-3-nano-omni',
    name: 'Nemotron 3 Nano Omni',
    provider: 'OpenRouter',
    apiModelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 256000,
    capabilities: 'Multimodal perception sub-agent, 30B-A3B',
    modelCardUrl: 'https://openrouter.ai/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    vendorUrl: 'https://www.nvidia.com/',
    company: 'NVIDIA',
    family: 'Nemotron 3',
    released: '2026-04-28',
    license: 'NVIDIA Open Model License',
    params: '30B total · 3B active',
    tags: ['multimodal', 'perception'],
    blurb: 'Open multimodal 30B-A3B model designed as a perception and context sub-agent.',
  },
  {
    id: 'nemotron-nano-12b-vl',
    name: 'Nemotron Nano 12B VL',
    provider: 'OpenRouter',
    apiModelId: 'nvidia/nemotron-nano-12b-v2-vl:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 128000,
    capabilities: 'Open multimodal reasoning, video + document intelligence',
    modelCardUrl: 'https://openrouter.ai/nvidia/nemotron-nano-12b-v2-vl',
    vendorUrl: 'https://www.nvidia.com/',
    company: 'NVIDIA',
    family: 'Nemotron Nano',
    released: '2025-10-28',
    license: 'NVIDIA Open Model License',
    params: '12B dense',
    tags: ['multimodal', 'video', 'document'],
    blurb: '12B open multimodal reasoning model for video understanding and document intelligence.',
  },
  {
    id: 'nemotron-nano-9b',
    name: 'Nemotron Nano 9B V2',
    provider: 'OpenRouter',
    apiModelId: 'nvidia/nemotron-nano-9b-v2:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 128000,
    capabilities: 'Dense 9B, unified reasoning + non-reasoning',
    modelCardUrl: 'https://openrouter.ai/nvidia/nemotron-nano-9b-v2',
    vendorUrl: 'https://www.nvidia.com/',
    company: 'NVIDIA',
    family: 'Nemotron Nano',
    released: '2025-09-05',
    license: 'NVIDIA Open Model License',
    params: '9B dense',
    tags: ['reasoning', 'general'],
    blurb: '9B dense LLM trained from scratch as a unified model for reasoning and non-reasoning tasks.',
  },
  {
    id: 'gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'OpenRouter',
    apiModelId: 'openai/gpt-oss-20b:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 131072,
    capabilities: 'Open-weight MoE, Apache 2.0, 3.6B active',
    modelCardUrl: 'https://openrouter.ai/openai/gpt-oss-20b',
    vendorUrl: 'https://openai.com/',
    company: 'OpenAI',
    family: 'gpt-oss',
    released: '2025-08-05',
    license: 'Apache 2.0',
    params: '21B total · 3.6B active',
    tags: ['open-weights', 'efficient', 'coding'],
    blurb: 'Open-weight 21B MoE released under Apache 2.0 with 3.6B active parameters per forward pass.',
  },
  {
    id: 'north-mini-code',
    name: 'North Mini Code',
    provider: 'OpenRouter',
    apiModelId: 'cohere/north-mini-code:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 256000,
    capabilities: 'Agentic coding model, sparse MoE 30B/3B',
    modelCardUrl: 'https://openrouter.ai/cohere/north-mini-code',
    vendorUrl: 'https://cohere.com/',
    company: 'Cohere',
    family: 'North',
    released: '2026-06-17',
    license: 'CC-BY-NC-4.0',
    params: '30B total · 3B active',
    tags: ['coding', 'agentic'],
    blurb: 'Cohere\u2019s first agentic coding model, optimized for code generation and repo-level work.',
  },
  {
    id: 'gemma-4-26b',
    name: 'Gemma 4 26B A4B',
    provider: 'OpenRouter',
    apiModelId: 'google/gemma-4-26b-a4b-it:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Instruct MoE, near-31B quality at 3.8B active',
    modelCardUrl: 'https://openrouter.ai/google/gemma-4-26b-a4b-it',
    vendorUrl: 'https://deepmind.google/',
    company: 'Google',
    family: 'Gemma 4',
    released: '2026-04-03',
    license: 'Gemma Terms of Use',
    params: '25.2B total · 3.8B active',
    tags: ['multimodal', 'efficient'],
    blurb: 'Google DeepMind instruction-tuned MoE with near-31B quality while activating only 3.8B per token.',
  },
  {
    id: 'gemma-4-31b',
    name: 'Gemma 4 31B',
    provider: 'OpenRouter',
    apiModelId: 'google/gemma-4-31b-it:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Dense multimodal, configurable thinking mode',
    modelCardUrl: 'https://openrouter.ai/google/gemma-4-31b-it',
    vendorUrl: 'https://deepmind.google/',
    company: 'Google',
    family: 'Gemma 4',
    released: '2026-04-02',
    license: 'Gemma Terms of Use',
    params: '30.7B dense',
    tags: ['multimodal', 'reasoning'],
    blurb: 'Google DeepMind 30.7B dense multimodal model with 256K context and configurable thinking mode.',
  },
  {
    id: 'ling-3.0-tiny',
    name: 'Ling 3.0 Tiny',
    provider: 'OpenRouter',
    apiModelId: 'inclusionai/ling-3.0-tiny:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Tiny MoE for responsive agents, 1.3B active',
    modelCardUrl: 'https://openrouter.ai/inclusionai/ling-3.0-tiny',
    vendorUrl: 'https://www.inclusion.ai/',
    company: 'inclusionAI',
    family: 'Ling 3.0',
    released: '2026-08-06',
    license: 'Apache 2.0',
    params: '7.9B total · 1.3B active',
    tags: ['responsive', 'instruction-following'],
    blurb: 'MoE from inclusionAI for responsive agents, instruction following, and multi-turn conversation.',
  },
  {
    id: 'laguna-s-2.1',
    name: 'Laguna S 2.1',
    provider: 'OpenRouter',
    apiModelId: 'poolside/laguna-s-2.1:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Coding agent model, 118B/8B active',
    modelCardUrl: 'https://openrouter.ai/poolside/laguna-s-2.1',
    vendorUrl: 'https://poolside.ai/',
    company: 'Poolside',
    family: 'Laguna 2.1',
    released: '2026-07-21',
    license: 'CC-BY-NC-4.0',
    params: '118B total · 8B active',
    tags: ['coding', 'agent'],
    blurb: 'Latest Poolside coding agent model, scoring 70.2% on Terminal-Bench 2.1.',
  },
  {
    id: 'laguna-xs-2.1',
    name: 'Laguna XS 2.1',
    provider: 'OpenRouter',
    apiModelId: 'poolside/laguna-xs-2.1:free',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 262144,
    capabilities: 'Coding agent model, 33B-A3B',
    modelCardUrl: 'https://openrouter.ai/poolside/laguna-xs-2.1',
    vendorUrl: 'https://poolside.ai/',
    company: 'Poolside',
    family: 'Laguna 2.1',
    released: '2026-07-02',
    license: 'CC-BY-NC-4.0',
    params: '33B total · 3B active',
    tags: ['coding', 'agent'],
    blurb: '33B-A3B coding agent model from Poolside, a step forward from Laguna XS.2.',
  },
]

// Models contributed by plugins are merged after the built-in roster and
// stamped with their pluginId, exactly like tasks. A plugin model normally
// arrives with a plugin GENERATOR for the same `provider` string
// (`plugins/registry.ts:generators`), which is what lets a contribution ship
// a model the harness has no built-in runner for. Cross-plugin duplicate ids
// are rejected at registration; a duplicate of a BUILT-IN id throws here (the
// registration side cannot see this array without closing an import cycle).
export const BENCHMARK_MODELS: BenchmarkModel[] = mergeModels()

function mergeModels(): BenchmarkModel[] {
  const builtinIds = new Set(BUILTIN_MODELS.map((m) => m.id))
  const contributed = pluginModels()
  for (const m of contributed) {
    // Louder than the task equivalent (a test) because the failure is silent:
    // `getModel(id)` would keep returning the BUILT-IN row while every result
    // recorded under that id looks like the plugin's. Reject at mount.
    if (builtinIds.has(m.id)) {
      throw new Error(
        `[registry] plugin '${m.pluginId}' contributes duplicate model id '${m.id}' (already a built-in model)`
      )
    }
  }
  return [...BUILTIN_MODELS, ...contributed]
}

// ── Providers ───────────────────────────────────────────────────────────
export const BENCHMARK_PROVIDERS: string[] = [
  ...new Set(BENCHMARK_MODELS.map((m) => m.provider)),
]

/** Models grouped by provider, preserving registry order. */
export function modelsByProvider(): Record<string, BenchmarkModel[]> {
  const groups: Record<string, BenchmarkModel[]> = {}
  for (const m of BENCHMARK_MODELS) {
    ;(groups[m.provider] ??= []).push(m)
  }
  return groups
}

// ── Tasks ──────────────────────────────────────────────────────────────
//
// Every row declares its `scorer` explicitly, including the text tasks. The
// field is optional (an unstamped row falls back to the category heuristic in
// `scorers/index.ts`), but stamping ALL of them means the registry is the one
// place you read to know how a task is evaluated — a mixed convention where
// some rows declare and others rely on the heuristic is the thing that made
// this selection hard to follow in the first place.
const BUILTIN_TASKS: BenchmarkTask[] = [
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
    scorer: 'behavioral',
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
    scorer: 'behavioral',
  },
  {
    id: 'crypto-hash-race',
    category: 'security-tasks',
    title: 'Crypto Hash Race',
    blurb: 'Implement and verify a constant-time comparison and a salted hash chain.',
    prompt: 'Write a Python module that provides constant-time string comparison, PBKDF2-based password hashing with a random salt, and a verify function. Include unit tests.',
    runtimeHint: 'CPython, local execution',
    iterationsDefault: 5,
    methodNotes: 'FROM THE NEXT SWEEP the module is EXECUTED (#15): the salted hash, the constant-time comparison, the verify round trip and the included unit tests are all run, for 70% executed behaviour and 30% structural. Every row published so far predates that scorer and was scored STRUCTURALLY (text-era) — the executable scorer was measured against those artifacts and deliberately not applied to them, so no published number changed. The measurement is in docs/lab/llm-benchmark/executable-scoring-impact.md.',
    demoComponentName: 'CryptoHashRaceDemo',
    slug: 'crypto-hash-race',
    scorer: 'executable',
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
    scorer: 'behavioral',
  },
  {
    id: 'equation-solver',
    category: 'advanced-mathematics',
    title: 'Equation Solver',
    blurb: 'Solve a system of non-linear equations and explain each step.',
    prompt: 'Solve the system x^2 + y^2 = 25 and x*y = 12 over the reals. List every solution pair and justify the algebraic steps.',
    runtimeHint: 'Text output, symbolic reasoning',
    iterationsDefault: 5,
    methodNotes: 'Scores by mathematical correctness, completeness of roots, and clarity of derivation. FROM THE NEXT SWEEP, when the answer contains a program it is EXECUTED (#15) and every required pair it prints is verified by substitution; a prose derivation is scored structurally, with the fallback reason recorded. Every row published so far predates that scorer and was scored STRUCTURALLY (text-era) — none was rescored. The measurement is in docs/lab/llm-benchmark/executable-scoring-impact.md.',
    demoComponentName: 'EquationSolverDemo',
    slug: 'equation-solver',
    scorer: 'executable',
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
    scorer: 'behavioral',
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
    scorer: 'behavioral',
  },
]

// Tasks contributed by plugins are merged after the built-in roster and
// stamped with their pluginId (provenance + collision diagnostics live in
// plugins/registry.ts; registry.test.ts enforces id uniqueness across the
// merged set).
export const BENCHMARK_TASKS: BenchmarkTask[] = [
  ...BUILTIN_TASKS,
  ...pluginTasks(),
]

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
