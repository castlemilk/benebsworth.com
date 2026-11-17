import * as React from "react"
import { crosses, haptic } from "@/lib/haptics"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Slider as SdkSlider, SliderControl, SliderIndicator, SliderThumb, SliderTrack, SliderValue } from "@ui-sdk/react/slider"

function Slider({
  label,
  value,
  defaultValue,
  min,
  max,
  step,
  onValueChange,
}: {
  label: string
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number) => void
}) {
  // A tick each time the thumb passes a twentieth of the range.
  const lo = min ?? 0
  const detent = ((max ?? 100) - lo) / 20
  const last = React.useRef(value ?? defaultValue ?? lo)
  const change = (next: number) => {
    if (crosses((value ?? last.current) - lo, next - lo, detent)) haptic("selection")
    last.current = next
    onValueChange?.(next)
  }
  return (
    <Field data-kit="field">
      <SdkSlider
        data-kit="slider"
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => change(next as number)}
      >
        <div data-kit="row">
          <FieldLabel data-kit="label">{label}</FieldLabel>
          <SliderValue data-kit="value" />
        </div>
        <SliderControl data-kit="slider-control">
          <span data-kit="slider-scale" aria-hidden />
          <SliderTrack data-kit="slider-track">
            <SliderIndicator data-kit="slider-indicator" />
            <SliderThumb data-kit="slider-thumb" />
          </SliderTrack>
        </SliderControl>
      </SdkSlider>
    </Field>
  )
}

export { Slider }
