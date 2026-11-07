/** Local-only review harness. Uses unchanged published manifest snapshots supplied
 * outside the source tree, never the global media registry or a private original. */
import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {hikes} from '@/content/hiking'
import {HikeJourney} from '@/components/hiking/hike-journey'
import trail from '@/components/hiking/trail-journal.module.css'
import './preview.css'
const originalFetch=window.fetch.bind(window)
let responseMode='published'
window.fetch=(input,init)=>{
  if(String(input).includes('/published/manifest/')) {
    if(responseMode==='error') return Promise.resolve(new Response('',{status:503}))
    if(responseMode==='missing') return Promise.resolve(new Response('',{status:404}))
    if(responseMode==='loading') return new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))
  }
  return originalFetch(input,init)
}
function Preview() {
  const [slug,setSlug]=useState('overland-track')
  const [mode,setMode]=useState('published')
  const [dark,setDark]=useState(false)
  const hike=hikes.find(hike=>hike.slug===slug)!
  return <>
    <div className="preview-toolbar"><strong>Local component preview</strong><span>Published photo snapshots. Nothing deployed.</span>
      <label>Hike <select value={slug} onChange={event=>setSlug(event.target.value)}>{['dolomites-alta-via-1','overland-track','haute-route'].map(slug=><option key={slug} value={slug}>{hikes.find(h=>h.slug===slug)!.name}</option>)}</select></label>
      <label>Response <select value={mode} onChange={event=>{responseMode=event.target.value;setMode(responseMode)}}><option value="published">Published data</option><option value="loading">Loading fixture</option><option value="error">Error fixture</option><option value="missing">Missing fixture</option></select></label>
      <button onClick={()=>{document.documentElement.classList.toggle('dark',!dark);setDark(!dark)}}>{dark?'Light theme':'Dark theme'}</button>
    </div>
    <main data-hiking-page="detail" className={`${trail.page} mx-auto w-full max-w-5xl px-6 pb-32 sm:px-8`}>
      <header className="py-10"><p>{hike.region} · {hike.country}</p><h1 className={`${trail.title} mt-3`}>{hike.name}</h1></header>
      <HikeJourney key={mode} hike={hike}/>
    </main>
  </>
}
createRoot(document.getElementById('root')!).render(<Preview/> )
