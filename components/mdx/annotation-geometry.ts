import rough from 'roughjs'
export type Rect = { x: number; y: number; width: number; height: number }
const point = (x: number, y: number) => `${Number(x.toFixed(2))} ${Number(y.toFixed(2))}`
type Point = {x:number;y:number}
const sketch = rough.generator()
/** Excalidraw-style double strokes with a stable seed and exact attachment vertices. */
export function sketchPath(path:string,seed=173,roughness=1.45):string {
  const drawable=sketch.path(path,{seed,roughness,bowing:1,maxRandomnessOffset:3,preserveVertices:true,disableMultiStroke:false,fill:'none'})
  return sketch.toPaths(drawable).map(p=>p.d).join(' ')
}
export function penCurve(start:Point,c1:Point,c2:Point,end:Point):string {
  return sketchPath(`M${point(start.x,start.y)} C${point(c1.x,c1.y)} ${point(c2.x,c2.y)} ${point(end.x,end.y)}`)
}
/** Route through the whitespace between two non-overlapping layout regions. */
export function connectorPath(target: Rect, note: Rect, anchor?: Rect, kind: 'arrow'|'bracket'='arrow'): string | null {
  if (![target,note,...(anchor?[anchor]:[])].every(r=>Object.values(r).every(Number.isFinite)&&r.width>0&&r.height>0)) return null
  let sx: number, sy: number, ex: number, ey: number, vertical = false
  const gap=7
  if(note.y+note.height <= target.y){sx=note.x+note.width*.45;sy=note.y+note.height+gap;ex=Math.min(target.x+target.width*.85,Math.max(target.x+target.width*.15,sx));ey=target.y-gap;vertical=true}
  else if(target.y+target.height <= note.y){sx=note.x+note.width*.45;sy=note.y-gap;ex=Math.min(target.x+target.width*.85,Math.max(target.x+target.width*.15,sx));ey=target.y+target.height+gap;vertical=true}
  else if(target.x+target.width <= note.x){sx=note.x-gap;sy=note.y+Math.min(note.height*.5,45);ex=target.x+target.width+gap;ey=Math.min(target.y+target.height*.8,Math.max(target.y+target.height*.2,sy))}
  else if(note.x+note.width <= target.x){sx=note.x+note.width+gap;sy=note.y+Math.min(note.height*.5,45);ex=target.x-gap;ey=Math.min(target.y+target.height*.8,Math.max(target.y+target.height*.2,sy))}
  else return null // Never draw through overlapping prose.
  if(anchor){ex=anchor.x+anchor.width/2;ey=anchor.y+anchor.height/2}
  const dx=ex-sx,dy=ey-sy
  // A deliberate bow remains visible even when start and target align exactly.
  // Scale with distance, cap the flourish, and keep controls inside the layout.
  const distance=Math.hypot(dx,dy)
  if(distance<2)return null
  const bow=Math.min(64,distance*.34)*(vertical?1:-1)
  const nx=-dy/distance,ny=dx/distance
  const left=Math.min(target.x,note.x),right=Math.max(target.x+target.width,note.x+note.width)
  const top=Math.min(target.y,note.y),bottom=Math.max(target.y+target.height,note.y+note.height)
  const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n))
  const c1x=clamp(sx+dx*.28+nx*bow,left,right),c1y=clamp(sy+dy*.28+ny*bow,top,bottom)
  const c2x=clamp(sx+dx*.78+nx*bow*.85,left,right),c2y=clamp(sy+dy*.78+ny*bow*.85,top,bottom)
  const angle=Math.atan2(ey-c2y,ex-c2x),len=12
  const ax=ex-len*Math.cos(angle-.45),ay=ey-len*Math.sin(angle-.45),bx=ex-len*.76*Math.cos(angle+.55),by=ey-len*.76*Math.sin(angle+.55)
  if(kind==='bracket'&&!vertical){
    const x=note.x>=target.x+target.width?target.x+target.width+gap:target.x-gap,cap=x>target.x?-7:7
    return sketchPath(`M${point(sx,sy)} Q${point((sx+x)/2,sy)} ${point(x,target.y+target.height/2)} M${point(x+cap,target.y)} L${point(x,target.y)} L${point(x,target.y+target.height)} L${point(x+cap,target.y+target.height)}`,311)
  }
  const stroke=penCurve({x:sx,y:sy},{x:c1x,y:c1y},{x:c2x,y:c2y},{x:ex,y:ey})
  return `${stroke} ${sketchPath(`M${point(ax,ay)} Q${point((ax+ex)/2+1.3,(ay+ey)/2-.7)} ${point(ex,ey)} Q${point((bx+ex)/2-.8,(by+ey)/2+.6)} ${point(bx,by)}`,271,.6)}`
}
/** Merge text fragments sharing a baseline, leaving a separate stroke per wrapped line. */
export function underlinePaths(rects: Rect[]): string[] {
  const lines: Rect[]=[]
  for(const r of rects.filter(r=>r.width>0&&r.height>0&&Object.values(r).every(Number.isFinite)).sort((a,b)=>a.y-b.y||a.x-b.x)){
    const line=lines.find(l=>Math.abs((l.y+l.height)-(r.y+r.height))<4)
    if(line){const right=Math.max(line.x+line.width,r.x+r.width);line.x=Math.min(line.x,r.x);line.width=right-line.x}
    else lines.push({...r})
  }
  return lines.map(r=>{const x=r.x,y=r.y+r.height+3,w=r.width;return `${penCurve({x,y},{x:x+w*.23,y:y+Math.min(9,w*.03)},{x:x+w*.63,y:y+Math.min(12,w*.04)},{x:x+w,y:y-1})}`})
}
