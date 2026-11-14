import { pathPoints, type PathMark } from './definition'

/** A deliberately small path language, validated even at the direct markup entry point. */
export function validatePathMark(mark: PathMark): void {
  const fields = ['kind', 'commands', 'role', 'paint', ...(mark.paint === 'stroke' ? ['emphasis', 'stroke'] : [])]
  if (mark.kind !== 'path' || Object.keys(mark).some(key => !fields.includes(key))
    || !['ink', 'accent', 'guide'].includes(mark.role)
    || !['stroke', 'fill'].includes(mark.paint)
    || mark.stroke !== undefined && mark.stroke !== 'fine'
    || mark.emphasis !== undefined && typeof mark.emphasis !== 'boolean') throw new Error('Invalid path paint')
  if (!Array.isArray(mark.commands) || mark.commands.length === 0) throw new Error('Invalid path commands')

  let open = false, drawn = false
  for (const command of mark.commands) {
    if (!command || typeof command !== 'object' || Array.isArray(command)) throw new Error('Invalid path command')
    const keys = command.op === 'M' || command.op === 'L' ? ['op', 'to']
      : command.op === 'C' ? ['op', 'control1', 'control2', 'to'] : command.op === 'Z' ? ['op'] : []
    if (keys.length === 0 || Object.keys(command).length !== keys.length
      || Object.keys(command).some(key => !keys.includes(key))) throw new Error('Invalid path command')
    for (const point of pathPoints([command])) {
      if (!Array.isArray(point) || point.length !== 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])
        || point[0] < 8 || point[0] > 312 || point[1] < 8 || point[1] > 232) throw new Error('Path exceeds the drawing bounds')
    }
    if (command.op === 'M') {
      if (open && (!drawn || mark.paint === 'fill')) throw new Error('Unfinished path contour')
      open = true; drawn = false
    } else if (command.op === 'Z') {
      if (!open || !drawn) throw new Error('Invalid path closure')
      open = false; drawn = false
    } else {
      if (!open) throw new Error('Path contour must start with M')
      drawn = true
    }
  }
  if (open && (!drawn || mark.paint === 'fill')) throw new Error('Unfinished path contour')
}
