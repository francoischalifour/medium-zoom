import { expect, test } from '@playwright/test'

import {
  type BundleName,
  bundles,
  dismissZoom,
  type Distribution,
  finishAnimations,
  loadBundle,
  loadZoomFixture,
  openImage,
} from './helpers.ts'

const distributions: Distribution[] = ['baseline', 'package']
const bundleNames = Object.keys(bundles) as BundleName[]

for (const bundle of bundleNames) {
  test(`${bundle} preserves published rendering and dismissal`, async ({ page }) => {
    const screenshots = []
    for (const distribution of distributions) {
      await loadZoomFixture(page, { distribution, bundle })
      await expect(page.locator('style')).toHaveCount(bundles[bundle].injectsStyles ? 1 : 0)
      if (!bundles[bundle].injectsStyles) {
        await page.addStyleTag({ url: `/${distribution}/dist/style.css` })
      }
      await openImage(page, page.locator('#image'))
      await finishAnimations(page)
      screenshots.push(await page.screenshot())
      await dismissZoom(page)
      await page.evaluate(() => window.zoom.open())
      await dismissZoom(page, { via: 'scroll' })
      await page.evaluate(() => window.zoom.detach())
      await expect(page.locator('#image')).not.toHaveClass(/medium-zoom-image/)
    }
    expect(screenshots[1]).toEqual(screenshots[0])
  })
}

test('default injects styles once; pure has no stylesheet side effect', async ({ page }) => {
  await page.goto('/fixture.html')
  await loadBundle(page, { bundle: 'pureUmd' })
  await expect(page.locator('style')).toHaveCount(0)
  await loadBundle(page)
  await expect(page.locator('style')).toHaveCount(1)
})

test('DOM container updates preserve the element identity', async ({ page }) => {
  await loadZoomFixture(page)
  expect(
    await page.evaluate(
      () =>
        window.zoom.update({ container: document.body }).getOptions().container === document.body
    )
  ).toBe(true)
})

for (const bundle of ['defaultUmd', 'pureUmd'] as const) {
  test(`${bundle} retains strict-mode semantics`, async ({ page }) => {
    const results = []
    for (const distribution of distributions) {
      await loadZoomFixture(page, { distribution, bundle })
      results.push(
        await page.evaluate(() => {
          try {
            window.zoom.update(Object.freeze({ container: { top: 2 } }))
            return 'accepted'
          } catch (error) {
            return (error as Error).name
          }
        })
      )
    }
    expect(results).toEqual(['TypeError', 'TypeError'])
  })
}
