'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Hike, Asset } from '@/lib/gen/content'
import { thumbOf } from '@/lib/admin/storage'
import { discoverPhotos, hasRecordedLocation, photoPlaces, photoAreas, type PhotoArea, type LocationFilter } from '@/lib/hiking/photo-discovery'
import styles from './photo-discovery.module.css'
import { galleryAssignmentNotice } from '@/lib/hiking/gallery-source-review'
import {photoTrailReasonText,type PhotoTrailConnections} from '@/lib/hiking/photo-trail'
import { fmtDate } from '@/lib/format'
import {TrailButton,TrailIconButton,TrailSelect,TrailPhotoNavigation,TrailPhotoPosition,TrailPhotoExpand,TrailPhotoLocation} from './trail-controls'
import {X} from 'lucide-react'
import {justifyGalleryRows} from '@/lib/hiking/gallery-layout'

/** Browse only metadata already present in this hike's published manifest.
 * Place labels are editorial assignments, not precise positions on the schematic. */
export function HikeGallery({ gallery, hike, active, onSelect, loading, error, onRetry, trailConnections, selectedTrailArea, onShowPhotoArea, onClearTrailArea, filterResetKey }: {
  gallery: Asset[]
  hike: Hike
  active: string | null
  onSelect: (name: string | null) => void
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  filterResetKey?:number
  trailConnections?: PhotoTrailConnections|null
  selectedTrailArea?: string|null
  onShowPhotoArea?: (id:string)=>void
  onClearTrailArea?: ()=>void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [location, setLocation] = useState<LocationFilter>('all')
  const [unlabelled, setUnlabelled] = useState(false)
  const [areaId, setAreaId] = useState<string | null>(null)
  useEffect(()=>{setLocation('all');setUnlabelled(false);setAreaId(null)},[filterResetKey])
  const assignmentNotice = galleryAssignmentNotice(hike.slug, gallery)
  const places = photoPlaces(gallery, hike)
  const areas = photoAreas(gallery)
  const area = areas.find(item => item.id === areaId)
  const trailArea=trailConnections?.areas.find(item=>item.id===selectedTrailArea)
  const trailPhotos=selectedTrailArea==='unlinked'&&trailConnections?gallery.filter(photo=>trailConnections.unmatched.has(photo.url)):trailArea?.photos
  const shown = discoverPhotos(trailPhotos ?? area?.photos ?? gallery, active, location, unlabelled && !active)
  const missingPlace = gallery.filter(photo => !photo.slot.trim()).length
  const recorded = gallery.filter(hasRecordedLocation).length
  const filtered = active !== null || unlabelled || location !== 'all' || areaId !== null || Boolean(selectedTrailArea)
  const clear = () => { onSelect(null); setUnlabelled(false); setLocation('all'); setAreaId(null); onClearTrailArea?.(); headingRef.current?.focus() }
  const value = active !== null ? `place:${active}` : unlabelled ? 'unlabelled' : 'all'

  return <section className={styles.panel} aria-label={`${hike.name} photo gallery`} style={{ '--accent': 'var(--trail-accent, var(--color-fg))' } as CSSProperties}>
    <div className={styles.heading}>
      <h3 data-photo-focus-target ref={headingRef} tabIndex={-1} className={`${styles.title} type-h3`}>Gallery</h3>
      {!loading && !error && <span role="status" aria-live="polite" className={styles.count}>{shown.length} photo{shown.length === 1 ? '' : 's'}{filtered ? ` of ${gallery.length}` : ''}</span>}
    </div>
    {loading ? <div className={styles.status} role="status">Loading photographs…</div>
      : error ? <div className={styles.status} role="alert"><p>Photographs could not be loaded. Please try again.</p>{onRetry && <TrailButton onClick={onRetry}>Try again</TrailButton>}</div>
      : gallery.length === 0 ? <p className={styles.status}>{hike.status === 'planned' ? 'This walk is still planned. ' : ''}No gallery photographs are available to display.</p>
      : <>
        {assignmentNotice && <aside className={styles.notice} aria-label="Photo source review">{assignmentNotice}</aside>}
        {selectedTrailArea&&<p className={styles.selectedArea}>{trailArea?`Trail photo area ${trailArea.number}. Locations are approximate.`:'Photographs not linked to this walking reference.'}</p>}
        {!selectedTrailArea&&<p className={styles.intro}>{trailConnections ? 'Browse published place labels or use a photo area on the walking reference. Open a photograph to return to its approximate area; place labels and proximity do not prove a walked stage.' : places.length > 0 ? 'Browse by published place labels or nearby photo areas. Place labels are not exact positions on the schematic route.' : 'These photographs have no published place labels yet. Browse nearby photo areas where location metadata is available; no place names are inferred.'}</p>}
        {(places.length > 0 || active || (recorded > 0 && recorded < gallery.length) || filtered) && <div className={styles.filters}>
          {places.length > 0 || active ? <TrailSelect label="Place" className={styles.field} value={value} onChange={event => {
              const next = event.target.value
              setUnlabelled(next === 'unlabelled')
              onSelect(next.startsWith('place:') ? next.slice(6) : null)
            }}>
              <option value="all">All places · {gallery.length}</option>
              {active && !places.some(place => place.name === active) && <option value={`place:${active}`}>{active} · 0</option>}
              {places.map(place => <option key={place.name} value={`place:${place.name}`}>{place.name} · {place.count}</option>)}
              {missingPlace > 0 && <option value="unlabelled">No place label · {missingPlace}</option>}
            </TrailSelect> : null}
          {recorded > 0 && recorded < gallery.length && <TrailSelect label="Location metadata" className={styles.field} value={location} onChange={event => setLocation(event.target.value as LocationFilter)}>
              <option value="all">All photographs</option>
              <option value="recorded">Coordinates recorded · {recorded}</option>
              <option value="unrecorded">No coordinates recorded · {gallery.length - recorded}</option>
            </TrailSelect>}
          {filtered && <TrailButton onClick={clear}>Clear filters</TrailButton>}
        </div>}
        {!trailConnections && areas.length > 1 && <fieldset className={styles.areas}>
          <legend>Nearby photo areas</legend>
          <p>GPS groups across the full gallery. Each photograph is within 2 km of its area’s cover photo. These are approximate groups, not named places or a route.</p>
          <div className={styles.areaList}>
            {areas.map((item, index) => <PhotoAreaButton key={item.id} area={item} number={index + 1} selected={areaId === item.id} onClick={() => setAreaId(areaId === item.id ? null : item.id)} />)}
          </div>
        </fieldset>}
        {shown.length === 0 ? <div className={styles.status}><p>No photographs match these filters{active ? ` for ${active}` : ''}. Try another place or clear the filters.</p></div>
          : <GalleryResults key={`${hike.slug}:${active}:${unlabelled}:${location}:${areaId}:${selectedTrailArea}`} shown={shown} showPlaceLabels={active === null} hike={assignmentNotice ? {...hike,name:'Published gallery'} : hike} focusFallback={headingRef} trailConnections={trailConnections} onShowPhotoArea={onShowPhotoArea} />}
      </>}
  </section>
}

function PhotoAreaButton({area, number, selected, onClick}: {area:PhotoArea;number:number;selected:boolean;onClick:()=>void}) {
  const [failed,setFailed] = useState(false)
  return <button className={styles.area} type="button" aria-pressed={selected} onClick={onClick} aria-label={`Area ${number}, ${area.photos.length} photograph${area.photos.length === 1 ? '' : 's'}`}>
    {!failed && <img src={thumbOf(area.cover)} alt="" loading="lazy" onError={() => setFailed(true)} />}
    <span>Area {number}<small>{area.photos.length} photo{area.photos.length === 1 ? '' : 's'}</small></span>
  </button>
}

function GalleryResults({shown, hike, focusFallback, showPlaceLabels,trailConnections,onShowPhotoArea}: {shown:Asset[]; hike:Hike; showPlaceLabels:boolean; focusFallback:React.RefObject<HTMLElement|null>;trailConnections?:PhotoTrailConnections|null;onShowPhotoArea?:(id:string)=>void}) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(containerRef)
  const rows = width > 0 ? justifyGalleryRows(shown, width, rowHeightFor(width), 12) : null
  return <>
    <div ref={containerRef}>
      {rows ? rows.map((row, ri) => <div key={ri} className="flex" style={{gap:12,marginBottom:12}}>
        {row.items.map(it => <GalleryTile key={it.asset.url} asset={it.asset} hike={hike} showPlaceLabel={showPlaceLabels} number={shown.indexOf(it.asset) + 1} width={it.width} height={row.height} onOpen={() => setLightbox(shown.indexOf(it.asset))} />)}
      </div>) : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((photo, i) => <GalleryTile key={photo.url} asset={photo} hike={hike} showPlaceLabel={showPlaceLabels} number={i + 1} onOpen={() => setLightbox(i)} />)}
      </div>}
    </div>
    {lightbox !== null && shown[lightbox] && <Lightbox focusFallback={focusFallback} images={shown} index={lightbox} hikeName={hike.name} trailConnections={trailConnections} onShowPhotoArea={onShowPhotoArea} onClose={() => setLightbox(null)} onIndex={index => setLightbox(((index % shown.length) + shown.length) % shown.length)} />}
  </>
}

function GalleryTile({
  asset,
  hike,
  width,
  height,
  number,
  showPlaceLabel,
  onOpen,
}: {
  asset: Asset
  hike: Hike
  width?: number
  height?: number
  number: number
  showPlaceLabel: boolean
  onOpen: () => void
}) {
  const [failed, setFailed] = useState(false)
  const sized = width && height
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-stage)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${sized ? '' : 'aspect-[4/3] w-full'}`}
      style={sized ? { width, height } : undefined}
      aria-label={asset.alt || asset.caption || `${hike.name} photo ${number} — open`}
    >
      {failed ? <span className={styles.tileError}>Preview unavailable</span> : <img
        src={thumbOf(asset)}
        onError={() => setFailed(true)}
        alt={asset.alt || asset.caption || `${hike.name} photo ${number}`}
        loading="lazy"
        decoding="async"
        width={asset.width || undefined}
        height={asset.height || undefined}
        className="absolute inset-0 h-full w-full object-cover"
      />}
      {showPlaceLabel && asset.slot && !failed && <span className={styles.tileLabel}>{asset.slot}</span>}
    </button>
  )
}

// ── justified-rows layout ────────────────────────────────────────────────
function rowHeightFor(w: number) {
  if (w < 480) return 150
  if (w < 768) return 190
  return 230
}

function useContainerWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

// ── lightbox ─────────────────────────────────────────────────────────────
function Lightbox({
  images,
  focusFallback,
  index,
  hikeName,
  onClose,
  onIndex,
  trailConnections,
  onShowPhotoArea,
}: {
  images: Asset[]
  focusFallback: React.RefObject<HTMLElement|null>
  index: number
  hikeName: string
  onClose: () => void
  onIndex: (i: number) => void
  trailConnections?:PhotoTrailConnections|null
  onShowPhotoArea?:(id:string)=>void
}) {
  const image = images[index]
  const count = images.length
  const linkedArea=trailConnections?.areas.find(area=>area.photos.some(photo=>photo.url===image.url))
  const unlinkedReason=trailConnections?.unmatched.get(image.url)
  const dialogRef = useRef<HTMLDivElement>(null)
  const filmstripRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const strip = filmstripRef.current
    if (!strip) return
    const revealCurrent = () => {
      const current = strip.querySelector<HTMLElement>('[aria-current="true"]')
      if (!current || strip.clientWidth === 0) return
      const frame = strip.getBoundingClientRect(), thumbnail = current.getBoundingClientRect()
      // Match the strip's 4px inset so the selected ring is not clipped. Only
      // scroll horizontally: scrollIntoView would also move the photograph.
      const left = frame.left + strip.clientLeft + 4, right = left + strip.clientWidth - 8
      const delta = thumbnail.left < left ? thumbnail.left - left : thumbnail.right > right ? thumbnail.right - right : 0
      const next = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, strip.scrollLeft + delta))
      if (next !== strip.scrollLeft) strip.scrollTo({left:next, behavior:'instant'})
    }
    revealCurrent()
    let previousWidth = strip.clientWidth
    const observer = new ResizeObserver(() => {
      if (strip.clientWidth === previousWidth) return
      previousWidth = strip.clientWidth
      revealCurrent()
    })
    observer.observe(strip)
    return () => observer.disconnect()
  }, [index, image.url, count])
  const touchStart = useRef<{x:number;y:number} | null>(null)
  const restoreOpener = useRef(true)
  const lastPhoto = useRef(image.url)
  useLayoutEffect(()=>{
    if(lastPhoto.current===image.url)return
    lastPhoto.current=image.url
    // A location action may disappear on an unlinked photo. Keep keyboard focus
    // in the viewer rather than leaving it on the page behind the dialog.
    const dialog=dialogRef.current
    if(dialog&&!dialog.contains(document.activeElement))dialog.focus()
  },[image.url])

  const nav = useCallback((d: number) => onIndex(index + d), [index, onIndex])

  // Handle keys only from this viewer. A native dialog opened above it (such
  // as site search) owns its cursor keys, focus loop and Escape dismissal.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229 ||
        e.altKey || e.ctrlKey || e.metaKey || (e.shiftKey && e.key !== 'Tab')) return
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); nav(-1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nav(1) }
    else if (e.key === 'Tab') {
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])]
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { e.preventDefault(); first?.focus() }
    }
  }

  // body scroll lock + focus management (restore focus to the opener on close)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const opener = document.activeElement as HTMLElement | null
    const fallback = focusFallback.current
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      if (restoreOpener.current) {
        if (opener?.isConnected) opener.focus()
        else if (fallback?.isConnected) fallback.focus()
      }
    }
  }, [focusFallback])

  // preload neighbours
  useEffect(() => {
    for (const d of [-1, 1]) {
      const n = images[(((index + d) % count) + count) % count]
      if (n) { const im = new Image(); im.src = n.url }
    }
  }, [index, images, count])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current=null
    // Overlay controls own their tap. A drift must not swipe and then click.
    if(e.target instanceof Element&&e.target.closest('button,a'))return
    const touch=e.touches[0]
    touchStart.current=touch?{x:touch.clientX,y:touch.clientY}:null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start=touchStart.current,touch=e.changedTouches[0]
    touchStart.current=null
    if(!start||!touch)return
    const dx=touch.clientX-start.x,dy=touch.clientY-start.y
    // A vertical scroll must not become a photo change because of hand drift.
    if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.5)nav(dx<0?1:-1)
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${hikeName} gallery, photo ${index + 1} of ${count}`}
      tabIndex={-1}
      className={styles.lightbox}
      onKeyDown={onKeyDown}
      onClick={onClose}
    >
      {/* top bar */}
      <div className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
        <span className={styles.lightboxTitle}>{hikeName}</span>
        <TrailPhotoPosition index={index} count={count}/>

        <TrailIconButton onClick={onClose} aria-label="Close"><X size={19} aria-hidden="true"/></TrailIconButton>
      </div>

      {/* Scroll the photograph and metadata, keeping Close and position in view. */}
      <div className={styles.lightboxContent} data-photo-scroll>
        {/* Controls are anchored to the actual image frame, never its letterbox. */}
        <div className={styles.lightboxStage} onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={()=>{touchStart.current=null}}>
          <LightboxPhoto image={image} hikeName={hikeName}>
            <div className={styles.lightboxNavigation}>
              {linkedArea&&onShowPhotoArea&&<TrailPhotoLocation areaNumber={linkedArea.number} onClick={()=>{restoreOpener.current=false;onClose();onShowPhotoArea(linkedArea.id)}}/>}
              <TrailPhotoExpand href={image.url}/>
              {count>1&&<TrailPhotoNavigation onPrevious={()=>nav(-1)} onNext={()=>nav(1)}/>}
            </div>
          </LightboxPhoto>

        </div>

        {/* caption + filmstrip */}
        <div className={styles.lightboxFooter} onClick={(e) => e.stopPropagation()}>
          {unlinkedReason&&<p className="mb-3 max-w-3xl text-sm leading-6 text-white/85">{photoTrailReasonText[unlinkedReason]}</p>}
          <div className={styles.lightboxCaption}>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {image.caption && <span className="font-sans text-sm text-white/90">{image.caption}</span>}
              {image.slot && <span className={styles.lightboxPlace}>{image.slot}</span>}
              {image.takenAt && <span className="text-white/75">{fmtDate(image.takenAt)}</span>}
            </span>

          </div>

          {count > 1 && (
            <div ref={filmstripRef} className={styles.filmstrip}>
              {images.map((im, i) => (
                <button
                  key={im.url}
                  type="button"
                  onClick={() => onIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === index}
                  className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition-opacity motion-reduce:transition-none ${
                    i === index ? 'opacity-100 ring-[var(--accent)]' : 'opacity-50 ring-transparent hover:opacity-90'
                  }`}
                >
                            <img src={thumbOf(im)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LightboxPhoto({image,hikeName,children}: {image:Asset;hikeName:string;children:ReactNode}) {
  const [state,setState] = useState<{url:string;failed:boolean;ratio:number|null}|null>(null)
  const current=state?.url===image.url?state:null
  const suppliedRatio=Number.isFinite(image.width)&&Number.isFinite(image.height)&&image.width>0&&image.height>0?image.width/image.height:null
  const ratio=current?.ratio??suppliedRatio??4/3
  return <div className={styles.lightboxFrame} data-photo-frame data-photo-failed={current?.failed||undefined} style={{'--photo-ratio':ratio} as CSSProperties}>
    {current?.failed?<p role="status" className={styles.lightboxError}>This photograph could not be loaded. You can open the full-size photo in a new tab or move to another photograph.</p>
      :<img key={image.url} src={image.url} width={image.width||undefined} height={image.height||undefined} alt={image.alt || image.caption || `${hikeName} photo`} onError={()=>setState({url:image.url,failed:true,ratio})} onLoad={event=>{const photo=event.currentTarget;if(photo.naturalWidth>0&&photo.naturalHeight>0)setState({url:image.url,failed:false,ratio:photo.naturalWidth/photo.naturalHeight})}} className={styles.lightboxPhoto}/>}
    {children}
  </div>
}
