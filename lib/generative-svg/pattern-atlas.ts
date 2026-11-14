import { PATTERN_CONSTRUCTIONS } from './pattern-constructions'
import { PATTERN_FIELDS } from './pattern-fields'
import { STUDIES as ROLLING_TILE_PATTERNS } from './pattern-rolling-tiles'
import { PATTERN_TEXTILE_STARS } from './pattern-textile-stars'
import { PATTERN_RIPPLES } from './pattern-ripples'
import type { Study } from './definition'

/** Add only reviewed batches; counts and discovery derive from registration. */
export const PATTERN_ATLAS_BATCHES: readonly (readonly Study[])[] = [
  [...PATTERN_CONSTRUCTIONS, ...PATTERN_FIELDS],
  [...ROLLING_TILE_PATTERNS, ...PATTERN_TEXTILE_STARS, ...PATTERN_RIPPLES],
]
export const PATTERN_ATLAS_STUDIES: readonly Study[] = PATTERN_ATLAS_BATCHES.flat()
