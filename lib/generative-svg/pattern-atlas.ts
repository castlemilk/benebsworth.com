import { PATTERN_CONSTRUCTIONS } from './pattern-constructions'
import { PATTERN_FIELDS } from './pattern-fields'
import type { Study } from './definition'

/** Add only reviewed batches; counts and discovery derive from registration. */
export const PATTERN_ATLAS_BATCHES: readonly (readonly Study[])[] = [[...PATTERN_CONSTRUCTIONS, ...PATTERN_FIELDS]]
export const PATTERN_ATLAS_STUDIES: readonly Study[] = PATTERN_ATLAS_BATCHES.flat()
