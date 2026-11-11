#!/usr/bin/env node
// Source preflight, followed by an explicit export-only draft scrub. No fetching.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const FILE = /\.[a-z0-9]{1,12}$/i
const ASSET_ATTRIBUTES = new Set(['src', 'poster', 'image', 'background', 'href', 'srcSet', 'srcset'])
const parser = createProcessor({ remarkPlugins: [remarkGfm, remarkMath] })

export function isPublished(data) {
  return data.release !== false && !data.draft
}

export function gitTrackedFiles(root) {
  return new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))
}

export function gitChangedFiles(root, base) {
  const commit = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`], { cwd: root, encoding: 'utf8' }).trim()
  const changed = execFileSync('git', ['diff', '--name-only', '-z', commit, '--'], { cwd: root, encoding: 'utf8' })
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
  return new Set(`${changed}${untracked}`.split('\0').filter(Boolean))
}

function issue(code, file, message) {
  return { code, file, message }
}

// Refuse symlinks on each path component, including absent-tail paths. This
// keeps both validation and deletion inside the chosen checkout.
function inspectPath(root, relative) {
  let current = root
  let stat
  for (const part of relative.split('/')) {
    if (!part || part === '.' || part === '..') throw new Error(`unsafe path: ${relative}`)
    current = path.join(current, part)
    try { stat = fs.lstatSync(current) } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
    if (stat.isSymbolicLink()) throw new Error(`symlink is not allowed: ${relative}`)
  }
  return stat
}

/** Return a public-relative blog asset, or null for remote/non-blog URLs/routes. */
export function resolveBlogAsset(url, slug, kind = 'jsx') {
  if (typeof url !== 'string' || !url.trim()) return null
  if (url !== url.trim()) throw new Error(`asset URL has surrounding whitespace: ${JSON.stringify(url)}`)
  if (/^(https?:)?\/\//i.test(url)) return null
  if (kind === 'hero' && !url.startsWith('/blog/')) throw new Error(`local hero image must use /blog/<slug>/<file>, matching cards and OG: ${url}`)
  if (/^data:/i.test(url) || url.startsWith('#')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    if (kind === 'link' && /^(mailto|tel):/i.test(url)) return null
    throw new Error(`unsupported asset URL scheme: ${url}`)
  }
  let pathname
  try { pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]) } catch {
    throw new Error(`invalid URL encoding: ${url}`)
  }
  if (pathname.includes('\\') || [...pathname].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /%[0-9a-f]{2}/i.test(pathname)) {
    throw new Error(`unsafe asset URL: ${url}`)
  }
  if (pathname.split('/').some((part) => part === '..')) throw new Error(`asset path traversal: ${url}`)
  if (pathname.startsWith('//')) throw new Error(`encoded absolute asset URL: ${url}`)
  pathname = pathname.replace(/^\.\//, '')
  if (pathname.split('/').some((part) => part === '.')) throw new Error(`unsafe asset URL: ${url}`)
  // This is deliberately the renderer's legacy rule, not normal URL resolution:
  // remarkImageBasePath maps every direct local Markdown image to its basename.
  if (kind === 'markdown-image') return `blog/${slug}/${path.posix.basename(pathname)}`
  if (kind === 'link' && !FILE.test(pathname)) return null // blog routes/anchors
  if (!pathname.startsWith('/')) pathname = `/blog/${slug}/${pathname}`
  if (!pathname.startsWith('/blog/')) return null
  const parts = pathname.slice(1).split('/')
  if (parts.length < 3 || !SLUG.test(parts[1]) || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`expected /blog/<safe-slug>/<file>: ${url}`)
  }
  return parts.join('/')
}

function literalAttribute(attribute) {
  if (typeof attribute.value === 'string') return attribute.value
  const expression = attribute.value?.data?.estree?.body?.[0]?.expression
  if (expression?.type === 'Literal' && typeof expression.value === 'string') return expression.value
  if (expression?.type === 'TemplateLiteral' && !expression.expressions.length) return expression.quasis[0].value.cooked
  return undefined
}

/** Parse actual Markdown/MDX nodes so code examples never become asset refs. */
export function collectAssetReferences(body) {
  const tree = parser.parse(body)
  const definitions = new Map()
  const refs = []
  const errors = []
  const visit = (node, fn) => {
    fn(node)
    for (const child of node.children ?? []) visit(child, fn)
  }
  visit(tree, (node) => {
    if (node.type === 'definition') definitions.set(node.identifier, node.url)
  })
  visit(tree, (node) => {
    if (node.type === 'image' || node.type === 'link') {
      refs.push({ url: node.url, kind: node.type === 'image' ? 'markdown-image' : 'link' })
    }
    if (node.type === 'imageReference' || node.type === 'linkReference') {
      const url = definitions.get(node.identifier)
      if (url) refs.push({ url, kind: node.type === 'imageReference' ? 'image-reference' : 'link' })
    }
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return
    for (const attribute of node.attributes ?? []) {
      if (attribute.type !== 'mdxJsxAttribute' || !ASSET_ATTRIBUTES.has(attribute.name)) continue
      const value = literalAttribute(attribute)
      if (value === undefined) {
        errors.push(`cannot statically check ${node.name}.${attribute.name}; use a literal asset URL`)
        continue
      }
      if (attribute.name.toLowerCase() === 'srcset') {
        for (const candidate of value.split(',')) refs.push({ url: candidate.trim().split(/\s+/)[0], kind: 'jsx' })
      } else {
        refs.push({ url: value, kind: attribute.name === 'href' ? 'link' : 'jsx' })
      }
    }
  })
  return { refs, errors }
}

/** Purely reads the source checkout. Callers may inject an exact tracked set. */
export function checkBlogAssets({ root = process.cwd(), trackedFiles, base, changedFiles } = {}) {
  root = fs.realpathSync(root)
  const errors = []
  const warnings = []
  const posts = []
  const checkedAssets = new Set()
  const tracked = trackedFiles === undefined ? gitTrackedFiles(root) : new Set(trackedFiles)
  const changed = base === undefined ? null : (changedFiles === undefined ? gitChangedFiles(root, base) : new Set(changedFiles))
  const blogDir = path.join(root, 'content/blog')
  if (!inspectPath(root, 'content/blog')?.isDirectory()) {
    return { root, posts, checkedAssets: [], warnings, errors: [issue('content-directory', 'content/blog', 'blog source directory is missing')] }
  }
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const slug = entry.name
    const file = `content/blog/${slug}/index.mdx`
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    if (!SLUG.test(slug)) {
      errors.push(issue('slug', file, 'post directory must be a lowercase hyphenated slug'))
      continue
    }
    try {
      const info = inspectPath(root, file)
      if (!info) continue
      if (!info.isFile()) throw new Error('index.mdx is not a regular file')
      const { data, content } = matter(fs.readFileSync(path.join(root, file), 'utf8'))
      let valid = true
      for (const flag of ['release', 'draft']) {
        if (Object.hasOwn(data, flag) && typeof data[flag] !== 'boolean') {
          errors.push(issue('flag-type', file, `${flag} must be a YAML boolean, not ${JSON.stringify(data[flag])}`))
          valid = false
        }
      }
      if (typeof data.title !== 'string' || !data.title.trim()) {
        errors.push(issue('title', file, 'title must be a non-empty string'))
        valid = false
      }
      if (!(typeof data.date === 'string' || data.date instanceof Date) || !Number.isFinite(new Date(data.date).getTime())) {
        errors.push(issue('date', file, 'date must be a valid date string'))
        valid = false
      }
      const post = { slug, file, published: valid && isPublished(data), valid, refs: [] }
      posts.push(post)
      for (const key of ['heroImage', 'hero_image']) {
        if (data[key] != null && typeof data[key] !== 'string') errors.push(issue('hero-type', file, `${key} must be a string`))
      }
      const hero = data.heroImage ?? data.hero_image
      if (typeof hero === 'string' && hero) post.refs.push({ url: hero, kind: 'hero' })
      const collected = collectAssetReferences(content)
      post.refs.push(...collected.refs)
      for (const message of collected.errors) errors.push(issue('dynamic-asset', file, message))
      if (valid && !post.published && inspectPath(root, `public/blog/${slug}/index.md`)) {
        errors.push(issue('draft-markdown', file, `stale public/blog/${slug}/index.md exposes draft text; remove that generated sibling`))
      }
    } catch (error) {
      errors.push(issue('source', file, error.message))
    }
  }
  const drafts = new Set(posts.filter((post) => post.valid && !post.published).map((post) => post.slug))
  for (const post of posts) {
    const seen = new Set()
    for (const reference of post.refs) {
      let asset
      try { asset = resolveBlogAsset(reference.url, post.slug, reference.kind) } catch (error) {
        errors.push(issue('asset-url', post.file, error.message))
        continue
      }
      if (!asset || seen.has(asset)) continue
      seen.add(asset)
      checkedAssets.add(asset)
      if (post.published && drafts.has(asset.split('/')[1])) errors.push(issue('draft-dependency', post.file, `published post references draft asset /${asset}`))
      const files = [`content/${asset}`, `public/${asset}`]
      // Migration compatibility is opt-in and history-based: old public WebPs
      // sometimes lack their content copy. Never grandfather a changed post,
      // a changed asset, a missing public file, an untracked file or mismatches.
      const unchanged = changed && ![post.file, ...files].some((file) => changed.has(file))
      const buffers = []
      for (const file of files) {
        try {
          const info = inspectPath(root, file)
          if (!info && file.startsWith('content/') && unchanged) {
            warnings.push(issue('legacy-mirror', post.file, `${file} is missing; unchanged from ${base}, but public existence and tracking are still required`))
            continue
          }
          if (!info?.isFile()) {
            errors.push(issue('asset-missing', post.file, `${file} is missing or not a regular file (from ${reference.url})`))
            continue
          }
          if (!tracked.has(file)) errors.push(issue('asset-untracked', post.file, `${file} is not tracked by Git`))
          buffers.push(fs.readFileSync(path.join(root, file)))
        } catch (error) { errors.push(issue('asset-path', post.file, error.message)) }
      }
      if (buffers.length === 2 && !buffers[0].equals(buffers[1])) errors.push(issue('asset-mismatch', post.file, `source and public bytes differ for /${asset}`))
    }
  }
  return { root, posts, checkedAssets: [...checkedAssets].sort(), errors, warnings }
}

/** Remove only export copies of known drafts. Fail closed before any deletion. */
export function sanitizeDraftExport({ root = process.cwd(), posts } = {}) {
  root = fs.realpathSync(root)
  const errors = []
  const targets = []
  if (!Array.isArray(posts)) throw new Error('sanitizeDraftExport requires validated source posts')
  const out = inspectPath(root, 'out')
  if (!out?.isDirectory()) return { removed: [], errors: [issue('export-directory', 'out', 'build output is missing; run the build first')] }
  const blog = inspectPath(root, 'out/blog')
  if (!blog) return { removed: [], errors }
  if (!blog.isDirectory()) return { removed: [], errors: [issue('export-directory', 'out/blog', 'expected a directory')] }
  for (const post of posts) {
    if (!post.valid || !SLUG.test(post.slug)) {
      errors.push(issue('draft-state', 'out/blog', 'refusing to sanitise with invalid source metadata'))
      continue
    }
    if (post.published) continue
    const target = `out/blog/${post.slug}`
    try {
      // A draft route should never be emitted. Do not hide a routing regression
      // by deleting its HTML; static public assets and stale Markdown are safe
      // to scrub once the route absence has been established.
      if (inspectPath(root, `out/blog/${post.slug}.html`)) throw new Error('unexpected draft HTML route')
      const info = inspectPath(root, target)
      if (!info) continue
      if (!info.isDirectory()) throw new Error('draft export path is not a directory')
      const scan = (relative) => {
        for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
          const child = `${relative}/${entry.name}`
          const stat = inspectPath(root, child)
          if (entry.name.toLowerCase().endsWith('.html')) throw new Error(`unexpected draft HTML: ${child}`)
          if (stat.isDirectory()) scan(child)
        }
      }
      scan(target)
      targets.push(target)
    } catch (error) { errors.push(issue('draft-export', target, error.message)) }
  }
  if (errors.length) return { removed: [], errors }
  for (const target of targets) fs.rmSync(path.join(root, target), { recursive: true })
  return { removed: targets, errors }
}

export function main(args = process.argv.slice(2), root = process.cwd()) {
  try {
    let base
    let sanitize = false
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--sanitize-export' && !sanitize) sanitize = true
      else if (args[i] === '--base' && base === undefined && args[i + 1] && !args[i + 1].startsWith('--')) base = args[++i]
      else throw new Error('Usage: node scripts/check-blog-assets.mjs [--base <gitref>] [--sanitize-export]')
    }
    const result = checkBlogAssets({ root, base })
    for (const error of result.errors) process.stderr.write(`${error.file}: [${error.code}] ${error.message}\n`)
    for (const warning of result.warnings) process.stderr.write(`${warning.file}: [warning:${warning.code}] ${warning.message}\n`)
    process.stdout.write(`Blog preflight: ${result.posts.length} posts, ${result.checkedAssets.length} local assets, ${result.errors.length} errors, ${result.warnings.length} warnings.\n`)
    if (result.errors.length) return 1
    if (sanitize) {
      const scrub = sanitizeDraftExport(result)
      for (const error of scrub.errors) process.stderr.write(`${error.file}: [${error.code}] ${error.message}\n`)
      if (scrub.errors.length) return 1
      process.stdout.write(`Draft export directories removed: ${scrub.removed.length}${scrub.removed.length ? ` (${scrub.removed.join(', ')})` : ''}.\n`)
    }
    return 0
  } catch (error) {
    process.stderr.write(`Blog preflight could not run: ${error.message}\n`)
    return 2
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main()
