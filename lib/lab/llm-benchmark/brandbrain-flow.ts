import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

/**
 * BrandBrain flow MCP client.
 *
 * BrandBrain's generation surface is a flow, not an image endpoint: a template
 * becomes a stored session, an asset-set plan is authored and approved, the run
 * executes, and outputs come back as artifact URLs. The MCP server (stdio) owns
 * that lifecycle plus spend authorisation, so this speaks MCP to the server
 * rather than reimplementing the flow API.
 *
 * Auth resolves in the order BrandBrain documents: a static bearer token, then
 * the cached OAuth session the server keeps in
 * `~/.brandbrain/flow-mcp-session-<hash>.json`. Neither is required at
 * construction — the server refreshes its own session — so "not authenticated"
 * is discovered by calling `whoami_brandbrain`, not by guessing.
 *
 * Live runs spend money. `maxSpendMicros` is passed through from
 * `BRANDBRAIN_MAX_PROVIDER_SPEND_USD_MICROS` and defaults to $1.00, and the
 * driver only ever asks for `mock` runs unless it is explicitly told otherwise.
 */

export interface BrandBrainFlowOptions {
  /** Path to the flow-orchestrator package (its `dist/index.js` is the server). */
  serverPath: string;
  /** Backend API base URL. Defaults to the server's own default. */
  apiUrl?: string;
  appUrl?: string;
  /** Static bearer token, when the deployment needs one. */
  bearerToken?: string;
  /** Ceiling for a single live run, in USD micros. */
  maxSpendMicros?: number;
  /** Per-call timeout. Generation runs are minutes long, so this is generous. */
  timeoutMs?: number;
}

export interface FlowModel {
  provider: string;
  modelId: string;
  /** Approximate USD per 1024-square image, as the catalogue reports it. */
  approxUsdPerImage?: number;
  supportsReferences?: boolean;
  status?: string;
}

interface McpEnvelope {
  id?: number
  result?: {
    content?: { type: string; text?: string; mimeType?: string; data?: string }[]
    isError?: boolean
  }
  error?: { message?: string }
}

/** Base64 image payloads a tool returned, in order. */
export interface FlowImage {
  mimeType: string
  data: string
}

export class BrandBrainFlowClient {
  private readonly options: BrandBrainFlowOptions
  private child?: ChildProcessWithoutNullStreams
  private buffer = ''
  private nextId = 1
  private readonly pending = new Map<
    number,
    { resolve: (v: { text: string; images: FlowImage[] }) => void; reject: (e: Error) => void }
  >()
  private ready?: Promise<void>

  constructor(options: BrandBrainFlowOptions) {
    this.options = options
  }

  /** Start the server and complete the MCP handshake. */
  async connect(): Promise<void> {
    this.ready ??= this.start()
    return this.ready
  }

  private async start(): Promise<void> {
    const env: NodeJS.ProcessEnv = { ...process.env }
    if (this.options.apiUrl) env.BRANDBRAIN_API_URL = this.options.apiUrl
    if (this.options.appUrl) env.BRANDBRAIN_APP_URL = this.options.appUrl
    if (this.options.bearerToken) env.BRANDBRAIN_FLOW_MCP_BEARER_TOKEN = this.options.bearerToken
    if (this.options.maxSpendMicros) {
      env.BRANDBRAIN_MAX_PROVIDER_SPEND_USD_MICROS = String(this.options.maxSpendMicros)
    }

    const child = spawn('node', [this.options.serverPath], { env, stdio: ['pipe', 'pipe', 'pipe'] })
    this.child = child
    child.stdout.on('data', (chunk) => this.consume(String(chunk)))
    child.stderr.on('data', () => {
      // The server logs to stderr; a failing call reports itself in the result.
    })
    child.on('exit', () => {
      for (const { reject } of this.pending.values()) reject(new Error('brandbrain flow mcp exited'))
      this.pending.clear()
    })

    await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'harness-loops', version: '1' },
    })
    this.notify('notifications/initialized')
  }

  private consume(chunk: string): void {
    this.buffer += chunk
    let index: number
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index)
      this.buffer = this.buffer.slice(index + 1)
      if (line.trim().length === 0) continue
      let message: McpEnvelope
      try {
        message = JSON.parse(line) as McpEnvelope
      } catch {
        continue
      }
      if (message.id === undefined) continue
      const waiter = this.pending.get(message.id)
      if (!waiter) continue
      this.pending.delete(message.id)
      if (message.error) {
        waiter.reject(new Error(message.error.message ?? 'brandbrain flow mcp error'))
      } else {
        const content = message.result?.content ?? []
        waiter.resolve({
          text: content
            .map((part) => part.text ?? '')
            .join('\n')
            .trim(),
          // Generated pictures arrive as image content blocks. They are the
          // only route to the bytes that does not require the platform's own
          // bearer token on this side, so dropping them means the flow runs,
          // spends, and hands back nothing usable.
          images: content
            .filter((part) => part.type === 'image' && typeof part.data === 'string')
            .map((part) => ({ mimeType: part.mimeType ?? 'image/png', data: part.data! })),
        })
      }
    }
  }

  private request(method: string, params: Record<string, unknown>): Promise<{ text: string; images: FlowImage[] }> {
    const child = this.child
    if (!child) return Promise.reject(new Error('brandbrain flow mcp is not connected'))
    const id = this.nextId++
    return new Promise<{ text: string; images: FlowImage[] }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`brandbrain flow mcp call timed out: ${method}`))
      }, this.options.timeoutMs ?? 180_000)
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  }

  private notify(method: string, params: Record<string, unknown> = {}): void {
    this.child?.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
  }

  /** Call one tool and return its text content. */
  async call(tool: string, args: Record<string, unknown> = {}): Promise<string> {
    return (await this.callRaw(tool, args)).text
  }

  /** Call one tool and keep both its text and any image blocks it returned. */
  async callRaw(
    tool: string,
    args: Record<string, unknown> = {}
  ): Promise<{ text: string; images: FlowImage[] }> {
    await this.connect()
    return this.request('tools/call', { name: tool, arguments: args })
  }

  /** Close the server. Safe to call twice. */
  close(): void {
    this.child?.kill()
    this.child = undefined
  }

  /** Who the cached session belongs to. Returns undefined when unauthenticated. */
  async identity(): Promise<string | undefined> {
    try {
      const text = await this.call('whoami_brandbrain')
      const match = /Authenticated as (.+?)\./.exec(text)
      return match?.[1] ?? text.slice(0, 120)
    } catch {
      return undefined
    }
  }

  /**
   * Image models the backend will actually accept.
   *
   * `sortByCost` is BrandBrain's own recommendation when choosing a cheap one,
   * and the catalogue is the only authority on valid pairs and prices.
   */
  async imageModels(options: { sortByCost?: boolean } = {}): Promise<FlowModel[]> {
    return parseImageModels(
      await this.call('list_image_models', options.sortByCost ? { sortByCost: true } : {})
    )
  }

  /**
   * BrandBrain's own preflight, which also names the generate nodes.
   *
   * `get_asset_flow` returns a summary with node COUNTS, so the estimate text
   * is the only place in this MCP surface that exposes a generate node id
   * (`generate_hero: openai/gpt-image-1 · ~$0.1670`) — and the price the run
   * would actually charge.
   */
  async estimateRun(
    sessionId: string
  ): Promise<{ usd?: number; nodes: { nodeId: string; provider: string; modelId: string; usd?: number }[] }> {
    const text = await this.call('estimate_asset_flow_run_cost', { sessionId })
    const total = /\$([\d.]+)/.exec(text)?.[1]
    const nodes = [
      ...text.matchAll(/([a-z_]+_[A-Za-z0-9_-]+):\s*([a-z]+)\/([A-Za-z0-9._-]+)\s*(?:·\s*~\$([\d.]+))?/g),
    ].map((m) => ({
      nodeId: m[1]!,
      provider: m[2]!,
      modelId: m[3]!,
      usd: m[4] ? Number(m[4]) : undefined,
    }))
    return { usd: total ? Number(total) : undefined, nodes }
  }

  /** Canonical starter flow templates, as `{ id, title }`. */
  async templates(): Promise<{ id: string; title: string }[]> {
    const text = await this.call('list_asset_flow_templates', { limit: 40 })
    const out: { id: string; title: string }[] = []
    for (const line of text.split('\n')) {
      const match = /^([a-z0-9][\w-]*):\s+(.+?)(?:\s+\(|$)/.exec(line.trim())
      if (match) out.push({ id: match[1]!, title: match[2]! })
    }
    return out
  }
}

export interface GenerateFlowOptions {
  /** The brief, written into the flow's prompt node. */
  prompt: string
  /** Where the generated file must land. */
  outPath: string
  /**
   * Pin the cheap model. Left unset, the flow runs the TEMPLATE's default —
   * gpt-image-2 at ~$0.21 an image — which is twenty times what
   * `openrouter/meta/muse-image` costs. Passing `cheapest: true` selects it
   * from the catalogue rather than hard-coding an id that may be retired.
   */
  provider?: string
  modelId?: string
  /** Choose the cheapest catalogue model automatically. */
  cheapest?: boolean
  /** Refuse a live run whose estimate exceeds this, in USD. Default $0.05. */
  budgetUsd?: number
  /** `mock` never calls a provider; `live` spends. Default `mock`. */
  mode?: 'mock' | 'live'
  /** Flow title, so the canvas is identifiable after the run. */
  title?: string
  /** Template to start from; the backend picks a default when omitted. */
  templateId?: string
}

export interface GenerateFlowResult {
  sessionId: string
  runId?: string
  taskId?: string
  path: string
  bytes: number
  mode: 'mock' | 'live'
  artifactUrl?: string
}

/**
 * First namespaced id in a tool's text.
 *
 * BrandBrain namespaces them (`flow_session_…`, `flow_task_…`, `run_…`) and a
 * loose `task_` match picks up `flow_task_` only by luck of the character class,
 * which is how a poll silently reports "not found" for a task that exists.
 */
function firstId(text: string, prefix: 'flow_session' | 'flow_task' | 'run'): string | undefined {
  return new RegExp(`\\b${prefix}_[A-Za-z0-9_-]+`).exec(text)?.[0]
}

/** Mock runs return an artifact digest; live runs return an http(s) URL. */
function artifactLocator(text: string): { kind: 'url'; url: string } | { kind: 'digest'; id: string } | undefined {
  const url = /https?:\/\/[^\s"'<>)]+/.exec(text)?.[0]
  if (url) return { kind: 'url', url }
  const digest = /artifact ([A-Za-z0-9]{16,})/.exec(text)?.[1]
  return digest ? { kind: 'digest', id: digest } : undefined
}

/** First http(s) artifact URL in a tool's text. */
function firstUrl(text: string): string | undefined {
  return /https?:\/\/[^\s"'<>)]+/.exec(text)?.[0]
}

/**
 * Run one BrandBrain flow and bring one generated picture back to disk.
 *
 * The lifecycle is BrandBrain's, deliberately: create a session from a template,
 * start a run, poll the task, then read the outputs and download the artifact.
 * Skipping any step would put a policy (spend authorisation, manifest approval)
 * on this side of the boundary, and those policies exist for a reason.
 */
export async function generateFlowImage(
  client: BrandBrainFlowClient,
  options: GenerateFlowOptions
): Promise<GenerateFlowResult | undefined> {
  const mode = options.mode ?? 'mock'
  const created = await client.call('create_asset_flow', {
    title: options.title ?? `harness image · ${options.prompt.slice(0, 60)}`,
    goal: options.prompt,
    ...(options.templateId ? { templateId: options.templateId } : {}),
  })
  const sessionId = firstId(created, 'flow_session')
  if (!sessionId) return undefined

  const validation = await client.call('validate_asset_flow', { sessionId })
  if (/error|failed/i.test(validation) && !/valid|no errors/i.test(validation)) return undefined

  // Pin the model BEFORE costing the run, so the estimate is for the model that
  // will actually execute rather than the template's default.
  if (mode === 'live') {
    let provider = options.provider
    let modelId = options.modelId
    if (options.cheapest || (!provider && !modelId)) {
      const cheapest = cheapestImageModel(await client.imageModels({ sortByCost: true }))
      provider ??= cheapest?.provider
      modelId ??= cheapest?.modelId
    }
    // The preflight names the generate nodes; get_asset_flow returns only node
    // COUNTS, so a client that needs a node id has to read it from here.
    const preflight = await client.estimateRun(sessionId)

    if (provider && modelId) {
      for (const node of preflight.nodes.filter((n) => n.nodeId.startsWith('generate'))) {
        await selectFlowModel(client, {
          sessionId,
          nodeId: node.nodeId,
          provider,
          modelId,
          aspectRatio: '16:9',
          copySafety: 'clean negative space on one side for headline copy',
        })
      }
      // Verify the pin landed rather than trusting a 200-shaped reply: this call
      // accepts provider/modelId without listing them in its schema and ignores
      // them, so the only proof is the re-priced preflight below.
    }

    // Re-estimate AFTER pinning, and refuse anything over budget: the price
    // that matters is the one the run will actually charge, not the one the
    // template defaulted to.
    const budget = options.budgetUsd ?? 0.05
    const after = await client.estimateRun(sessionId)
    if (after.usd !== undefined && after.usd > budget) return undefined
  }

  const started = await client.call('start_asset_flow_run', { sessionId, mode })
  const taskId = firstId(started, 'flow_task')
  let runId = firstId(started, 'run')

  if (taskId) {
    // Poll to completion. A live image generation takes tens of seconds.
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const status = await client.call('get_asset_flow_task', { taskId })
      // The completion message is where the run id appears, and it is NOT
      // prefixed: `completed with run ef75…`. Without it, get_flow_outputs
      // reports "No runs yet" and the run looks like it produced nothing.
      runId ??= /with run ([A-Za-z0-9]{16,})/.exec(status)?.[1]
      if (/completed|succeeded/i.test(status)) break
      if (/failed|error/i.test(status)) return undefined
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }

  // Outputs first as raw content: the MCP serves the picture itself as an image
  // block, which needs no platform token on this side. The text form is the
  // fallback for a client that only advertises an artifact id.
  const raw = await client.callRaw('get_flow_outputs', { sessionId, ...(runId ? { runId } : {}) })
  const image = raw.images[0]
  if (image) {
    const bytes = Buffer.from(image.data, 'base64')
    if (bytes.byteLength === 0) return undefined
    const ext = image.mimeType.includes('webp') ? 'webp' : image.mimeType.includes('jpeg') ? 'jpg' : 'png'
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const target = options.outPath.replace(/\.[a-z0-9]+$/i, `.${ext}`)
    const dir = target.split('/').slice(0, -1).join('/')
    if (dir) mkdirSync(dir, { recursive: true })
    writeFileSync(target, bytes)
    return { sessionId, runId, taskId, path: target, bytes: bytes.byteLength, mode }
  }

  const outputs = raw.text
  const locator = artifactLocator(outputs)
  if (!locator) return undefined

  // A mock run has no image bytes behind it — it returns an artifact digest —
  // so the honest result is "the flow ran, there is no picture". Anything else
  // would be a placeholder file pretending to be a generation.
  if (locator.kind === 'digest') return undefined

  const response = await fetch(locator.url)
  if (!response.ok) return undefined
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.byteLength === 0) return undefined

  const dir = options.outPath.split('/').slice(0, -1).join('/')
  if (dir) {
    const { mkdirSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true })
  }
  const { writeFileSync } = await import('node:fs')
  writeFileSync(options.outPath, bytes)

  return { sessionId, runId, taskId, path: options.outPath, bytes: bytes.byteLength, mode, artifactUrl: locator.url }
}

/**
 * Cheapest image model worth actually using.
 *
 * Two catalogue traps, both found by reading the live list rather than the
 * docs: sorting by cost puts a $0 **legacy** model first (nothing generates
 * from those reliably), and a $0 entry is far more likely to be a listing
 * artefact than a free tier. So: a real price, a current model, and the
 * cheapest of those — `openrouter/meta/muse-image` at ~$0.01 today.
 */
export function cheapestImageModel(models: FlowModel[]): FlowModel | undefined {
  const usable = models.filter(
    (m) =>
      typeof m.approxUsdPerImage === 'number' &&
      m.approxUsdPerImage > 0 &&
      (m.status ?? 'current') === 'current'
  )
  return usable.sort((a, b) => a.approxUsdPerImage! - b.approxUsdPerImage!)[0]
}

/** Points a flow's generate node at a specific model before any run. */
export async function selectFlowModel(
  client: BrandBrainFlowClient,
  args: { sessionId: string; nodeId: string; provider?: string; modelId?: string; aspectRatio?: string; copySafety?: string }
): Promise<boolean> {
  const text = await client.call('set_generate_target', args)
  return !/error|failed|not found/i.test(text)
}

/** BrandBrain's own preflight estimate, in USD, before a live run spends. */
export async function estimateRunCostUsd(
  client: BrandBrainFlowClient,
  args: { sessionId: string; targetNodeId?: string }
): Promise<number | undefined> {
  const text = await client.call('estimate_asset_flow_run_cost', args)
  const dollars = /\$([\d.]+)/.exec(text)?.[1]
  if (dollars !== undefined) return Number(dollars)
  const micros = /([\d.]+)\s*(?:USD\s*)?micros?/i.exec(text)?.[1]
  return micros !== undefined ? Number(micros) / 1_000_000 : undefined
}

/**
 * Parse the image-model catalogue text.
 *
 * The backend is the only authority on which provider/model pairs are valid and
 * what each costs, so this reads its own listing rather than carrying a copy
 * that goes stale. The price is what a spend decision is made from, so it is
 * parsed rather than approximated.
 */
export function parseImageModels(text: string): FlowModel[] {
  const models: FlowModel[] = []
  let provider = ''
  for (const line of text.split('\n')) {
    const heading = /^([a-z]+)(?: \(default [^)]*\))?:/.exec(line.trim())
    if (heading?.[1]) {
      provider = heading[1]
      continue
    }
    const entry = /^(\S+)\s+·\s+(\S+)(.*)$/.exec(line.trim())
    if (!entry || provider === '') continue
    const price = /~\$([\d.]+)\/1024²/.exec(entry[3] ?? '')
    const references = /references≤(\d+)/.exec(entry[3] ?? '')
    models.push({
      provider,
      modelId: entry[1]!,
      status: entry[2],
      approxUsdPerImage: price?.[1] ? Number(price[1]) : undefined,
      supportsReferences: Boolean(references?.[1]),
    })
  }
  return models
}

/** Parse the template listing into `{ id, title }`. */
export function parseTemplates(text: string): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = []
  for (const line of text.split('\n')) {
    const match = /^([a-z0-9][\w-]*):\s+(.+?)(?:\s+\(|$)/.exec(line.trim())
    if (match) out.push({ id: match[1]!, title: match[2]! })
  }
  return out
}
