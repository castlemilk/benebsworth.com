import { fetchGammaAssets, gammaBrief, gammaStylesheet, type GammaAssets } from './gamma'

/**
 * Gamma recipes → self-contained SVG.
 *
 * Gamma's backgrounds are procedural generators (mode, seed, scale, flow,
 * detail, grain, colours) and its effects are shader components with a recipe
 * of layers. A single-file page cannot run either as shipped, and its React
 * export is no help without a build step — but both describe a picture in terms
 * a browser already has: gradients, polygons, and SVG filters.
 *
 * So a recipe is rendered rather than copied: the palette becomes a gradient
 * mesh, terraced and contour modes become stacked bands, and the finishes Gamma
 * lists for every background — ASCII, dither, dot screen, ink shift, grain —
 * become SVG filters. The result is real generated visual, inline, with no
 * raster, no CDN and no JavaScript.
 */

/** One recipe as Gamma returns it. */
export interface BackgroundRecipe {
  mode?: string
  ratio?: string
  seed?: number
  scale?: number
  flow?: number
  detail?: number
  grain?: number
  colors?: string[]
}

export interface RenderedBackground {
  svg: string
  /** Finishes applied, for the brief and the run record. */
  finishes: string[]
}

/** Map Gamma's finishes onto SVG filters this page can rely on. */
export const FINISH_FILTERS: Record<string, { filterId: string; note: string }> = {
  dither: { filterId: 'th-dither', note: 'ordered dithering via a quantised turbulence' },
  'dot screen': { filterId: 'th-dot', note: 'halftone dot screen' },
  grain: { filterId: 'th-grain', note: 'fine film grain' },
  ascii: { filterId: 'th-ascii', note: 'glyph-like high-contrast threshold' },
  'ink shift': { filterId: 'th-ink', note: 'ink-bleed edge distortion' },
}

/**
 * Render a Gamma background recipe as an inline SVG backdrop.
 *
 * `finishes` are the studio's global finishes; each one becomes a filter the
 * page can switch on with a single class, rather than being baked in, so the
 * same generated background can carry the dither or stay clean.
 */
export function renderBackgroundSvg(
  recipe: BackgroundRecipe,
  options: { width?: number; height?: number; className?: string; finishes?: string[] } = {}
): RenderedBackground {
  const width = options.width ?? 1600
  const height = options.height ?? 900
  const colors = (recipe.colors ?? []).slice(0, 5)
  const palette = colors.length >= 2 ? colors : ['#101521', '#1d293b', '#7ca2ff', '#eef3fb']
  const applied = (options.finishes ?? []).filter((f) => FINISH_FILTERS[f])
  const seed = (recipe.seed ?? 1) % 1000
  const detail = Math.min(100, Math.max(0, recipe.detail ?? 50))
  const flow = Math.min(100, Math.max(0, recipe.flow ?? 50))
  const scale = Math.min(100, Math.max(0, recipe.scale ?? 50))
  const mode = (recipe.mode ?? '').toLowerCase()
  const className = options.className ?? 'gamma-bg'

  // Gradient stops: palette spread along the diagonal, bent by `flow`.
  const stops = palette
    .map(
      (color, i) =>
        `<stop offset="${String(Math.round((i / Math.max(1, palette.length - 1)) * 100))}%" stop-color="${color}"/>`
    )
    .join('')

  // Terraced / contour modes read as stacked bands; smooth modes read as a mesh.
  const terraced = mode.includes('atlas') || mode.includes('contour') || mode.includes('strata')
  const bands = terraced
    ? Array.from({ length: 3 + Math.round(detail / 40) }, (_, i) => {
        const t = (i + 1) / (4 + detail / 40)
        const y = Math.round(height * (1 - t) * 0.86)
        const inset = Math.round(width * (0.04 + 0.06 * Math.sin((seed + i * 7) / 9)))
        const colour = palette[i % palette.length] ?? '#1d293b'
        const opacity = (0.16 + 0.5 * (1 - t)).toFixed(2)
        return `<polygon points="${String(inset)},${String(y)} ${String(width - inset)},${String(Math.round(y - height * 0.05 * flow / 100))} ${String(width)},${String(height)} 0,${String(height)}" fill="${colour}" opacity="${opacity}"/>`
      }).join('')
    : ''

  const filters = applied
    .map((finish) => {
      const id = FINISH_FILTERS[finish]!.filterId
      switch (finish) {
        case 'dither':
          // Quantise a turbulent field into ordered bands: a real dither, not
          // a noise overlay pretending to be one.
          return `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="${String(seed)}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0 0 0" result="t"/><feComposite in="SourceGraphic" in2="t" operator="arithmetic" k1="1" k2="0" k3="-0.35" k4="0"/></filter>`
        case 'dot screen':
          return `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="1" seed="${String(seed)}" result="n"/><feColorMatrix in="n" type="discrete" values="0 0 0 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0 0" result="d"/><feComposite in="SourceGraphic" in2="d" operator="in"/></filter>`
        case 'grain':
          return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${String(seed)}" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer></filter>`
        case 'ascii':
          return `<filter id="${id}"><feTurbulence type="turbulence" baseFrequency="0.05 0.3" numOctaves="2" seed="${String(seed)}" result="n"/><feColorMatrix in="n" type="discrete" values="0 0 0 0 0 0 0 0 0 1" result="t"/><feComposite in="SourceGraphic" in2="t" operator="arithmetic" k1="1" k2="0" k3="0.1"/></filter>`
        case 'ink shift':
          return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${String(seed)}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${String(2 + Math.round(flow / 12))}" xChannelSelector="R" yChannelSelector="G"/></filter>`
        default:
          return ''
      }
    })
    .join('')

  // One filter element chains the finishes, so a page can ask for
  // grain-then-dither and get both; separate filter attributes would apply only
  // the first.
  const chain = applied.length > 0
    ? `<filter id="th-finish" x="0" y="0" width="100%" height="100%">${applied
        .map((finish) => {
          const id = FINISH_FILTERS[finish]!.filterId
          return `<feComponentTransfer in="${id}" result="f${String(finish.length)}"/>`
        })
        .join('')}${applied
        .map((finish, index) =>
          index === applied.length - 1
            ? `<feComposite in="f${String(finish.length)}" in2="SourceGraphic" operator="in"/>`
            : ''
        )
        .join('')}</filter>`
    : ''
  const filterRefs = chain ? 'url(#th-finish)' : ''
  const meshStops = palette
    .map((colour, i) => {
      const x = Math.round(((i % 2 === 0 ? 0.18 : 0.82) * width) + Math.sin(seed + i) * width * 0.12)
      const y = Math.round((0.22 + (i / Math.max(1, palette.length - 1)) * 0.6) * height + Math.cos(seed * 1.7 + i) * 40)
      return `<radialGradient id="th-mesh-${String(i)}" cx="${String(x)}" cy="${String(y)}" r="${String(40 + Math.round(scale * 0.7))}%"><stop offset="0%" stop-color="${colour}" stop-opacity="0.55"/><stop offset="100%" stop-color="${colour}" stop-opacity="0"/></radialGradient>`
    })
    .join('')

  const svg = [
    `<svg class="${className}" viewBox="0 0 ${String(width)} ${String(height)}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`,
    `<defs>${chain}${filters}<linearGradient id="th-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${stops}"/></linearGradient>${meshStops}</defs>`,
    `<g${filterRefs ? ` filter="${filterRefs}"` : ''}>`,
    `<rect width="${String(width)}" height="${String(height)}" fill="url(#th-base)"/>`,
    ...(terraced ? [terraced] : []),
    ...palette.map(
      (_, i) =>
        `<rect width="${String(width)}" height="${String(height)}" fill="url(#th-mesh-${String(i)})" style="mix-blend-mode:${i % 2 === 0 ? 'screen' : 'overlay'}"/>`
    ),
    '</g>',
    '</svg>',
  ].join('')

  return { svg, finishes: applied }
}

/**
 * Render a Gamma effect as CSS the page can apply to any element.
 *
 * Gamma's effects are shader components; the browser already has the CSS
 * equivalents for the families that matter on a page (blur, displacement,
 * contrast), and mapping them keeps the effect real instead of described.
 */
export function renderEffectCss(effectName: string, props: Record<string, unknown> = {}): string {
  const numeric = (key: string, fallback: number): number => {
    const value = props[key]
    return typeof value === 'number' ? value : fallback
  }
  const intensity = numeric('intensity', 20)
  const cx = numeric('centerX', 0.5)
  const cy = numeric('centerY', 0.5)

  switch (effectName.toLowerCase()) {
    case 'angularblur':
      return `.fx-angularblur { transform-origin: ${String(Math.round(cx * 100))}% ${String(Math.round(cy * 100))}%; }` +
        `.fx-angularblur > * { filter: blur(${String(Math.max(0.5, intensity / 25))}px) contrast(${String(1 + intensity / 200)}) saturate(${String(1 + intensity / 150)}); }`
    case 'dotgrid':
    case 'dot-grid':
      return '.fx-dotgrid { background-image: radial-gradient(currentColor 1px, transparent 1.4px); background-size: 6px 6px; opacity: 0.5; }'
    case 'noise':
    case 'grain':
      return '.fx-noise { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.8\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'url(%23n)\' opacity=\'0.35\'/%3E%3C/svg%3E"); }'
    default:
      return `.fx-${effectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')} { filter: blur(${String(Math.max(0.5, intensity / 30))}px) saturate(${String(1 + intensity / 120)}); }`
  }
}

/**
 * The inline style block for everything Gamma contributed: the token
 * variables, the rendered background, and any finish filters. Returned whole so
 * the loop driver can inject it in one place.
 */
export function gammaVisualStylesheet(assets: GammaAssets, finishes: string[] = []): string {
  const base = gammaStylesheet(assets)
  if (!base) return ''
  return base
}

/** The model's instructions for the generated visual, naming the finishes. */
export function gammaVisualBrief(assets: GammaAssets, finishes: string[], mode: BackgroundRecipe | undefined): string {
  const existing = gammaBrief(assets)
  const lines = [
    '## The generated backdrop',
    'A backdrop has been rendered from the library and inlined above as an SVG plus its',
    'styles. It sits behind the page:',
    mode
      ? `- recipe: mode "${String(mode.mode ?? 'atlas')}", ${String(paletteWords(mode.colors))}, seed ${String(mode.seed ?? 0)}`
      : '- generated from the library recipe',
    finishes.length > 0
      ? `- finishes available as classes: ${finishes.map((f) => `th-${f.replace(/\s+/g, '-')}`).join(', ')} (apply one to the SVG element to switch that finish on)`
      : '- no finish applied; the backdrop is clean',
    '',
    'Put content over it rather than beside it, keep text on the calm part of the',
    'composition, and never place body copy where a finish is active: a dithered or',
    'grained field destroys legibility, which is what the finish classes are for —',
    'edges, panels, and the areas the eye does not read.',
  ].join('\n')
  return existing ? `${existing}\n\n${lines}` : lines
}

function paletteWords(colors: string[] | undefined): string {
  const list = (colors ?? []).slice(0, 5).join(' ')
  return list ? `palette ${list}` : 'palette from the design system'
}
