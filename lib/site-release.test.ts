import { describe,it,expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assertDispatch, outputDigest, missingRoutes } from '../scripts/site-release.mjs'
const valid={repository:'castlemilk/benebsworth.com',ref:'refs/heads/master',sha:'a'.repeat(40),approvedSha:'a'.repeat(40),target:'prod'}
describe('remote publishing guards',()=>{
 it('accepts exact source approval',()=>expect(()=>assertDispatch(valid)).not.toThrow())
 for(const [key,value] of Object.entries({repository:'other/site',ref:'refs/heads/feature',approvedSha:'b'.repeat(40),target:'other',sha:'main'}))
  it(`rejects invalid ${key}`,()=>expect(()=>assertDispatch({...valid,[key]:value})).toThrow())
 it('detects changed bytes and file names',()=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'site-release-'))
  try {fs.writeFileSync(path.join(d,'index.html'),'one');const a=outputDigest(d);fs.writeFileSync(path.join(d,'index.html'),'two');expect(outputDigest(d).sha256).not.toBe(a.sha256);fs.writeFileSync(path.join(d,'extra.txt'),'two');expect(outputDigest(d).files).toBe(2)}finally{fs.rmSync(d,{recursive:true,force:true})}
 })
 it('blocks missing published routes',()=>{
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'site-routes-'))
  try{fs.writeFileSync(path.join(d,'index.html'),'home');expect(missingRoutes('<urlset><url><loc>https://benebsworth.com/</loc></url><url><loc>https://benebsworth.com/blog/kept/</loc></url></urlset>',d)).toEqual(['/blog/kept/'])}finally{fs.rmSync(d,{recursive:true,force:true})}
 })
 it('fails closed for empty or foreign sitemap',()=>{expect(()=>missingRoutes('', '.')).toThrow();expect(()=>missingRoutes('<loc>https://other.example/</loc>','.')).toThrow()})
 it('rejects output without index',()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'site-empty-'));try{expect(()=>outputDigest(d)).toThrow()}finally{fs.rmSync(d,{recursive:true,force:true})}})
})
