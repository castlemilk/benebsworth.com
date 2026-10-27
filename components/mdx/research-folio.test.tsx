import React from 'react'
import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {FieldNote,Assumptions,FigureFocus} from './research-folio'
import {Controls} from '../lab/controls'
import {BlogFilter} from '../blog/blog-filter'

describe('research folio',()=>{
 it('keeps notes and assumptions semantic without client JavaScript',()=>{const html=renderToStaticMarkup(<><FieldNote title="Boundary condition"><p>Keep the resistor fixed.</p></FieldNote><Assumptions><ul><li>Ideal source</li></ul></Assumptions></>);expect(html).toContain('<aside');expect(html).toContain('aria-label="Boundary condition"');expect(html).toContain('<li>Ideal source</li>');expect(html).not.toContain('<script');});
 it('uses figure/caption and a separate accessible reading note',()=>{const html=renderToStaticMarkup(<FigureFocus title="Response" caption="A measured response" note={<p>Watch the settling time.</p>}><svg aria-label="response plot"/></FigureFocus>);expect(html).toContain('<figcaption>A measured response</figcaption>');expect(html).toContain('Reading note for Response');expect(html).toContain('aria-hidden="true"');});
 it('renders real Gamma range with bounds and accessible value',()=>{const html=renderToStaticMarkup(<Controls specs={[{type:'range',key:'speed',label:'Speed',min:0,max:10,step:1}]} params={{speed:4}} onChange={()=>{}} onReset={()=>{}} onCopy={()=>{}}/>);expect(html).toContain('range-slider-input');expect(html).toContain('aria-valuetext="4"');expect(html).toContain('max="10"');expect(html).toContain('gamma-button');});
 it('archive controls expose selection and disable empty clear',()=>{const html=renderToStaticMarkup(<BlogFilter topics={[]} searchQuery="" onSearchChange={()=>{}} activeTopic={null} onTopicChange={()=>{}}/>);expect(html).toContain('aria-label="Search posts"');expect(html).toContain('aria-pressed="true"');expect(html).toContain('gamma-button');expect(html).not.toContain('scrollbar-width:none');});
})

import {AnnotatedBlock,AnnotationTarget,MarginNote} from './annotated-block'
import {AnnotationMark} from './annotation-marks'
describe('target-bound annotations',()=>{
 it('renders source-order target then linked selectable note',()=>{const html=renderToStaticMarkup(<AnnotatedBlock><MarginNote target="curve" label="Observation">Look at the envelope.</MarginNote><AnnotationTarget id="curve"><p>Figure</p></AnnotationTarget></AnnotatedBlock>);expect(html.indexOf('id="curve"')).toBeLessThan(html.indexOf('class="margin-note"'));expect(html).toContain('href="#curve"');expect(html).toContain('handwritten-note');expect(html).toContain('aria-hidden="true"');});
 it('rejects missing, mismatched or duplicate targets',()=>{expect(()=>renderToStaticMarkup(<AnnotatedBlock><AnnotationTarget id="a">A</AnnotationTarget></AnnotatedBlock>)).toThrow();expect(()=>renderToStaticMarkup(<AnnotatedBlock><AnnotationTarget id="a">A</AnnotationTarget><MarginNote target="b">B</MarginNote></AnnotatedBlock>)).toThrow();expect(()=>renderToStaticMarkup(<AnnotatedBlock><AnnotationTarget id="a">A</AnnotationTarget><AnnotationTarget id="a">B</AnnotationTarget><MarginNote target="a">C</MarginNote></AnnotatedBlock>)).toThrow();});
 it('produces stable, non-random gesture geometry',()=>{expect(renderToStaticMarkup(<AnnotationMark kind="arrow"/>)).toBe(renderToStaticMarkup(<AnnotationMark kind="arrow"/>));});
})
