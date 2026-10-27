import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

import { finishAnimations } from './helpers'

test('React usage examples compose, zoom, and copy the selected snippet', async ({ page }) => {
  await page.goto('/react')
  const usage = page.locator('#usage')
  const tabs = usage.getByRole('tablist', { name: 'React examples' })
  const panel = usage.getByRole('tabpanel')

  await expect(tabs.getByRole('tab', { name: 'Basic', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(panel.locator('.usage-preview img')).toHaveCount(1)
  await tabs.getByRole('tab', { name: 'With caption', exact: true }).click()
  await expect(panel.locator('figure figcaption')).toHaveText(
    'First light in Denali National Park.'
  )
  await expect(panel.locator('pre')).toContainText('<figcaption')

  await page.keyboard.press('ArrowRight')
  await expect(tabs.getByRole('tab', { name: 'Gallery', exact: true })).toBeFocused()
  const images = panel.locator('.usage-preview img')
  await expect(images).toHaveCount(3)
  for (let index = 0; index < 3; index++) {
    const image = images.nth(index)
    await image.scrollIntoViewIfNeeded()
    await image.evaluate((element: HTMLImageElement) => element.decode())
    await image.locator('..').click()
    await expect(page.locator('.medium-zoom-image--opened')).toHaveAttribute(
      'alt',
      (await image.getAttribute('alt'))!
    )
    await page.keyboard.press('Escape')
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  }

  // The clipboard is the only external dependency in this copy interaction.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text
        },
      },
    })
  })
  await usage.getByRole('button', { name: 'Copy usage code', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-copied', /photos\.map\(photo/)
  await expect(page.locator('html')).not.toHaveAttribute('data-copied', /--hls-/)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(page.viewportSize()!.width)
})

test('HD usage loads the original only when the visitor zooms', async ({ page }) => {
  const originals: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/images/denali.jpg')) {
      originals.push(request.url())
    }
  })
  await page.goto('/react')
  const usage = page.locator('#usage')
  await usage.getByRole('tab', { name: 'High resolution', exact: true }).click()
  const image = usage.locator('.usage-preview img')
  await expect(image).toHaveAttribute('src', /denali-preview\.webp$/)
  await expect(image).toHaveAttribute('data-zoom-src', /denali\.jpg$/)
  await image.scrollIntoViewIfNeeded()
  await image.evaluate((element: HTMLImageElement) => element.decode())
  expect(originals).toEqual([])
  await image.locator('..').click()
  await expect(page.locator('.medium-zoom-image--opened[src$="denali.jpg"]')).toBeVisible()
  await expect.poll(() => originals.length).toBe(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('React compositions remain accessible in light and dark themes', async ({ page }) => {
  await page.goto('/react')
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    if (theme === 'dark') {
      await expect(page.locator('html')).toHaveClass(/dark/)
    } else {
      await expect(page.locator('html')).not.toHaveClass(/dark/)
    }
    for (const name of ['Basic', 'With caption', 'Gallery', 'High resolution']) {
      await page.locator('#usage').getByRole('tab', { name, exact: true }).click()
      await finishAnimations(page)
      const results = await new AxeBuilder({ page })
        .include('#usage')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    }
  }
})

test('example tabs share hover and keyboard behavior, with code before the preview', async ({
  page,
}) => {
  await page.goto('/react')
  const usage = page.locator('#usage')
  const tabs = usage.getByRole('tablist', { name: 'React examples' })
  const caption = tabs.getByRole('tab', { name: 'With caption', exact: true })
  await caption.hover()
  await finishAnimations(page)
  await expect(caption).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const hoverColor = await caption.evaluate(element => getComputedStyle(element).backgroundColor)
  const rail = page.getByRole('tablist', { name: 'Landscape view' })
  const codeTab = rail.getByRole('tab', { name: 'Code', exact: true })
  await codeTab.hover()
  await expect(codeTab).toHaveCSS('background-color', hoverColor)
  await rail.getByRole('tab', { name: 'Preview', exact: true }).press('End')
  await expect(codeTab).toBeFocused()
  await expect(codeTab).toHaveAttribute('aria-selected', 'true')

  await caption.click()
  await caption.press('End')
  await expect(tabs.getByRole('tab', { name: 'High resolution', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(tabs.getByRole('tab', { name: 'Basic', exact: true })).toBeFocused()
  await tabs.getByRole('tab', { name: 'Basic', exact: true }).click()
  const trigger = usage.getByRole('button', { name: 'Zoom image: Ocean sunset', exact: true })
  await page.keyboard.press('Tab')
  await trigger.focus()
  const corners = await trigger.evaluate(element => {
    const trigger = getComputedStyle(element)
    const image = getComputedStyle(element.querySelector('img')!)
    return {
      triggerRadius: trigger.borderRadius,
      imageRadius: image.borderRadius,
      triggerShape: trigger.getPropertyValue('corner-shape'),
      imageShape: image.getPropertyValue('corner-shape'),
      outline: trigger.outlineStyle,
      offset: trigger.outlineOffset,
    }
  })
  expect(corners.triggerRadius).toBe(corners.imageRadius)
  expect(corners.triggerShape).toBe(corners.imageShape)
  expect(corners.outline).toBe('solid')
  expect(corners.offset).toBe('2px')
  const code = usage.locator('.usage-code')
  const preview = usage.locator('.usage-preview')
  expect((await code.boundingBox())!.x).toBeLessThan((await preview.boundingBox())!.x)
  await expect(code).toContainText('Works with SSR and React Server Components.')
  await page.setViewportSize({ width: 390, height: 844 })
  expect((await code.boundingBox())!.y).toBeLessThan((await preview.boundingBox())!.y)
})
