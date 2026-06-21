export type ParamValue = number | boolean | string
export type Params = Record<string, ParamValue>

export type ControlSpec =
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number }
  | { key: string; label: string; type: 'toggle' }
  | { key: string; label: string; type: 'color' }
  | { key: string; label: string; type: 'select'; options: { label: string; value: string }[] }

export type Dims = { w: number; h: number; dpr: number }
export type EffectTheme = { bg: string; fg: string }
export type Renderer = { step: (timeMs: number, params: Params) => void; destroy?: () => void }
export type EffectModule = {
  controls: ControlSpec[]
  defaults: Params
  createRenderer: (ctx: CanvasRenderingContext2D, dims: Dims, theme?: EffectTheme) => Renderer
  /** Optional: keep coupled controls coherent. Called once on init (no
   *  `change`) to normalise the starting params, and on every control change
   *  with the edited `{ key, value }`; returns the next params. Omit for
   *  effects with independent controls — callers then do a plain
   *  `{ ...prev, [key]: value }`. (e.g. reaction-diffusion: picking a preset
   *  loads its feed/kill; editing feed/kill switches the preset to 'custom'.) */
  reconcileParams?: (params: Params, change?: { key: string; value: ParamValue }) => Params
}
