export type ParamValue = number | boolean | string
export type Params = Record<string, ParamValue>

export type ControlSpec =
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number }
  | { key: string; label: string; type: 'toggle' }
  | { key: string; label: string; type: 'color' }
  | { key: string; label: string; type: 'select'; options: { label: string; value: string }[] }

export type Dims = { w: number; h: number; dpr: number }
export type Renderer = { step: (timeMs: number, params: Params) => void; destroy?: () => void }
export type EffectModule = {
  controls: ControlSpec[]
  defaults: Params
  createRenderer: (ctx: CanvasRenderingContext2D, dims: Dims) => Renderer
}
