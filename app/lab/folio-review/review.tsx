'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { GammaButton } from '@/components/gamma/GammaButton'
import { Stat, StatGroup } from '@/components/mdx/editorial-components'
import { Callout } from '@/components/ui/callout'
import styles from './review.module.css'

export function FolioReview() {
  const [narrow, setNarrow] = useState(false)
  const { setTheme } = useTheme()

  return (
    <main id="main-content" className={`folio-reading-page ${styles.page}`}>
      <nav className={styles.navigation} aria-label="Review navigation">
        <Link href="/lab/editorial-system/">Editorial study</Link>
        <Link href="/blog/">Writing archive</Link>
      </nav>
      <header className={styles.header}>
        <p className={styles.kicker}>FOLIO-001 / FOLIO-002 · Local review specimen</p>
        <h1>Statistics &amp; field callouts</h1>
        <p>Production components, illustrative copy. No measurements, research findings or authored article text are represented here.</p>
      </header>
      <div className={styles.controls}>
        <fieldset>
          <legend>Reading column</legend>
          <div className={styles.buttons}>
            <GammaButton type="button" variant="secondary" aria-pressed={!narrow} aria-controls="folio-review-column" onClick={() => setNarrow(false)}>Full reading column</GammaButton>
            <GammaButton type="button" variant="secondary" aria-pressed={narrow} aria-controls="folio-review-column" onClick={() => setNarrow(true)}>390px column</GammaButton>
          </div>
        </fieldset>
        <fieldset>
          <legend>Site theme</legend>
          <div className={styles.buttons}>
            <GammaButton type="button" variant="secondary" onClick={() => setTheme('light')}>Use light theme</GammaButton>
            <GammaButton type="button" variant="secondary" onClick={() => setTheme('dark')}>Use dark theme</GammaButton>
          </div>
        </fieldset>
      </div>
      <p className={styles.explanation}>
        The narrow setting constrains the content column, not the browser viewport. It is not a phone-viewport test. Both widths shrink to fit available space. Theme controls use the existing site preference.
      </p>
      <p role="status" className={styles.status}>{narrow ? '390px column selected' : 'Full reading column selected'}</p>
      <article id="folio-review-column" aria-label="Illustrative component specimens" className={`research-article ${styles.column}`} style={{ maxWidth: narrow ? '390px' : '48rem' }}>
        <div className="prose max-w-none">
          <section aria-labelledby="review-statistics">
            <h2 id="review-statistics">Statistics</h2>
            <p>Invented values exercise units, case-sensitive symbols and longer labels. They are not a benchmark or a claim about a real system.</p>
            <StatGroup>
              <Stat label={<>V<sub>out</sub> · illustrative output</>} value="3.3 V" context="Invented voltage for checking symbol case and unit spacing." />
              <Stat label="Illustrative elapsed time across an intentionally long observation label" value="12 ms" context="Invented duration with a longer explanation to inspect wrapping in the narrow column." />
              <Stat label="Example with optional context omitted" value="0.25" />
            </StatGroup>
          </section>
          <section aria-labelledby="review-callouts">
            <h2 id="review-callouts">Seven callout types</h2>
            <p>Type labels remain readable without colour. The information specimen omits its optional title; insight and reflection use handwriting without implying an error.</p>
            <Callout type="info"><p>This titleless information specimen contains <strong>selectable rich text</strong> and a <a href="#review-statistics">link to the statistics</a>.</p></Callout>
            <Callout type="warning" title="Illustrative caution"><p>Do not interpret the invented values above as measured results.</p></Callout>
            <Callout type="success" title="Illustrative confirmation"><p>This is sample confirmation copy, not a report that a test or deployment passed.</p></Callout>
            <Callout type="error" title="Illustrative error"><p>This specimen demonstrates an error label and rule. No actual application failure is being reported.</p></Callout>
            <Callout type="thinking" title="A deliberately longer insight title that should wrap without crowding the reading column"><p>Inspect how the title, explicit <em>Insight</em> label and body stay distinct when the column narrows.</p></Callout>
            <Callout type="feeling" title="A subjective reflection"><p>This is illustrative personal commentary, not evidence. Red handwriting marks the note style rather than an error state.</p></Callout>
            <Callout type="doing" title="Compare the two column widths"><p>Use the controls above, then inspect this real list:</p><ul><li>Read the type label and optional title.</li><li>Check the long statistics label and unit spacing.</li></ul></Callout>
          </section>
        </div>
      </article>
    </main>
  )
}
