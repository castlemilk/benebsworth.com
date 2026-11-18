/** Pure source-mode URL codec. No browser history, routing or DOM operations. */
import {
  HOST_KINDS, buildHostHref, initialHostState, readHostState,
} from '../../lib/knowledge-source/integration/host-seam'
import {
  CANONICAL_PROVIDER,
  type SourceViewDataV2, type SourceViewStateV2, type SourceViewTransitionV2,
} from './view-contract-v2'

const HOST_KEYS = ['kgProvider', 'kgSnapshot', 'kgRoot', 'kgSelected', 'kgKinds', 'kgQuery'] as const
const WRAPPER_KEYS = ['kgView', 'kgScope', 'kgCategory', 'kgPage', 'kgTheme'] as const
const ORIGIN_KEYS = ['kgOriginProvider', 'kgOriginSnapshot', 'kgOriginId'] as const
const OWNED_KEYS = new Set<string>([...HOST_KEYS, ...WRAPPER_KEYS, ...ORIGIN_KEYS])
const VIEWS = ['neighbourhood', 'list', 'categories'] as const
const SCOPES = ['collection', 'neighbours'] as const
const THEMES = ['light', 'dark'] as const
const PARSE_BASE = 'https://knowledge.invalid/'

const hasControl = (value: string) => Array.from(value).some(character =>
  character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)
const opaque = (value: unknown): value is string => typeof value === 'string'
  && value.length > 0 && value.length <= 4096 && value.trim() === value && !hasControl(value)
const optionalOpaque = (value: unknown) => value === null || opaque(value)
const qualifier = (value: unknown) => value === '' || opaque(value)
const context = (data: SourceViewDataV2) => ({ provider: CANONICAL_PROVIDER, snapshot: data.canonical })

/**
 * Validate the ORIGINAL value before URL parsing can repair a missing authority.
 * Return its original bytes: relative source anchors must never gain an origin.
 */
export function safeViewHref(value: string | null, absolute = false): string | null {
  if (typeof value !== 'string' || !value || Array.from(value).some(character =>
    character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127
    || character === '\\' || /\s/u.test(character))) return null
  const relative = value.startsWith('/') && !value.startsWith('//')
  if (relative && absolute) return null
  if (!relative) {
    const match = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/iu.exec(value)
    if (!match || match[1].includes('@')) return null
  }
  try {
    const parsed = new URL(value, PARSE_BASE)
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname
      && !parsed.username && !parsed.password ? value : null
  } catch { return null }
}

/** Split without normalizing the path, authority, hash or foreign query bytes. */
function hrefParts(href: string) {
  const hashAt = href.indexOf('#')
  const beforeHash = hashAt < 0 ? href : href.slice(0, hashAt)
  const queryAt = beforeHash.indexOf('?')
  return {
    base: queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt),
    query: queryAt < 0 ? '' : beforeHash.slice(queryAt + 1),
    hash: hashAt < 0 ? '' : href.slice(hashAt),
  }
}

function decodedName(pair: string): string | null {
  const separator = pair.indexOf('=')
  try { return decodeURIComponent((separator < 0 ? pair : pair.slice(0, separator)).replace(/\+/gu, ' ')) }
  catch { return null }
}

function malformedParameter(key: string, value: string) {
  return 'Malformed owned parameter ' + key + ': ' + JSON.stringify(value)
}

function parameterErrors(query: string, params: URLSearchParams): string[] {
  const errors: string[] = []
  for (const key of OWNED_KEYS) {
    if (params.getAll(key).length > 1) errors.push('Duplicate owned parameter: ' + key)
  }
  for (const pair of query.split('&')) {
    const key = decodedName(pair)
    if (!key || !OWNED_KEYS.has(key)) continue
    const separator = pair.indexOf('=')
    const raw = separator < 0 ? '' : pair.slice(separator + 1)
    try { decodeURIComponent(raw.replace(/\+/gu, ' ')) }
    catch { errors.push('Malformed encoding for ' + key + ': ' + JSON.stringify(raw)) }
  }
  const malformed = (key: string, valid: (value: string) => boolean) => {
    const value = params.get(key)
    if (value !== null && !valid(value)) errors.push(malformedParameter(key, value))
  }
  for (const key of ['kgProvider', 'kgSnapshot', 'kgRoot', 'kgSelected', 'kgCategory']) {
    malformed(key, qualifier)
  }
  malformed('kgKinds', value => value === '' || value.split(',').every(kind =>
    HOST_KINDS.some(allowed => allowed === kind)))
  malformed('kgQuery', value => !hasControl(value))
  malformed('kgView', value => VIEWS.some(allowed => allowed === value))
  malformed('kgScope', value => SCOPES.some(allowed => allowed === value))
  malformed('kgTheme', value => THEMES.some(allowed => allowed === value))
  malformed('kgPage', value => /^[1-9]\d*$/u.test(value) && Number.isSafeInteger(Number(value)))
  for (const key of ORIGIN_KEYS) malformed(key, opaque)
  const suppliedOriginFields = ORIGIN_KEYS.filter(key => params.has(key)).length
  if (suppliedOriginFields > 0 && suppliedOriginFields < ORIGIN_KEYS.length) {
    errors.push('Incomplete candidate origin: provider, snapshot and ID are all required')
  }
  return errors
}

export function initialSourceViewState(data: SourceViewDataV2): SourceViewStateV2 {
  return {
    navigation: initialHostState(context(data)), candidateOrigin: null,
    view: 'neighbourhood', scope: 'collection', categoryId: null,
    page: 1, theme: 'light', inputError: null,
  }
}

export function readSourceViewState(href: string, data: SourceViewDataV2): SourceViewStateV2 {
  const initial = initialSourceViewState(data)
  const safe = safeViewHref(href)
  // Even an unsafe URL can retain its raw requested query for explicit recovery.
  // Never pass that unsafe original to a URL parser or infer an active provider.
  const parts = hrefParts(typeof href === 'string' ? href : '')
  const params = new URLSearchParams(parts.query)
  const errors = parameterErrors(parts.query, params)
  if (!safe) errors.unshift('Invalid original graph URL')
  const hasOrigin = ORIGIN_KEYS.some(key => params.has(key))
  const requestedView = params.get('kgView')
  const requestedScope = params.get('kgScope')
  const requestedTheme = params.get('kgTheme')
  const requestedPage = params.get('kgPage')
  return {
    ...initial,
    navigation: readHostState('/?' + parts.query, context(data)),
    candidateOrigin: hasOrigin ? {
      provider: params.get('kgOriginProvider') ?? '',
      snapshot: params.get('kgOriginSnapshot') ?? '',
      id: params.get('kgOriginId') ?? '',
    } : null,
    view: VIEWS.find(value => value === requestedView) ?? initial.view,
    scope: SCOPES.find(value => value === requestedScope) ?? initial.scope,
    categoryId: params.get('kgCategory') || null,
    page: requestedPage !== null && /^[1-9]\d*$/u.test(requestedPage)
      && Number.isSafeInteger(Number(requestedPage)) ? Number(requestedPage) : initial.page,
    theme: THEMES.find(value => value === requestedTheme) ?? initial.theme,
    inputError: errors.length ? errors.join('; ') : null,
  }
}

function validWrapperState(state: SourceViewStateV2): boolean {
  const navigation = state?.navigation
  const origin = state?.candidateOrigin
  return Boolean(state && state.inputError === null && navigation
    && qualifier(navigation.provider) && qualifier(navigation.snapshot)
    && optionalOpaque(navigation.rootId) && optionalOpaque(navigation.selectedId)
    && Array.isArray(navigation.kinds) && navigation.kinds.every(kind => HOST_KINDS.includes(kind))
    && typeof navigation.query === 'string' && !hasControl(navigation.query)
    && VIEWS.includes(state.view) && SCOPES.includes(state.scope) && THEMES.includes(state.theme)
    && Number.isSafeInteger(state.page) && state.page >= 1 && optionalOpaque(state.categoryId)
    && (origin === null || (origin && opaque(origin.provider) && opaque(origin.snapshot) && opaque(origin.id))))
}

export function buildSourceViewHref(href: string, state: SourceViewStateV2): string | null {
  if (!safeViewHref(href) || !validWrapperState(state)) return null
  const parts = hrefParts(href)
  // Let the source owner's codec encode its fields; merge only the owned values.
  const hostParams = new URL(buildHostHref('/', state.navigation), PARSE_BASE).searchParams
  const owned = new URLSearchParams()
  for (const key of HOST_KEYS) owned.set(key, hostParams.get(key) ?? '')
  owned.set('kgView', state.view)
  owned.set('kgScope', state.scope)
  owned.set('kgCategory', state.categoryId ?? '')
  owned.set('kgPage', String(state.page))
  owned.set('kgTheme', state.theme)
  if (state.candidateOrigin !== null) {
    owned.set('kgOriginProvider', state.candidateOrigin.provider)
    owned.set('kgOriginSnapshot', state.candidateOrigin.snapshot)
    owned.set('kgOriginId', state.candidateOrigin.id)
  }
  const foreign = parts.query ? parts.query.split('&').filter(pair => {
    const key = decodedName(pair)
    return key === null || !OWNED_KEYS.has(key)
  }) : []
  return parts.base + '?' + [...foreign, owned.toString()].join('&') + parts.hash
}

export function sourceHistoryPlan(href: string, transition: SourceViewTransitionV2, existingState: unknown): {
  method: 'none' | 'push' | 'replace'; href: string; state: unknown; reason?: string
} {
  if (transition.history === 'none') {
    return { method: 'none', href, state: existingState, ...(transition.reason ? { reason: transition.reason } : {}) }
  }
  const nextHref = buildSourceViewHref(href, transition.state)
  if (!nextHref || !['push', 'replace'].includes(transition.history)) {
    return {
      method: 'none', href, state: existingState,
      reason: transition.state?.inputError ?? (!safeViewHref(href) ? 'Invalid original graph URL' : 'Invalid source view state or history intent'),
    }
  }
  return {
    method: transition.history, href: nextHref, state: existingState,
    ...(transition.reason ? { reason: transition.reason } : {}),
  }
}
