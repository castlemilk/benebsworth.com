// Standalone config for the hike photo annotator. The bucket + public base are
// the site's single image bucket (public-read, not secret). Write auth is the
// gcloud account that owns the bucket; the Gemini executor is the Antigravity CLI.

export const BUCKET = process.env.HIKE_BUCKET || 'benebsworth-hiking'
export const PUBLIC_BASE = (process.env.HIKE_PUBLIC_BASE || `https://storage.googleapis.com/${BUCKET}`).replace(/\/$/, '')

// gcloud account with bucket IAM write — pinned, never the ambient active account.
export const GCLOUD_ACCOUNT = process.env.HIKE_GCLOUD_ACCOUNT || 'ben.ebsworth@gmail.com'

// Antigravity CLI (`agy`) — the Gemini vision executor.
export const AGY_BIN = process.env.AGY_BIN || 'agy'
export const AGY_MODEL = process.env.AGY_MODEL || '' // '' = agy default (Gemini 3.x Pro)

export const manifestObject = (slug) => `manifest/hike/${slug}.json`
export const manifestPublicUrl = (slug) => `${PUBLIC_BASE}/${manifestObject(slug)}`
export const gsUri = (object) => `gs://${BUCKET}/${object}`
