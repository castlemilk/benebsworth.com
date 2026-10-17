/**
 * Gamma catalogue client.
 *
 * Gamma (~/projects/gamma) is a component library, a design-system token set, a
 * background studio and a shader catalogue, all served over one MCP endpoint at
 * `POST /api/mcp`. For a generated page it answers three questions the design
 * skills cannot: what a maintained component looks like, what a real background
 * recipe is, and what an effect's source is.
 *
 * Everything here returns CSS or a file path, never React. The task ships a
 * single self-contained HTML file with no build step, so a `<Component />` import
 * is not an option — but the tokens, the background recipes and the shader
 * source are all directly portable, and a catalogueued component's *styles* are
 * exactly what a hand-rolled page gets wrong.
 *
 * Nothing here is required: when Gamma is not running, every call returns
 * undefined and the loop proceeds without it, saying so in its record.
 */

export interface GammaMcpOptions {
  /** Streamable HTTP endpoint. Default is Gamma's documented local URL. */
  url?: string
  /** Per-call timeout in milliseconds. */
  timeoutMs?: number
}

const DEFAULT_URL = 'http://127.0.0.1:3000/api/mcp'

/** One JSON-RPC call. Gamma speaks stateless Streamable HTTP with JSON replies. */
async function call<T>(
  tool: string,
  args: Record<string, unknown>,
  options: GammaMcpOptions = {}
): Promise<T | undefined> {
  const url = options.url ?? DEFAULT_URL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: tool, arguments: args },
      }),
    })
    if (!response.ok) return undefined
    const text = await response.text()
    // Some Streamable HTTP servers frame JSON in an SSE `data:` envelope.
    const payload = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('')
    const body = JSON.parse(payload || text) as {
      result?: { content?: { type: string; text?: string }[] }
    }
    const first = body.result?.content?.find((c) => c.type === 'text')
    return first?.text as T | undefined
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

export interface GammaCatalogueEntry {
  id?: string
  slug?: string
  name?: string
  kind?: string
  summary?: string
  description?: string
  category?: string
}

export interface GammaAssets {
  /** True when the catalogue answered at all. */
  reachable: boolean;
  /** Design-system token CSS, ready to inline. */
  tokensCss?: string;
  /** Design-system name, so the model can name what it used. */
  system?: string;
  /** Background recipe CSS, ready to inline. */
  backgroundCss?: string;
  backgroundName?: string;
  /** Effect/shader source, for a canvas or SVG the page can inline. */
  effectCss?: string;
  effectName?: string;
  /** Catalogue slugs worth mentioning in the brief. */
  componentSlugs: string[];
  /** Anything that went wrong, for the run record. */
  notes: string[];
}

/** Parse the tool's text payload, which may be JSON or a bare string. */
function parsePayload(raw: string | undefined): unknown {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

/** Find the first CSS-looking string anywhere in a tool payload. */
function findCss(value: unknown, depth = 0): string | undefined {
  if (depth > 5) return undefined
  if (typeof value === 'string') {
    return value.includes('{') && value.includes(':') && value.length > 40 ? value : undefined
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCss(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findCss(item, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

/** The first hex palette in a payload, whatever key it hides under. */
function findPalette(value: unknown, depth = 0): string[] {
  if (depth > 5 || value === null || value === undefined) return []
  if (Array.isArray(value)) {
    const hexes = value.filter((v): v is string => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v))
    if (hexes.length >= 2) return hexes
    for (const item of value) {
      const found = findPalette(item, depth + 1)
      if (found.length >= 2) return found
    }
    return []
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findPalette(item, depth + 1)
      if (found.length >= 2) return found
    }
  }
  return []
}

/** The one-line description of a catalogue entry, when it has one. */
function findSummary(value: unknown, depth = 0): string | undefined {
  if (depth > 4 || !value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (typeof record.summary === 'string' && record.summary.length > 0) return record.summary
  for (const item of Object.values(record)) {
    const found = findSummary(item, depth + 1)
    if (found) return found
  }
  return undefined
}

/** Turn a Gamma background palette into portable CSS. */
function backgroundCssFromPalette(palette: string[], name: string, summary?: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const properties = palette.map((hex, i) => `  --gamma-bg-${String(i + 1)}: ${hex};`).join('\n')
  const stops = palette.map((hex) => `${hex}`).join(', ')
  return [
    `/* Gamma background "${name}"${summary ? ` — ${summary}` : ''} */`,
    `:root {\n${properties}\n}`,
    `.gamma-bg-${slug} {`,
    '  background: linear-gradient(160deg, ' + stops + ');',
    '  background-size: cover;',
    '}',
  ].join('\n')
}

/**
 * The first handle in a catalogue list.
 *
 * Every list endpoint answers `{ items: [{ id | slug | name, … }] }` and the
 * matching get-endpoint takes that handle back, so this is the join key for
 * list → get. Resolved by walking rather than by shape: the payloads differ per
 * endpoint, and a shape-specific reader breaks the first time one of them does.
 */
function firstHandle(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstHandle(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['id', 'slug', 'name'] as const) {
      const handle = record[key];
      if (typeof handle === 'string' && handle.length > 0) return handle;
    }
    for (const item of Object.values(record)) {
      const found = firstHandle(item, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

function names(value: unknown): string[] {
  const out: string[] = []
  const walk = (node: unknown, depth: number): void => {
    if (depth > 4 || !node) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    if (typeof node === 'object') {
      const record = node as Record<string, unknown>
      const name = (record.slug ?? record.id ?? record.name) as string | undefined
      if (typeof name === 'string' && name.length > 0) out.push(name)
      for (const item of Object.values(record)) {
        if (typeof item === 'object' || Array.isArray(item)) walk(item, depth + 1)
      }
    }
  };
  walk(value, 0);
  return [...new Set(out)];
}

/**
 * Pull the assets a page can actually use.
 *
 * The order matters: tokens first (they set the palette and type every Gamma
 * component assumes), then a background, then one effect. Component *slugs* are
 * returned rather than their React source, because the brief should point the
 * model at maintained implementations without pretending it can import them.
 */
export async function fetchGammaAssets(
  query: string,
  options: GammaMcpOptions = {}
): Promise<GammaAssets> {
  /**
   * List a catalogue with the query, then without it.
   *
   * Gamma's catalogue is visual — backgrounds, shaders, components — so a
   * marketing phrase like "landing page" matches nothing and an empty result is
   * indistinguishable from an empty catalogue. A plain listing always has
   * entries, and relevance is the query's job only when it helps.
   */
  async function listWithFallback(
    tool: string,
    args: Record<string, unknown>,
    options: GammaMcpOptions
  ): Promise<unknown> {
    const searched = parsePayload(await call(tool, args, options))
    if (firstHandle(searched)) return searched
    return parsePayload(await call(tool, {}, options))
  }

  const assets: GammaAssets = { reachable: false, componentSlugs: [], notes: [] }

  const systems = parsePayload(await call('gamma_list_design_systems', {}, options))
  assets.system = firstHandle(systems)

  if (assets.system) {
    const tokens = parsePayload(await call('gamma_get_design_system', { id: assets.system }, options))
    assets.tokensCss = findCss(tokens)
    if (!assets.tokensCss) assets.notes.push(`design system "${assets.system}" returned no token CSS`)
  }

  const backgrounds = await listWithFallback('gamma_list_backgrounds', { query }, options)
  const backgroundName = names(backgrounds)[0]
  if (backgroundName) {
    const background = parsePayload(await call('gamma_get_background', { mode: backgroundName }, options))
    // A Gamma background is a procedural recipe — palette, seed, scale, flow —
    // not a stylesheet, so there is no CSS text to lift. What travels into a
    // single-file page is the palette: custom properties plus one gradient that
    // uses them, which is the part a hand-written page usually gets wrong.
    const palette = findPalette(background)
    const summary = findSummary(background)
    assets.backgroundCss = palette.length > 0 ? backgroundCssFromPalette(palette, backgroundName, summary) : findCss(background)
    assets.backgroundName = backgroundName
    if (!assets.backgroundCss) assets.notes.push(`background "${backgroundName}" returned neither CSS nor a palette`)
  }

  const shaders = await listWithFallback('gamma_list_shaders', { query, limit: 5 }, options)
  const shaderName = names(shaders)[0]
  if (shaderName) {
    const shader = parsePayload(await call('gamma_get_shader', { name: shaderName }, options))
    assets.effectCss = findCss(shader)
    assets.effectName = shaderName
    if (!assets.effectCss) assets.notes.push(`shader "${shaderName}" returned no source`)
  }

  const components = await listWithFallback('gamma_list_components', { query }, options)
  assets.componentSlugs = names(components).slice(0, 12)

  assets.reachable = assets.componentSlugs.length > 0 || assets.tokensCss !== undefined
  if (!assets.reachable) assets.notes.push('gamma catalogue returned nothing')
  return assets
}

/**
 * The CSS block handed to the model.
 *
 * Scoped deliberately: the tokens are Gamma's, and a page that redefines them
 * half-way through is worse than one that adopts them. The block is commented as
 * vendored so nobody later mistakes it for something the model wrote.
 */
export function gammaStylesheet(assets: GammaAssets): string {
  if (!assets.tokensCss && !assets.backgroundCss && !assets.effectCss) return ''
  const parts: string[] = []
  if (assets.tokensCss) {
    parts.push(`/* Gamma design tokens${assets.system ? ` (${assets.system})` : ''} — vendored, adopt as-is */\n${assets.tokensCss}`)
  }
  if (assets.backgroundCss) {
    parts.push(
      `/* Gamma background recipe${assets.backgroundName ? `: ${assets.backgroundName}` : ''} */\n${assets.backgroundCss}`
    )
  }
  if (assets.effectCss) {
    parts.push(
      `/* Gamma effect source${assets.effectName ? `: ${assets.effectName}` : ''} */\n${assets.effectCss}`
    )
  }
  return parts.join('\n\n')
}

/**
 * The note that tells the model what it has and what it may not do with it.
 *
 * The one rule that matters: these are real implementations from a maintained
 * library, so they beat whatever the model would have written, and replacing
 * them with a hand-rolled equivalent is a downgrade.
 */
export function gammaBrief(assets: GammaAssets): string {
  if (!assets.reachable) return ''
  const have: string[] = []
  if (assets.tokensCss) have.push(`design tokens${assets.system ? ` from the ${assets.system} design system` : ''}`)
  if (assets.backgroundCss) {
    have.push(
      assets.backgroundName ? `a background recipe ("${assets.backgroundName}")` : 'a background recipe'
    )
  }
  if (assets.effectCss) {
    have.push(
      assets.effectName ? `the source of the "${assets.effectName}" effect` : 'an effect implementation'
    )
  }
  if (assets.componentSlugs.length > 0) {
    have.push(`maintained components you should mirror rather than reinvent: ${assets.componentSlugs.slice(0, 6).join(', ')}`)
  }

  return [
    '## From the Gamma component library',
    'These are real, maintained implementations, copied below so this file stays',
    'self-contained. Use them as they are:',
    ...have.map((item) => `- ${item}`),
    '',
    'The tokens are the point. Set the page palette and type from them instead of',
    'inventing new values, and let the background or effect carry the atmosphere',
    'rather than adding a gradient of your own. Do not redefine what is already',
    'defined here — a half-applied token set is worse than none.',
  ].join('\n')
}
