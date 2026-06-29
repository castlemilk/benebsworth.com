'use client'

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...p }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" width="1em" height="1em" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable="false" {...p}
    >
      {children}
    </svg>
  )
}

export const DistanceIcon = (p: IconProps) => <Svg {...p}><path d="M3 17h18" /><path d="M5 17v-3l3-5 4 4 3-6 4 6v4" /></Svg>
export const DurationIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
export const AscentIcon = (p: IconProps) => <Svg {...p}><path d="M4 19h16" /><path d="M4 19l7-12 4 6 2-3 3 9" /></Svg>
export const DescentIcon = (p: IconProps) => <Svg {...p}><path d="M4 5h16" /><path d="M20 5l-7 12-4-6-2 3-3-9" /></Svg>
export const SummitIcon = (p: IconProps) => <Svg {...p}><path d="M3 19h18L14 6l-3 5-2-2-6 10Z" /><path d="M12.5 8.5l1.5-2.5" /></Svg>
export const AltitudeIcon = (p: IconProps) => <Svg {...p}><path d="M3 20l6-11 4 5 3-4 5 10H3Z" /></Svg>
export const BootIcon = (p: IconProps) => <Svg {...p}><path d="M6 4v9l-1.5 1.2A2 2 0 0 0 4 16v2a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1c0-2-1.5-2.6-3.5-3.5L11 13V4Z" /><path d="M6 9h5" /></Svg>
export const SeasonIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 3.5v3M16 3.5v3" /></Svg>
export const PackIcon = (p: IconProps) => <Svg {...p}><path d="M7 8a5 5 0 0 1 10 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" /><path d="M9.5 8V6a2.5 2.5 0 0 1 5 0v2M9 13h6" /></Svg>
export const HutIcon = (p: IconProps) => <Svg {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-4h4v4" /></Svg>
export const TentIcon = (p: IconProps) => <Svg {...p}><path d="M12 4 3 19h18L12 4Z" /><path d="M12 9l-4 10M12 9l4 10" /></Svg>
export const WaterIcon = (p: IconProps) => <Svg {...p}><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z" /></Svg>
export const PassIcon = (p: IconProps) => <Svg {...p}><path d="M3 17l5-7 3 3 3-5 4 6" /><path d="M2 20h20" /><circle cx="14" cy="8" r="1" /></Svg>
export const ViewpointIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /></Svg>
export const JunctionIcon = (p: IconProps) => <Svg {...p}><path d="M12 21V8" /><path d="M12 8 6 3M12 8l6-5" /><circle cx="12" cy="21" r="1" /></Svg>
export const LeafIcon = (p: IconProps) => <Svg {...p}><path d="M5 19c0-8 6-13 14-14 1 9-4 15-14 14Z" /><path d="M9 15c3-3 5-5 8-7" /></Svg>
export const TrackIcon = (p: IconProps) => <Svg {...p}><ellipse cx="9" cy="15" rx="2.3" ry="3" /><circle cx="6" cy="10.5" r="1.2" /><circle cx="9.5" cy="8.5" r="1.2" /><circle cx="13" cy="10.5" r="1.2" /></Svg>
export const StarIcon = (p: IconProps) => <Svg {...p}><path d="m12 3 2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.4 9.3l6-.7Z" /></Svg>
export const ExposureIcon = (p: IconProps) => <Svg {...p}><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4.5M12 17.2v.1" /></Svg>
export const CompassIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m9 15 1.5-4.5L15 9l-1.5 4.5L9 15Z" /></Svg>
export const SunriseIcon = (p: IconProps) => <Svg {...p}><path d="M3 18h18M12 3v4M5 8 7 10M19 8l-2 2M2 14h3M19 14h3" /><path d="M8 18a4 4 0 0 1 8 0" /></Svg>

// kind → icon lookup, used by Checkpoint/Stop/Landmark.
export const KIND_ICON = {
  pass: PassIcon, summit: SummitIcon, water: WaterIcon, junction: JunctionIcon,
  viewpoint: ViewpointIcon, camp: TentIcon, hut: HutIcon, milestone: StarIcon,
  rifugio: HutIcon, hotel: HutIcon, bivvy: TentIcon, refuge: HutIcon,
  gorge: PassIcon, lake: WaterIcon, monument: ViewpointIcon, glacier: AltitudeIcon,
} as const

export type IconKind = keyof typeof KIND_ICON
