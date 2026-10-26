import { test, expect } from '@playwright/test'
import { decodeImages, dismissZoom } from '../browser/helpers.ts'

for (const path of ['/zoom', '/composed']) {
  test(`${path}: a Server Component renders the image in the initial HTML without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      const response = await page.goto(path)
      expect(response!.ok()).toBe(true)
      expect(await response!.text()).toContain('Rendered by a Server Component')
      await expect(
        page.getByRole('heading', { name: 'Rendered by a Server Component' })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Zoom image: Ocean sunset from a Server Component' })
      ).toBeVisible()
      await expect(page.locator('img')).toHaveAttribute('width', '1920')
    } finally {
      await context.close()
    }
  })

  test(`${path}: hydrates server HTML and carries server props across client navigation`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(path)
    // Hydrate the actual server response before exercising the RSC client transport.
    await expect(
      page.getByRole('heading', { name: 'Rendered by a Server Component' })
    ).toBeVisible()
    const trigger = page.getByRole('button', {
      name: 'Zoom image: Ocean sunset from a Server Component',
    })
    const image = trigger.locator('img')
    await decodeImages(image)
    await expect(path === '/zoom' ? image : trigger).toHaveClass(/server-image/)
    await image.evaluate(node => {
      delete (node as HTMLImageElement).dataset.opened
      node.addEventListener(
        'medium-zoom:opened',
        () => {
          ;(node as HTMLImageElement).dataset.opened = 'true'
        },
        { once: true }
      )
    })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(image).toHaveAttribute('data-opened', 'true')
    await expect(page.locator('.medium-zoom-image--opened')).toBeVisible()
    await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)'
    )
    const bounds = await page.locator('.medium-zoom-image--opened').boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(31)
    expect(bounds!.y).toBeGreaterThanOrEqual(31)
    await dismissZoom(page)
    await expect(trigger).toBeFocused()
    await page.getByRole('link', { name: 'Back to fixture home' }).click()
    await expect(page.getByRole('heading', { name: 'Server Components fixture' })).toBeVisible()
    await page
      .getByRole('link', {
        name: path === '/zoom' ? 'Open the image example' : 'Open the composed example',
      })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Rendered by a Server Component' })
    ).toBeVisible()
    await decodeImages(image)
    await image.evaluate(node => {
      delete (node as HTMLImageElement).dataset.opened
      node.addEventListener(
        'medium-zoom:opened',
        () => {
          ;(node as HTMLImageElement).dataset.opened = 'true'
        },
        { once: true }
      )
    })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(image).toHaveAttribute('data-opened', 'true')
    await expect(page.locator('.medium-zoom-image--opened')).toBeVisible()
    await dismissZoom(page)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
