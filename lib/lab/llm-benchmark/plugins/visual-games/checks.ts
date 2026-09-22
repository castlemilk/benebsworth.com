import type { CheckContext, CheckFn, CheckResult } from '../../scorers/sandbox'

// Each check preserves its denominator even if a selector/interaction fails.
// Otherwise the sandbox's generic exception result has maxPoints=0, which
// could reward an artifact for omitting a required control entirely.
function check(name: string, maxPoints: number, run: (ctx: CheckContext) => Promise<boolean>): CheckFn {
  return async (ctx): Promise<CheckResult> => {
    try {
      const passed = await run(ctx)
      return { name, passed, points: passed ? maxPoints : 0, maxPoints }
    } catch (error) {
      return { name, passed: false, points: 0, maxPoints, detail: String(error) }
    }
  }
}

async function frame(ctx: CheckContext) {
  return ctx.page.locator('canvas#scene').screenshot({ timeout: 900 })
}

async function resetView(ctx: CheckContext) {
  await ctx.page.locator('#reset-view').click({ timeout: 700 })
  await ctx.page.waitForTimeout(180)
}

async function drag(ctx: CheckContext) {
  const box = await ctx.page.locator('canvas#scene').boundingBox()
  if (!box) throw new Error('Missing scene canvas')
  await ctx.page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5)
  await ctx.page.mouse.down()
  await ctx.page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65, { steps: 10 })
  await ctx.page.mouse.up()
  await ctx.page.waitForTimeout(180)
}

export const lighthouseRotation = check('lighthouse-rotation', 35, async (ctx) => {
  const toggle = ctx.page.locator('#toggle-rotation')
  if (await toggle.getAttribute('aria-pressed', { timeout: 700 }) !== 'true') return false
  const before = await frame(ctx)
  await ctx.page.waitForTimeout(350)
  const moving = await frame(ctx)
  await toggle.click({ timeout: 700 })
  await ctx.page.waitForTimeout(180)
  const stopped = await frame(ctx)
  await ctx.page.waitForTimeout(300)
  return !before.equals(moving) && stopped.equals(await frame(ctx)) &&
    await toggle.getAttribute('aria-pressed') === 'false'
})

export const lighthouseOrbit = check('lighthouse-orbit', 35, async (ctx) => {
  await resetView(ctx)
  const before = await frame(ctx)
  await ctx.page.waitForTimeout(150)
  if (!before.equals(await frame(ctx))) return false
  await drag(ctx)
  return !before.equals(await frame(ctx))
})

export const lighthouseReset = check('lighthouse-reset', 30, async (ctx) => {
  await resetView(ctx)
  const before = await frame(ctx)
  await drag(ctx)
  const changed = !before.equals(await frame(ctx))
  await resetView(ctx)
  return changed && before.equals(await frame(ctx))
})

async function car(ctx: CheckContext) {
  return ctx.page.locator('canvas#scene').evaluate((el) => {
    const number = (name: string) => {
      const value = el.getAttribute(name)
      return value === null || value.trim() === '' ? NaN : Number(value)
    }
    return { speed: number('data-speed'), heading: number('data-heading'), distance: number('data-distance') }
  }, undefined, { timeout: 700 })
}

async function restart(ctx: CheckContext) {
  await ctx.page.locator('#restart').click({ timeout: 700 })
  await ctx.page.waitForTimeout(100)
}

async function hold(ctx: CheckContext, keys: string[], duration = 650) {
  try {
    for (const key of keys) await ctx.page.keyboard.down(key)
    await ctx.page.waitForTimeout(duration)
  } finally {
    for (const key of keys) await ctx.page.keyboard.up(key)
  }
}

export const racerAcceleration = check('racer-acceleration', 35, async (ctx) => {
  await restart(ctx)
  const initial = await car(ctx)
  const before = await frame(ctx)
  await hold(ctx, ['ArrowUp'])
  const driven = await car(ctx)
  return initial.speed === 0 && driven.speed > 0 && driven.distance > initial.distance && !before.equals(await frame(ctx))
})

export const racerSteering = check('racer-steering', 25, async (ctx) => {
  await restart(ctx)
  await hold(ctx, ['ArrowUp'], 350)
  const initial = await car(ctx)
  const before = await frame(ctx)
  await hold(ctx, ['ArrowUp', 'ArrowRight'], 450)
  const turned = await car(ctx)
  return turned.distance > initial.distance && Math.abs(turned.heading - initial.heading) > 0.03 && !before.equals(await frame(ctx))
})

export const racerBraking = check('racer-braking', 20, async (ctx) => {
  await restart(ctx)
  await hold(ctx, ['ArrowUp'])
  const moving = await car(ctx)
  await hold(ctx, ['ArrowDown'], 450)
  const braking = await car(ctx)
  return moving.speed > 0 && braking.speed >= 0 && braking.speed < moving.speed * 0.8
})

export const racerRestart = check('racer-restart', 20, async (ctx) => {
  await restart(ctx)
  const initial = await car(ctx)
  await hold(ctx, ['ArrowUp', 'ArrowRight'])
  const moving = await car(ctx)
  await restart(ctx)
  const reset = await car(ctx)
  return moving.distance > 0 && reset.speed === 0 && reset.distance === 0 &&
    Number.isFinite(initial.heading) && Math.abs(reset.heading - initial.heading) < 0.001
})
