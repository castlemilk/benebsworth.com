import type { ControlSpec, Params, ParamValue } from './types'

export function encodeParams(params: Params): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v))
  return sp.toString()
}

function coerce(spec: ControlSpec, raw: string, fallback: ParamValue): ParamValue {
  switch (spec.type) {
    case 'range': {
      const n = Number(raw)
      if (!Number.isFinite(n)) return fallback
      return Math.min(spec.max, Math.max(spec.min, n))
    }
    case 'toggle':
      return raw === 'true' || raw === '1'
    case 'color':
      return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback
    case 'select':
      return spec.options.some((o) => o.value === raw) ? raw : fallback
  }
}

export function decodeParams(search: string, defaults: Params, specs: ControlSpec[]): Params {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const out: Params = { ...defaults }
  for (const spec of specs) {
    if (!sp.has(spec.key)) continue
    out[spec.key] = coerce(spec, sp.get(spec.key)!, defaults[spec.key])
  }
  return out
}
