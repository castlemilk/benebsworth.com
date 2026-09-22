import { afterAll, describe, expect, it } from 'vitest'
import { closeSandbox, runChecks } from '../../scorers/sandbox'
import { lighthouseRotation, lighthouseOrbit, lighthouseReset, racerAcceleration, racerSteering, racerBraking, racerRestart } from './checks'

// Hand-written interaction fixtures, deliberately simple; these verify check
// discrimination, not the artistic/3D requirements of the benchmark prompt.
const lighthouse = `<!doctype html><canvas id="scene" width="300" height="200"></canvas>
<button id="toggle-rotation" aria-pressed="true">Pause</button><button id="reset-view">Reset</button>
<script>
let angle=0,run=true,down=false;const c=document.querySelector('canvas'),x=c.getContext('2d'),t=document.querySelector('#toggle-rotation');
t.onclick=()=>{run=!run;t.setAttribute('aria-pressed',String(run))};
document.querySelector('#reset-view').onclick=()=>{angle=0;run=false;t.setAttribute('aria-pressed','false')};
c.onpointerdown=()=>down=true;c.onpointermove=()=>{if(down)angle+=.2};window.onpointerup=()=>down=false;
function frame(){if(run)angle+=.02;x.fillStyle='#123';x.fillRect(0,0,300,200);x.fillStyle='#fd6';x.fillRect(130+80*Math.sin(angle),50,30,90);requestAnimationFrame(frame)}frame();
</script>`
const racer = `<!doctype html><canvas id="scene" width="300" height="200"></canvas><button id="restart">Restart</button>
<script>
let speed=0,heading=0,distance=0;const keys={},c=document.querySelector('canvas'),x=c.getContext('2d');
onkeydown=e=>{keys[e.code]=true;e.preventDefault()};onkeyup=e=>keys[e.code]=false;
document.querySelector('button').onclick=()=>{speed=0;heading=0;distance=0};
function frame(){if(keys.ArrowUp)speed+=.2;if(keys.ArrowDown)speed*=.8;if(keys.ArrowRight&&speed>0)heading+=.04;
distance+=speed*.016;c.dataset.speed=speed;c.dataset.heading=heading;c.dataset.distance=distance;
x.fillStyle='#123';x.fillRect(0,0,300,200);x.fillStyle='#fd6';x.fillRect(20+distance%200,70+20*Math.sin(heading),25,15);requestAnimationFrame(frame)}frame();
</script>`
const lighthouseChecks = [lighthouseRotation, lighthouseOrbit, lighthouseReset]
const racerChecks = [racerAcceleration, racerSteering, racerBraking, racerRestart]
afterAll(closeSandbox)

// Browser integration is explicit, like the existing gateway fixture gate.
// Ordinary unit tests must still work on machines without Chromium installed.
describe.runIf(process.env.BENCH_BROWSER_TESTS === '1')('visual game check discrimination', () => {
  it('awards full behavior points to working controls', async () => {
    for (const [html, checks] of [[lighthouse, lighthouseChecks], [racer, racerChecks]] as const) {
      const results = await runChecks(html, [...checks])
      expect(results.every((r) => r.passed), JSON.stringify(results)).toBe(true)
      expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(100)
    }
  }, 40000)

  it('fails static artifacts with fake telemetry and keeps the full denominator', async () => {
    const staticPage = '<canvas id="scene" data-speed="20" data-heading="1" data-distance="99"></canvas><button id="restart">Restart</button><button id="reset-view">Reset</button><button id="toggle-rotation" aria-pressed="true">Pause</button>'
    for (const checks of [lighthouseChecks, racerChecks]) {
      const results = await runChecks(staticPage, checks)
      expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(0)
      expect(results.reduce((sum, r) => sum + r.maxPoints, 0)).toBe(100)
    }
  }, 40000)

  it('scores missing controls as failures with their original point budgets', async () => {
    const results = await runChecks('<p>No game here</p>', [...lighthouseChecks, ...racerChecks])
    expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(0)
    expect(results.reduce((sum, r) => sum + r.maxPoints, 0)).toBe(200)
  }, 15000)
})
