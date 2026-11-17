'use client'

import { useEffect } from 'react'
import { markVisited } from './progress'

/** Records a chapter visit in localStorage once on mount. Renders nothing. */
export function VisitedMarker({ chapterId }: { chapterId: string }) {
  useEffect(() => {
    markVisited(chapterId)
  }, [chapterId])
  return null
}
