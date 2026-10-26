import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

for (const path of ['/website.html', '/examples/shadcn/']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${path} is accessible in ${theme} mode`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      await page.goto(path)
      await expect(page.locator('.example-card').first()).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      async function audit(state: string) {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze()
        await testInfo.attach(`${state}-accessibility`, {
          body: JSON.stringify(results, null, 2),
          contentType: 'application/json',
        })
        expect(results.violations).toEqual([])
      }
      await audit('preview')

      // Exercise keyboard access, radio selection, and the rounded image focus ring.
      const packageTab = page
        .locator('.hero-install')
        .getByRole('radio', { name: 'npm', exact: true })
        .locator('..')
      await packageTab.click()
      await expect(packageTab).toHaveCSS('outline-style', 'none')
      await page.locator('.hero-install').getByRole('radio', { name: 'npm', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(
        page.locator('.hero-install').getByRole('radio', { name: 'pnpm', exact: true })
      ).toBeChecked()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(
        page
          .locator('.hero-install')
          .getByRole('radio', { name: 'pnpm', exact: true })
          .locator('..')
      ).toHaveCSS('outline-style', 'solid')
      const trigger = page.locator('.preview-trigger').first()
      await expect(trigger).toHaveAccessibleDescription(
        /Enter or Space to zoom.*Escape, or scroll to close/
      )
      await trigger.focus()
      const ring = await trigger.evaluate(element => {
        const css = getComputedStyle(element)
        return { radius: css.borderRadius, outline: css.outlineStyle, width: css.outlineWidth }
      })
      expect(Number.parseFloat(ring.radius)).toBeGreaterThanOrEqual(7)
      expect(ring.outline).toBe('solid')
      expect(ring.width).toBe('2px')
      await page.keyboard.press('Enter')
      await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
      await audit('zoomed')
      await page.keyboard.press('Escape')
      await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
      await expect(trigger).toBeFocused()

      await page.getByRole('tab', { name: 'Code', exact: true }).first().click()
      await audit('code')
      await page.getByRole('link', { name: 'Start building', exact: true }).click()
      await expect(page).toHaveURL(/#usage-title$/)
      await expect(page.locator('#usage h2')).toBeInViewport()
      await page.setViewportSize({ width: 390, height: 844 })
      await audit('mobile-code')
    })
  }
}
