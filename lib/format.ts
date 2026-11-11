/** Format the author's Melbourne publication date consistently during SSR and hydration. */
export function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-AU', { timeZone: 'Australia/Melbourne', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}
