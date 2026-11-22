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

export async function fingers(page: Page, input: Input) {
  const client =
    input === 'touch' ? await page.context().newCDPSession(page) : undefined
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: readonly Point[]
  ) =>
    client!.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
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
      if (input === 'touch') {
        await touch('touchStart', points)
      } else if (input === 'mouse') {
        await page.mouse.move(...points[0]!)
        await page.mouse.down()
      } else {
        await dispatch('pointerdown', points)
      }
    },
    async move(...points: Point[]) {
      at = points
      if (input === 'touch') {
        await touch('touchMove', points)
      } else if (input === 'mouse') {
        await page.mouse.move(...points[0]!)
      } else {
        await dispatch('pointermove', points)
      }
    },
    /** Moves every finger by (dx, dy) over `steps` frames; `spread` pulls two fingers apart. */
    async glide(dx: number, dy: number, steps = 8, spread = 0) {
      const from = at
      for (let step = 1; step <= steps; step++) {
        const progress = step / steps
        await press.move(
          ...from.map(([x, y], index): Point => [
            x + dx * progress + (index ? spread : -spread) * progress,
            y + dy * progress,
          ])
        )
        await page.waitForTimeout(16)
      }
    },
    async up() {
      if (input === 'touch') {
        await touch('touchEnd', [])
      } else if (input === 'mouse') {
        await page.mouse.up()
      } else {
        await dispatch('pointerup', at)
      }
    },
  }
  return press
}
