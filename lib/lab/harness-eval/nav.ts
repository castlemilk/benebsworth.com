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
