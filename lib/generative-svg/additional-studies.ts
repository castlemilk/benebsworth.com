import type { InkRole, Mark, Point, Study } from './model'
const line = (points: readonly Point[], role: InkRole = 'ink', emphasis = false, closed = false): Mark => ({ kind: 'line', points, role, emphasis, closed })
const circle = (center: Point, radius: number, role: InkRole = 'ink', emphasis = false): Mark => ({ kind: 'circle', center, radius, role, emphasis })
const text = (at: Point, value: string, role: InkRole = 'ink', emphasis = false): Mark => ({ kind: 'text', at, text: value, role, emphasis })
const points = (fn: (t: number) => Point, from: number, to: number, intervals = 256) => Array.from({ length: intervals + 1 }, (_, i) => fn(from + (to - from) * i / intervals))
const axes = (x = 160, y = 120): Mark[] => [line([[28, y], [292, y]], 'guide'), line([[x, 28], [x, 212]], 'guide')]
const node = (center: Point, label: string, active = false, radius = 16): Mark[] => [circle(center, radius, active ? 'accent' : 'ink', active), text(center, label, active ? 'accent' : 'ink', active)]
function arrow(start: Point, end: Point, active = false, bend = 0): Mark[] {
  const dx = end[0] - start[0], dy = end[1] - start[1], length = Math.hypot(dx, dy)
  const control: Point = [(start[0] + end[0]) / 2 - dy / length * bend, (start[1] + end[1]) / 2 + dx / length * bend]
  const curve = points(t => [(1-t)**2*start[0]+2*(1-t)*t*control[0]+t*t*end[0], (1-t)**2*start[1]+2*(1-t)*t*control[1]+t*t*end[1]], 0, 1, 24)
  const a = Math.atan2(end[1] - control[1], end[0] - control[0]), role = active ? 'accent' : 'ink'
  return [line(curve, role, active), line([[end[0]-10*Math.cos(a-.75),end[1]-10*Math.sin(a-.75)],end,[end[0]-10*Math.cos(a+.75),end[1]-10*Math.sin(a+.75)]],role,active)]
}
function edge(start: Point, end: Point, active = false, radius = 16, bend = 0, endRadius = radius + 8): Mark[] {
  const length = Math.hypot(end[0]-start[0],end[1]-start[1]), dx=(end[0]-start[0])/length,dy=(end[1]-start[1])/length
  return arrow([start[0]+dx*radius,start[1]+dy*radius],[end[0]-dx*endRadius,end[1]-dy*endRadius],active,bend)
}
const box = (center: Point, width: number, height: number): Mark => line([[center[0]-width/2,center[1]-height/2],[center[0]+width/2,center[1]-height/2],[center[0]+width/2,center[1]+height/2],[center[0]-width/2,center[1]+height/2]],'ink',false,true)

/** Schwarzschild equatorial null-ray equation, G=c=M=1. RK4 from a turning point. */
export function nullRay(closest: number, step = 0.005) {
  if(!Number.isFinite(closest) || closest < 5 || closest > 10 || step < .001 || step > .01 || !Number.isFinite(step)) throw new Error('Invalid null-ray parameters')
  let u=1/closest,v=0,phi=0
  const samples=[{u,v,phi}]
  const acceleration=(u:number)=>-u+3*u*u
  for(let i=0;i<2000;i++){
    const a1=v,b1=acceleration(u),a2=v+step*b1/2,b2=acceleration(u+step*a1/2),a3=v+step*b2/2,b3=acceleration(u+step*a2/2),a4=v+step*b3,b4=acceleration(u+step*a3)
    const nextU=u+step*(a1+2*a2+2*a3+a4)/6
    if(nextU<1/14)break
    u=nextU;v+=step*(b1+2*b2+2*b3+b4)/6;phi+=step;samples.push({u,v,phi})
  }
  return samples
}
export function attentionWeights(query: number, temperature: number) {
  const queries=[[1,0],[0,1],[1,1]],keys=[[1,0],[0,1],[-1,0]],q=queries[query]
  const scores=keys.map(k=>(q[0]*k[0]+q[1]*k[1])/Math.sqrt(2)/temperature),max=Math.max(...scores),exps=scores.map(s=>Math.exp(s-max)),sum=exps.reduce((a,b)=>a+b,0)
  return exps.map(e=>e/sum)
}
export const GOSSIP_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,3],[2,5],[4,7]] as const
export function gossipDistances() {
  const distances=Array(8).fill(Infinity) as number[];distances[0]=0
  for(let round=0;round<8;round++)for(const [a,b] of GOSSIP_EDGES){distances[a]=Math.min(distances[a],distances[b]+1);distances[b]=Math.min(distances[b],distances[a]+1)}
  return distances
}
export const DAG_EDGES = [[0,2],[0,3],[1,3],[2,4],[3,4],[3,5]] as const
export function ancestors(target:number){const result=new Set([target]);for(let i=0;i<6;i++)for(const [a,b] of DAG_EDGES)if(result.has(b))result.add(a);return result}
export const ADDITIONAL_STUDIES: readonly Study[] = [
 {
  id:'integral-trajectory', tags: ["calculus", "differential-equations", "curves"], aliases: ["ODE solution", "integral curve"],title:'Integral trajectories',category:'Mathematics',provenance:'math-derived',
  description:'Three solutions to the same differential equation. Tune the highlighted initial value while keeping the derivative unchanged.',
  basis:'dy/dx = cos x; y = sin x + C, x ∈ [0,2π]. Curves use C−0.5, C and C+0.5. 256 intervals, separate display-axis scales; highlighted y(0)=C.',
  parameters:[{key:'initial',label:'Initial value C',min:-1,max:1,step:.5,initial:0}],
  model:p=>({marks:[...axes(32),...[-.5,0,.5].map(offset=>line(points(x=>[32+256*x/(2*Math.PI),120-36*(Math.sin(x)+p.initial+offset)],0,2*Math.PI),offset===0?'accent':'ink',offset===0))]}),
 },
 {
  id:'black-hole-geodesic', tags: ["relativity", "black-holes", "numerical-integration"], aliases: ["Schwarzschild", "null geodesic", "light ray"],title:'Black-hole null rays',category:'Physics',provenance:'simulated',
  description:'Light-ray trajectories outside a Schwarzschild black hole, integrated from their closest approach. The small circle marks the horizon radius.',
  basis:'Equatorial null geodesics: u″+u=3u², u=1/r, G=c=M=1. RK4 Δφ=0.005; turning radii r₀,r₀+1.5,r₀+3, truncated at r≤14. Horizon r=2. Coordinate-plane projection, not an observer image or lensing simulation.',
  parameters:[{key:'closest',label:'Closest radius r₀/M',min:5,max:7,step:1,initial:5}],
  model:p=>{const marks:Mark[]=[circle([160,120],13.2),text([160,147],'r=2M')];for(const [i,offset] of [0,1.5,3].entries()){
   const samples=nullRay(p.closest+offset),half=samples.map(({u,phi})=>[160+6.6*Math.sin(phi)/u,120-6.6*Math.cos(phi)/u] as Point)
   const full=[...half.slice(1).reverse().map(([x,y])=>[320-x,y] as Point),...half];marks.push(line(full,i===0?'accent':'ink',i===0))
  }return {marks}},
 },
 {
  id:'wavepacket-quantum', tags: ["quantum-mechanics", "wavefunctions", "probability-density"], aliases: ["Gaussian wave packet", "wavepacket", "psi"],title:'Quantum wavepacket',category:'Physics',provenance:'math-derived',
  description:'A Gaussian wavefunction and its probability density, separated so the oscillating carrier is not mistaken for probability.',
  basis:'At t=0, ψ=(2πσ²)^(−1/4) exp(−x²/(4σ²)) exp(ikx). Upper: Re ψ. Lower: |ψ|², normalized over the infinite line. Window x∈[−4,4], 256 intervals; finite window is not renormalized. No time evolution.',
  parameters:[{key:'sigma',label:'Width σ',min:.5,max:1.5,step:.25,initial:1},{key:'carrier',label:'Wave number k',min:1,max:4,step:1,initial:3}],
  model:p=>({marks:[line([[28,95],[292,95]],'guide'),line([[28,210],[292,210]],'guide'),line(points(x=>[160+32*x,95-60*(2*Math.PI*p.sigma**2)**(-.25)*Math.exp(-x*x/(4*p.sigma**2))*Math.cos(p.carrier*x)],-4,4)),line(points(x=>[160+32*x,210-45/Math.sqrt(2*Math.PI*p.sigma**2)*Math.exp(-x*x/(2*p.sigma**2))],-4,4),'accent'),text([54,20],'Re ψ'),text([54,155],'|ψ|²')]}),
 },
 {
  id:'magnetic-dipole', tags: ["electromagnetism", "magnetism", "fields"], aliases: ["point dipole", "magnetic field lines"],title:'Magnetic dipole field',category:'Physics',provenance:'math-derived',
  description:'Meridional field lines of an ideal point dipole. The excluded central region avoids the singular source.',
  basis:'Outside r≥0.8, ideal dipole field lines satisfy r=r₀ sin²θ. Shell radii r₀=2…N+1, 128 intervals per half-plane curve, equal axis scales. Arrows indicate decreasing z at the equator. No finite bar-magnet model.',
  parameters:[{key:'shells',label:'Field shells',min:2,max:4,step:1,initial:3}],
  model:p=>{const marks:Mark[]=[circle([160,120],.8*17),line([[160,30],[160,210]],'guide')];for(let r0=2;r0<=p.shells+1;r0++)for(const sign of [-1,1]){const start=Math.asin(Math.sqrt(.8/r0));marks.push(line(points(t=>[160+sign*17*r0*Math.sin(t)**3,120-17*r0*Math.sin(t)**2*Math.cos(t)],start,Math.PI-start,128),r0===2?'accent':'ink'));marks.push(...arrow([160+sign*17*r0,116],[160+sign*17*r0,124],r0===2))}return {marks}},
 },
 {
  id:'consistent-hash-ring', tags: ["hashing", "partitioning", "distributed-systems"], aliases: ["consistent hashing", "clockwise successor"],title:'Consistent hash ring',category:'Algorithms',provenance:'topology',
  description:'A small circular key space with clockwise successor ownership. Move a key to see its assigned token, including wraparound.',
  basis:'Key space {0…11}; tokens {0,2,4,6,8,10}. A key belongs to the first token ≥ key clockwise, wrapping to 0. Fixed token placement; no hash function, replication or rebalancing simulation.',
  parameters:[{key:'key',label:'Key',min:0,max:11,step:1,initial:3}],
  model:p=>{const owner=Math.ceil(p.key/2)%6,at=(angle:number,radius:number):Point=>[160+radius*Math.sin(angle),120-radius*Math.cos(angle)],nodes=Array.from({length:6},(_,i)=>at(i*Math.PI/3,80)),key=at(p.key*Math.PI/6,38);return {marks:[...Array.from({length:6},(_,i)=>line(points(t=>at(t,80),i*Math.PI/3+.24,(i+1)*Math.PI/3-.24,32))),...edge(key,nodes[owner],true,5,0,22),circle(key,5,'accent'),...nodes.flatMap((n,i)=>node(n,String(i*2),i===owner,14)),text([160,120],`key ${p.key}`)]}},
 },
 {
  id:'directed-acyclic-graph', tags: ["graphs", "dependencies", "algorithms"], aliases: ["DAG", "dependency graph", "ancestor closure"],title:'Directed acyclic graph',category:'Algorithms',provenance:'topology',
  description:'A fixed dependency graph with upstream prerequisites highlighted. Every arrow advances one level, so cycles are impossible.',
  basis:'Edges A→C, A→D, B→D, C→E, D→E, D→F. Selection includes the chosen node and all its ancestors. No scheduling or runtime execution is implied.',
  parameters:[{key:'target',label:'Target (0=A … 5=F)',min:0,max:5,step:1,initial:4}],
  model:p=>{const nodes:Point[]=[[56,65],[56,175],[160,65],[160,175],[264,65],[264,175]],visited=ancestors(p.target);return {marks:[...DAG_EDGES.flatMap(([a,b])=>edge(nodes[a],nodes[b],visited.has(a)&&visited.has(b))),...nodes.flatMap((n,i)=>node(n,String.fromCharCode(65+i),visited.has(i)))]}},
 },
 {
  id:'transformer-attention', tags: ["attention", "softmax", "machine-learning"], aliases: ["scaled dot product", "self attention", "Q K attention"],title:'Scaled dot-product attention',category:'Algorithms',provenance:'math-derived',
  description:'Inspect one attention row from three fixed queries and keys. Labels show the normalized weights; the strongest edge receives emphasis.',
  basis:'Q={(1,0),(0,1),(1,1)}, K={(1,0),(0,1),(−1,0)}. Weights softmax(q·K/(√2 T)); labels rounded to three decimals. One selected query, no learned model, values, multi-head aggregation or causal mask.',
  parameters:[{key:'query',label:'Query row',min:0,max:2,step:1,initial:0},{key:'temperature',label:'Temperature T',min:.5,max:2,step:.5,initial:1}],
  model:p=>{const weights=attentionWeights(p.query,p.temperature),source:Point=[52,60+50*p.query],max=Math.max(...weights),marks:Mark[]=[];for(let i=0;i<3;i++){marks.push(...edge(source,[268,60+50*i],weights[i]===max,18),text([65+95*i,205],`K${i}: ${weights[i].toFixed(3)}`),...node([52,60+50*i],`Q${i}`,i===p.query,18),...node([268,60+50*i],`K${i}`,false,18))}return {marks}},
 },
 {
  id:'raft-consensus', tags: ["quorum", "replication", "distributed-systems"], aliases: ["Raft quorum", "majority acknowledgement"],title:'Raft quorum study',category:'Distributed systems',provenance:'topology',
  description:'Count acknowledgements in a fixed five-member cluster. A majority is visible without pretending it alone proves a Raft commit.',
  basis:'Five voters, leader included in the count; majority threshold floor(5/2)+1=3. Arrows represent acknowledgement relationships. Necessary quorum condition only: term, log matching, elections and membership changes are not simulated.',
  parameters:[{key:'acks',label:'Acknowledged voters (incl. leader)',min:1,max:5,step:1,initial:3}],
  model:p=>{const nodes:Point[]=[[160,120],[76,52],[244,52],[76,188],[244,188]];return {marks:[...nodes.slice(1).flatMap((n,i)=>edge(n,nodes[0],i+1<p.acks)),...nodes.flatMap((n,i)=>node(n,i===0?'L':String(i),i<p.acks)),text([160,218],`${p.acks}/5 ${p.acks>=3?'majority':'minority'}`)]}},
 },
 {
  id:'event-stream', tags: ["streaming", "logs", "distributed-systems"], aliases: ["event log", "consumer offset", "event pipeline"],title:'Event stream pipeline',category:'Distributed systems',provenance:'topology',
  description:'An ordered log with a readable consumer position. Advance the count to separate consumed events from the next offset.',
  basis:'Five fixed events at offsets 0…4, source S and consumers A/B. Read count is the number consumed by A; its next offset equals that count. B is an independent illustrative consumer. No delivery, storage or exactly-once guarantee.',
  parameters:[{key:'read',label:'A read count',min:0,max:5,step:1,initial:2}],
  model:p=>({marks:[box([156,120],204,48),...arrow([46,120],[60,120]),...arrow([258,112],[273,80]),...arrow([258,128],[273,160]),...node([30,120],'S',false,12),...node([286,72],'A',true,13),...node([286,168],'B',false,13),...Array.from({length:5},(_,i)=>node([76+40*i,120],String(i),i<p.read,12)).flat(),text([160,190],`A next offset ${p.read}`)]}),
 },
 {
  id:'mesh-gossip', tags: ["gossip", "networks", "distributed-systems"], aliases: ["gossip mesh network", "message propagation"],title:'Gossip mesh',category:'Distributed systems',provenance:'topology',
  description:'A message spreads one hop per round from node 0 across a fixed mesh. Reachability is exact for this simplified reliable network.',
  basis:'Eight nodes, ring edges plus 0–3, 2–5, 4–7. Synchronous rounds, every informed node forwards to every neighbor, no loss or delay. Not a randomized protocol or consensus simulation.',
  parameters:[{key:'round',label:'Gossip round',min:0,max:3,step:1,initial:1}],
  model:p=>{const nodes=Array.from({length:8},(_,i)=>[160+80*Math.sin(i*Math.PI/4),120-80*Math.cos(i*Math.PI/4)] as Point),distances=gossipDistances();return {marks:[...GOSSIP_EDGES.map(([a,b])=>edge(nodes[a],nodes[b],Math.min(distances[a],distances[b])<p.round,12,0,12)[0]),...nodes.flatMap((n,i)=>node(n,String(i),distances[i]<=p.round,12))]}},
 },
 {
  id:'circuit-breaker', tags: ["resilience", "state-machines", "distributed-systems"], aliases: ["circuit breaker pattern", "half open"],title:'Circuit breaker',category:'Distributed systems',provenance:'topology',
  description:'Inspect the three modes and the transitions between them. Active mode is a selection, not a live service-health measurement.',
  basis:'0 Closed → 1 Open on failure threshold; Open → 2 Half-open after cooldown; Half-open → Closed on success or Open on failure. Thresholds, timers and requests are not simulated. C/O/H identify the modes.',
  parameters:[{key:'mode',label:'Mode (0 C / 1 O / 2 H)',min:0,max:2,step:1,initial:0}],
  model:p=>{const nodes:Point[]=[[58,120],[160,52],[262,120]];return {marks:[...edge(nodes[0],nodes[1],false,23),...edge(nodes[1],nodes[2],false,23,30),...edge(nodes[2],nodes[1],false,23,30),...edge(nodes[2],nodes[0],false,23,-65),...nodes.flatMap((n,i)=>node(n,['C','O','H'][i],i===p.mode,23)),text([58,190],'Closed'),text([160,190],'Open'),text([262,190],'Half-open')]}},
 },
 {
  id:'load-balancer', tags: ["load-balancing", "routing", "distributed-systems"], aliases: ["round robin", "backend fanout"],title:'Round-robin load balancer',category:'Distributed systems',provenance:'topology',
  description:'A request index selects one of three healthy backends. The active route is marked with both color and heavier strokes.',
  basis:'Fixed backend order B0,B1,B2; request n maps to B(n mod 3). All backends assumed healthy; no concurrency, failover, weighting or network behavior is simulated.',
  parameters:[{key:'request',label:'Request index',min:0,max:8,step:1,initial:0}],
  model:p=>{const target=p.request%3,lb:Point=[112,120],nodes:Point[]=[[260,48],[260,120],[260,192]];return {marks:[...edge([36,120],lb,true,18),...nodes.flatMap((n,i)=>edge(lb,n,i===target,18)),...node([36,120],'C',false,18),...node(lb,'LB',false,18),...nodes.flatMap((n,i)=>node(n,`B${i}`,i===target,18)),text([160,222],`request ${p.request} → B${target}`)]}},
 },
 {
  id:'antenna-radiation', tags: ["antennas", "radio-frequency", "electromagnetism"], aliases: ["RF antenna", "short dipole power pattern"],title:'Short-dipole radiation',category:'Electronics',provenance:'math-derived',
  description:'The normalized power pattern of an electrically short ideal dipole, shown as a meridional polar cut.',
  basis:'Power P/Pmax=sin²θ, θ measured from the dipole axis. Polar radius encodes power, not field amplitude |sinθ|. 256 intervals; ideal free-space short dipole, not a finite antenna or 3D field simulation.',
  parameters:[{key:'angle',label:'Axis angle (π/4)',min:0,max:3,step:1,initial:0}],
  model:p=>{const a=p.angle*Math.PI/4,at=(theta:number,r:number):Point=>[160+r*Math.sin(theta+a),120-r*Math.cos(theta+a)];return {marks:[line([at(0,92),at(Math.PI,92)],'guide'),line(points(t=>at(t,80*Math.sin(t)**2),0,2*Math.PI)),line([at(0,12),at(Math.PI,12)],'accent',true)]}},
 },
 {
  id:'logic-lattice', tags: ["boolean-logic", "digital-electronics", "gates"], aliases: ["logic gate array", "AND XOR OR"],title:'Boolean gate array',category:'Electronics',provenance:'topology',
  description:'Follow two Boolean inputs through AND and XOR, then OR the results. Values and line weight make the truth state readable without color.',
  basis:'Functional block diagram, not standard gate silhouettes or an electrical circuit. U=A∧B, V=A XOR B, Y=U∨V=A∨B. Dots mark fan-out; the gap at the wire crossing means no connection. Ideal Boolean inputs; no propagation delay or analogue voltage.',
  parameters:[{key:'a',label:'Input A',min:0,max:1,step:1,initial:1},{key:'b',label:'Input B',min:0,max:1,step:1,initial:0}],
  model:p=>{const u=p.a&p.b,v=p.a^p.b,y=u|v,wire=(pts:Point[],on:number)=>line(pts,on?'accent':'ink',Boolean(on));return {marks:[wire([[46,64],[70,64],[70,58],[100,58]],p.a),wire([[70,64],[70,158],[100,158]],p.a),wire([[46,176],[82,176],[82,168]],p.b),wire([[82,148],[82,82],[100,82]],p.b),circle([70,64],2,p.a?'accent':'ink',Boolean(p.a)),circle([82,176],2,p.b?'accent':'ink',Boolean(p.b)),wire([[82,176],[100,176]],p.b),wire([[150,70],[180,70],[180,108],[215,108]],u),wire([[150,170],[193,170],[193,132],[215,132]],v),wire([[265,120],[284,120]],y),box([125,70],50,50),box([125,170],50,50),box([240,120],50,50),...node([34,64],String(p.a),Boolean(p.a),12),...node([34,176],String(p.b),Boolean(p.b),12),...node([296,120],String(y),Boolean(y),12),text([34,38],'A'),text([34,202],'B'),text([296,94],'Y'),text([125,58],'AND'),text([125,80],String(u)),text([125,158],'XOR'),text([125,180],String(v)),text([240,108],'OR'),text([240,130],String(y))]}},
 },
 {
  id:'rlc-resonance', tags: ["circuits", "resonance", "filters"], aliases: ["RLC", "band pass", "resistor voltage response"],title:'RLC band-pass response',category:'Electronics',provenance:'math-derived',
  description:'A series RLC circuit measured across its resistor. Tune Q to change bandwidth while preserving the unit resonant peak.',
  basis:'Magnitude |V_R/V_in|=(r/Q)/sqrt((1−r²)²+(r/Q)²), r=ω/ω₀, ω₀=1/sqrt(LC), Q=ω₀L/R. r∈[0,3], 384 intervals, separate display-axis scales. Ideal linear series RLC; no parasitics.',
  parameters:[{key:'q',label:'Quality factor Q',min:.5,max:4,step:.5,initial:2}],
  model:p=>({marks:[...axes(32,204),line(points(r=>[32+256*r/3,204-152*(r/p.q)/Math.hypot(1-r*r,r/p.q)],0,3,384)),circle([32+256/3,52],4,'accent',true),text([280,220],'ω/ω₀')]}),
 },
 {
  id:'clock-eye-diagram', tags: ["timing", "signal-processing", "synthetic"], aliases: ["NRZ", "eye diagram", "clock jitter study"],title:'Synthetic eye diagram',category:'Electronics',provenance:'math-derived',
  description:'Overlay smooth binary transitions with deterministic timing offsets. The eye closes horizontally as the offset grows.',
  basis:'Eight three-symbol NRZ patterns, levels ±1, edges at ±0.5 UI. S(t)=½(1+tanh(t/0.07)); shared offsets {−j,0,j}; constant duplicates omitted. Window ±1 UI, 128 intervals. Synthetic timing study, not measured jitter, noise, BER or an instrument capture.',
  parameters:[{key:'jitter',label:'Timing offset j (UI)',min:0,max:.15,step:.05,initial:.1}],
  model:p=>{const marks:Mark[]=[...axes(160),text([274,220],'UI')],shifts=p.jitter===0?[0]:[-p.jitter,0,p.jitter],step=(t:number)=>(1+Math.tanh(t/.07))/2;for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1])for(const shift of shifts){if(a===b&&b===c&&shift!==0)continue;marks.push(line(points(t=>[160+128*t,120-65*(a+(b-a)*step(t+.5-shift)+(c-b)*step(t-.5-shift))],-1,1,128),a===-1&&b===1&&c===-1&&shift===0?'accent':'ink'))}return {marks}},
 },
]
