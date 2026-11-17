import * as React from "react"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { haptic } from "@/lib/haptics"
import { Radio, RadioGroup } from "@ui-sdk/react/radio"

// A mode dial, as on a camera: labeled stops on a printed arc of ticks, the
// chosen one in a filled circle, and a small knurled knob whose pointer turns
// to it. Click a stop, drag anywhere on the dial round, or use the arrow
// keys; it's a radio group underneath.
function ModeDial({
  label,
  options,
  value: controlled,
  defaultValue,
  onValueChange,
  sweep = 240,
}: {
  label: string
  options: { value: string; label: string }[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  sweep?: number
}) {
  const [stored, setStored] = React.useState(defaultValue ?? options[0].value)
  const value = controlled ?? stored
  const step = options.length > 1 ? sweep / (options.length - 1) : 0
  const angleOf = (i: number) => -sweep / 2 + i * step
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  // A tick at each stop the knob turns to.
  const choose = (next: string) => {
    setStored(next)
    if (next === value) return
    haptic("selection")
    onValueChange?.(next)
  }

  const turning = React.useRef(false)
  // The angle from the knob's center, which sits half the dial's width down.
  const turnTo = (event: React.PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const angle =
      (Math.atan2(event.clientX - box.left - box.width / 2, -(event.clientY - box.top - box.width / 2)) * 180) / Math.PI
    let nearest = 0
    options.forEach((_, i) => {
      if (Math.abs(angleOf(i) - angle) < Math.abs(angleOf(nearest) - angle)) nearest = i
    })
    choose(options[nearest].value)
  }

  return (
    <Field data-kit="field">
      <FieldLabel data-kit="label">{label}</FieldLabel>
      <RadioGroup
        data-kit="mode-dial"
        value={value}
        onValueChange={(next) => next && choose(String(next))}
        style={{ "--sweep": `${sweep}deg`, "--at": `${angleOf(index)}deg` } as React.CSSProperties}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          turning.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          turnTo(event)
        }}
        onPointerMove={(event) => turning.current && turnTo(event)}
        onPointerUp={() => (turning.current = false)}
        onPointerCancel={() => (turning.current = false)}
      >
        <span data-kit="mode-dial-scale" aria-hidden />
        <span data-kit="mode-dial-knob" aria-hidden>
          <span data-kit="mode-dial-pointer" />
        </span>
        {options.map((option, i) => (
          <Radio
            key={option.value}
            value={option.value}
            data-kit="mode-stop"
            style={{ "--a": `${angleOf(i)}deg` } as React.CSSProperties}
          >
            <span data-kit="mode-stop-label">{option.label}</span>
          </Radio>
        ))}
      </RadioGroup>
    </Field>
  )
}

export { ModeDial }
