import type { SpatialFrame, Vec3 } from '@/lib/lab/spatial/types'

export type CameraView = 'perspective' | 'front' | 'top'
function project([x, y, z]: Vec3, view: CameraView): [number, number] {
  if (view === 'front') return [320 + x * 63, 230 - y * 63]
  if (view === 'top') return [320 + x * 63, 230 + z * 63]
  return [320 + (x * 0.83 - z * 0.56) * 63, 230 - (y * 0.9 - x * 0.25 - z * 0.37) * 63]
}
export function SpatialFallback({ frame, title, view }: { frame: SpatialFrame; title: string; view: CameraView }) {
  return <svg viewBox="0 0 640 460" role="img" aria-label={`${title}, projected view`} className="h-full w-full" data-renderer="svg">
    <title>{title}: projected view with the same model and controls</title>
    {frame.surfaces?.map((surface, i) => <g key={`surface-${i}`} fill={surface.color} opacity={Math.min(surface.opacity ?? 0.15, 0.18)}>
      {Array.from({ length: Math.floor(surface.indices.length / 3) }, (_, j) => <polygon key={j} points={surface.indices.slice(j * 3, j * 3 + 3).map(k => project(surface.vertices[k], view).join(',')).join(' ')} />)}
    </g>)}
    {frame.lines.map((line, i) => <polyline key={i} points={line.points.map(p => project(p, view).join(',')).join(' ')} fill="none" stroke={line.color} strokeOpacity={line.opacity ?? 0.9} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
    {frame.points?.map((point, i) => { const [cx, cy] = project(point.position, view); return <circle key={i} cx={cx} cy={cy} r={Math.max(3, (point.size ?? 0.06) * 63)} fill={point.color} /> })}
  </svg>
}
