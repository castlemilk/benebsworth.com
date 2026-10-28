import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Deliberately fixed: this helper must never relink to another project or team.
export const PROJECT_ID = 'prj_sxj2GQBYr1GDrSADoiKBve3nAlmO'
export const ORG_ID = 'team_xE5DMN3hIo8aPqyHNkBybg8r'

export function validateProject(project) {
  if (project.projectId !== PROJECT_ID || project.orgId !== ORG_ID) {
    throw new Error('Refusing upload: linked Vercel project/team is not benebsworth.com')
  }
}

export function validateOutput(root = '.') {
  const output = join(root, '.vercel/output')
  const config = JSON.parse(readFileSync(join(output, 'config.json'), 'utf8'))
  if (config.version !== 3) throw new Error('Expected Build Output API version 3')
  const build = JSON.parse(readFileSync(join(output, 'builds.json'), 'utf8'))
  if (build.target !== 'preview' || build.error || build.builds?.some((entry) => entry.error)) {
    throw new Error('Expected a successful local preview build, never production output')
  }

  // These catch both an absent export and accidentally skipped postbuild hooks.
  // Check the actual upload payload, not only the intermediate out/ directory.
  for (const file of ['index.html', 'blog/index.html', 'sitemap.xml', 'robots.txt', 'opengraph-image.png', 'pagefind/pagefind.js']) {
    const path = join(output, 'static', file)
    const stat = statSync(path)
    if (!stat.isFile() || stat.size === 0) throw new Error(`Missing/empty prebuilt asset: ${file}`)
  }
}

export function validateUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.origin !== value ||
      !url.hostname.endsWith('.vercel.app') || url.username || url.password || url.port) {
    throw new Error('Expected one HTTPS vercel.app deployment origin')
  }
  return value
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    switch (process.argv[2]) {
      case 'project':
        validateProject(JSON.parse(readFileSync('.vercel/project.json', 'utf8')))
        break
      case 'output':
        validateOutput()
        break
      case 'url':
        validateUrl(process.env.DEPLOYMENT_URL)
        break
      default:
        throw new Error('Usage: node scripts/ci/vercel-preview.mjs project|output|url')
    }
  } catch (error) {
    // Do not print the input object, environment, or CLI response on failure.
    console.error(error.message)
    process.exitCode = 1
  }
}
