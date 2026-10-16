export const HARNESS_EVAL_BASE_PATH = '/lab/harness-eval/'

export function harnessSuitePath(suite: string): string {
  return `${HARNESS_EVAL_BASE_PATH}${encodeURIComponent(suite)}/`
}

export function harnessTaskPath(suite: string, taskId: string): string {
  return `${HARNESS_EVAL_BASE_PATH}${encodeURIComponent(suite)}/${encodeURIComponent(taskId)}/`
}

/**
 * Model IDs are provider/model strings. A slash cannot safely live in the
 * single [model] route segment on a static host, so use a readable separator
 * in the public URL and reverse it in the detail page.
 */
export function harnessModelSlug(modelId: string): string {
  return modelId.replaceAll('/', '--')
}

export function harnessModelIdFromSlug(slug: string): string {
  return decodeURIComponent(slug).replaceAll('--', '/')
}

export function harnessModelPath(modelId: string): string {
  return `${HARNESS_EVAL_BASE_PATH}models/${harnessModelSlug(modelId)}/`
}

export function harnessModelIndexPath(): string {
  return `${HARNESS_EVAL_BASE_PATH}models/`
}

/**
 * Side-by-side comparison URL.
 *
 * The site is a static export, so a comparison has to be a path rather than a
 * query string: `?a=&b=` would need a runtime server to read. Two slugs can
 * never collide with a `vs` segment between them, and the result is a link you
 * can paste into a commit message or a thread and have it mean the same thing.
 */
export function harnessComparePath(leftModelId: string, rightModelId: string): string {
  const left = harnessModelSlug(leftModelId);
  const right = harnessModelSlug(rightModelId);
  // Canonical order so the same pair is one URL, not two.
  const [first, second] = left <= right ? [left, right] : [right, left];
  return `${HARNESS_EVAL_BASE_PATH}compare/${first}/vs/${second}/`
}
