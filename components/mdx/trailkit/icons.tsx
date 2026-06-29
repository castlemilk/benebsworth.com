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

// Single-stroke line set, refined to one cohesive grammar (24px grid, 1.5px,
// round caps/joins) from the brandbrain icon-sheet reference (public/trailkit/icon-sheet.webp).
export const DistanceIcon = (p: IconProps) => <Svg {...p}><circle cx="5" cy="18" r="1.6" /><circle cx="19" cy="6" r="1.6" /><path d="M6.4 16.8C9 15 8.2 11.5 11 10.2s5-1 6-2.8" /></Svg>
export const DurationIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
export const AscentIcon = (p: IconProps) => <Svg {...p}><path d="M3 20h18" /><path d="M4 17l6-8 4 4 6-8" /><path d="M16 5h4v4" /></Svg>
export const DescentIcon = (p: IconProps) => <Svg {...p}><path d="M3 4h18" /><path d="M4 7l6 8 4-4 6 8" /><path d="M16 19h4v-4" /></Svg>
export const SummitIcon = (p: IconProps) => <Svg {...p}><path d="M2 20l7-12 3.5 6 2.5-4 7 10z" /><path d="M6.6 14.5 9 8l2.2 3.8" /></Svg>
export const AltitudeIcon = (p: IconProps) => <Svg {...p}><path d="M3 20l6-12 4 6 2-3 6 9z" /></Svg>
export const BootIcon = (p: IconProps) => <Svg {...p}><path d="M6 4v9l-1.5 1.2A2 2 0 0 0 4 16v2a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1c0-2-1.5-2.6-3.5-3.5L11 13V4z" /><path d="M6 9h5" /></Svg>
export const SeasonIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 3.5v3M16 3.5v3" /></Svg>
export const PackIcon = (p: IconProps) => <Svg {...p}><path d="M7 9a5 5 0 0 1 10 0v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><path d="M9.5 9V6.5a2.5 2.5 0 0 1 5 0V9" /><path d="M7 13h10" /><path d="M11 13v3h2v-3" /></Svg>
export const HutIcon = (p: IconProps) => <Svg {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-4h4v4" /></Svg>
export const TentIcon = (p: IconProps) => <Svg {...p}><path d="M12 5 4 19h16z" /><path d="M12 5v14" /><path d="M9.5 19c0-3 1-5 2.5-5s2.5 2 2.5 5" /></Svg>
export const WaterIcon = (p: IconProps) => <Svg {...p}><path d="M3 8c2 0 2.5 1.4 4.5 1.4S11 8 13 8s2.5 1.4 4.5 1.4S21 8 21 8" /><path d="M3 12.5c2 0 2.5 1.4 4.5 1.4S11 12.5 13 12.5s2.5 1.4 4.5 1.4S21 12.5 21 12.5" /><path d="M3 17c2 0 2.5 1.4 4.5 1.4S11 17 13 17s2.5 1.4 4.5 1.4S21 17 21 17" /></Svg>
export const PassIcon = (p: IconProps) => <Svg {...p}><path d="M2 19h20" /><path d="M2 19l5.5-9 3 4.2" /><path d="M22 19l-5.5-9-3 5" /></Svg>
export const ViewpointIcon = (p: IconProps) => <Svg {...p}><path d="M5.5 9 4 16a2.5 2.5 0 0 0 5 0L8.5 9a1.5 1.5 0 0 0-3 0z" /><path d="M18.5 9 20 16a2.5 2.5 0 0 1-5 0L15.5 9a1.5 1.5 0 0 1 3 0z" /><path d="M8.5 12h7" /></Svg>
export const JunctionIcon = (p: IconProps) => <Svg {...p}><path d="M12 3.5v17" /><path d="M12 6.5h6l2 2-2 2h-6" /><path d="M12 12H6l-2 2 2 2h6" /></Svg>
export const LeafIcon = (p: IconProps) => <Svg {...p}><path d="M5 19c0-8 6-13 14-14 1 9-4 15-14 14z" /><path d="M9 15c3-3 5-5 8-7" /></Svg>
export const TrackIcon = (p: IconProps) => <Svg {...p}><ellipse cx="12" cy="15.5" rx="3.2" ry="2.6" /><circle cx="7.4" cy="11" r="1.3" /><circle cx="11" cy="8.6" r="1.3" /><circle cx="13" cy="8.6" r="1.3" /><circle cx="16.6" cy="11" r="1.3" /></Svg>
export const StarIcon = (p: IconProps) => <Svg {...p}><path d="m12 3 2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.4 9.3l6-.7z" /></Svg>
export const ExposureIcon = (p: IconProps) => <Svg {...p}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5" /><path d="M12 17.6v.05" /></Svg>
export const CompassIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m9 15 1.6-4.4L15 9l-1.6 4.4z" /><path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21" /></Svg>
export const SunriseIcon = (p: IconProps) => <Svg {...p}><path d="M3 18h18M12 3v4M5.5 8.5 7 10M18.5 8.5 17 10M2 14h2.5M19.5 14H22" /><path d="M8 18a4 4 0 0 1 8 0" /></Svg>

// kind → icon lookup, used by Checkpoint/Stop/Landmark.
export const KIND_ICON = {
  pass: PassIcon, summit: SummitIcon, water: WaterIcon, junction: JunctionIcon,
  viewpoint: ViewpointIcon, camp: TentIcon, hut: HutIcon, milestone: StarIcon,
  rifugio: HutIcon, hotel: HutIcon, bivvy: TentIcon, refuge: HutIcon,
  gorge: PassIcon, lake: WaterIcon, monument: ViewpointIcon, glacier: AltitudeIcon,
} as const

export type IconKind = keyof typeof KIND_ICON
