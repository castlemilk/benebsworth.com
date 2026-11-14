import { geometryFor, parametersFor, type Geometry, type Study } from './model'

export interface Appearance {
  palette: 'folio' | 'monochrome' | 'custom'
  theme: 'light' | 'dark'
  weight: number
  guides: boolean
  inkColor: string
  accentColor: string
  linecap: 'round' | 'butt'
  guideOpacity: number
  emphasis: number
}
export const DEFAULT_APPEARANCE: Appearance = { palette: 'folio', theme: 'light', weight: 2.4, guides: true, inkColor: '#28343b', accentColor: '#b32624', linecap: 'round', guideOpacity: 1, emphasis: 1.65 }
export const APPEARANCE_PRESETS = [
  { id: 'folio', label: 'Folio', values: {} },
  { id: 'technical', label: 'Technical', values: { weight: 1.5, linecap: 'butt', guideOpacity: 0.7, emphasis: 1.5 } },
  { id: 'bold', label: 'Bold', values: { weight: 3.2, guideOpacity: 0.5, emphasis: 1.8 } },
] as const
export function appearanceFor(values: Partial<Appearance> = {}): Appearance {
  for (const key of Object.keys(values)) if (!(Object.hasOwn(DEFAULT_APPEARANCE, key))) throw new Error('Unknown appearance setting')
  const value = { ...DEFAULT_APPEARANCE, ...values }
  if (!['folio', 'monochrome', 'custom'].includes(value.palette) || !['light', 'dark'].includes(value.theme) || typeof value.guides !== 'boolean' || !['round', 'butt'].includes(value.linecap) || !/^#[0-9a-f]{6}$/i.test(value.inkColor) || !/^#[0-9a-f]{6}$/i.test(value.accentColor)) throw new Error('Invalid appearance')
  for (const [number, min, max] of [[value.weight, 1.5, 4], [value.guideOpacity, 0.2, 1], [value.emphasis, 1.25, 2]]) if (!Number.isFinite(number) || number < min || number > max) throw new Error('Invalid appearance')
  return { ...value, inkColor: value.inkColor.toLowerCase(), accentColor: value.accentColor.toLowerCase() }
}
export function presetAppearance(id: string, theme: Appearance['theme']): Appearance {
  const preset = APPEARANCE_PRESETS.find(p => p.id === id)
  if (!preset) throw new Error('Unknown appearance preset')
  return appearanceFor({ ...DEFAULT_APPEARANCE, ...preset.values, theme })
}
export function activePreset(appearance: Appearance): string {
  return APPEARANCE_PRESETS.find(p => JSON.stringify(presetAppearance(p.id, appearance.theme)) === JSON.stringify(appearance))?.id ?? 'custom'
}
export function inksFor(appearance: Appearance) {
  const ink = appearance.palette === 'custom' ? appearance.inkColor : appearance.theme === 'dark' ? '#f4f1e8' : '#28343b'
  return { ink, accent: appearance.palette === 'custom' ? appearance.accentColor : appearance.palette === 'monochrome' ? ink : appearance.theme === 'dark' ? '#ffaaa5' : '#b32624', guide: appearance.theme === 'dark' ? '#9ba8ae' : '#707b80' }
}
export function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
  }
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
export function lowContrastInks(appearance: Appearance): string[] {
  const inks = inksFor(appearance), surface = appearance.theme === 'dark' ? '#11171b' : '#f4f1e8'
  return (['ink', 'accent'] as const).filter(role => contrastRatio(inks[role], surface) < 4.5)
}
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
const number = (n: number) => String(Math.round(n * 10000) / 10000)

export function geometryMarkup(geometry: Geometry, options: Partial<Appearance> = {}): string {
  const appearance = appearanceFor(options), inks = inksFor(appearance)
  return geometry.marks.filter(mark => appearance.guides || mark.role !== 'guide').map(mark => {
    if (mark.stroke !== undefined && mark.stroke !== 'fine') throw new Error('Invalid stroke tier')
    const color = inks[mark.role], weight = appearance.weight * (mark.stroke === 'fine' ? 0.4 : 1) * (mark.role === 'guide' ? 0.6 : mark.emphasis ? appearance.emphasis : 1)
    const attributes = `fill="none" stroke="${color}" stroke-width="${number(weight)}" stroke-linecap="${appearance.linecap}" stroke-linejoin="round"${mark.role === 'guide' ? ` stroke-opacity="${number(appearance.guideOpacity)}"` : ''}`
    if (mark.kind === 'circle') return `<circle cx="${number(mark.center[0])}" cy="${number(mark.center[1])}" r="${number(mark.radius)}" ${attributes}/>`
    if (mark.kind === 'text') return `<text x="${number(mark.at[0])}" y="${number(mark.at[1] + 5)}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" font-weight="${mark.emphasis ? 700 : 400}" fill="${color}">${escape(mark.text)}</text>`
    const tag = mark.closed ? 'polygon' : 'polyline'
    return `<${tag} points="${mark.points.map(([x, y]) => `${number(x)},${number(y)}`).join(' ')}" ${attributes}/>`
  }).join('')
}

/** Self-contained, transparent SVG with concrete colors and no scripts or external resources. */
export function renderStudySvg(study: Study, values: Readonly<Record<string, number>> = {}, options: Partial<Appearance> = {}): string {
  const parameters = parametersFor(study, values), appearance = appearanceFor(options)
  const description = `${study.description} ${study.basis} Parameters: ${JSON.stringify(parameters)}. Provenance: ${study.provenance}.`
  const recipe = { version: 1, study: study.id, parameters, appearance }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" role="img" aria-label="${escape(study.title)}"><title>${escape(study.title)}</title><desc>${escape(description)}</desc><metadata>${escape(JSON.stringify(recipe))}</metadata>${geometryMarkup(geometryFor(study, parameters), appearance)}</svg>`
}
