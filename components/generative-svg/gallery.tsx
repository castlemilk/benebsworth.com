'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { STUDIES, STUDY_REGISTRY, parametersFor, type Study } from '@/lib/generative-svg/model'
import { DEFAULT_APPEARANCE, renderStudySvg, type Appearance } from '@/lib/generative-svg/render'
import { useVectorCopy } from '@/components/vectors/use-vector-copy'
import styles from './gallery.module.css'
import { StyleLab } from './style-lab'
import { ArtworkCollection } from '@/components/editorial-artwork/collection'
import { searchStudies, studyUrl, STUDY_CATEGORIES } from '@/lib/generative-svg/registry'

// Thumbnails use defaults and need not resample when another study is tuned.
const Drawing = memo(function Drawing({ study, appearance }: { study: Study; appearance: Appearance }) {
  const svg = renderStudySvg(study, {}, appearance)
  // Keep the growing collection's thousands of path nodes out of the page DOM.
  // The thumbnail remains vector SVG; only the selected workbench is inline.
  // Eager data-URI images are also available for printing unvisited rows.
  return <div className={styles.drawing}><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} width={320} height={240} alt="" loading="eager" decoding="async" /></div>
})

function ExportActions({ svg, title, id }: { svg: string; title: string; id: string }) {
  const { feedback, copy } = useVectorCopy()
  return (
    <div className={styles.export}>
      <div className={styles.actions}>
        <button type="button" disabled={feedback.status === 'copying'} onClick={() => void copy('SVG', () => svg)}>
          {feedback.status === 'copied' ? 'SVG copied' : feedback.status === 'error' ? 'Retry copy' : 'Copy SVG'}
        </button>
        <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download={`${id}.svg`}>Download SVG</a>
      </div>
      <p>Transparent background. Colors and line weight are included in the file.</p>
      <p role="status" aria-label="SVG export status" aria-live="polite" className={styles.feedback}>
        {feedback.status === 'error' ? 'Clipboard unavailable. Try again or download the SVG.' : feedback.status === 'copied' ? `${title} SVG copied.` : ''}
      </p>
    </div>
  )
}

/** One name per provenance, used by the card kicker and the study notes alike. */
function kindLabel(study: Study) {
  return study.provenance === 'math-derived' ? 'Mathematical model' : study.provenance === 'simulated' ? 'Numerical model' : study.provenance === 'topology' ? 'Graph construction' : 'Illustrative geometry'
}

function StudyWorkbench({ study, appearance, values, setValues }: { study: Study; appearance: Appearance; values: Record<string, number>; setValues: (values: Record<string, number>) => void }) {
  const svg = useMemo(() => renderStudySvg(study, values, appearance), [study, values, appearance])
  return (
    <div className={styles.workbench}>
      <div className={styles.sheet} data-surface={appearance.theme}>
        <div className={styles.drawing} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div className={styles.studyDetails}>
        <p className={styles.kicker}>{kindLabel(study)}</p>
        <h2>{study.title}</h2>
        <p className={styles.tags} aria-label="Study tags">{study.tags.map(tag => <span key={tag}>{tag.replaceAll('-', ' ')}</span>)}</p>
        <a className={styles.permalink} href={studyUrl(study)}>Link to this study</a>
        <p>{study.description}</p>
        <p className={styles.basis}><strong>{kindLabel(study)}</strong>{study.basis}</p>
        {study.parameters.length > 0 && (
          <fieldset className={styles.parameters}>
            <legend>Parameters</legend>
            {study.parameters.map(parameter => (
              <label key={parameter.key}>
                <span>{parameter.label}</span>
                <input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={values[parameter.key]} onChange={e => setValues({ ...values, [parameter.key]: Number(e.target.value) })} />
                <output>{values[parameter.key]}</output>
              </label>
            ))}
            <button type="button" onClick={() => setValues(parametersFor(study))}>Reset parameters</button>
          </fieldset>
        )}
        <ExportActions key={`${study.id}:${JSON.stringify(values)}:${JSON.stringify(appearance)}`} svg={svg} title={study.title} id={study.id} />
      </div>
    </div>
  )
}

/** One route-local workbench. No modal, animation loop, network fetch or WebGL dependency. */
export function GenerativeGallery() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [studyValues, setStudyValues] = useState<Record<string, Record<string, number>>>({})
  const [selectedId, setSelectedId] = useState(STUDIES[0].id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All studies')
  const [tag, setTag] = useState('')
  const [linkWarning, setLinkWarning] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const workbenchRef = useRef<HTMLElement>(null)
  const selected = STUDIES.find(study => study.id === selectedId)!
  const selectedValues = useMemo(() => Object.hasOwn(studyValues, selected.id) ? studyValues[selected.id] : parametersFor(selected), [studyValues, selected])
  const filtered = searchStudies(STUDY_REGISTRY, query, { category: category === 'All studies' ? undefined : category, tag: tag || undefined })
  useEffect(() => {
    const restore = () => {
      const id = new URLSearchParams(window.location.search).get('study')
      const found = id ? STUDY_REGISTRY.get(id) : undefined
      setSelectedId(found?.id ?? STUDIES[0].id)
      setLinkWarning(id && !found ? 'That study link was not found. Showing the first study instead.' : '')
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  const openStudy = (study: Study) => {
    setSelectedId(study.id)
    setLinkWarning('')
    const url = new URL(window.location.href)
    if (url.searchParams.get('study') !== study.id) {
      url.searchParams.set('study', study.id)
      url.hash = ''
      window.history.pushState(null, '', url)
    }
    workbenchRef.current?.focus()
  }
  const clear = () => { setQuery(''); setCategory('All studies'); setTag(''); searchRef.current?.focus() }
  return (
    <div className={styles.gallery}>
      <header className={styles.opening}>
        <h1>Drawing with <em>rules.</em></h1>
        <p>Curves from equations. Diagrams from relationships. A small collection of SVG studies, with a drawing language you can change. Transparent editorial artwork lives alongside them.</p>
      </header>

      <nav aria-label="Library collections" className={styles.collectionNav}><a href="#svg-studies">SVG studies</a><a href="#artwork">PNG artwork</a><a href="/vectors/originals/">Original vectors</a></nav>

      {linkWarning && <p role="status">{linkWarning}</p>}
      <StyleLab appearance={appearance} setAppearance={setAppearance} />

      <section ref={workbenchRef} tabIndex={-1} aria-label="Selected study" className={styles.selected}>
        <StudyWorkbench study={selected} appearance={appearance} values={selectedValues} setValues={values => setStudyValues(current => ({ ...current, [selected.id]: values }))} />
      </section>

      <section id="svg-studies" className={styles.collection} aria-labelledby="collection-title">
        <div className={styles.collectionHeader}>
          <h2 id="collection-title">The collection</h2>
          <p>{STUDIES.length} working studies. One shared geometry and export framework.</p>
        </div>
        <div className={styles.filters}>
          <label>Find a study<input ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, tag or alias, such as BST…" /></label>
          <label>Subject<select value={category} onChange={e => setCategory(e.target.value)}>{['All studies', ...STUDY_CATEGORIES].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Tag<select value={tag} onChange={e => setTag(e.target.value)}><option value="">All tags</option>{STUDY_REGISTRY.tags.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></label>
          <button type="button" onClick={clear}>Clear filters</button>
          <p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'study' : 'studies'}</p>
        </div>
        {filtered.length === 0 ? <div className={styles.empty}><h3>No matching studies</h3><p>Try a different term or clear the filters to see the collection.</p><button type="button" onClick={clear}>Show all studies</button></div> : (
          <div className={styles.specimens}>
            {filtered.map(study => (
              <article key={study.id} id={study.id} className={styles.specimen}>
                <button type="button" onClick={() => openStudy(study)} aria-label={`Open ${study.title}`} aria-pressed={selectedId === study.id}>
                  <span className={styles.thumbnail} data-surface={appearance.theme}><Drawing study={study} appearance={appearance} /></span>
                  <span className={styles.kind}>{kindLabel(study)}</span>
                  <span className={styles.specimenTitle}>{study.title}</span>
                  <span className={styles.tags}>{study.tags.map(tag => <span key={tag}>{tag.replaceAll('-', ' ')}</span>)}</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <ArtworkCollection />
      <footer className={styles.notes}>
        <h2>Geometry first. Style second.</h2>
        <p>Appearance changes ink, stroke weight, line ends, selection emphasis and construction lines. It never moves the underlying points. Each SVG download contains its model notes, current parameters and styling recipe, with no background, external fonts or scripts.</p>
        <p>The collection preserves all 25 original motifs and can grow through the shared study registry. Original SVG artwork remains preserved separately. The editorial PNG masters above are unchanged, with their prompts and provenance available as a separate metadata download. Your parameter tuning stays while you browse this page. Sampled curves are approximations; illustrative studies are labelled individually.</p>
      </footer>
    </div>
  )
}
