import type { Metadata } from 'next'
import { getCrmItems } from '@/lib/admin/items'
import { AdminProvider } from '@/components/admin/admin-context'
import { AdminShell } from '@/components/admin/admin-shell'

// Standalone, unlisted admin tool — noindex, no site chrome. Auth is client-side
// (Google sign-in); write security is GCS bucket IAM.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  const items = getCrmItems()
  return (
    <AdminProvider>
      <AdminShell items={items} />
    </AdminProvider>
  )
}
