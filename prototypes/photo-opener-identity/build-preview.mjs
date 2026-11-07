import {createRequire} from 'node:module'
import {mkdir,copyFile,readFile,writeFile,cp} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..')
if(!process.argv[2])throw new Error('Pass a separate preview output directory')
const stage=path.resolve(process.argv[2]),req=createRequire(path.join(root,'package.json'))
const {build}=req('esbuild'),postcss=req('postcss'),tailwind=req('@tailwindcss/postcss')
await mkdir(stage+'/out/fonts',{recursive:true});await mkdir(stage+'/.openai',{recursive:true})
await cp(root+'/public/fonts',stage+'/out/fonts',{recursive:true})
await copyFile(root+'/public/fonts/editorial/source-serif-4.woff',stage+'/out/fonts/source-serif-4.woff')
await copyFile(root+'/public/hiking/photos/overland-ronny-creek-1200.webp',stage+'/out/fixture-photo.webp')
const css=await postcss([tailwind({base:root})]).process(await readFile(root+'/app/globals.css','utf8'),{from:root+'/app/globals.css'})
await writeFile(stage+'/out/site.css',css.css+'\n'+await readFile(root+'/prototypes/photo-discovery/preview.css','utf8'))
await build({absWorkingDir:root,entryPoints:[path.join(here,'fixture.tsx')],bundle:true,format:'esm',target:'es2022',outfile:stage+'/out/main.js',alias:{'@':root},nodePaths:[root+'/node_modules'],define:{'process.env':'{}','process.env.NODE_ENV':'"production"'}})
await writeFile(stage+'/out/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo return-focus review</title><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>')
await writeFile(stage+'/.openai/hosting.json','{"static":{"directory":"out"}}\n')
console.log('Built synthetic interaction fixture only: '+stage)
