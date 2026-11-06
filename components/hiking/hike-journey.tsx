'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Hike, Asset } from '@/lib/gen/content'
import { cacheBust, manifestUrl } from '@/lib/admin/storage'
import { stageAnchor } from './journey-core'
import { JourneyMap } from './journey-map'
import { HikeGallery } from './hike-gallery'
import { readPublishedGallery } from '@/lib/hiking/photo-discovery'
import {PhotoTrailMap} from './photo-trail-map'
import {connectPhotosToTrail,readRetainedPhotoTrail,OVERLAND_REFERENCE_URL,type PhotoTrailReference} from '@/lib/hiking/photo-trail'

/**
 * Client orchestrator for a hike detail page: holds the shared "active waypoint"
 * selection (links the journey map ↔ gallery) and reads the live photo manifest
 * from GCS (managed in /admin). Read-only — there is no inline editor on public
 * pages anymore. When a published trail guide exists (`guideSlug`), each waypoint
 * deep-links into that day's section of the guide.
 */
export function HikeJourney({ hike, guideSlug }: { hike: Hike; guideSlug?: string }) {
  return <JourneyContent key={hike.slug} hike={hike} guideSlug={guideSlug} />
}

function JourneyContent({ hike, guideSlug }: { hike: Hike; guideSlug?: string }) {
  const [active, setActive] = useState<string | null>(null)
  const [gallery, setGallery] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  const supportsReference = hike.slug === 'overland-track'
  const [reference,setReference] = useState<PhotoTrailReference|null>(null)
  const [routeLoading,setRouteLoading] = useState(supportsReference)
  const [routeError,setRouteError] = useState(false)
  const [routeAttempt,setRouteAttempt] = useState(0)
  const [selectedTrailArea,setSelectedTrailArea] = useState<string|null>(null)
  const [galleryFilterReset,setGalleryFilterReset]=useState(0)
  const mapHeading = useRef<HTMLHeadingElement>(null)
  const mapFigure = useRef<HTMLElement>(null)
  const galleryContainer = useRef<HTMLDivElement>(null)
  const focusFrame = useRef<number|null>(null)
  useEffect(()=>()=>{if(focusFrame.current!==null) cancelAnimationFrame(focusFrame.current)},[])
  const focusSection=(target:'map'|'gallery',animate=false)=>{
    if(focusFrame.current!==null) cancelAnimationFrame(focusFrame.current)
    focusFrame.current=requestAnimationFrame(()=>{
      // Return to the selected area, not the map's top edge: southern markers
      // can otherwise land beneath the viewport on a short phone screen.
      const selectedMarker=target==='map'?mapFigure.current?.querySelector<HTMLElement>('[data-selected-photo-area]'):null
      const element=selectedMarker??(target==='map'?mapFigure.current:galleryContainer.current?.querySelector<HTMLElement>('h3'))
      // Keep focus and visual motion in sync instead of jumping before scrolling.
      element?.focus({preventScroll:true})
      const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??true
      element?.scrollIntoView({block:selectedMarker?'center':'start',behavior:animate&&!reducedMotion?'smooth':'instant'})
    })
  }
  useEffect(()=>{
    if(!supportsReference) return
    let alive=true
    const controller=new AbortController()
    fetch(OVERLAND_REFERENCE_URL,{signal:controller.signal})
      .then(async response=>{if(!response.ok) throw new Error('Walking reference unavailable');return readRetainedPhotoTrail(await response.text())})
      .then(value=>{if(alive)setReference(value)})
      .catch(()=>{if(alive){setReference(null);setSelectedTrailArea(null);setRouteError(true)}})
      .finally(()=>{if(alive)setRouteLoading(false)})
    return ()=>{alive=false;controller.abort()}
  },[supportsReference,routeAttempt])
  const connections=useMemo(()=>reference?connectPhotosToTrail(hike.slug,gallery,reference):null,[reference,hike.slug,gallery])
  const selectTrailArea=(id:string|null)=>{setActive(null);setSelectedTrailArea(id);setGalleryFilterReset(value=>value+1)}
  const selectPlace=(name:string|null)=>{setSelectedTrailArea(null);setActive(name)}
  const retryReference=()=>{setReference(null);setRouteError(false);setRouteLoading(true);setSelectedTrailArea(null);setRouteAttempt(value=>value+1)}

  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const url = manifestUrl('hike', hike.slug)
    if (!url) { setLoading(false); return }
    let alive = true
    const controller = new AbortController()
    fetch(cacheBust(url), { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (response.status === 404) return []
        if (!response.ok) throw new Error('Gallery request failed')
        return readPublishedGallery(await response.json())
      })
      .then(photos => { if (alive) setGallery(photos) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; controller.abort() }
  }, [hike.slug, attempt])
  const retry = () => { setError(false); setLoading(true); setAttempt(value => value + 1) }

  const dayHref = useMemo(
    () =>
      guideSlug
        ? (day: string) => {
            const a = stageAnchor(day)
            return a ? `/blog/${guideSlug}/#${a}` : null
          }
        : undefined,
    [guideSlug],
  )

  return (
    <>
      <a href={`#photos-${hike.slug}`} className="mb-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Browse photographs by place ↓</a>
      {supportsReference ? <>
        <PhotoTrailMap reference={reference} connections={connections} selected={selectedTrailArea} onSelect={selectTrailArea} onBrowse={()=>focusSection('gallery')} headingRef={mapHeading} mapFocusRef={mapFigure} loading={routeLoading} error={routeError} onRetry={retryReference} galleryLoading={loading} galleryError={error}/>
        <details className="mb-8 border-y border-[var(--color-border)] py-4"><summary className="min-h-11 cursor-pointer py-2 text-sm">Authored itinerary · schematic, not geographic</summary><div className="mt-4"><JourneyMap hike={hike} active={active} onSelect={selectPlace} dayHref={dayHref}/></div></details>
      </>:<JourneyMap hike={hike} active={active} onSelect={selectPlace} dayHref={dayHref} />}
      <div ref={galleryContainer} id={`photos-${hike.slug}`} className="mt-12 scroll-mt-8">
        <HikeGallery filterResetKey={galleryFilterReset} hike={hike} gallery={gallery} active={active} onSelect={selectPlace} loading={loading} error={error} onRetry={retry} trailConnections={connections} selectedTrailArea={selectedTrailArea} onClearTrailArea={()=>setSelectedTrailArea(null)} onShowPhotoArea={id=>{selectTrailArea(id);focusSection('map',true)}} />
      </div>
    </>
  )
}
