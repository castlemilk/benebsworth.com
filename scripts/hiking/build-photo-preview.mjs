import {build} from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import {mkdir,copyFile,readFile,writeFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const [output,fixtures]=process.argv.slice(2)
if(!output||!fixtures||!path.isAbsolute(output)||!path.isAbsolute(fixtures)||output===root||output.startsWith(root+path.sep)) throw new Error('Provide absolute external preview and published-fixture directories')
execFileSync('python',['scripts/hiking/check-overland-source.py'],{cwd:root,stdio:'inherit'})
const out=path.join(output,'out')
await mkdir(path.join(out,'published/manifest/hike'),{recursive:true})
await mkdir(path.join(out,'fonts'),{recursive:true})
await mkdir(path.join(out,'hiking/routes'),{recursive:true})
await copyFile(path.join(root,'public/hiking/routes/overland-standard-osm.json'),path.join(out,'hiking/routes/overland-standard-osm.json'))
const provenance=JSON.parse(await readFile(path.join(fixtures,'provenance.json'),'utf8'))
const inputs=[]
for(const slug of ['dolomites-alta-via-1','overland-track','haute-route']) {
 const data=await readFile(path.join(fixtures,slug+'.json'))
 const sha256=createHash('sha256').update(data).digest('hex')
 const source=provenance.sources.find(source=>source.slug===slug)
 if(source?.sha256!==sha256 || source.source_url!==`https://storage.googleapis.com/benebsworth-hiking/manifest/hike/${slug}.json`) throw new Error('Published fixture provenance mismatch')
 inputs.push({slug,sha256})
 await writeFile(path.join(out,'published/manifest/hike',slug+'.json'),data)
}
await copyFile(path.join(root,'public/fonts/editorial/source-serif-4.woff'),path.join(out,'fonts/source-serif-4.woff'))
await copyFile(path.join(root,'prototypes/photo-discovery/index.html'),path.join(out,'index.html'))
const css=await postcss([tailwind({base:root})]).process(await readFile(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')})
await writeFile(path.join(out,'site.css'),css.css)
await build({absWorkingDir:root,entryPoints:['prototypes/photo-discovery/main.tsx'],bundle:true,format:'esm',target:'es2022',outfile:path.join(out,'main.js'),alias:{'@':root},loader:{'.woff':'file','.woff2':'file'},external:['/fonts/*'],define:{'process.env':'{}','process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_HIKE_PUBLIC_BASE':'"/published"'}})
await mkdir(path.join(output,'.openai'),{recursive:true})
await writeFile(path.join(output,'.openai/hosting.json'),'{"static":{"directory":"out"}}\n')
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
const files=[]
async function record(directory) {
 for(const entry of await readdir(directory,{withFileTypes:true})) {
  const file=path.join(directory,entry.name)
  if(entry.isDirectory()) await record(file)
  else files.push({path:path.relative(out,file),sha256:createHash('sha256').update(await readFile(file)).digest('hex')})
 }
}
await record(out)
await writeFile(path.join(output,'build-receipt.json'),JSON.stringify({sourceCommit:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),sourceDirty:git('status','--porcelain','--','.',':!node_modules'),files,inputs,provenance,scope:'Local component harness only, not a Next production build or deployment'},null,2))
process.stdout.write(`Local component preview built at ${out}. No publication.\n`)
