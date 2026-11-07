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
      await openImage(page, image, { trigger: name === 'shadcn' ? image.locator('..') : image })
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
  await page.goto('/')
  const image = page.locator('#zoom-default')
  await openImage(page, image, { trigger: image.locator('..') })
  await dismissZoom(page)
  await page.screenshot({ path: '.cache/playwright/report/website.png', fullPage: true })
})

test('standalone shadcn component fixtures keep assets local to a subpath', async ({ page }) => {
  await page.route(
    url => url.pathname.startsWith('/assets/images/'),
    route => route.abort()
  )
  await page.goto('/standalone-examples/shadcn/')
  const image = page.locator('.gallery img').first()
  await decodeImages(image)
  expect(await image.evaluate(node => (node as HTMLImageElement).currentSrc)).toContain(
    '/standalone-examples/shadcn/assets/images/'
  )
  await openImage(page, image, { trigger: image.locator('..') })
  await dismissZoom(page)
  await page.goto('/standalone-examples/shadcn/playground.html')
  const fixture = page.locator('img').first()
  await decodeImages(fixture)
  expect(await fixture.evaluate(node => (node as HTMLImageElement).currentSrc)).toContain(
    '/standalone-examples/shadcn/assets/images/'
  )
  await openImage(page, fixture, { trigger: fixture.locator('..') })
  await dismissZoom(page)
})

test('vitepress example zooms page images above the navigation after client-side navigation', async ({
  page,
}) => {
  const errors = observeErrors(page)
  await page.goto('/examples/vitepress/')
  const content = page.locator('.vp-doc')
  await expect(content.locator('a img')).not.toHaveClass(/medium-zoom-image/)
  const image = content.locator('.medium-zoom-image').first()
  await decodeImages(image)
  await openImage(page, image)
  // The zoom covers the fixed navigation bar instead of sliding under it.
  const nav = await page.locator('.VPNav').boundingBox()
  const covering = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.className, {
    x: nav!.x + nav!.width / 2,
    y: nav!.y + nav!.height / 2,
  })
  expect(covering).toMatch(/medium-zoom-(overlay|image--opened)/)
  await dismissZoom(page)

  await page.locator('.VPSidebar').getByRole('link', { name: 'Gallery' }).click()
  await expect(page.locator('h1')).toHaveText('Gallery')
  const zoomable = content.locator('.medium-zoom-image')
  await expect(zoomable).toHaveCount(2)
  await decodeImages(zoomable.first())
  await openImage(page, zoomable.first())
  await dismissZoom(page)
  expect(errors).toEqual([])
})
