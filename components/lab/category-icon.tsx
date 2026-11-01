const CATEGORY_ICONS: Readonly<Record<string, string>> = {
  engineering: '/topics/custom-v6/ee.svg',
  physics: '/topics/custom-v6/physics.svg',
  cosmology: '/topics/custom-v6/cosmology.svg',
  ai: '/topics/custom-v6/ai.svg',
}

/** Decorative category identity; the caller supplies its visible label. */
export function CategoryIcon({ category, fallback, size = 24 }: {
  category: string
  fallback: string
  size?: number
}) {
  const icon = CATEGORY_ICONS[category]
  return icon ? <span aria-hidden="true" style={{
    display: 'inline-block', width: size, height: size, flexShrink: 0,
    verticalAlign: 'middle', backgroundColor: 'currentColor',
    mask: `url("${icon}") center / contain no-repeat`,
    WebkitMask: `url("${icon}") center / contain no-repeat`,
  }} /> : <span aria-hidden="true">{fallback}</span>
}
