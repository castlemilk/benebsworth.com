import { Meter as SdkMeter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@ui-sdk/react/meter"

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <SdkMeter data-kit="meter" value={value}>
      <div data-kit="row">
        <MeterLabel data-kit="label">{label}</MeterLabel>
        <MeterValue data-kit="value" />
      </div>
      <MeterTrack data-kit="meter-track">
        <MeterIndicator data-kit="meter-indicator" />
      </MeterTrack>
    </SdkMeter>
  )
}

export { Meter }
