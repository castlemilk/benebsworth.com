import * as React from "react"
import { bindRepeat } from "@ui-sdk/core"
import { Pagination, PaginationNext, PaginationPrevious } from "@ui-sdk/react/pagination"
import { Icon } from "@/components/ui/icon"
import { haptic } from "@/lib/haptics"

// The step parts mark an end with aria-disabled and keep it focusable; these
// keys also take the native disabled at the ends, as they always have, so
// an end key can't be focused and the skin's :disabled look applies. (The
// parts' types allow for links, which have no disabled.)
const nativeDisabled = (disabled: boolean) => ({ disabled }) as object
// The same goes for their refs, typed for links: these keys are buttons.
const keyRef = (ref: React.RefObject<HTMLButtonElement | null>) => ref as unknown as React.Ref<HTMLAnchorElement>

// Holding a key keeps paging. A pointer press steps through core's
// bindRepeat: once on the press (a touch tap, on release), then every 80ms
// after 380ms held; the click that follows is swallowed so the part doesn't
// step again. A click with no pointer behind it (Enter, Space, a screen
// reader) is left to the part, which steps once. A press that ends without a
// click is forgotten at the next press.
function useHoldToStep(key: React.RefObject<HTMLElement | null>, step: React.RefObject<() => void>) {
  React.useEffect(() => {
    const el = key.current!
    let held = false
    const reset = () => (held = false)
    const swallow = (event: MouseEvent) => {
      if (!held) return
      held = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    el.addEventListener("pointerdown", reset, true)
    el.addEventListener("click", swallow, true)
    const unbind = bindRepeat(el, {
      delay: 380,
      repeat: 80,
      keys: [],
      onStep: ({ count, input }) => {
        if (input === "click") return
        held = true
        // Each repeat is felt; the press itself is felt from the press.
        if (count > 1) haptic("selection")
        step.current()
      },
    })
    return () => {
      unbind()
      el.removeEventListener("pointerdown", reset, true)
      el.removeEventListener("click", swallow, true)
    }
  }, [key, step])
}

const spacing = 46
const step = 16
const radius = spacing / ((step * Math.PI) / 180)
const pitch = 4
// Teeth around the visible half of the drum, at a fixed pitch along its rim.
const teeth = Array.from({ length: Math.ceil((Math.PI * radius) / pitch) + 2 }, (_, i) => i)

// Pagination as a thumbwheel: page numbers on a drum turned on its side,
// fine cog teeth along its edges, the current page between two index marks,
// and previous and next keys either side. Drag it, flick it, scroll it,
// click a number, or use the arrow keys; past either end it gives a little
// and springs back. It reads as a slider of pages.
//
// Input only moves a target; one animation loop eases the drum toward it
// and paints it directly, so motion stays smooth whatever the input does.
//
// The page itself is UI SDK's pagination: its root holds the page (the
// wheel controls it), and its previous and next parts are the keys, whose
// presses come back through its clamped page change. The drum is the
// custom part: a slider of pages with its own drag, spring and keys.
function PageWheel({
  pageCount,
  page: controlled,
  defaultPage = 1,
  onPageChange,
  label = "Page",
}: {
  pageCount: number
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  label?: string
}) {
  const [stored, setStored] = React.useState(defaultPage)
  const page = controlled ?? stored
  const [center, setCenter] = React.useState(page)
  const wheel = React.useRef<HTMLDivElement>(null)
  // `center` is the page last at the center, for the tick as each one passes.
  const motion = React.useRef({ pos: page, target: page, frame: 0, last: 0, center: page })
  const drag = React.useRef<{
    x: number
    target: number
    samples: [number, number][]
    moved: boolean
  } | null>(null)
  const settle = React.useRef(0)
  const latest = React.useRef({ page, commit: (_: number) => {} })

  const clamp = (p: number) => Math.min(pageCount, Math.max(1, p))
  // Beyond the ends the drum still moves, but only a fraction as far.
  const give = (p: number) =>
    p < 1 ? 1 - (1 - p) * 0.3 : p > pageCount ? pageCount + (p - pageCount) * 0.3 : p

  const commit = (next: number) => {
    setStored(next)
    if (next !== latest.current.page) onPageChange?.(next)
  }
  latest.current = { page, commit }

  // The teeth never change, so they're found once rather than queried every
  // frame. The numbers are re-rendered as the drum turns, so they're found
  // fresh each time.
  const teethEls = React.useRef<HTMLElement[] | null>(null)
  const paint = () => {
    const el = wheel.current
    if (!el) return
    teethEls.current ??= [...el.querySelectorAll<HTMLElement>("[data-tooth]")]
    const { pos } = motion.current
    // The teeth sit around the drum's curve, so they crowd and narrow toward
    // its ends as the surface turns away.
    const phase = (((pos * spacing) % pitch) + pitch) % pitch
    const half = teeth.length / 2
    for (const tooth of teethEls.current) {
      const angle = ((Number(tooth.dataset.tooth) - half) * pitch - phase) / radius
      const visible = Math.abs(angle) < Math.PI / 2
      tooth.style.transform = visible
        ? `translateX(${(radius * Math.sin(angle)).toFixed(2)}px) scaleX(${Math.cos(angle).toFixed(3)})`
        : "scaleX(0)"
      tooth.style.opacity = visible ? (0.25 + 0.75 * Math.cos(angle)).toFixed(2) : "0"
    }
    for (const span of el.querySelectorAll<HTMLElement>("[data-n]")) {
      const d = Number(span.dataset.n) - pos
      const angle = Math.max(-90, Math.min(90, d * step))
      const rad = (angle * Math.PI) / 180
      span.style.transform = `translateX(${(radius * Math.sin(rad)).toFixed(2)}px) perspective(600px) rotateY(${angle.toFixed(2)}deg)`
      span.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 0.2))
    }
  }

  // Eases the drum toward its target at the same rate whatever the frame
  // rate, then stops the loop once it has arrived.
  const run = () => {
    const m = motion.current
    if (m.frame) return
    m.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(64, now - m.last))
      m.last = now
      // Held, the drum stays under the finger; let go, it eases to its page.
      if (drag.current) m.pos = m.target
      else m.pos += (m.target - m.pos) * (1 - Math.exp(-0.014 * dt))
      if (Math.abs(m.target - m.pos) < 0.001) m.pos = m.target
      paint()
      const rounded = Math.round(m.pos)
      // A tick as each page passes the center, as the drum turns.
      if (rounded !== m.center) {
        haptic("selection")
        m.center = rounded
      }
      setCenter((c) => (c === rounded ? c : rounded))
      if (m.pos === m.target && !drag.current) {
        m.frame = 0
        return
      }
      m.frame = requestAnimationFrame(tick)
    }
    m.frame = requestAnimationFrame(tick)
  }

  const aim = (target: number) => {
    motion.current.target = target
    run()
  }

  const goTo = (next: number) => {
    const p = clamp(next)
    aim(p)
    commit(p)
  }

  // The keys repeat from where the drum is headed, which is current between
  // renders.
  const previousKey = React.useRef<HTMLButtonElement>(null)
  const nextKey = React.useRef<HTMLButtonElement>(null)
  const stepBack = React.useRef(() => {})
  const stepOn = React.useRef(() => {})
  stepBack.current = () => goTo(Math.round(motion.current.target) - 1)
  stepOn.current = () => goTo(Math.round(motion.current.target) + 1)
  useHoldToStep(previousKey, stepBack)
  useHoldToStep(nextKey, stepOn)

  React.useLayoutEffect(paint)

  React.useEffect(() => {
    if (!drag.current && motion.current.target !== page) aim(page)
    // Only an outside change of page moves it.
  }, [page])

  // Scrolling moves the target as it goes and settles on a page once it
  // stops. React's wheel listener is passive, so it's added here to keep the
  // page from scrolling with it.
  React.useEffect(() => {
    const el = wheel.current!
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return
      event.preventDefault()
      const m = motion.current
      m.target = give(m.target + delta / spacing / 1.5)
      run()
      clearTimeout(settle.current)
      settle.current = window.setTimeout(() => {
        const p = clamp(Math.round(motion.current.target))
        motion.current.target = p
        run()
        latest.current.commit(p)
      }, 120)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", onWheel)
      clearTimeout(settle.current)
      cancelAnimationFrame(motion.current.frame)
    }
  }, [])

  const first = Math.max(1, center - 6)
  const last = Math.min(pageCount, center + 6)
  const numbers = Array.from({ length: last - first + 1 }, (_, i) => first + i)

  return (
    <Pagination data-kit="page-wheel-row" aria-label={label} page={page} pageCount={pageCount} onPageChange={(next: number) => goTo(next)}>
      <PaginationPrevious ref={keyRef(previousKey)} data-kit="button" data-tone="secondary" data-shape="round" aria-label="Previous page" {...nativeDisabled(page <= 1)}>
        <Icon name="prev" />
      </PaginationPrevious>
      <div
        ref={wheel}
        data-kit="page-wheel"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={pageCount}
        aria-valuenow={page}
        aria-valuetext={`Page ${page} of ${pageCount}`}
        onKeyDown={(event) => {
          const to = {
            ArrowRight: page + 1,
            ArrowUp: page + 1,
            ArrowLeft: page - 1,
            ArrowDown: page - 1,
            Home: 1,
            End: pageCount,
            PageUp: page + 3,
            PageDown: page - 3,
          }[event.key]
          if (to === undefined) return
          event.preventDefault()
          goTo(to)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, target: motion.current.target, samples: [], moved: false }
        }}
        onPointerMove={(event) => {
          const d = drag.current
          if (!d) return
          const dx = event.clientX - d.x
          if (!d.moved && Math.abs(dx) < 3) return
          if (!d.moved) event.currentTarget.dataset.dragging = ""
          d.moved = true
          const target = give(d.target - dx / spacing)
          d.samples = [...d.samples.slice(-4), [performance.now(), target]]
          aim(target)
        }}
        onPointerUp={(event) => {
          const d = drag.current
          drag.current = null
          delete event.currentTarget.dataset.dragging
          if (!d) return
          if (!d.moved) {
            const box = event.currentTarget.getBoundingClientRect()
            goTo(Math.round(motion.current.target + (event.clientX - box.left - box.width / 2) / spacing))
            return
          }
          // A flick carries on in the direction it was going, by how fast.
          const [a, b] = [d.samples[0], d.samples.at(-1)]
          const velocity = a && b && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0
          goTo(Math.round(motion.current.target + velocity * 220))
        }}
        onPointerCancel={(event) => {
          drag.current = null
          delete event.currentTarget.dataset.dragging
          goTo(Math.round(motion.current.target))
        }}
      >
        {["top", "bottom"].map((edge) => (
          <div key={edge} data-kit="page-wheel-teeth" data-edge={edge} aria-hidden>
            {teeth.map((i) => (
              <i key={i} data-tooth={i} />
            ))}
          </div>
        ))}
        <div data-kit="page-wheel-drum" aria-hidden>
          {numbers.map((n) => (
            <span key={n} data-n={n} data-kit="page-wheel-number" data-current={n === center || undefined}>
              {n}
            </span>
          ))}
        </div>
      </div>
      <PaginationNext ref={keyRef(nextKey)} data-kit="button" data-tone="secondary" data-shape="round" aria-label="Next page" {...nativeDisabled(page >= pageCount)}>
        <Icon name="next" />
      </PaginationNext>
    </Pagination>
  )
}

export { PageWheel }
