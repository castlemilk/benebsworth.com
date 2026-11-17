import * as React from "react"
import { haptic } from "@/lib/haptics"
import { Switch as SdkSwitch, SwitchThumb } from "@ui-sdk/react/switch"

// A switch you can click or drag. Dragging, the thumb follows the pointer and
// settles on whichever side is nearer when let go; the click that follows a
// drag is ignored, so it doesn't toggle a second time.
function Switch({
  label,
  defaultChecked,
  onCheckedChange,
}: {
  label: string
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const [checked, setChecked] = React.useState(Boolean(defaultChecked))
  const drag = React.useRef<{ x: number; moved: boolean; from: boolean; at: number } | null>(null)
  const ignoreClick = React.useRef(false)
  // Clicked or dragged across, the switch snaps over with one firm tap.
  const set = (next: boolean) => {
    if (next !== checked) haptic("medium")
    setChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <label data-kit="switch-row">
      <span data-kit="label">{label}</span>
      <SdkSwitch
        data-kit="switch"
        checked={checked}
        onCheckedChange={(next) => {
          if (ignoreClick.current) return
          set(next)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          drag.current = { x: event.clientX, moved: false, from: checked, at: checked ? 1 : 0 }
        }}
        onPointerMove={(event) => {
          const current = drag.current
          if (!current) return
          const dx = event.clientX - current.x
          const el = event.currentTarget
          if (!current.moved) {
            if (Math.abs(dx) < 3) return
            current.moved = true
            el.setPointerCapture(event.pointerId)
            el.dataset.dragging = ""
          }
          const thumb = el.querySelector<HTMLElement>('[data-kit="switch-thumb"]')!
          const travel = el.clientWidth - thumb.offsetWidth - thumb.offsetLeft * 2
          current.at = Math.min(1, Math.max(0, (current.from ? 1 : 0) + dx / travel))
          el.style.setProperty("--switch-drag-x", `${current.at * travel}px`)
        }}
        onPointerUp={(event) => {
          const current = drag.current
          drag.current = null
          if (!current?.moved) return
          const el = event.currentTarget
          delete el.dataset.dragging
          el.style.removeProperty("--switch-drag-x")
          set(current.at > 0.5)
          ignoreClick.current = true
          setTimeout(() => {
            ignoreClick.current = false
          })
        }}
      >
        <SwitchThumb data-kit="switch-thumb" />
      </SdkSwitch>
    </label>
  )
}

export { Switch }
