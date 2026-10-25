import { AxeBuilder } from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { decodeImages, dismissZoom, openImage } from './helpers.ts'

// Run once on desktop and once on mobile within the existing browser suite.
test('built website and open zooms have no automatically detected WCAG A/AA violations', async ({
  page,
}, testInfo) => {
  await page.goto('/website.html')
  await decodeImages(page.locator('img'))
  const states = ['page', 'default', 'background', 'trigger'] as const
  for (const state of states) {
    await test.step(state, async () => {
      if (state === 'trigger') {
        const trigger = page.getByRole('button', { name: 'Trigger zoom' })
        await trigger.focus()
        await page.keyboard.press('Enter')
      } else if (state !== 'page') {
        await openImage(page, page.locator(`#zoom-${state}`), {
          via: testInfo.project.name.startsWith('mobile') ? 'tap' : 'click',
        })
      }
      if (state !== 'page') {
        await expect(page.locator('.medium-zoom-overlay')).toHaveCSS('opacity', '1')
        await expect(page.locator('.medium-zoom-image--opened')).toBeVisible()
      }
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      await testInfo.attach(`accessibility-${state}`, {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      })
      if (result.violations.length) {
        await testInfo.attach(`accessibility-${state}-screenshot`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        })
      }
      expect(
        result.violations,
        `${state}: see accessibility JSON for selectors and remediation`
      ).toEqual([])
      if (state !== 'page') await dismissZoom(page)
    })
  }
})
