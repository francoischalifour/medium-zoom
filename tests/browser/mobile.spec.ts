import { test, expect } from '@playwright/test'
import { loadZoomFixture, openImage } from './helpers.ts'

for (const distribution of ['baseline', 'package'] as const) {
  test.describe(distribution, () => {
    test.beforeEach(async ({ page }) => {
      await loadZoomFixture(page, {
        distribution,
        body: `<button type="button" aria-label="Zoom image" style="padding:0;border:0;background:none">
          <img id="image" src="/images/image-1.jpg" width="160" alt="Zoom fixture">
        </button>`,
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
