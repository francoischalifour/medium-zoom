import { expect, type Page, test } from '@playwright/test'

import { fingers, inputFor, type Point } from './fingers'
import { addModernStyles, preparePage } from './helpers'

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
/** Waits until the frames rest where the zoom put them. */
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

test('a swipe carries the image under the finger with its neighbour beside it', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-60, 0)
  // One to one once the slop that tells a drag from a tap is crossed.
  const dragged = await offsetX(page)
  expect(dragged).toBeLessThan(-40)
  await finger.glide(-40, 0)
  expect(await offsetX(page)).toBeCloseTo(dragged - 40, 0)
  const neighbour = page.locator('dialog img:not([class])')
  await expect(neighbour).toHaveCount(1)
  await expect(neighbour).toHaveAttribute('aria-hidden', 'true')
  // Beside the image, a gap and the window's own width away.
  const shown = (await frame(page).boundingBox())!
  const box = (await neighbour.boundingBox())!
  expect(box.x).toBeGreaterThan(shown.x + shown.width)
  // Held still before release: not a flick and short of half way, so it springs back.
  await page.waitForTimeout(150)
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
  await finger.glide(-90, 0, 3)
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('2 / 3')
  // The incoming image settles into its own fit, in place, without a scene transition.
  await expect.poll(() => offsetX(page)).toBe(0)
  await expect(page.locator('dialog img')).toHaveCount(
    await page.locator('dialog img.medium-zoom-image--opened').count()
  )
  await page.waitForTimeout(400)
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await finger.down([x, y])
  await finger.glide(90, 0, 3)
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
})

/** Resolves once the open image's swipe offset passes `limit`, as a fraction of the window. */
const travelled = (page: Page, limit: number) =>
  page.waitForFunction(
    limit =>
      (parseFloat(
        document.querySelector<HTMLElement>(
          'dialog img.medium-zoom-image--opened'
        )?.style.translate ?? ''
      ) || 0) <
      -limit * innerWidth,
    limit,
    { polling: 'raf' }
  )

test('a swipe that catches the last one past halfway moves on again', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  for (let swipe = 0; swipe < 2; swipe++) {
    await finger.down([x, y])
    await finger.glide(-120, 0, 3)
    await finger.up()
    if (!swipe) {
      await travelled(page, 0.55)
    }
  }
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('3 / 3')
  await expect.poll(() => offsetX(page)).toBe(0)
  await expect(page.locator('dialog img:not([class])')).toHaveCount(0)
})

test('a swipe that catches the last one early holds the strip, both images in place', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(-120, 0, 3)
  await finger.up()
  await travelled(page, 0.1)
  // A tap stops nothing: the strip carries on to the neighbour it was heading for.
  await finger.down([x, y])
  expect(
    await page
      .locator('dialog img:not([class]), dialog img.medium-zoom-image--opened')
      .count()
  ).toBe(2)
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect.poll(() => offsetX(page)).toBe(0)
})

test('the first and last images resist being swiped past', async ({
  page,
}, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(150, 0)
  const resisted = await offsetX(page)
  expect(resisted).toBeGreaterThan(20)
  expect(resisted).toBeLessThan(100)
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
  // A short drag springs back.
  await finger.down([x, y])
  await finger.glide(0, 50)
  await expect(dialog).toHaveAttribute('data-medium-zoom-gesture', 'close')
  expect(
    Number(await overlay.evaluate(({ style }) => style.opacity))
  ).toBeLessThan(1)
  await page.waitForTimeout(150)
  await finger.up()
  await expect(dialog).not.toHaveAttribute('data-medium-zoom-gesture')
  await expect
    .poll(() => overlay.evaluate(({ style }) => style.opacity))
    .toBe('')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  // Dragging further, up this time, closes; the controls step aside meanwhile.
  await finger.down([x, y])
  await finger.glide(0, -200, 12)
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCSS(
    'opacity',
    '0'
  )
  await page.waitForTimeout(150)
  await finger.up()
  await expect(dialog).toHaveCount(0)
})

test('a flick down closes however short it is', async ({ page }, info) => {
  await open(page)
  const finger = await fingers(page, inputFor(info))
  const [x, y] = await centre(page)
  await finger.down([x, y])
  await finger.glide(0, 60, 2)
  await finger.up()
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('a double tap zooms in where it lands, further each time, back to fit from the maximum, and a single tap still closes', async ({
  page,
  isMobile,
}) => {
  await open(page)
  const dialog = page.locator('dialog')
  const [x, y] = await centre(page)
  const tap = () =>
    isMobile
      ? page.touchscreen.tap(x - 40, y - 20)
      : page.mouse.click(x - 40, y - 20)
  // The scale once the spring has come to rest; '' when fitted.
  const doubleTap = async () => {
    await tap()
    await tap()
    await page.waitForTimeout(800)
    return frame(page).evaluate(({ style }) => style.scale)
  }
  const scales = [Number(await doubleTap())]
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  expect(scales[0]).toBeGreaterThanOrEqual(2)
  // A single tap leaves a zoomed image alone.
  await page.waitForTimeout(400)
  await expect(dialog).toBeVisible()
  // Each double tap zooms further, as a pinch would, up to the maximum.
  for (let step = 0; step < 6 && scales.at(-1) !== 0; step++) {
    scales.push(Number(await doubleTap()))
  }
  // Back to fit only from the maximum, at least four times the fit.
  const fitted = scales.indexOf(0)
  expect(fitted).toBeGreaterThan(0)
  for (let step = 1; step < fitted; step++) {
    expect(scales[step]).toBeGreaterThan(scales[step - 1]!)
  }
  expect(scales[fitted - 1]).toBeGreaterThanOrEqual(3.99)
  await expect(dialog).not.toHaveAttribute('data-medium-zoom-zoomed')
  await tap()
  await expect(dialog).toHaveCount(0)
})

for (const gap of [40, 100, 160]) {
  test(`a double tap ${gap}ms apart zooms in, even as the first tap starts closing`, async ({
    page,
    isMobile,
  }) => {
    await open(page)
    const [x, y] = await centre(page)
    const tap = () =>
      isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)
    await tap()
    // The first tap's hint is still moving when the second lands.
    await page.waitForTimeout(gap)
    await tap()
    await expect(page.locator('dialog')).toHaveAttribute(
      'data-medium-zoom-zoomed',
      'true'
    )
    await page.waitForTimeout(800)
    await expect(page.locator('dialog')).toBeVisible()
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
  await hand.glide(0, 0, 8, 40)
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
  // Pinching well below the fit closes, as in Photos.
  await hand.down([x - 120, y], [x + 120, y])
  await hand.glide(0, 0, 8, -105)
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
  const wheel = (deltaX: number, deltaY: number, ctrlKey = false) =>
    dialog.dispatchEvent('wheel', {
      deltaX,
      deltaY,
      ctrlKey,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    })
  for (let step = 0; step < 5; step++) {
    await wheel(0, -20, true)
  }
  await expect(dialog).toHaveAttribute('data-medium-zoom-zoomed', 'true')
  const before = await offsetX(page)
  await wheel(30, 0)
  expect(await offsetX(page)).toBeLessThan(before)
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
  // Panning is not stepping: the button shows no press.
  await expect(
    page.getByRole('button', { name: 'Next image' })
  ).not.toHaveAttribute('data-pressed')
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
  await page.waitForTimeout(150)
  await finger.up()
  // Settled within the same frame: no spring to wait for.
  expect(await offsetX(page)).toBe(0)
  await finger.down([x, y])
  await finger.glide(-90, 0, 3)
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
  await finger.glide(-90, 0, 3)
  await finger.up()
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect.poll(() => offsetX(page)).toBe(0)
  await page.keyboard.press('+')
  const zoomed = await frame(page).boundingBox()
  // The image the swipe settled on is requested, after it was preloaded as a neighbour.
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

/** Records when the press ends, when the close shows and when the zoom starts closing. */
const timeTap = (page: Page) =>
  page.evaluate(() => {
    const dialog = document.querySelector('dialog')!
    const times: Record<string, number> = {}
    Object.assign(window, { times })
    dialog.addEventListener(
      'pointerup',
      () => (times.up ??= performance.now()),
      true
    )
    new MutationObserver(() => {
      if (dialog.dataset.mediumZoomGesture === 'close') {
        times.feedback ??= performance.now()
      }
    }).observe(dialog, { attributes: true })
    new MutationObserver(() => {
      if (!document.body.classList.contains('medium-zoom--opened')) {
        times.closed ??= performance.now()
      }
    }).observe(document.body, { attributes: true })
  })
const tapTimes = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { times: Record<string, number> }).times
  )

test('a single tap starts closing at once and finishes within the double-tap pause', async ({
  page,
  isMobile,
}) => {
  await open(page)
  await timeTap(page)
  const [x, y] = await centre(page)
  await (isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  await expect(page.locator('dialog')).toHaveCount(0)
  const { up, feedback, closed } = await tapTimes(page)
  // The image answers the release in the same task, and the backdrop is already fading.
  expect(feedback! - up!).toBeLessThan(20)
  // The pause runs from the press: no more than its length after the release.
  expect(closed! - up!).toBeLessThan(330)
})

test('a mouse moving off after a click closes without waiting for a second one', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Hovering needs a mouse')
  await open(page)
  await timeTap(page)
  const [x, y] = await centre(page)
  await page.mouse.click(x, y)
  await page.mouse.move(x + 60, y, { steps: 3 })
  await expect(page.locator('dialog')).toHaveCount(0)
  const { up, closed } = await tapTimes(page)
  expect(closed! - up!).toBeLessThan(200)
})
