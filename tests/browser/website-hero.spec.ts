import { test, expect } from '@playwright/test'

for (const path of ['/', '/react']) {
  test(`${path} expands the decorative zoom frames independently of its content`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(path)
    const hero = page.locator('.hero')
    const frame = page.locator('.hero-frame')
    const crop = page.locator('.hero-crop')
    const initialHeight = (await hero.boundingBox())!.height
    const supported = await page.evaluate(
      () =>
        CSS.supports('animation-timeline', 'scroll(root block)') &&
        CSS.supports('animation-range', '0px 300px')
    )
    await page.mouse.move(600, 300)
    await page.mouse.wheel(0, 200)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150)
    if (supported) {
      await expect
        .poll(() =>
          frame.evaluate(element => {
            const matrix = getComputedStyle(element).transform
            return matrix === 'none' ? 1 : new DOMMatrixReadOnly(matrix).m11
          })
        )
        .toBeGreaterThan(1.035)
      const scale = await frame.evaluate(
        element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m11
      )
      expect(scale).toBeLessThan(1.065)
      const surfaceOpacity = await crop.evaluate(element =>
        Number(getComputedStyle(element, '::before').opacity)
      )
      expect(surfaceOpacity).toBeGreaterThan(0.55)
      expect(surfaceOpacity).toBeLessThan(0.75)
    } else {
      await expect
        .poll(() => frame.evaluate(element => getComputedStyle(element).transform))
        .toBe('none')
    }
    expect(await crop.evaluate(element => getComputedStyle(element, '::before').transform)).toBe(
      'none'
    )
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
        page.locator('.hero-frame').evaluate(element => getComputedStyle(element).transform)
      )
      .toBe('none')
    await expect
      .poll(() =>
        page
          .locator('.hero-crop')
          .evaluate(element => getComputedStyle(element, '::before').transform)
      )
      .toBe('none')
  })

  test(`${path} frames the headline and lede at every width and text size`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const width of [375, 768, 1_100, 1_440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      for (const rootSize of ['100%', '125%']) {
        await page.evaluate(size => (document.documentElement.style.fontSize = size), rootSize)
        const { frame, text } = await page.evaluate(() => {
          const range = document.createRange()
          const walker = document.createTreeWalker(
            document.querySelector('.hero-crop')!,
            NodeFilter.SHOW_TEXT
          )
          const rects: DOMRect[] = []
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent!.trim()) {
              continue
            }
            range.selectNodeContents(walker.currentNode)
            rects.push(...range.getClientRects())
          }
          return {
            frame: document.querySelector('.hero-frame')!.getBoundingClientRect().toJSON(),
            text: {
              left: Math.min(...rects.map(rect => rect.left)),
              right: Math.max(...rects.map(rect => rect.right)),
              top: Math.min(...rects.map(rect => rect.top)),
              bottom: Math.max(...rects.map(rect => rect.bottom)),
            },
          }
        })
        expect(frame.left).toBeLessThanOrEqual(text.left)
        expect(frame.right).toBeGreaterThanOrEqual(text.right)
        expect(frame.top).toBeLessThanOrEqual(text.top)
        expect(frame.bottom).toBeGreaterThanOrEqual(text.bottom)
        expect(frame.left).toBeGreaterThanOrEqual(0)
        expect(frame.right).toBeLessThanOrEqual(width)
      }
    }
  })
}

for (const path of ['/', '/react']) {
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
          path: `/tmp/medium-zoom-mobile-${path === '/' ? 'javascript' : 'react'}-${width}-${theme}.png`,
        })
      }
    }
  })
}
