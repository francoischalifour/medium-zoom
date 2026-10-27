import AxeBuilder from '@axe-core/playwright'

import { testUrl } from '../server-urls'
import { test, expect } from './website-fixture'

for (const theme of ['light', 'dark'] as const) {
  test(`the shared footer stays usable from phone to desktop in ${theme} mode`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme })
    for (const [path, current] of [
      ['/website.html', 'JavaScript'],
      ['/react', 'React'],
      ['/docs/javascript/', 'Documentation'],
    ]) {
      await page.goto(path)
      await page.evaluate(() => document.fonts.ready)
      const footer = page.getByRole('contentinfo')
      const navigation = footer.getByRole('navigation', { name: 'Footer navigation' })
      await expect(navigation.locator('[aria-current="page"]')).toHaveText(current)
      await expect(navigation.getByRole('link')).toHaveCount(6)
      for (const width of [320, 768, 1_440]) {
        await page.setViewportSize({ width, height: 900 })
        await footer.scrollIntoViewIfNeeded()
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
        for (const link of await navigation.getByRole('link').all()) {
          const bounds = (await link.boundingBox())!
          expect(bounds.height).toBeGreaterThanOrEqual(width === 320 ? 44 : 24)
          expect(bounds.x).toBeGreaterThanOrEqual(0)
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
        }
        await footer.screenshot({ path: testInfo.outputPath(`footer-${current}-${width}.png`) })
      }
      const result = await new AxeBuilder({ page }).include('.site-footer').analyze()
      expect(result.violations).toEqual([])
    }
  })
}

test('footer links navigate between the docs, React, and JavaScript on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route(`${testUrl}/`, async route => {
    const response = await route.fetch({ url: `${testUrl}/website.html` })
    await route.fulfill({ response })
  })
  await page.goto('/docs/javascript/')
  const navigation = page.getByRole('navigation', { name: 'Footer navigation' })
  await navigation.getByRole('link', { name: 'React', exact: true }).click()
  await expect(page).toHaveURL(`${testUrl}/react`)
  await expect(navigation.locator('[aria-current="page"]')).toHaveText('React')
  await navigation.getByRole('link', { name: 'Documentation' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  await navigation.getByRole('link', { name: 'JavaScript', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`${testUrl}/`)
  await expect(navigation.locator('[aria-current="page"]')).toHaveText('JavaScript')
})
