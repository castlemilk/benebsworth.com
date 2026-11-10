import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { STUDIES, geometryFor, type Mark } from './model'
import { ancestors, attentionWeights, DAG_EDGES, GOSSIP_EDGES, gossipDistances, nullRay } from './additional-studies'
const study=(id:string)=>STUDIES.find(s=>s.id===id)!
const line=(m:Mark)=>{if(m.kind!=='line')throw new Error('Expected curve');return m.points}
const texts=(marks:Mark[])=>marks.filter((m):m is Extract<Mark,{kind:'text'}>=>m.kind==='text')

describe('complete original catalogue',()=>{
 it('matches all 25 original manifest IDs exactly, with five studies per category',()=>{
  const directory=path.join(process.cwd(),'public/vectors')
  const ids=fs.readdirSync(directory).filter(name=>fs.existsSync(path.join(directory,name,'manifest.json'))).flatMap(name=>JSON.parse(fs.readFileSync(path.join(directory,name,'manifest.json'),'utf8')).items.map((item:{id:string})=>item.id))
  expect(STUDIES.map(s=>s.id).sort()).toEqual(ids.sort())
  expect(new Set(ids).size).toBe(25)
  for(const category of ['Mathematics','Physics','Algorithms','Distributed systems','Electronics'])expect(STUDIES.filter(s=>s.category===category)).toHaveLength(5)
 })
 it('preserves the integral family derivative and stated initial condition',()=>{
  const g=geometryFor(study('integral-trajectory'),{initial:1}),central=line(g.marks[3])
  expect(central[0][1]).toBe(84)
  expect(central[64][1]).toBe(48)
  expect(central[256][1]).toBeCloseTo(84)
  const upper=line(g.marks[2]),lower=line(g.marks[4])
  central.forEach((p,i)=>{expect(upper[i][1]-p[1]).toBeCloseTo(18);expect(p[1]-lower[i][1]).toBeCloseTo(18)})
 })
 it('integrates exterior Schwarzschild rays with a conserved first integral and refinement agreement',()=>{
  for(const closest of [5,6.5,7,10]){
   const coarse=nullRay(closest),fine=nullRay(closest,.0025),energy=1/closest**2-2/closest**3
   expect(coarse.length).toBeGreaterThan(100)
   coarse.forEach(({u,v,phi},i)=>{expect(1/u).toBeGreaterThanOrEqual(closest-1e-10);expect(1/u).toBeLessThanOrEqual(14);expect(v*v+u*u-2*u**3).toBeCloseTo(energy,10);expect(u).toBeCloseTo(fine[i*2].u,10);expect(phi).toBeCloseTo(i*.005,10)})
  }
  expect(()=>nullRay(NaN)).toThrow();expect(()=>nullRay(3)).toThrow();expect(()=>nullRay(5,.00001)).toThrow()
  expect(study('black-hole-geodesic').provenance).toBe('simulated')
 })
 it('separates the normalized wavefunction carrier from probability density',()=>{
  const s=study('wavepacket-quantum'),a=geometryFor(s,{sigma:.5,carrier:1}),b=geometryFor(s,{sigma:.5,carrier:4})
  expect(line(a.marks[3])).toEqual(line(b.marks[3]))
  expect(line(a.marks[2])).not.toEqual(line(b.marks[2]))
  expect(line(a.marks[3])[128][1]).toBeCloseTo(210-45/Math.sqrt(2*Math.PI*.25))
  expect(texts(a.marks).map(t=>t.text)).toEqual(['Re ψ','|ψ|²'])
 })
 it('keeps dipole curves outside the exclusion radius and on r=r₀ sin²θ',()=>{
  const g=geometryFor(study('magnetic-dipole'),{shells:4})
  const curves=g.marks.filter(m=>m.kind==='line'&&m.points.length===129)
  expect(curves).toHaveLength(8)
  curves.forEach((m,i)=>line(m).forEach(([px,py])=>{
   const x=(px-160)/17,z=(120-py)/17,r=Math.hypot(x,z),r0=2+Math.floor(i/2)
   expect(r).toBeGreaterThanOrEqual(.8-1e-12)
   expect(r).toBeCloseTo(r0*x*x/(r*r),10)
  }))
 })
 it('assigns inclusive clockwise hash ownership with wraparound',()=>{
  for(let key=0;key<12;key++)expect(texts(geometryFor(study('consistent-hash-ring'),{key}).marks).filter(t=>t.emphasis).map(t=>t.text)).toEqual([String((Math.ceil(key/2)%6)*2)])
 })
 it('clears hash labels and gives even-key arrows a usable shaft',()=>{
  for(let key=0;key<12;key+=2){
   const marks=geometryFor(study('consistent-hash-ring'),{key}).marks
   const arcs=marks.slice(0,6).map(line),tokenCenters=marks.filter((m):m is Extract<Mark,{kind:'circle'}>=>m.kind==='circle'&&m.radius===14).map(m=>m.center)
   arcs.flat().forEach(p=>tokenCenters.forEach(c=>expect(Math.hypot(p[0]-c[0],p[1]-c[1])).toBeGreaterThan(18)))
   const shaft=line(marks[6]);expect(Math.hypot(shaft.at(-1)![0]-shaft[0][0],shaft.at(-1)![1]-shaft[0][1])).toBeCloseTo(15)
  }
 })
 it('keeps DAG edges forward and ancestor closure exact',()=>{
  expect([...ancestors(4)].sort()).toEqual([0,1,2,3,4])
  expect([...ancestors(0)]).toEqual([0])
  DAG_EDGES.forEach(([a,b])=>expect(Math.floor(a/2)).toBeLessThan(Math.floor(b/2)))
 })
 it('normalizes attention rows with stable scaled dot-product softmax',()=>{
  for(let q=0;q<3;q++)for(const temperature of [.5,1,1.5,2]){
   const weights=attentionWeights(q,temperature)
   expect(weights.reduce((a,b)=>a+b,0)).toBeCloseTo(1,14)
   weights.forEach(w=>expect(w).toBeGreaterThan(0))
   const labels=texts(geometryFor(study('transformer-attention'),{query:q,temperature}).marks).filter(t=>/^K[0-2]: /.test(t.text)).map(t=>t.text.split(': ')[1])
   expect(labels).toEqual(weights.map(w=>w.toFixed(3)))
  }
  expect(attentionWeights(0,.5)[0]).toBeGreaterThan(attentionWeights(0,2)[0])
 })
 it('requires three of five acknowledgements without claiming a complete Raft commit',()=>{
  for(let acks=1;acks<=5;acks++){
   const t=texts(geometryFor(study('raft-consensus'),{acks}).marks)
   expect(t.filter(n=>n.emphasis)).toHaveLength(acks)
   expect(t.at(-1)?.text).toBe(`${acks}/5 ${acks>=3?'majority':'minority'}`)
  }
  expect(study('raft-consensus').basis).toContain('Necessary quorum condition only')
 })
 it('retains event order and points to the next unread offset',()=>{
  for(let read=0;read<=5;read++){
   const t=texts(geometryFor(study('event-stream'),{read}).marks),events=t.filter(n=>/^\d$/.test(n.text))
   expect(events.map(n=>n.text)).toEqual(['0','1','2','3','4'])
   expect(events.filter(n=>n.emphasis)).toHaveLength(read)
   expect(t.at(-1)?.text).toBe(`A next offset ${read}`)
  }
 })
 it('computes gossip reachability by synchronous shortest-hop distance',()=>{
  const distances=gossipDistances(),visited=new Set([0]);expect(distances).toHaveLength(8)
  for(let round=0;round<=3;round++){
   expect(texts(geometryFor(study('mesh-gossip'),{round}).marks).filter(t=>t.emphasis).map(t=>Number(t.text)).sort()).toEqual([...visited].sort())
   const next=new Set(visited);for(const [a,b]of GOSSIP_EDGES){if(visited.has(a))next.add(b);if(visited.has(b))next.add(a)};next.forEach(n=>visited.add(n))
  }
 })
 it('preserves four circuit-breaker transitions across mode selection',()=>{
  for(let mode=0;mode<3;mode++){
   const marks=geometryFor(study('circuit-breaker'),{mode}).marks
   expect(marks.filter(m=>m.kind==='line'&&m.points.length===25)).toHaveLength(4)
   expect(texts(marks).filter(t=>t.emphasis).map(t=>t.text)).toEqual([['C','O','H'][mode]])
  }
 })
 it('assigns round-robin requests to the correct backend',()=>{
  for(let request=0;request<=8;request++)expect(texts(geometryFor(study('load-balancer'),{request}).marks).filter(t=>t.emphasis).map(t=>t.text)).toEqual([`B${request%3}`])
 })
 it('uses sin² power rather than field amplitude and rotates the dipole axis consistently',()=>{
  const a=geometryFor(study('antenna-radiation'),{angle:0}),b=geometryFor(study('antenna-radiation'),{angle:2}),curve=line(a.marks[1]),rotated=line(b.marks[1])
  expect(curve[0]).toEqual([160,120]);expect(curve[64][0]).toBeCloseTo(240)
  expect(Math.hypot(curve[32][0]-160,curve[32][1]-120)).toBeCloseTo(40)
  curve.forEach(([x,y],i)=>{expect(rotated[i][0]-160).toBeCloseTo(120-y);expect(120-rotated[i][1]).toBeCloseTo(-(x-160))})
 })
 it('computes the complete Boolean truth table',()=>{
  for(const a of [0,1])for(const b of [0,1]){
   const marks=geometryFor(study('logic-lattice'),{a,b}).marks
   const output=texts(marks).find(t=>t.at[0]===296&&t.at[1]===120)
   expect(output?.text).toBe(String(a|b))
   expect(texts(marks).find(t=>t.at[0]===125&&t.at[1]===80)?.text).toBe(String(a&b))
   expect(texts(marks).find(t=>t.at[0]===125&&t.at[1]===180)?.text).toBe(String(a^b))
  }
 })
 it('preserves the RLC zero-frequency rejection and unit resonant peak for every Q',()=>{
  for(let q=.5;q<=4;q+=.5){const curve=line(geometryFor(study('rlc-resonance'),{q}).marks[2]);expect(curve[0][1]).toBe(204);expect(curve[128][1]).toBe(52);expect(Math.min(...curve.map(p=>p[1]))).toBeCloseTo(52)}
 })
 it('keeps synthetic eye traces within levels and makes timing offset an explicit deterministic parameter',()=>{
  for(const jitter of [0,.05,.1,.15]){
   const curves=geometryFor(study('clock-eye-diagram'),{jitter}).marks.filter(m=>m.kind==='line'&&m.points.length===129)
   expect(curves).toHaveLength(jitter===0?8:20)
   curves.forEach(m=>line(m).forEach(([,y])=>{expect(y).toBeGreaterThanOrEqual(55-1e-10);expect(y).toBeLessThanOrEqual(185+1e-10)}))
  }
  expect(study('clock-eye-diagram').basis).toContain('not measured jitter')
 })
})
