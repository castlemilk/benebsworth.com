'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Responsive grid for Stop/Landmark/Flora/Fauna cards. */
export function TrailGrid({ children, cols = 2, className }: { children?: ReactNode; cols?: 1 | 2 | 3; className?: string }) {
  const colClass = cols === 1 ? 'sm:grid-cols-1' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'
  return <div className={cn('not-prose my-10 grid grid-cols-1 gap-4', colClass, className)}>{children}</div>
}
