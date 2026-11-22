import type { Page, TestInfo } from '@playwright/test'

export type Point = readonly [number, number]
export type Input = 'touch' | 'mouse' | 'pointer'

/**
 * Real input where the browser accepts it: CDP touch in mobile Chromium, the mouse on
 * desktop. Mobile WebKit has no touch injection and the mouse is a single pointer, so
 * those get synthetic pointer events.
 */
export const inputFor = ({ project }: TestInfo, fingers = 1): Input =>
  project.use.isMobile
    ? project.name.includes('chromium')
      ? 'touch'
      : 'pointer'
    : fingers > 1
      ? 'pointer'
      : 'mouse'

/**
 * Projects with `metadata.cpuThrottle` slow Chromium's main thread by that factor, so
 * events arrive sparse and late, as on a slow phone or a loaded CI runner.
 */
export async function throttle(page: Page, { project }: TestInfo) {
  const rate = Number(project.metadata.cpuThrottle ?? 1)
  if (rate > 1) {
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setCPUThrottlingRate', { rate })
  }
}

/**
 * `elapse` passes time between events; a test that paused the page clock passes
 * `ms => page.clock.runFor(ms)`, which then stamps the events itself.
 */
export async function fingers(
  page: Page,
  input: Input,
  elapse?: (ms: number) => Promise<unknown>
) {
  // Chromium takes each event's time from CDP, so a gesture keeps the speed the test gives
  // it however slowly the page handles each event. Elsewhere, events take the time they
  // are dispatched.
  const client =
    input !== 'pointer' &&
    page.context().browser()?.browserType().name() === 'chromium'
      ? await page.context().newCDPSession(page)
      : undefined
  // Seconds since the epoch, CDP's unit. A press starts from the real time, which the
  // engine's tap timers compare with; later events keep the gesture's own pace. Never
  // ahead of the real time, which Chromium's touch handling expects.
  let time = 0
  const pass = (ms: number) => {
    time = elapse ? Date.now() / 1_000 : time + ms / 1_000
    return elapse ? elapse(ms) : page.waitForTimeout(ms)
  }
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: readonly Point[]
  ) =>
    client!.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
      timestamp: time,
    })
  const mouse = (
    type: 'mousePressed' | 'mouseMoved' | 'mouseReleased',
    [x, y]: Point
  ) =>
    client!.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: 'left',
      buttons: type === 'mouseReleased' ? 0 : 1,
      clickCount: 1,
      timestamp: time,
    })
  const dispatch = (type: string, points: readonly Point[]) =>
    page.evaluate(
      ({ type, points }) => {
        const state = window as unknown as { pressed?: Element }
        points.forEach(([clientX, clientY], index) => {
          // Later events go to the pressed element, as with pointer capture, unless it was replaced.
          const target =
            type === 'pointerdown'
              ? (document.elementFromPoint(clientX, clientY) ??
                document.documentElement)
              : state.pressed!.isConnected
                ? state.pressed!
                : (document.querySelector('dialog') ?? document.documentElement)
          if (type === 'pointerdown' && !index) {
            state.pressed = target
          }
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              // Kept apart from the mouse's pointer id, which the page also sees.
              pointerId: index + 11,
              isPrimary: !index,
              pointerType: 'touch',
              clientX,
              clientY,
            })
          )
        })
      },
      { type, points }
    )
  let at: readonly Point[] = []
  const press = {
    async down(...points: Point[]) {
      at = points
      time = Math.max(time, Date.now() / 1_000)
      if (input === 'touch') {
        await touch('touchStart', points)
      } else if (client) {
        await mouse('mousePressed', points[0]!)
      } else if (input === 'mouse') {
        await page.mouse.move(...points[0]!)
        await page.mouse.down()
      } else {
        await dispatch('pointerdown', points)
      }
    },
    /** Moves the fingers `after` ms past the previous event. */
    async move(points: readonly Point[], after = 16) {
      at = points
      await pass(after)
      if (input === 'touch') {
        await touch('touchMove', points)
      } else if (client) {
        await mouse('mouseMoved', points[0]!)
      } else if (input === 'mouse') {
        await page.mouse.move(...points[0]!)
      } else {
        await dispatch('pointermove', points)
      }
    },
    /**
     * Moves every finger by (dx, dy) in `steps` moves `every` ms apart; `spread` pulls two
     * fingers apart.
     */
    async glide(
      dx: number,
      dy: number,
      { steps = 8, spread = 0, every = 16 } = {}
    ) {
      const from = at
      for (let step = 1; step <= steps; step++) {
        const progress = step / steps
        await press.move(
          from.map(([x, y], index): Point => [
            x + dx * progress + (index ? spread : -spread) * progress,
            y + dy * progress,
          ]),
          every
        )
      }
    },
    /** Rests the fingers where they are, so the release that follows carries no speed. */
    async hold(duration: number) {
      await pass(duration)
    },
    async up() {
      if (input === 'touch') {
        await touch('touchEnd', [])
      } else if (client) {
        await mouse('mouseReleased', at[0]!)
      } else if (input === 'mouse') {
        await page.mouse.up()
      } else {
        await dispatch('pointerup', at)
      }
    },
  }
  return press
}
