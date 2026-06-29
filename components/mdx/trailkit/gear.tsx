'use client'

import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { accentStyle } from './primitives'
import { PackIcon } from './icons'

export interface GearProps {
  name: string
  group?: 'worn' | 'pack' | 'safety' | 'optional'
  essential?: boolean
  note?: ReactNode
}

const GROUP_ORDER: NonNullable<GearProps['group']>[] = ['worn', 'pack', 'safety', 'optional']
const GROUP_LABEL: Record<NonNullable<GearProps['group']>, string> = {
  worn: 'Worn', pack: 'In the pack', safety: 'Safety', optional: 'Optional',
}

export function Gear(_: GearProps) { return null } // data-only; rendered by GearList

export function GearList({ children, accent }: { children?: ReactNode; accent?: string }) {
  const items = Children.toArray(children).filter((c): c is ReactElement<GearProps> => isValidElement(c)) as ReactElement<GearProps>[]
  const groups = GROUP_ORDER.map((g) => ({ g, items: items.filter((it) => (it.props.group ?? 'pack') === g) })).filter((x) => x.items.length)

  return (
    <div className="not-prose my-12 rounded-[0.625rem] border border-[var(--color-border)] bg-surface p-6" style={accentStyle(accent)}>
      <p className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted">
        <span className="text-[1rem]" style={{ color: 'var(--accent)' }}><PackIcon /></span> Gear
      </p>
      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {groups.map(({ g, items }) => (
          <div key={g}>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>{GROUP_LABEL[g]}</p>
            <ul className="mt-2 space-y-1.5">
              {items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-2 font-sans text-[0.9rem] text-fg/85">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.props.essential ? 'var(--accent)' : 'color-mix(in srgb, var(--color-fg) 30%, transparent)' }} aria-hidden />
                  <span>
                    {it.props.name}
                    {it.props.essential && <span className="ml-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>essential</span>}
                    {it.props.note && <span className="block font-sans text-[0.78rem] leading-snug text-muted">{it.props.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
