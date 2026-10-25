import { test, expect } from '@playwright/test'
import { exampleNames } from '../../scripts/example-names.ts'
import { openImage, dismissZoom, decodeImages, observeErrors } from './helpers.ts'

for (const [mode, path] of Object.entries({
  local: 'examples',
  standalone: 'standalone-examples',
})) {
  for (const name of exampleNames) {
    test(`${name} ${mode} example loads and zooms`, async ({ page }, testInfo) => {
      const errors = observeErrors(page)
      await page.goto(`/${path}/${name}/`)
      const image = page.locator('.medium-zoom-image').first()
      await expect(image).toBeVisible()
      await decodeImages(image)
      await page.screenshot({ path: testInfo.outputPath(`${name}-before.png`) })
      await openImage(page, image)
      const screenshot = testInfo.outputPath(`${name}-opened.png`)
      await page.screenshot({ path: screenshot })
      await testInfo.attach(`${name} ${mode} opened`, {
        path: screenshot,
        contentType: 'image/png',
      })
      await dismissZoom(page)
      expect(errors).toEqual([])
    })
  }
}

test('website uses the local package', async ({ page }) => {
  await page.goto('/website.html')
  await openImage(page, page.locator('#zoom-default'))
  await dismissZoom(page)
  await page.screenshot({ path: 'playwright-report/website.png', fullPage: true })
})
