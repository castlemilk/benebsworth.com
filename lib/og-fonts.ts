import fs from 'node:fs'
import path from 'node:path'
import type { ImageResponse } from 'next/og'

type Fonts = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']
let cachedFonts: Fonts

/**
 * Keep Next's exact default Geist first, with licensed local Noto fallback
 * families for authored Greek/math/category symbols. Supplying fonts replaces
 * Next's defaults, so omitting Geist would change every production card.
 * Build-only assets: never fetch Google fonts or depend on host system fonts.
 */
export function ogFonts(): NonNullable<Fonts> {
  if (!cachedFonts) {
    const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative))
    cachedFonts = [
      { name: 'geist', data: read('node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Noto Sans', data: read('assets/og-fonts/NotoSans-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Noto Sans Symbols', data: read('assets/og-fonts/NotoSansSymbols-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Noto Sans Symbols 2', data: read('assets/og-fonts/NotoSansSymbols2-Regular.ttf'), weight: 400, style: 'normal' },
    ]
  }
  return cachedFonts
}
