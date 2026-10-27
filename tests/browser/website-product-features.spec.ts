import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import { version } from '../../package.json'
import { test, expect } from './website-fixture'

test.use({ deviceScaleFactor: 1 })

for (const path of ['/website.html', '/react']) {
  test(`${path} serves product features and footer metadata without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      await page.goto(path)
      const features = page.getByRole('region', {
        name: path === '/react' ? 'Component features' : 'Library features',
      })
      await expect(
        page
          .getByRole('contentinfo')
          .getByRole('link', { name: `v${version} (opens in a new tab)`, exact: true })
      ).toHaveAttribute('href', `https://www.npmjs.com/package/medium-zoom/v/${version}`)
      const gzipBytes = gzipSync(readFileSync('dist/medium-zoom.min.js'), { level: 9 }).length
      if (path === '/website.html') {
        await expect(features).toContainText(
          `${(gzipBytes / 1_000).toFixed(0)} kB. Zero dependencies.`
        )
        await expect(features).toContainText('TypeScript ready.')
      }
      await expect(
        page
          .getByRole('contentinfo')
          .getByRole('link', { name: 'MIT license (opens in a new tab)', exact: true })
      ).toBeVisible()
      await expect(features.getByRole('heading', { level: 2 })).toHaveCount(3)
    } finally {
      await context.close()
    }
  })
}

test('mobile previews stay small and load the full-resolution image only on zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const sources: string[] = []
  page.on('request', request => sources.push(request.url()))
  await page.goto('/react')
  const preview = page.locator('.usage-preview .usage-photo')
  await preview.scrollIntoViewIfNeeded()
  await expect
    .poll(() => preview.evaluate(image => (image as HTMLImageElement).currentSrc))
    .toContain('ocean-sunset-preview-small.webp')
  expect(sources.some(url => url.endsWith('/ocean-sunset.jpg'))).toBe(false)
  await page.locator('.usage-preview').getByRole('button').click()
  await expect(
    page.locator('img.medium-zoom-image--opened[src$="/ocean-sunset.jpg"]')
  ).toBeVisible()
  expect(sources.some(url => url.endsWith('/ocean-sunset.jpg'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('features remain readable at phone width in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/website.html')
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    const features = page.getByRole('region', { name: 'Library features' })
    await features.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    await features.screenshot({ path: testInfo.outputPath(`product-features-${theme}.png`) })
  }
})
