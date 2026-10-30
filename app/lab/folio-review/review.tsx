'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { GammaButton } from '@/components/gamma/GammaButton'
import { Stat, StatGroup, PullQuote } from '@/components/mdx/editorial-components'
import { Callout } from '@/components/ui/callout'
import styles from './review.module.css'
import { FieldNote, Assumptions } from '@/components/mdx/research-folio'
import { PostBrief, EvidenceNote, MethodSteps } from '@/components/mdx/post-patterns'

export function FolioReview({ technicalProse, equations }: { technicalProse?: React.ReactNode; equations?: React.ReactNode }) {
  const [narrow, setNarrow] = useState(false)
  const { setTheme } = useTheme()

  return (
    <main id="main-content" className={`folio-reading-page ${styles.page}`}>
      <nav className={styles.navigation} aria-label="Review navigation">
        <Link href="/lab/editorial-system/">Editorial study</Link>
        <Link href="/blog/">Writing archive</Link>
      </nav>
      <header className={styles.header}>
        <p className={styles.kicker}>FOLIO-001 / FOLIO-002 / FOLIO-003 / FOLIO-004 / FOLIO-005 · Local review specimen</p>
        <h1>Notes, reasoning &amp; field callouts</h1>
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
        <div className="prose dark:prose-invert max-w-none">
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
          <section aria-labelledby="review-notes">
            <h2 id="review-notes">Quotation, notes and assumptions</h2>
            <p>Illustrative editorial copy, not an attributed quotation or a research claim.</p>
            <PullQuote><p>A useful note keeps the reasoning visible without replacing the argument. Longer passages should remain readable when the column narrows, with <em>emphasis</em> intact.</p><p>This second paragraph checks paragraph spacing and a <a href="#review-method">link to the review procedure</a>.</p></PullQuote>
            <FieldNote><p>The default observation note retains its title and explicit kind.</p></FieldNote>
            <FieldNote kind="caution" title="A deliberately longer caution title that must wrap without covering the content"><p>This is a <strong>component specimen</strong>, not a warning about a measured system.</p></FieldNote>
            <FieldNote kind="method" title="Method"><p>Compare the two column settings using the controls above.</p></FieldNote>
            <Assumptions><ul><li>The copy on this page is illustrative.</li><li>A narrow content column is not a phone viewport.</li></ul></Assumptions>
            <Assumptions title="Scope of this review"><p>Visual review and test results are recorded separately.</p></Assumptions>
          </section>
          <section aria-labelledby="review-briefs">
            <h2 id="review-briefs">Four reading briefs</h2>
            <PostBrief kind="explainer"><p>This specimen omits audience and prerequisites.</p></PostBrief>
            <PostBrief kind="experiment" audience="Readers inspecting component behaviour"><p>This specimen provides an audience but no prerequisites.</p></PostBrief>
            <PostBrief kind="essay" prerequisites={['Read the illustrative-copy notice']}><p>This specimen provides prerequisites but no audience.</p></PostBrief>
            <PostBrief kind="guide" audience="Readers comparing both theme settings" prerequisites={['Access to the theme controls', 'A reading column to inspect']}><p>This specimen provides both optional fields.</p></PostBrief>
          </section>
          <section aria-labelledby="review-evidence">
            <h2 id="review-evidence">Explicit evidence labels</h2>
            <p>These are label specimens only. No measurement, simulation, research finding or interpretation of real evidence is reported.</p>
            {(['measured', 'simulated', 'illustrative', 'interpretation'] as const).map(basis => <React.Fragment key={basis}>
              <EvidenceNote basis={basis}><p>Component label specimen only; no research result is reported. Optional limitations are omitted.</p></EvidenceNote>
              <EvidenceNote basis={basis} limitations={<p>This specimen demonstrates the limitations field, not a validated result.</p>}><p>Component label specimen only; no research result is reported. Explicit limitations follow.</p></EvidenceNote>
            </React.Fragment>)}
          </section>
          <section aria-labelledby="review-method">
            <h2 id="review-method">A real review procedure</h2>
            <MethodSteps steps={[
              { title: 'Select a column', content: <p>Choose the full or 390px content column using the controls above.</p> },
              { title: 'Select a theme', content: <p>Use the light or dark theme control, then read the labels, quote and body text without changing the specimen content.</p> },
              { title: 'Inspect the content', content: <p>Check wrapping and spacing, then return to the <a href="#review-notes">note specimens</a> to compare the longer title.</p> },
            ]} />
            <MethodSteps title="One-step recheck" steps={[{ title: 'Read the scope', content: <p>Confirm the distinction between content-column review and phone-viewport testing.</p> }]} />
          </section>
        </div>
        {technicalProse}
        {equations}
      </article>
    </main>
  )
}
