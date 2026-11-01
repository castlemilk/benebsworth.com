/** Keep the readout inside its chart, flipping before clamping at edges. */
export function inspectionPosition(x:number, y:number, width:number, height:number) {
  const pad=8, gap=16
  const boxWidth=Math.max(0,Math.min(208,width-pad*2))
  const boxHeight=Math.max(0,Math.min(188,height-pad*2))
  const left=x+gap+boxWidth<=width-pad ? x+gap : x-gap-boxWidth
  const top=y+gap+boxHeight<=height-pad ? y+gap : y-gap-boxHeight
  return {left:Math.max(pad,Math.min(width-pad-boxWidth,left)),top:Math.max(pad,Math.min(height-pad-boxHeight,top)),width:boxWidth,maxHeight:boxHeight}
}
