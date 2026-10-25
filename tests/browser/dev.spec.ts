import { test, expect } from '@playwright/test'
import { openImage, dismissZoom } from './helpers.ts'

test('Svelte development server attaches and dismisses zooms', async ({ page }) => {
  await page.goto('http://127.0.0.1:4176/examples/svelte/')
  await expect(page.locator('.medium-zoom-image')).toHaveCount(3)
  await openImage(page, page.getByRole('img', { name: 'Zoom 1', exact: true }))
  await dismissZoom(page)
})
