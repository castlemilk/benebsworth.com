import { afterAll, describe, expect, it } from 'vitest'
import { closeSandbox, runChecks } from './sandbox'

afterAll(closeSandbox)

describe.runIf(process.env.BENCH_BROWSER_TESTS === '1')('rendered canvas capture', () => {
  it('observes WebGL animation without requiring preserveDrawingBuffer', async () => {
    const html = `<canvas width="240" height="160"></canvas><script>
const gl=document.querySelector('canvas').getContext('webgl');
if(!gl)throw new Error('WebGL unavailable');
function draw(t){gl.clearColor((Math.sin(t/300)+1)/2,.2,.7,1);gl.clear(gl.COLOR_BUFFER_BIT);requestAnimationFrame(draw)}
requestAnimationFrame(draw);
</script>`
    const results = await runChecks(html, [async (ctx) => {
      const before = await ctx.captureCanvas()
      await ctx.page.waitForTimeout(350)
      const after = await ctx.captureCanvas()
      return { name: 'webgl-motion', passed: Boolean(before && after && !before.data.equals(after.data)), points: 0, maxPoints: 1 }
    }])
    expect(results.every((r) => r.passed), JSON.stringify(results)).toBe(true)
  }, 15000)
})
