import { test, expect } from '@playwright/test'
import { decodeImages, finishAnimations, observeErrors } from './helpers.ts'

for (const width of [1_280, 390]) {
  test(`video plays within the zoomed poster at ${width}px and cleans up`, async ({ page }) => {
    const errors = observeErrors(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/examples/video/')
    await decodeImages(page.locator('#poster'))
    const trigger = page.getByRole('button', { name: 'Zoom and play the flower video' })
    const video = page.locator('video')

    // Exercise keyboard activation as well as pointer activation on reopen.
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(video).toBeVisible()
    await expect
      .poll(() => video.evaluate((video: HTMLVideoElement) => video.currentTime))
      .toBeGreaterThan(0.1)
    const bounds = await page.locator('.medium-zoom-image--opened').boundingBox()
    const playerBounds = await video.boundingBox()
    // Transforms and fixed positioning can round to different subpixel coordinates.
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(playerBounds![key] - bounds![key])).toBeLessThan(0.05)
    }
    expect(
      await video.evaluate(
        (video: HTMLVideoElement) => video.controls && video.muted && video.playsInline
      )
    ).toBe(true)

    const player = await video.elementHandle()
    await page.keyboard.press('Escape')
    await expect(video).toHaveCount(0)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(
      await player!.evaluate(
        (video: HTMLVideoElement) => video.paused && !video.hasAttribute('src')
      )
    ).toBe(true)

    await trigger.click()
    await expect(video).toBeVisible()
    await expect
      .poll(() => video.evaluate((video: HTMLVideoElement) => video.currentTime))
      .toBeGreaterThan(0)
    await page.locator('.medium-zoom-overlay').click({ position: { x: 4, y: 4 } })
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await expect(video).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('video is removed on resize, overlay dismissal, and interrupted opening', async ({ page }) => {
  await page.goto('/examples/video/')
  await decodeImages(page.locator('#poster'))
  const trigger = page.locator('#play')
  const video = page.locator('video')

  await trigger.click()
  await expect(video).toBeVisible()
  await page.setViewportSize({ width: 800, height: 600 })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(video).toHaveCount(0)

  await trigger.click()
  await expect(video).toBeVisible()
  await page.locator('.medium-zoom-overlay').click({ position: { x: 4, y: 4 } })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(video).toHaveCount(0)

  // Dismiss synchronously in `open`, before an image clone or player is appended.
  await page.locator('#poster').evaluate(poster => {
    poster.addEventListener('medium-zoom:open', () => window.dispatchEvent(new Event('resize')), {
      once: true,
    })
  })
  await trigger.click()
  await expect(trigger).toBeFocused()
  await expect(page.locator('video, .medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(
    0
  )
})

test('blocked autoplay leaves a usable player and failed media leaves the poster', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // oxlint-disable-next-line typescript/unbound-method -- Restore the method on its prototype.
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      HTMLMediaElement.prototype.play = play
      return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'))
    }
  })
  await page.goto('/examples/video/')
  await page.locator('#play').click()
  const video = page.locator('video')
  await expect(video).toBeVisible()
  expect(await video.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true)
  await video.evaluate((video: HTMLVideoElement) => video.play())
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)

  await page.route('**/*.mp4', route => route.fulfill({ status: 404 }))
  const failure = page.waitForResponse(response => response.url().endsWith('.mp4'))
  await page.locator('#play').click()
  expect((await failure).status()).toBe(404)
  await expect(page.locator('.medium-zoom-image--opened')).toBeVisible()
  await finishAnimations(page)
  await expect(video).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.locator('#play')).toBeFocused()
})
