import { test, expect } from '@playwright/test'

for (const path of ['/website.html', '/examples/shadcn/']) {
  test(`${path} expands the decorative zoom frames independently of its content`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(path)
    const hero = page.locator('.hero')
    const initialHeight = (await hero.boundingBox())!.height
    const supported = await page.evaluate(
      () =>
        CSS.supports('animation-timeline', 'scroll(root block)') &&
        CSS.supports('animation-range', '0px 600px')
    )
    await page.mouse.move(600, 300)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150)
    if (supported) {
      await expect
        .poll(() =>
          hero.evaluate(element => {
            const matrix = getComputedStyle(element, '::before').transform
            return matrix === 'none' ? 1 : new DOMMatrixReadOnly(matrix).m11
          })
        )
        .toBeGreaterThan(1.005)
      const scale = await hero.evaluate(
        element => new DOMMatrixReadOnly(getComputedStyle(element, '::before').transform).m11
      )
      expect(scale).toBeLessThan(1.025)
      const surfaceScale = await hero.evaluate(
        element => new DOMMatrixReadOnly(getComputedStyle(element, '::after').transform).m11
      )
      expect(surfaceScale).toBeCloseTo(scale, 2)
    } else {
      await expect
        .poll(() => hero.evaluate(element => getComputedStyle(element, '::before').transform))
        .toBe('none')
    }
    expect((await hero.boundingBox())!.height).toBe(initialHeight)
  })

  test(`${path} keeps zoom frames still with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(path)
    await page.mouse.move(600, 300)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150)
    await expect
      .poll(() =>
        page.locator('.hero').evaluate(element => getComputedStyle(element, '::before').transform)
      )
      .toBe('none')
    await expect
      .poll(() =>
        page.locator('.hero').evaluate(element => getComputedStyle(element, '::after').transform)
      )
      .toBe('none')
  })
}

for (const path of ['/website.html', '/examples/shadcn/']) {
  test(`${path} keeps the mobile hero within the viewport`, async ({ page }) => {
    for (const width of [375, 430]) {
      await page.setViewportSize({ width, height: 844 })
      for (const theme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true)
        const install = await page.locator('#installation').boundingBox()
        expect(install!.y + install!.height).toBeLessThanOrEqual(844)
        await page.screenshot({
          path: `/tmp/medium-zoom-mobile-${path === '/website.html' ? 'library' : 'shadcn'}-${width}-${theme}.png`,
        })
      }
    }
  })
}
