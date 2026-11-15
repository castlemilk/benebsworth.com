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

export const SET07_SCIENTIFIC_NOTES = {
  label: 'Set07',
  batchId: 'grounded-forms-twenty-five-studies-set07-r01',
  url: '/artwork/grounded-notes/set07.d7416b7d71060fa9921008e41250dc92e0d078e5c2e31b591ff5eadb6acc98a9.md',
  sha256: 'd7416b7d71060fa9921008e41250dc92e0d078e5c2e31b591ff5eadb6acc98a9',
} as const

export const SET08_SCIENTIFIC_NOTES = {
  label: 'Set08',
  batchId: 'grounded-forms-twenty-five-studies-set08-r01',
  url: '/artwork/grounded-notes/set08.bdf9a796b0ff2c6a186857fc1e0f4055f33e0d162c059f99d425db8fe99593cd.md',
  sha256: 'bdf9a796b0ff2c6a186857fc1e0f4055f33e0d162c059f99d425db8fe99593cd',
} as const

export const GROUNDED_SCIENTIFIC_NOTES = [SET05_SCIENTIFIC_NOTES, SET06_SCIENTIFIC_NOTES, SET07_SCIENTIFIC_NOTES, SET08_SCIENTIFIC_NOTES] as const
export const scientificNotesFor = (batchId: string) => GROUNDED_SCIENTIFIC_NOTES.find(notes => notes.batchId === batchId)
