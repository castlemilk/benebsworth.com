import type { Metadata } from 'next'
import { FolioReview } from './review'

export const metadata: Metadata = {
  title: 'Folio component review',
  description: 'Illustrative statistics and callout specimens for local visual review.',
  robots: { index: false, follow: false },
}

export default function FolioReviewPage() {
  return <FolioReview />
}
