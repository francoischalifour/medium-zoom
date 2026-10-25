import { test, expect, type Page, type Route } from '@playwright/test'
import { loadZoomFixture, openImage } from './helpers.ts'

const imageButton = `<button type="button" aria-label="Zoom image" style="padding:0;border:0;background:none">
  <img id="image" src="/images/image-1.jpg" width="160" alt="Zoom fixture">
</button>`

test('video plays inline after a tap and cleans up on viewport change', async ({ page }) => {
  await page.goto('/examples/video/')
  await page.locator('#play').tap()
  const video = page.locator('video')
  await expect(video).toBeVisible()
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeGreaterThan(0)
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: viewport.height, height: viewport.width })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(video).toHaveCount(0)
  await expect(page.locator('#play')).toBeFocused()
})

for (const distribution of ['baseline', 'package'] as const) {
  test.describe(distribution, () => {
    test.beforeEach(async ({ page }) => {
      await loadZoomFixture(page, {
        distribution,
        body: imageButton,
      })
    })

    test('touch opens the image and a second tap dismisses it', async ({ page }) => {
      await openImage(page, page.locator('#image'), { via: 'tap' })
      await page.locator('.medium-zoom-image--opened').tap()
      await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    })

    test('changing the mobile viewport dismisses the zoom', async ({ page }) => {
      await openImage(page, page.locator('#image'), { via: 'tap' })
      const viewport = page.viewportSize()!
      await page.setViewportSize({ width: viewport.height, height: viewport.width })
      await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    })
  })
}

// Model touch sequences explicitly: Playwright's touchscreen only exposes single taps.
async function touch(page: Page, type: string, count: number) {
  await page.evaluate(
    ({ type, count }) => {
      const event = new Event(type, { bubbles: true })
      Object.defineProperty(event, 'touches', { value: { length: count } })
      document.querySelector('.medium-zoom-image--opened')!.dispatchEvent(event)
    },
    { type, count }
  )
}

async function scroll(page: Page, top: number) {
  await page.evaluate(top => {
    window.scrollTo(0, top)
    document.dispatchEvent(new Event('scroll'))
  }, top)
  await page.clock.runFor(250)
}

for (const initialScale of [0.5, 2]) {
  test(`pinch panning respects the opening viewport scale of ${initialScale}`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Browser scale emulation requires Chromium CDP')
    await loadZoomFixture(page, { body: imageButton })
    await page.evaluate(async initialScale => {
      document
        .querySelector('meta[name="viewport"]')!
        .setAttribute('content', `width=device-width,initial-scale=${initialScale}`)
      // Let the updated viewport metadata take effect before emulating a pinch.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }, initialScale)
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: initialScale })
    await expect
      .poll(() => page.evaluate(() => window.visualViewport!.scale))
      .toBeCloseTo(initialScale)
    await page.evaluate(() => window.zoom.open())
    await page.clock.install()

    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: initialScale * 1.5 })
    await scroll(page, 100)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await scroll(page, 200)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)

    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: initialScale })
    await scroll(page, 210)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await scroll(page, 300)
    await page.clock.runFor(500)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)

    // A new opening must capture the browser's current scale again.
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: initialScale * 1.5 })
    await page.evaluate(() => void window.zoom.open())
    await page.clock.runFor(500)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await scroll(page, 400)
    await page.clock.runFor(500)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  })
}

test('pinching while an HD image loads refreshes the scroll baseline', async ({ page }) => {
  await loadZoomFixture(page, { body: imageButton })
  let pendingImage!: Route
  await page.route('**/pending.jpg', route => {
    pendingImage = route
  })
  await page.clock.install()
  await page.evaluate(() => {
    // Exercise touch tracking without relying on the visual viewport guard.
    Object.defineProperty(window, 'visualViewport', { value: undefined })
    document.querySelector('#image')!.setAttribute('data-zoom-src', '/pending.jpg')
  })
  await page.locator('#image').tap()
  await expect.poll(() => Boolean(pendingImage)).toBe(true)
  await touch(page, 'touchstart', 2)
  await scroll(page, 80)
  await touch(page, 'touchend', 0)
  await pendingImage.fulfill({ path: 'stories/images/image-2.jpg', contentType: 'image/jpeg' })
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(2)
  await page.clock.runFor(500)

  await scroll(page, 90)
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await scroll(page, 140)
  await page.clock.runFor(500)
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test.describe('pinch gestures', () => {
  test.beforeEach(async ({ page }) => {
    await loadZoomFixture(page, { body: imageButton })
    await openImage(page, page.locator('#image'), { via: 'tap' })
    await page.clock.install()
  })

  for (const endEvent of ['touchend', 'touchcancel']) {
    test(`pinching protects scrolling until the last finger leaves via ${endEvent}`, async ({
      page,
    }) => {
      // Exercise the touch fallback independently of VisualViewport support.
      await page.evaluate(() => {
        Object.defineProperty(window, 'visualViewport', { value: undefined })
        window.scrollTo(0, 80)
        document.dispatchEvent(new Event('scroll'))
      })
      // A pinch must also cancel a dismissal queued by a preceding scroll.
      await touch(page, 'touchstart', 2)
      await scroll(page, 160)
      await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
      await touch(page, endEvent, 1)
      await scroll(page, 240)
      await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
      await touch(page, endEvent, 0)
      // Releasing the pinch resets the baseline for ordinary scrolling.
      await scroll(page, 250)
      await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
      await touch(page, 'touchstart', 1)
      await scroll(page, 320)
      await page.clock.runFor(500)
      await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    })
  }

  test('panning a magnified viewport stays open after touch cancellation', async ({ page }) => {
    await touch(page, 'touchstart', 2)
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'scale', { configurable: true, value: 2 })
    })
    await touch(page, 'touchcancel', 0)
    await scroll(page, 100)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await scroll(page, 200)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'scale', { value: 1 })
    })
    await scroll(page, 210)
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await scroll(page, 300)
    await page.clock.runFor(500)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  })

  test('closing during a pinch clears gesture state for the next opening', async ({ page }) => {
    await touch(page, 'touchstart', 2)
    await page.evaluate(() => void window.zoom.close())
    await page.clock.runFor(500)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await page.evaluate(() => void window.zoom.open())
    await page.clock.runFor(500)
    await scroll(page, 100)
    await page.clock.runFor(500)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  })
})
