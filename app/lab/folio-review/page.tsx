import type { Metadata } from 'next'
import { FolioReview } from './review'

export const metadata: Metadata = {
  title: 'Folio component review',
  description: 'Illustrative statistics, callouts, notes and reasoning specimens for local visual review.',
  robots: { index: false, follow: false },
}

export default function FolioReviewPage() {
  return <FolioReview />
}
