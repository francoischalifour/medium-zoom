import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './website-fixture'

for (const shortcut of ['Meta+k', 'Control+k']) {
  test(`${shortcut} searches section anchors and restores focus`, async ({ page }) => {
    await page.goto('/website.html')
    const trigger = page.getByRole('button', { name: /Search docs/ })
    await trigger.focus()
    await page.keyboard.press(shortcut)
    const search = page.getByRole('combobox')
    await expect(search).toBeFocused()
    await expect(page.getByRole('option', { name: /JavaScript quickstart/ })).toBeVisible()
    await search.fill('margin')
    await expect(page.getByRole('option').first()).toContainText('margin')
    await expect(page.getByRole('option').first()).toContainText('Options')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(search).toHaveValue('')
    await search.fill('margin')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/docs\/reference\/javascript\/options\/#margin$/)
    await expect(page.locator('#margin')).toBeInViewport()
  })
}

test('aliases, keyboard selection, empty state, and modal accessibility', async ({ page }) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.fill('nextjs')
  await expect(page.getByRole('option').first()).toContainText('Server rendering')
  await search.fill('high resolution')
  await expect(page.getByRole('option').first()).toContainText('HD images')
  await search.fill('nothing matches this query')
  await expect(page.getByText('No results for')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await search.fill('')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { selected: true })).toContainText('React quickstart')
  const report = await new AxeBuilder({ page }).include('.command-palette').analyze()
  expect(report.violations).toEqual([])
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/docs\/react\/$/)
})

test('actions respect package manager and report copy success and failure', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('medium-zoom-package-manager', 'pnpm')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          ;(window as unknown as { copied: string }).copied = text
        },
      },
    })
  })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.fill('copy react')
  await page.getByRole('option', { name: /Copy React install command/ }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Copied to clipboard')
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toMatch(
    /^pnpm dlx shadcn@latest add /
  )
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('Permission denied')
    }
  })
  await page.getByRole('option', { name: /Copy React install command/ }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Could not copy. Select and copy this command: pnpm dlx'
  )
  await search.fill('theme')
  const wasDark = await page.locator('html').evaluate(element => element.classList.contains('dark'))
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveClass(wasDark ? '' : 'dark')
})

test('mobile search fits the viewport and dismisses with the close button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/docs/')
  const trigger = page.getByRole('button', { name: /Search docs/ })
  await trigger.click()
  await expect(page.getByRole('combobox')).toBeFocused()
  await expect(page.getByRole('option').first()).toBeVisible()
  const bounds = await page.getByRole('dialog').boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(700)
  await page.getByRole('button', { name: 'Close search' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})
