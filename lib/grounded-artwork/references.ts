/** Original full scientific notes, separate from discovery's lightweight summaries. */
export const SET05_SCIENTIFIC_NOTES = {
  label: 'Set05',
  batchId: 'grounded-forms-twenty-five-studies-set05-r01',
  url: '/artwork/grounded-notes/set05.5034a810f35404eb90896c95352b1395ce826e69bfa3b743a0aba8998386e98a.md',
  sha256: '5034a810f35404eb90896c95352b1395ce826e69bfa3b743a0aba8998386e98a',
} as const

export const SET06_SCIENTIFIC_NOTES = {
  label: 'Set06',
  batchId: 'grounded-forms-twenty-five-studies-set06-r01',
  url: '/artwork/grounded-notes/set06.6d16ad6fe8cd49a4ec007bba55c7abee9560f598c6ee7e486f98d88065650df3.md',
  sha256: '6d16ad6fe8cd49a4ec007bba55c7abee9560f598c6ee7e486f98d88065650df3',
} as const

export const GROUNDED_SCIENTIFIC_NOTES = [SET05_SCIENTIFIC_NOTES, SET06_SCIENTIFIC_NOTES] as const
export const scientificNotesFor = (batchId: string) => GROUNDED_SCIENTIFIC_NOTES.find(notes => notes.batchId === batchId)
