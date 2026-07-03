/**
 * Config for the /admin image CRM. Admin email is static (gates the editor UI);
 * real write security is GCS bucket IAM. Bucket/base/client-id come from env
 * (provisioned in infra/gcp + docs/hiking-admin-setup.md). The env var names are
 * the original NEXT_PUBLIC_HIKE_* (the site's single image bucket).
 */
export const ADMIN = {
  adminEmail: 'ben.ebsworth@gmail.com',
  bucket: process.env.NEXT_PUBLIC_HIKE_BUCKET ?? '',
  publicBase: (process.env.NEXT_PUBLIC_HIKE_PUBLIC_BASE ?? '').replace(/\/$/, ''),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  /** `openid email` (admin gate via userinfo) + GCS read/write (same token uploads). */
  scope: 'openid email https://www.googleapis.com/auth/devstorage.read_write',
} as const

export const isAdminConfigured = () => Boolean(ADMIN.bucket && ADMIN.publicBase && ADMIN.googleClientId)
