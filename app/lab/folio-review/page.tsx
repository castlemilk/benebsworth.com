import { MdxContent } from '@/components/mdx/mdx-content'
import { equationFixture } from './equation-fixture'
import { technicalProseFixture } from './technical-prose-fixture'
import type { Metadata } from 'next'
import { FolioReview } from './review'

export const metadata: Metadata = {
  title: 'Folio component review',
  description: 'Illustrative statistics, callouts, notes, reasoning and technical prose specimens for local visual review.',
  robots: { index: false, follow: false },
}

export default function FolioReviewPage() {
  return <FolioReview technicalProse={<MdxContent source={technicalProseFixture} />} equations={<MdxContent source={equationFixture} />} />
}
