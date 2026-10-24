import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const REPOSITORY = 'castlemilk/benebsworth.com'
export function assertDispatch({repository, ref, sha, approvedSha, target}) {
  if (repository !== REPOSITORY) throw new Error('Wrong repository')
  if (ref !== 'refs/heads/master') throw new Error('Publish workflow must run from master')
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || sha !== approvedSha) throw new Error('Approval must match the exact workflow commit')
  if (!['staging', 'prod'].includes(target)) throw new Error('Unknown deployment target')
}
export function outputDigest(directory) {
  const hash = crypto.createHash('sha256')
  let files = 0
  function walk(relative = '') {
    for (const entry of fs.readdirSync(path.join(directory, relative), {withFileTypes: true}).sort((a,b)=>a.name.localeCompare(b.name, 'en'))) {
      const name = path.posix.join(relative, entry.name)
      if (entry.isSymbolicLink()) throw new Error('Output may not contain symlinks')
      if (entry.isDirectory()) walk(name)
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(path.join(directory,name))
        hash.update(JSON.stringify([name, bytes.length])); hash.update(bytes); files++
      } else throw new Error('Unsupported output file')
    }
  }
  walk()
  if (!files || !fs.existsSync(path.join(directory,'index.html'))) throw new Error('Missing static site output')
  return {sha256:hash.digest('hex'), files}
}
export function missingRoutes(xml, directory) {
  const locations = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].trim())
  if (!locations.length) throw new Error('Live sitemap contains no routes')
  return locations.flatMap(location => {
    const url=new URL(location)
    if (!['benebsworth.com','www.benebsworth.com'].includes(url.hostname) || url.protocol!=='https:') throw new Error('Unexpected sitemap origin')
    const decoded=decodeURIComponent(url.pathname)
    if (decoded.includes('\\') || decoded.split('/').includes('..')) throw new Error('Unsafe route')
    const relative=decoded.replace(/^\/+|\/+$/g,'')
    const file=path.join(directory,relative,'index.html')
    return fs.existsSync(file) ? [] : [url.pathname]
  })
}
export async function preserveLiveRoutes(directory) {
  const response=await fetch('https://benebsworth.com/sitemap.xml',{signal:AbortSignal.timeout(20000),redirect:'error'})
  if (!response.ok) throw new Error(`Cannot verify live route preservation: HTTP ${response.status}`)
  const xml=await response.text()
  if (xml.length>5_000_000) throw new Error('Unexpectedly large sitemap')
  const missing=missingRoutes(xml,directory)
  if (missing.length) throw new Error(`Refusing deployment: existing live routes missing: ${missing.join(', ')}`)
}
async function main() {
  const [mode,directory='out',receipt='site-release.json']=process.argv.slice(2)
  if (mode==='dispatch') {
    assertDispatch({repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,sha:process.env.GITHUB_SHA,approvedSha:process.env.APPROVED_SHA,target:process.env.DEPLOY_TARGET})
  } else if (mode==='record') {
    const commit=process.env.GITHUB_SHA
    if (!/^[a-f0-9]{40}$/.test(commit??'')) throw new Error('Missing source commit')
    fs.writeFileSync(receipt,JSON.stringify({repository:REPOSITORY,commit,...outputDigest(directory)},null,2)+'\n')
  } else if (mode==='verify') {
    const expected=JSON.parse(fs.readFileSync(receipt,'utf8')); const actual=outputDigest(directory)
    if(expected.repository!==REPOSITORY || expected.commit!==process.env.GITHUB_SHA || expected.sha256!==actual.sha256 || expected.files!==actual.files) throw new Error('Build receipt mismatch')
    await preserveLiveRoutes(directory)
  } else throw new Error('Usage: site-release.mjs dispatch|record|verify [output] [receipt]')
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(error=>{console.error(error.message);process.exitCode=1})
