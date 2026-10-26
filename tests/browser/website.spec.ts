import type { Page } from '@playwright/test'
import { test, expect } from './website-fixture'
import { testUrl } from '../server-urls.ts'
import { decodeImages, dismissZoom, openImage } from './helpers.ts'

async function openHome(page: Page) {
  // Core-package tests intentionally use a blank /. Map it to the built home page only here.
  await page.route(`${testUrl}/`, async route => {
    const response = await route.fetch({ url: `${testUrl}/website.html` })
    await route.fulfill({ response })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Your images,/ })).toBeVisible()
  await decodeImages(page.locator('#zoom-default'))
  await page.evaluate(() => document.fonts.ready)
  const install = await page.locator('.hero-install').boundingBox()
  expect(install!.y + install!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
}

test('home page presents the library with the shared preview and code rail', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await openHome(page)
  await expect(page.getByText('No dependencies. Works with any framework.')).toBeVisible()
  await expect(page.locator('.section-links:visible [aria-current="page"]')).toHaveText(
    'JavaScript'
  )
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true })
  const image = page.locator('#zoom-default')
  await openImage(page, image, { trigger: image.locator('..') })
  await dismissZoom(page)
  const card = page.getByRole('article', { name: 'Landscape example', exact: true })
  await card.getByRole('tab', { name: 'Code', exact: true }).click()
  await expect(card.getByRole('tabpanel')).toContainText('<img')
  await expect(card.getByRole('tabpanel')).toContainText('ocean-sunset.jpg')
  await expect(card.getByRole('tabpanel')).toContainText('data-zoomable')
  await expect(card.getByRole('tabpanel')).not.toContainText('mediumZoom(')
  await expect(card.getByRole('tabpanel').locator('img')).toHaveCount(0)
  await expect(page.locator('#usage-code')).toContainText("mediumZoom('[data-zoomable]'")
  expect(errors).toEqual([])
})

test('shared navigation preserves theme and typography across both pages and back navigation', async ({
  page,
}, testInfo) => {
  await openHome(page)
  const header = await page.locator('.navigation').boundingBox()
  const fonts = await page.evaluate(async () => {
    const sans = await document.fonts.load('500 14px "Geist Variable"')
    const mono = await document.fonts.load('400 13px "Geist Mono Variable"')
    return [sans.length, mono.length]
  })
  expect(fonts.every(count => count > 0)).toBe(true)
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'React', exact: true }).click()
  await expect(page).toHaveURL(`${testUrl}/react`)
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(page.locator('.section-links:visible [aria-current="page"]')).toHaveText('React')
  await expect(page.getByRole('heading', { name: /Your images,/ })).toBeVisible()
  const nextHeader = await page.locator('.navigation').boundingBox()
  expect(nextHeader).toEqual(header)
  await page.screenshot({ path: testInfo.outputPath('integration-dark.png'), fullPage: true })
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await page.getByRole('navigation').getByRole('link', { name: 'JavaScript', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Your images,/ })).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass('dark')
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.goBack()
  await expect(page).toHaveURL(`${testUrl}/react`)
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
})

test('home page commands copy the selected package manager and usage', async ({ page }) => {
  await openHome(page)
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
  await page.locator('.hero-install').getByRole('radio', { name: 'npm', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.locator('.hero-install').getByRole('button', { name: 'Copy install command' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-copied', 'pnpm add medium-zoom')
  await page.getByRole('button', { name: 'Copy usage code' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-copied', /margin: 24/)
  await expect(page.locator('html')).toHaveAttribute(
    'data-copied',
    /import mediumZoom from 'medium-zoom'/
  )
  const card = page.getByRole('article', { name: 'Landscape example', exact: true })
  await card.getByRole('tab', { name: 'Code', exact: true }).click()
  await card.getByRole('button', { name: 'Copy landscape code', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-copied', /<img[\s\S]*data-zoomable\n>/)
  await expect(page.locator('html')).not.toHaveAttribute('data-copied', /<span|--hls-/)
})

test('mobile navigation remains usable and both pages fit the viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHome(page)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'React', exact: true })
  ).toBeVisible()
  await expect(page.locator('.brand-name')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true })
  await page.getByRole('navigation').getByRole('link', { name: 'React', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Your images,/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('integration-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 740 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'JavaScript', exact: true })
  ).toBeVisible()
})

test('system theme is respected before interaction and explicit preference survives reload', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openHome(page)
  await expect(page.locator('html')).toHaveClass('dark')
  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await page.reload()
  await expect(page.locator('html')).not.toHaveClass('dark')
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible()
})

test('both pages end with an install action and one curated gallery', async ({ page }) => {
  await openHome(page)
  for (const integration of [false, true]) {
    if (integration) await page.goto('/react')
    const main = page.getByRole('region', { name: 'Image zoom examples', exact: true })
    await expect(page.getByLabel('Scrollable examples', { exact: true })).toHaveCount(1)
    await expect(main.getByRole('article')).toHaveCount(6)
    await expect(main.getByRole('article', { name: 'Panorama example' })).toHaveCount(0)
    for (const name of ['Landscape', 'Portrait', 'Mountains', 'Earth', 'Architecture', 'Aurora']) {
      const card = main.getByRole('article', { name: `${name} example`, exact: true })
      const image = card.locator('img')
      await image.scrollIntoViewIfNeeded()
      await decodeImages(image)
      await openImage(page, image, { trigger: image.locator('..') })
      await dismissZoom(page)
    }
    const credit = main
      .getByRole('article', { name: 'Earth example', exact: true })
      .getByRole('link', { name: /Source: NASA/ })
    await expect(credit).toContainText('Source: NASA')
    const closing = page.getByRole('region', { name: 'Add zoom to your project.', exact: true })
    await expect(
      closing.getByRole('button', { name: 'Copy install command', exact: true })
    ).toBeVisible()
    const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id))
    expect(new Set(ids).size).toBe(ids.length)
  }
})

test('rails start on the content grid and scroll across the viewport', async ({ page }) => {
  await openHome(page)
  for (const integration of [false, true]) {
    if (integration) await page.goto('/react')
    const section = page.getByRole('region', { name: 'Image zoom examples', exact: true })
    const rail = section.locator('.example-rail')
    const first = section.getByRole('article').first()
    const heading = await section.getByRole('heading', { name: 'Try the zoom.' }).boundingBox()
    const card = await first.boundingBox()
    const bounds = await rail.boundingBox()
    expect(Math.abs(card!.x - heading!.x)).toBeLessThan(2)
    expect(Math.abs(bounds!.x)).toBeLessThan(2)
    expect(Math.abs(bounds!.width - page.viewportSize()!.width)).toBeLessThan(2)
    await section.getByRole('button', { name: 'Next example', exact: true }).click()
    await expect.poll(async () => (await first.boundingBox())!.x).toBeLessThan(0)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
  }
})

test('both pages preload the same font resources across navigation', async ({ page }) => {
  await openHome(page)
  const homeFonts = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll(links => links.map(link => (link as HTMLLinkElement).href).sort())
  expect(homeFonts).toHaveLength(2)
  await page.getByRole('navigation').getByRole('link', { name: 'React', exact: true }).click()
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(2)
  const componentFonts = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll(links => links.map(link => (link as HTMLLinkElement).href).sort())
  expect(componentFonts).toEqual(homeFonts)
  await page.evaluate(() => document.fonts.ready)
  const loadedFonts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map(resource => resource.name)
      .filter(name => name.endsWith('.woff2'))
      .sort()
  )
  expect(loadedFonts).toEqual(homeFonts)
})

test('package manager preference follows navigation, reloads, and other tabs', async ({
  page,
  context,
}) => {
  await openHome(page)
  await page
    .locator('.hero-install')
    .getByRole('radio', { name: 'pnpm', exact: true })
    .press('Space')
  await expect(page.locator('.hero-install pre')).toContainText('pnpm add medium-zoom')
  await page.reload()
  await expect(
    page.locator('.hero-install').getByRole('radio', { name: 'pnpm', exact: true })
  ).toBeChecked()
  await expect(page.locator('.hero-install pre')).toContainText('pnpm add medium-zoom')

  await page.getByRole('link', { name: 'React component', exact: true }).click()
  await expect(
    page.locator('.hero-install').getByRole('radio', { name: 'pnpm', exact: true })
  ).toBeChecked()
  await expect(page.locator('.hero-install pre')).toContainText('pnpm dlx shadcn@latest add')
  await page
    .locator('.hero-install')
    .getByRole('radio', { name: 'bun', exact: true })
    .press('Space')
  await page.goBack()
  await expect(
    page.locator('.hero-install').getByRole('radio', { name: 'bun', exact: true })
  ).toBeChecked()
  await expect(page.locator('.hero-install pre')).toContainText('bun add medium-zoom')

  const otherTab = await context.newPage()
  await otherTab.goto('/react')
  await expect(
    otherTab.locator('.hero-install').getByRole('radio', { name: 'bun', exact: true })
  ).toBeChecked()
  await otherTab
    .locator('.hero-install')
    .getByRole('radio', { name: 'yarn', exact: true })
    .press('Space')
  await expect(otherTab.locator('.hero-install pre')).toContainText('yarn dlx shadcn@latest add')
  await expect(
    page.locator('.hero-install').getByRole('radio', { name: 'yarn', exact: true })
  ).toBeChecked()
  await expect(page.locator('.hero-install pre')).toContainText('yarn add medium-zoom')
  await otherTab.reload()
  await expect(
    otherTab.locator('.hero-install').getByRole('radio', { name: 'yarn', exact: true })
  ).toBeChecked()
})

test('guide links underline only on hover', async ({ page }) => {
  await openHome(page)
  for (const path of ['/website.html', '/react']) {
    await page.goto(path)
    const link = page.locator('.guide-note a').first()
    await link.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    await expect(link).toHaveCSS('text-decoration-line', 'none')
    await link.hover()
    await expect(link).toHaveCSS('text-decoration-line', 'underline')
  }
})

test('mobile branding stays in the bar and product navigation is centered in the hero', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHome(page)
  for (const integration of [false, true]) {
    if (integration) await page.goto('/react')
    for (const width of [320, 390, 680]) {
      await page.setViewportSize({ width, height: 844 })
      const bar = page.getByRole('navigation', { name: 'Main navigation', exact: true })
      const product = page.getByRole('navigation', { name: 'Product navigation', exact: true })
      await expect(page.locator('.brand-name')).toBeVisible()
      await expect(bar.getByRole('link', { name: 'React', exact: true })).toHaveCount(0)
      await expect(
        product.getByRole('link', { name: integration ? 'React' : 'JavaScript', exact: true })
      ).toHaveAttribute('aria-current', 'page')
      const barBox = (await bar.boundingBox())!
      const brandBox = (await bar.getByRole('link', { name: 'medium-zoom home' }).boundingBox())!
      const utilities = (await bar
        .getByRole('button', { name: /Switch to .* theme/ })
        .boundingBox())!
      const productBox = (await product.boundingBox())!
      const labelBox = (await page.locator('.hero .eyebrow').boundingBox())!
      expect(
        Math.abs(brandBox.y + brandBox.height / 2 - utilities.y - utilities.height / 2)
      ).toBeLessThan(1)
      expect(productBox.y).toBeGreaterThanOrEqual(barBox.y + barBox.height)
      expect(Math.abs(productBox.x + productBox.width / 2 - width / 2)).toBeLessThan(1)
      expect(labelBox.y).toBeGreaterThan(productBox.y + productBox.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      if (width === 390)
        await page.screenshot({
          path: `/tmp/medium-zoom-mobile-navigation-${integration ? 'React' : 'JavaScript'}.png`,
        })
    }
  }
})

for (const integration of [false, true]) {
  test(`wide ${integration ? 'React' : 'JavaScript'} rails reveal overflow on intent without moving cards`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1_920, height: 1_080 })
    await openHome(page)
    if (integration) await page.goto('/react')
    const section = page.getByRole('region', { name: 'Image zoom examples', exact: true })
    const rail = section.getByLabel('Scrollable examples', { exact: true })
    const first = section.getByRole('article').first()
    const sectionBox = (await section.boundingBox())!
    const firstBox = (await first.boundingBox())!
    const outsideCard = async () =>
      page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.example-card'), {
        x: sectionBox.x + sectionBox.width + 80,
        y: (await first.boundingBox())!.y + 160,
      })
    await expect.poll(outsideCard).toBe(false)
    if (!integration) await page.screenshot({ path: '/tmp/medium-zoom-wide-rail-resting.png' })
    await first.hover()
    await expect.poll(outsideCard).toBe(true)
    expect((await first.boundingBox())!.x).toBe(firstBox.x)
    await page.mouse.move(100, 100)
    await expect.poll(outsideCard).toBe(true)
    await section.getByRole('button', { name: 'Next example', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(rail).toBeFocused()
    await expect.poll(outsideCard).toBe(true)
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
    const position = await rail.evaluate(element => element.scrollLeft)
    await page.getByRole('button', { name: /Switch to .* theme/ }).focus()
    await expect.poll(outsideCard).toBe(true)
    await page.locator('#usage-title').scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        rail.evaluate(element => {
          const bounds = element.getBoundingClientRect()
          return Math.max(0, bounds.bottom - 56) / bounds.height
        })
      )
      .toBeLessThan(0.15)
    await rail.scrollIntoViewIfNeeded()
    await expect.poll(outsideCard).toBe(false)
    expect(await rail.evaluate(element => element.scrollLeft)).toBe(position)
    await section.getByRole('heading').hover()
    await expect.poll(outsideCard).toBe(true)
    expect(await rail.evaluate(element => element.scrollLeft)).toBe(position)
    await section.getByRole('button', { name: 'Next example', exact: true }).click()
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(position)
    const nextPosition = await rail.evaluate(element => element.scrollLeft)
    await page.mouse.move(100, 100)
    await expect.poll(outsideCard).toBe(true)
    expect(await rail.evaluate(element => element.scrollLeft)).toBe(nextPosition)
  })
}

for (const integration of [false, true]) {
  for (const motion of ['no-preference', 'reduce'] as const) {
    test(`Start building aligns the ${integration ? 'React' : 'JavaScript'} usage heading with ${motion} motion`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion })
      await openHome(page)
      if (integration) await page.goto('/react')
      await expect(page.locator('html')).toHaveCSS(
        'scroll-behavior',
        motion === 'no-preference' ? 'smooth' : 'auto'
      )
      await page.getByRole('link', { name: 'Start building', exact: true }).click()
      await expect(page).toHaveURL(/#usage-title$/)
      await expect(page.locator('#usage-title')).toBeFocused()
      await expect
        .poll(() =>
          page.locator('#usage-title').evaluate(element => element.getBoundingClientRect().top)
        )
        .toBeCloseTo(88, 0)
      const heading = (await page.locator('#usage-title').boundingBox())!
      const header = (await page.locator('.site-header').boundingBox())!
      expect(heading.y).toBeGreaterThan(header.y + header.height)
    })
  }
}

test('the closing action copies the selected installation command', async ({ page }) => {
  await openHome(page)
  for (const integration of [false, true]) {
    if (integration) await page.goto('/react')
    await page.locator('.hero-install').getByRole('radio', { name: 'pnpm', exact: true }).check()
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
    const closing = page.getByRole('region', { name: 'Add zoom to your project.', exact: true })
    await closing.getByRole('button', { name: 'Copy install command', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute(
      'data-copied',
      integration ? /pnpm dlx shadcn@latest add/ : 'pnpm add medium-zoom'
    )
    await expect(closing.getByRole('status')).toHaveText('Copied to clipboard')
    await closing.getByRole('radio', { name: 'yarn', exact: true }).check()
    await expect(
      page.locator('.hero-install').getByRole('radio', { name: 'yarn', exact: true })
    ).toBeChecked()
    await expect(closing.locator('pre')).toContainText(
      integration ? 'yarn dlx shadcn@latest add' : 'yarn add medium-zoom'
    )
  }
})

test('wide rail gradient edges follow resizing immediately', async ({ page }) => {
  await page.setViewportSize({ width: 1_920, height: 1_080 })
  await openHome(page)
  await page.mouse.move(100, 100)
  const section = page.getByRole('region', { name: 'Image zoom examples', exact: true })
  for (const width of [1_600, 2_560, 1_440]) {
    await page.setViewportSize({ width, height: 1_080 })
    const bounds = (await section.boundingBox())!
    const edges = await section.locator('.rail-window').evaluate(element => ({
      left: Number.parseFloat(getComputedStyle(element, '::before').left),
      right: Number.parseFloat(getComputedStyle(element, '::after').right),
    }))
    expect(edges.left).toBeCloseTo(bounds.x, 0)
    expect(edges.right).toBeCloseTo(width - bounds.x - bounds.width, 0)
  }
})
