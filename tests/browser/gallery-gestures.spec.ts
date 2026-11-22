import { expect, type Page, test, type TestInfo } from '@playwright/test'

import { fingers, inputFor, type Point, throttle } from './fingers'
import { addModernStyles, preparePage } from './helpers'

test.beforeEach(({ page }, info) => throttle(page, info))

const threeImages =
  '<img src="/images/image-1.jpg" width="160" alt="Mountain"><img src="/images/image-2.jpg" width="160" alt="Forest"><img src="/images/image-1.jpg" width="160" alt="Ocean">'

async function open(page: Page, name = 'Mountain') {
  await preparePage(page, { body: threeImages })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    const { slide } = await window.loadEntry('transitions')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    window.modalZoom = createZoom('img', {
      margin: 24,
      renderer: dialog({ content: galleryControls(), transition: slide() }),
    })
    bindZoomTriggers(window.modalZoom)
  })
  await page.getByRole('button', { name }).click()
  await expect(page.getByRole('dialog', { name })).toBeVisible()
  await settled(page)
}
const settled = (page: Page) =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('dialog img')].every(
      frame => !frame.getAnimations().length
    )
  )

const frame = (page: Page) =>
  page.locator('dialog img.medium-zoom-image--opened').last()
const centre = async (page: Page): Promise<Point> => {
  const box = (await frame(page).boundingBox())!
  return [box.x + box.width / 2, box.y + box.height / 2]
}
const offsetX = (page: Page) =>
  frame(page).evaluate(element => parseFloat(element.style.translate) || 0)
/**
 * Resolves once a page timer of `ms` fires, so after any shorter timer the engine set
 * before it, however slowly the page runs: a check that nothing happens waits on this.
 */
const pageTimers = (page: Page, ms: number) =>
  page.evaluate(ms => new Promise(resolve => setTimeout(resolve, ms)), ms)
const closing = (page: Page) =>
  page.evaluate(() => !document.body.classList.contains('medium-zoom--opened'))

test('a swipe carries the image under the finger with its neighbour beside it', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-60, 0)
  // Past the slop that tells a drag from a tap, the image follows one to one.
  await expect.poll(() => offsetX(page)).toBeLessThan(-40)
  const dragged = await offsetX(page)
  await finger.glide(-40, 0)
  await expect.poll(() => offsetX(page)).toBeCloseTo(dragged - 40, 0)
  const neighbour = page.locator('dialog img:not([class])')
  await expect(neighbour).toHaveCount(1)
  await expect(neighbour).toHaveAttribute('aria-hidden', 'true')
  const shown = (await frame(page).boundingBox())!
  const box = (await neighbour.boundingBox())!
  expect(box.x).toBeGreaterThan(shown.x + shown.width)
  // Held still so the release is no flick; short of halfway, it springs back.
  await finger.hold(150)
  await finger.up()
  await expect.poll(() => offsetX(page)).toBe(0)
  await expect(neighbour).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('1 / 3')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
})

test('a short flick is enough to move on, and no click dismisses the zoom', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-90, 0, { steps: 3 })
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('2 / 3')
  // The incoming image settles in place: no scene transition adds frames.
  await expect.poll(() => offsetX(page)).toBe(0)
  await expect(page.locator('dialog img')).toHaveCount(
    await page.locator('dialog img.medium-zoom-image--opened').count()
  )
  // Past the double-tap pause, which a click ending the swipe would have closed after.
  await pageTimers(page, 400)
  expect(await closing(page)).toBe(false)
  await finger.down([x, y])
  await finger.glide(90, 0, { steps: 3 })
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
})

/**
 * Pauses the page's clock, which drives the gesture springs and stamps events, and returns
 * fingers that move on it: a test then presses at an exact point of a swipe's flight, at an
 * exact speed, however fast the machine runs.
 */
const onPausedClock = async (page: Page, info: TestInfo) => {
  await pauseClock(page)
  return fingers(page, inputFor(info), async ms => {
    await page.evaluate(
      () =>
        new Promise(resolve =>
          (
            window as unknown as { realFrame: typeof requestAnimationFrame }
          ).realFrame(resolve)
        )
    )
    await page.clock.runFor(ms)
  })
}
const pauseClock = async (page: Page) => {
  // Chromium delivers moves with the next real frame: wait for it before time passes, or
  // the moves are stamped late. The clock replaces requestAnimationFrame.
  await page.evaluate(() =>
    Object.assign(window, { realFrame: requestAnimationFrame.bind(window) })
  )
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 1_000)
}
/** Runs the paused clock until the open image holds still for a few frames. */
const rest = async (page: Page) => {
  const placement = () =>
    frame(page).evaluate(({ style }) => `${style.translate} ${style.scale}`)
  for (let still = 0, last = ''; still < 3;) {
    await page.clock.runFor(16)
    const now = await placement()
    still = now === last ? still + 1 : 0
    last = now
  }
}
/** The open image's swipe offset, as a fraction of the window. */
const travelled = async (page: Page) =>
  -(await offsetX(page)) / page.viewportSize()!.width

test('a swipe that catches the last one past halfway moves on again', async ({
  page,
}, info) => {
  await open(page)
  const finger = await onPausedClock(page, info)
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-120, 0, { steps: 3 })
  await finger.up()
  while ((await travelled(page)) < 0.55) {
    await page.clock.runFor(16)
  }
  // Still in flight: the press lands it on Forest, and this swipe carries on from there.
  expect(await travelled(page)).toBeLessThan(0.9)
  await finger.down([x, y])
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await finger.glide(-120, 0, { steps: 3 })
  await finger.up()
  await page.clock.resume()
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('3 / 3')
  await expect.poll(() => offsetX(page)).toBe(0)
  await expect(page.locator('dialog img:not([class])')).toHaveCount(0)
})

test('a swipe that catches the last one early holds the strip, both images in place', async ({
  page,
}, info) => {
  await open(page)
  const finger = await onPausedClock(page, info)
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-120, 0, { steps: 3 })
  await finger.up()
  await page.clock.runFor(16)
  await finger.down([x, y])
  expect(await travelled(page)).toBeLessThan(0.5)
  // A press holds both images; releasing carries on to the neighbour it was heading for.
  expect(
    await page
      .locator('dialog img:not([class]), dialog img.medium-zoom-image--opened')
      .count()
  ).toBe(2)
  await finger.up()
  await page.clock.resume()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect.poll(() => offsetX(page)).toBe(0)
})

test('a flick reads its speed however far apart its moves arrive, and a rest still stops it', async ({
  page,
}, info) => {
  await open(page)
  const finger = await onPausedClock(page, info)
  const [x, y] = await centre(page)
  // Moves further apart than the 100ms speed is measured over, as from a busy page.
  await finger.down([x, y])
  await finger.glide(-150, 0, { steps: 3, every: 150 })
  await finger.hold(150)
  await finger.up()
  await rest(page)
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  expect(await offsetX(page)).toBe(0)
  // Too short to pass halfway: only its speed moves it on.
  await finger.down([x, y])
  await finger.glide(-150, 0, { steps: 3, every: 150 })
  await finger.up()
  await page.clock.resume()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
})

test('the first and last images resist being swiped past', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(150, 0)
  await expect.poll(() => offsetX(page)).toBeGreaterThan(20)
  expect(await offsetX(page)).toBeLessThan(100)
  await finger.up()
  await expect.poll(() => offsetX(page)).toBe(0)
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
})

test('dragging the image away fades the backdrop and closes past a threshold', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  const dialog = page.locator('dialog')
  const overlay = page.locator('.medium-zoom-overlay')
  await finger.down([x, y])
  await finger.glide(0, 50)
  await expect(dialog).toHaveAttribute('data-medium-zoom-gesture', 'close')
  expect(
    Number(await overlay.evaluate(({ style }) => style.opacity))
  ).toBeLessThan(1)
  // Held still so the release is no flick, which would close.
  await finger.hold(150)
  await finger.up()
  await expect(dialog).not.toHaveAttribute('data-medium-zoom-gesture')
  await expect
    .poll(() => overlay.evaluate(({ style }) => style.opacity))
    .toBe('')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await finger.down([x, y])
  await finger.glide(0, -200, { steps: 12 })
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCSS(
    'opacity',
    '0'
  )
  await finger.hold(150)
  await finger.up()
  await expect(dialog).toHaveCount(0)
})

test('a flick down closes however short it is', async ({ page }, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(0, 60, { steps: 2 })
  await finger.up()
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('a double tap zooms in where it lands, further each time, back to fit from the maximum, and a single tap still closes', async ({
  page,
  isMobile,
}) => {
  await open(page)
  await pauseClock(page)
  const dialog = page.locator('dialog')
  const [x, y] = await centre(page)
  const tap = () =>
    isMobile
      ? page.touchscreen.tap(x - 40, y - 20)
      : page.mouse.click(x - 40, y - 20)
  // The scale once the spring rests; '' when fitted, which Number() reads as 0.
  const doubleTap = async () => {
    await tap()
    await tap()
    await rest(page)
    return frame(page).evaluate(({ style }) => style.scale)
  }
  const scales = [Number(await doubleTap())]
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  expect(scales[0]).toBeGreaterThanOrEqual(2)
  // Past the double-tap pause, the second tap has not also closed it.
  await page.clock.runFor(400)
  expect(await closing(page)).toBe(false)
  for (let step = 0; step < 6 && scales.at(-1) !== 0; step++) {
    scales.push(Number(await doubleTap()))
  }
  // The step before fit is the maximum, at least four times the fit.
  const fitted = scales.indexOf(0)
  expect(fitted).toBeGreaterThan(0)
  for (let step = 1; step < fitted; step++) {
    expect(scales[step]).toBeGreaterThan(scales[step - 1]!)
  }
  expect(scales[fitted - 1]).toBeGreaterThanOrEqual(3.99)
  await expect(dialog).not.toHaveAttribute('data-medium-zoom-zoomed')
  await tap()
  await page.clock.resume()
  await expect(dialog).toHaveCount(0)
})

for (const gap of [40, 100, 160]) {
  test(`a double tap ${gap}ms apart zooms in, even as the first tap starts closing`, async ({
    page,
    isMobile,
  }) => {
    await open(page)
    await pauseClock(page)
    const [x, y] = await centre(page)
    const tap = () =>
      isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)
    await tap()
    // The first tap's hint is still moving when the second lands.
    await page.clock.runFor(gap)
    await tap()
    await rest(page)
    await expect(page.locator('dialog')).toHaveAttribute(
      'data-medium-zoom-zoomed',
      'true'
    )
    await page.clock.runFor(800)
    expect(await closing(page)).toBe(false)
  })
}

test('a pinch zooms around the fingers, one finger then pans, and a pinch in closes', async ({
  page,
}, info) => {
  await open(page)
  const hand = await fingers(page, inputFor(info, 2))
  const [x, y] = await centre(page)
  const dialog = page.locator('dialog')
  await hand.down([x - 20, y], [x + 20, y])
  await hand.glide(0, 0, { spread: 40 })
  await expect(dialog).toHaveAttribute('data-medium-zoom-gesture', 'pinch')
  await hand.up()
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  const scale = await frame(page).evaluate(({ style }) => Number(style.scale))
  expect(scale).toBeGreaterThan(2)
  // Panning a zoomed image never navigates.
  const finger = await fingers(page, inputFor(info))
  await finger.down([x, y])
  await finger.glide(-150, 0)
  await finger.up()
  await expect(page.getByRole('status')).toContainText('1 / 3')
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  await hand.down([x - 120, y], [x + 120, y])
  await hand.glide(0, 0, { spread: -105 })
  await hand.up()
  await expect(dialog).toHaveCount(0)
})

test('Ctrl+wheel, as a trackpad pinch, zooms and the wheel then pans', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Wheels need a desktop')
  await open(page)
  const [x, y] = await centre(page)
  const dialog = page.locator('dialog')
  await page.mouse.move(x, y)
  // Browsers report a trackpad pinch as a wheel with Ctrl held.
  await page.keyboard.down('Control')
  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, -20)
  }
  await page.keyboard.up('Control')
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  const before = await offsetX(page)
  await page.mouse.wheel(30, 0)
  await expect.poll(() => offsetX(page)).toBeLessThan(before)
  await expect(dialog).toBeVisible()
})

test('keys zoom, pan a zoomed image instead of stepping, and reach either end', async ({
  page,
}) => {
  await open(page)
  const dialog = page.locator('dialog')
  const status = page.getByRole('status')
  await page.keyboard.press('+')
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  expect(await frame(page).evaluate(({ style }) => style.scale)).toBe('1.5')
  const before = await offsetX(page)
  await page.keyboard.down('ArrowRight')
  // Panning is not stepping, so Next shows no press.
  await expect(
    page.getByRole('button', { name: 'Next image' })
  ).not.toHaveAttribute('data-medium-zoom-pressed')
  await page.keyboard.up('ArrowRight')
  expect(await offsetX(page)).toBeLessThan(before)
  await expect(status).toContainText('1 / 3')
  await page.keyboard.press('-')
  await expect(dialog).not.toHaveAttribute('data-medium-zoom-zoomed')
  await page.keyboard.press('+')
  await page.keyboard.press('0')
  await expect(dialog).not.toHaveAttribute('data-medium-zoom-zoomed')
  await page.keyboard.press('ArrowRight')
  await expect(status).toContainText('2 / 3')
  await page.keyboard.press('End')
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await page.keyboard.press('Home')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
})

test('closing a zoomed image takes it back from where it is', async ({
  page,
}) => {
  await open(page)
  await page.keyboard.press('+')
  await page.keyboard.press('+')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('with reduced motion, gestures settle at once', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-100, 0)
  await finger.hold(150)
  await finger.up()
  // Settled in the same frame: no spring to wait for.
  expect(await offsetX(page)).toBe(0)
  await finger.down([x, y])
  await finger.glide(-90, 0, { steps: 3 })
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  expect(await offsetX(page)).toBe(0)
})

test('after a swipe, the high-resolution image loads after a pause and joins a zoomed image in place', async ({
  page,
}, info) => {
  await preparePage(page, { body: threeImages })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const state = window as unknown as {
      loads: string[]
      release: Record<string, () => void>
    }
    state.loads = []
    state.release = {}
    window.modalZoom = createZoom('img', {
      margin: 24,
      // Loads on demand, so the test decides when the image arrives.
      loader: ({ original }, ready) => {
        state.loads.push(original.alt)
        state.release[original.alt] = () => {
          const media = new Image()
          media.onload = () => ready(media)
          media.src = (original as HTMLImageElement).src
        }
      },
      renderer: dialog({ content: galleryControls() }),
    })
    bindZoomTriggers(window.modalZoom)
  })
  await page.getByRole('button', { name: 'Mountain' }).click()
  await page.evaluate(() =>
    (window as unknown as { release: Record<string, () => void> }).release
      .Mountain!()
  )
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await settled(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-90, 0, { steps: 3 })
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect.poll(() => offsetX(page)).toBe(0)
  await page.keyboard.press('+')
  const zoomed = await frame(page).boundingBox()
  // Forest twice: preloaded as a neighbour, then requested once the swipe settled on it.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { loads: string[] }).loads.slice(0, 3)
      )
    )
    .toEqual(['Mountain', 'Forest', 'Forest'])
  await page.evaluate(() =>
    (window as unknown as { release: Record<string, () => void> }).release
      .Forest!()
  )
  await expect(
    page.locator('dialog img.medium-zoom-image--opened')
  ).toHaveCount(2)
  await settled(page)
  const joined = await frame(page).boundingBox()
  expect(joined!.width).toBeCloseTo(zoomed!.width, 0)
  expect(joined!.x).toBeCloseTo(zoomed!.x, 0)
})

test('a single tap starts closing at once and finishes within the double-tap pause', async ({
  page,
  isMobile,
}) => {
  await open(page)
  await pauseClock(page)
  const dialog = page.locator('dialog')
  const [x, y] = await centre(page)
  await (isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  // Feedback comes with the release, before any time passes.
  await expect(dialog).toHaveAttribute('data-medium-zoom-gesture', 'close')
  expect(await closing(page)).toBe(false)
  // The double-tap pause runs from the press, so closing starts within its length.
  await page.clock.runFor(300)
  expect(await closing(page)).toBe(true)
  await page.clock.resume()
  await expect(dialog).toHaveCount(0)
})

test('a mouse moving off after a click closes without waiting for a second one', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Hovering needs a mouse')
  await open(page)
  await pauseClock(page)
  const [x, y] = await centre(page)
  await page.mouse.click(x, y)
  await page.mouse.move(x + 60, y, { steps: 3 })
  expect(await closing(page)).toBe(true)
  await page.clock.resume()
  await expect(page.locator('dialog')).toHaveCount(0)
})
