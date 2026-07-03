import fs from 'node:fs'
import path from 'node:path'

const BASE_DIR = path.join(process.cwd(), 'content/lab/llm-benchmark')

function readFile(rel: string): string {
  const filePath = path.join(BASE_DIR, rel)
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

/** Intro copy for `/lab/llm-benchmark/`. */
export function loadBenchmarkIntro(): string {
  return readFile('index.mdx')
}

/** Category explainer for `/lab/llm-benchmark/[category]/`. */
export function loadCategoryMdx(slug: string): string {
  return readFile(`categories/${slug}.mdx`)
}

/** Task explainer for `/lab/llm-benchmark/[category]/[task]/`. */
export function loadTaskMdx(slug: string): string {
  return readFile(`tasks/${slug}.mdx`)
}

/** Post-task reflection/explainer for `/lab/llm-benchmark/[category]/[task]/`. */
export function loadTaskPostMdx(slug: string): string {
  return readFile(`tasks/${slug}.post.mdx`)
}
