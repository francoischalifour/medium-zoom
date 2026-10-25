import { test, expect } from '@playwright/test'
import { loadZoomFixture, openImage } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await loadZoomFixture(page)
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
