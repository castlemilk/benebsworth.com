import * as React from "react"
import { bindRepeat } from "@ui-sdk/core"
import { Button } from "@ui-sdk/react/button"
import { haptic } from "@/lib/haptics"

// One press zone. Held, it keeps pressing, like a game pad: once on the
// press, then every 80ms after 380ms, through core's bindRepeat. Enter and
// Space press it once, through the button's own click.
function Zone({ dir, label, onPress }: { dir: string; label: string; onPress?: () => void }) {
  const el = React.useRef<HTMLButtonElement>(null)
  const latest = React.useRef(onPress)
  latest.current = onPress
  React.useEffect(
    () =>
      bindRepeat(el.current!, {
        delay: 380,
        repeat: 80,
        keys: [],
        onStep: ({ count }) => {
          // Each repeat is felt; the press itself is felt from its click.
          if (count > 1) haptic("selection")
          latest.current?.()
        },
      }),
    [],
  )
  return (
    <Button ref={el} data-kit="dpad-zone" data-dir={dir} aria-label={label}>
      <span data-kit="dpad-arrow" />
    </Button>
  )
}

// A D-pad: one matte cross-shaped cap in a round well, with a shallow dish
// at its center and four press zones. Pressing a direction rocks the whole
// cap on its center pivot, tilting it a few degrees toward that arm. Each
// zone is its own button (a UI SDK button) that repeats while held, and
// arrow keys press them while the pad has focus (held, they repeat at the
// keyboard's own rate).
function DPad({
  label,
  onUp,
  onDown,
  onLeft,
  onRight,
}: {
  label: string
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
}) {
  const handlers = { up: onUp, down: onDown, left: onLeft, right: onRight }
  const names = { up: "Up", down: "Down", left: "Left", right: "Right" }
  return (
    <div
      data-kit="dpad"
      role="group"
      aria-label={label}
      onKeyDown={(event) => {
        const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as const)[
          event.key as "ArrowUp"
        ]
        if (!dir) return
        event.preventDefault()
        handlers[dir]?.()
      }}
    >
      <span data-kit="dpad-well" aria-hidden />
      <span data-kit="dpad-shadow" aria-hidden>
        <span data-kit="dpad-base" />
      </span>
      <span data-kit="dpad-cap" aria-hidden>
        <span data-kit="dpad-dish" />
      </span>
      {(["up", "left", "right", "down"] as const).map((dir) => (
        <Zone key={dir} dir={dir} label={names[dir]} onPress={handlers[dir]} />
      ))}
    </div>
  )
}

export { DPad }
