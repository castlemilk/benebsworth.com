import type {Asset} from '@/lib/gen/content'
export type GalleryRow={items:{asset:Asset;width:number}[];height:number}
const aspectOf=(asset:Asset)=>asset.width&&asset.height?asset.width/asset.height:4/3
/** Keep original aspect ratios without packing portraits into unreadable slivers.
 * Break before a new image would shrink any existing thumbnail below 112px. */
export function justifyGalleryRows(items:Asset[],width:number,targetHeight:number,gap:number):GalleryRow[]{
 const rows:GalleryRow[]=[]
 if(width<=0)return rows
 const minimum=Math.min(112,width)
 let row:Asset[]=[],sum=0
 const flush=(last:boolean)=>{
  if(!row.length)return
  const fit=(width-gap*(row.length-1))/sum
  const readable=Math.max(targetHeight,...row.map(item=>minimum/aspectOf(item)))
  const height=last?Math.min(readable,fit):fit
  rows.push({height,items:row.map(asset=>({asset,width:aspectOf(asset)*height}))})
  row=[];sum=0
 }
 for(const item of items){
  const aspect=aspectOf(item),candidate=[...row,item]
  const fit=(width-gap*row.length)/(sum+aspect)
  if(row.length&&candidate.some(asset=>aspectOf(asset)*fit<minimum))flush(false)
  row.push(item);sum+=aspect
  if(sum*targetHeight+gap*(row.length-1)>=width)flush(false)
 }
 flush(true)
 return rows
}
