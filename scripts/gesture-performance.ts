/**
 * Gesture frame budget on a throttled phone: swipes, a drag to close and a pinch in the
 * gallery playground, with the CPU slowed six times, as Chrome's "low-end mobile".
 *
 *   bun run dev:gallery
 *   bun scripts/gesture-performance.ts [url]   default http://127.0.0.1:5179/
 *
 * Reports frames over budget while fingers move or images settle, and the layout, style
 * and script work the gestures cost, from CDP `Performance.getMetrics`.
 */
import { chromium, devices } from '@playwright/test'

const url = process.argv[2] || 'http://127.0.0.1:5179/'
const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 13'] })
const page = await context.newPage()
const client = await context.newCDPSession(page)
await page.goto(url)
await page.locator('.gallery img').first().tap()
await page.waitForTimeout(1_000)
await client.send('Performance.enable')
await client.send('Emulation.setCPUThrottlingRate', { rate: 6 })

type Point = readonly [number, number]
const touch = (
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: readonly Point[]
) =>
  client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([x, y], id) => ({ x, y, id })),
  })
/** Fingers travel from `from` by (dx, dy), each a little apart when `spread` is set. */
async function gesture(from: Point[], dx: number, dy: number, spread = 0) {
  await touch('touchStart', from)
  for (let step = 1; step <= 12; step++) {
    const progress = step / 12
    await touch(
      'touchMove',
      from.map(([x, y], index) => [
        x + dx * progress + (index ? spread : -spread) * progress,
        y + dy * progress,
      ])
    )
    await page.waitForTimeout(16)
  }
  await touch('touchEnd', [])
  await page.waitForTimeout(700)
}

const metrics = async () =>
  Object.fromEntries(
    (await client.send('Performance.getMetrics')).metrics.map(
      ({ name, value }) => [name, value]
    )
  )
await page.evaluate(() => {
  const frames: number[] = []
  let last = performance.now()
  const tick = (now: number) => {
    frames.push(now - last)
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  Object.assign(window, { frames })
})
const before = await metrics()
for (let swipe = 0; swipe < 4; swipe++) {
  await gesture([[300, 400]], -240, 0)
}
await gesture([[200, 300]], 0, 120)
await gesture(
  [
    [160, 400],
    [230, 400],
  ],
  0,
  0,
  80
)
await gesture(
  [
    [160, 400],
    [230, 400],
  ],
  0,
  0,
  -60
)
const after = await metrics()
const frames = (await page.evaluate(
  () => (window as unknown as { frames: number[] }).frames
)) as number[]
await browser.close()

const sorted = frames.slice(1).sort((a, b) => a - b)
const percentile = (share: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))]!
const delta = (name: string) => after[name]! - before[name]!
console.table({
  frames: sorted.length,
  'frames over 33 ms': sorted.filter(time => time > 33.4).length,
  'p50 frame (ms)': +percentile(0.5).toFixed(1),
  'p95 frame (ms)': +percentile(0.95).toFixed(1),
  'max frame (ms)': +sorted[sorted.length - 1]!.toFixed(1),
  layouts: delta('LayoutCount'),
  'style recalcs': delta('RecalcStyleCount'),
  'layout (ms)': +(delta('LayoutDuration') * 1_000).toFixed(1),
  'style (ms)': +(delta('RecalcStyleDuration') * 1_000).toFixed(1),
  'script (ms)': +(delta('ScriptDuration') * 1_000).toFixed(1),
  'tasks (ms)': +(delta('TaskDuration') * 1_000).toFixed(1),
})
