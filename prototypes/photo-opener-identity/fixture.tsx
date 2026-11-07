import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import {HikeGallery} from '../../components/hiking/hike-gallery'
import {hikes} from '../../content/hiking'
import trail from '../../components/hiking/trail-journal.module.css'
const photos=Array.from({length:18},(_,i)=>({id:'',url:`/fixture-photo.webp?photo=${i+1}`,thumb:'',alt:`Fixture photo ${i+1}`,caption:`Interaction fixture ${i+1}. Reused repository cover, not an additional photograph.`,slot:'',lat:0,lng:0,width:1200,height:800,takenAt:''}))
function Fixture(){const [dark,setDark]=useState(false);return <><header className="preview-toolbar"><strong>Photo return-focus review</strong><span>Synthetic 18-item interaction fixture. No public manifests, GPS or capture times.</span><button onClick={()=>{document.documentElement.classList.toggle('dark',!dark);setDark(!dark)}}>{dark?'Light theme':'Dark theme'}</button></header><main data-hiking-page="detail" className={`${trail.page} mx-auto w-full max-w-5xl px-6 pb-32 sm:px-8`}><h1 className={`${trail.title} py-10`}>Photo gallery interaction check</h1><HikeGallery hike={{...hikes[0],name:'Interaction fixture'}} gallery={photos} active={null} onSelect={()=>{}}/></main></>}
createRoot(document.getElementById('root')!).render(<Fixture/> )
