import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './website-fixture'

const origin = 'https://medium-zoom.francoischalifour.com'
const pages = [
  ['/docs/', 'Overview'],
  ['/docs/javascript/', 'JavaScript quickstart'],
  ['/docs/react/', 'React quickstart'],
  ['/docs/guides/hd-images/', 'HD images'],
  ['/docs/guides/galleries/', 'Galleries'],
  ['/docs/guides/styling/', 'Styling'],
  ['/docs/guides/custom-react-triggers/', 'Custom triggers'],
  ['/docs/guides/controlled-state/', 'Controlled state'],
  ['/docs/guides/server-rendering/', 'Server rendering'],
  ['/docs/reference/javascript/medium-zoom/', 'mediumZoom()'],
  ['/docs/reference/javascript/options/', 'Options'],
  ['/docs/reference/javascript/methods/', 'Methods'],
  ['/docs/reference/javascript/events/', 'Events'],
  ['/docs/reference/react/image-zoom/', '<ImageZoom>'],
  ['/docs/reference/react/composition/', 'Composition'],
] as const

test('collapsed docs navigation stays inside the article column on phones and tablets', async ({
  page,
}) => {
  await page.goto('/docs/javascript/')
  for (const width of [390, 1_024]) {
    await page.setViewportSize({ width, height: 900 })
    const main = page.locator('.docs-main')
    const menus = main.locator('.docs-mobile-navigation')
    await expect(menus).toBeVisible()
    const mainBounds = (await main.boundingBox())!
    const menuBounds = (await menus.boundingBox())!
    expect(menuBounds.x).toBe(mainBounds.x)
    expect(menuBounds.width).toBe(mainBounds.width)
    const documentation = menus.getByText('Documentation', { exact: true }).first()
    if (width === 390) await expect(documentation).toBeVisible()
    else await expect(documentation).toBeHidden()
    await expect(menus.locator('summary').last()).toHaveText('On this page')
  }
  await page.setViewportSize({ width: 1_024, height: 900 })
  await page.goto('/docs/')
  await expect(page.locator('.docs-mobile-navigation')).toBeHidden()
})

test('the active outline section keeps its rail marker without a fill or underline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1_440, height: 900 })
  await page.goto('/docs/javascript/')
  const link = page.locator('.docs-outline a[href="#initialize-the-zoom"]')
  await link.click()
  await expect(link).toHaveAttribute('aria-current', 'location')
  await link.hover()
  await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(link).toHaveCSS('text-decoration-line', 'none')
  expect(await link.evaluate(element => getComputedStyle(element, '::before').width)).toBe('2px')
})

for (const theme of ['light', 'dark'] as const) {
  test(`docs scroll indicators follow overflow and keyboard focus in ${theme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/docs/guides/hd-images/')
    const menu = page.locator('.docs-mobile-navigation details').first()
    await menu.locator('summary').click()
    const area = menu.locator('.scroll-area')
    const viewport = area.locator('.scroll-area-viewport')
    await expect(area).not.toHaveAttribute('data-scroll-above')
    await expect(area).toHaveAttribute('data-scroll-below', '')
    expect(await area.evaluate(element => getComputedStyle(element, '::after').opacity)).toBe('1')
    await viewport.evaluate(element => {
      element.scrollTop = (element.scrollHeight - element.clientHeight) / 2
    })
    await expect(area).toHaveAttribute('data-scroll-above', '')
    await expect(area).toHaveAttribute('data-scroll-below', '')
    await area.getByRole('link', { name: 'Composition', exact: true }).focus()
    await expect(area).toHaveAttribute('data-scroll-above', '')
    await expect(area).not.toHaveAttribute('data-scroll-below')
    expect(await area.evaluate(element => getComputedStyle(element, '::after').opacity)).toBe('0')
    await menu.locator('summary').click()
    await menu.locator('summary').click()
    await expect(area).toHaveAttribute('data-scroll-above', '')
    const contents = page.locator('.docs-mobile-navigation details').last()
    await contents.locator('summary').click()
    await expect(contents.locator('.scroll-area')).not.toHaveAttribute('data-scroll-above')
    await expect(contents.locator('.scroll-area')).not.toHaveAttribute('data-scroll-below')
    await page.setViewportSize({ width: 1_440, height: 600 })
    await expect(page.locator('.docs-sidebar')).toHaveAttribute('data-scroll-below', '')
    await page.setViewportSize({ width: 1_440, height: 1_500 })
    await expect(page.locator('.docs-sidebar')).not.toHaveAttribute('data-scroll-below')
  })
}

test('anchor arrival waits for scrolling, fades away, and repeats for the same destination', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1_440, height: 900 })
  await page.goto('/docs/reference/javascript/methods/')
  const link = page.locator('.docs-outline a[href="#getzoomedimage"]')
  const heading = page.locator('h2#getzoomedimage')
  await link.click()
  await expect(heading).toHaveAttribute('data-anchor-arrival', '')
  await expect(heading).toBeInViewport()
  await expect(link).toHaveAttribute('aria-current', 'location')
  const position = await page.evaluate(() => window.scrollY)
  await expect(heading).not.toHaveAttribute('data-anchor-arrival', '', { timeout: 3_000 })
  expect(await page.evaluate(() => window.scrollY)).toBe(position)
  await link.click()
  await expect(heading).toHaveAttribute('data-anchor-arrival', '')
  await page.locator('.docs-outline a[href="#open"]').click()
  await expect(page.locator('#open')).toHaveAttribute('data-anchor-arrival', '')
  await expect(heading).not.toHaveAttribute('data-anchor-arrival', '')
  await page.goBack()
  await expect(heading).toHaveAttribute('data-anchor-arrival', '')
})

test('mobile contents menus close before landing and transfer keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/docs/guides/custom-react-triggers/')
  const menu = page.locator('.docs-mobile-navigation details').last()
  await menu.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('open', '')
  await expect(menu.locator('.docs-contents-title')).toBeHidden()
  const link = menu.getByRole('link', { name: 'Style the trigger', exact: true })
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(menu).not.toHaveAttribute('open', '')
  const heading = page.locator('#style-the-trigger')
  await expect(heading).toHaveAttribute('data-anchor-arrival', '')
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

test('deep links and compatibility markers show static arrival feedback with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/docs/javascript/#add-an-image')
  const heading = page.locator('#add-an-image')
  await expect(heading).toHaveAttribute('data-anchor-arrival', '')
  expect(
    await heading.evaluate(element => getComputedStyle(element, '::before').animationName)
  ).toBe('none')
  await expect(heading).not.toHaveAttribute('data-anchor-arrival', '', { timeout: 3_000 })
  await page.goto('/docs/guides/hd-images/#data-zoom-src')
  await expect(page.locator('[data-anchor-arrival]')).toBeVisible()
  await expect(page.locator('#data-zoom-src')).not.toHaveAttribute('data-anchor-arrival', '')
  await page.goto('/docs/javascript/#%E0%A4%A')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

for (const [path, title] of pages) {
  test(`${title} ships complete HTML, anchors and metadata`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    try {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-weight', '550')
      await expect(page).toHaveTitle(`${title} — medium-zoom documentation`)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + path)
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        origin + path
      )
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S.{40}/)
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        'content',
        (await page.locator('meta[name="description"]').getAttribute('content')) || ''
      )
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
        'content',
        `${title} — medium-zoom documentation`
      )
      const schema = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent()) || '{}'
      )
      expect(schema['@type']).toBe('TechArticle')
      expect(schema.url).toBe(origin + path)
      const ids = await page
        .locator('[id]')
        .evaluateAll(elements => elements.map(element => element.id))
      expect(new Set(ids).size).toBe(ids.length)
      const links = await page
        .locator('a[href]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('href')!))
      for (const href of new Set(links)) {
        if (href.startsWith('#')) await expect(page.locator(href)).toHaveCount(1)
        if (href.startsWith('/')) {
          const destination = href === '/' ? '/website.html' : href
          const result = await context.request.get(destination)
          expect(result.status(), href).toBe(200)
          const hash = new URL(href, origin).hash
          if (hash) expect(await result.text(), href).toContain(`id="${hash.slice(1)}"`)
        }
      }
      if (path !== '/docs/') {
        await expect(page.locator('article pre code').first()).not.toBeEmpty()
        await expect(page.locator('article pre code span[style]').first()).toBeAttached()
      }
      const sitemap = await (await context.request.get('/sitemap.xml')).text()
      expect(sitemap).toContain(`<loc>${origin}${path}</loc>`)
    } finally {
      await context.close()
    }
  })
}

test('documentation navigation preserves package manager and theme preferences', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.setViewportSize({ width: 1_440, height: 900 })
  await page.goto('/website.html')
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .locator('a[href="/docs/"]')
    .click()
  await page
    .getByRole('navigation', { name: 'Choose your setup' })
    .getByRole('link', { name: /JavaScript quickstart/ })
    .click()
  await page
    .locator('#javascript-installation')
    .getByRole('radio', { name: 'bun', exact: true })
    .check()
  await expect(page.locator('#javascript-installation')).toContainText('bun add medium-zoom')
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .locator('a[href="/docs/"]')
    .click()
  await page
    .getByRole('navigation', { name: 'Choose your setup' })
    .getByRole('link', { name: /React quickstart/ })
    .click()
  await expect(
    page.locator('#react-installation').getByRole('radio', { name: 'bun', exact: true })
  ).toBeChecked()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.locator('.docs-sidebar a[href="/docs/reference/javascript/options/"]').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page
    .getByRole('navigation', { name: 'Related reference' })
    .getByRole('link', { name: 'Methods', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Methods')
  await page
    .getByRole('navigation', { name: 'Related reference' })
    .getByRole('link', { name: 'Options', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Options')
  await page.locator('.docs-sidebar a[href="/docs/javascript/"]').click()
  await expect(
    page.locator('#javascript-installation').getByRole('radio', { name: 'bun', exact: true })
  ).toBeChecked()
  expect(errors).toEqual([])
})

test('the React quickstart loads the preview before requesting the full-size zoom image', async ({
  page,
}) => {
  const images: string[] = []
  page.on('request', request => {
    if (request.resourceType() === 'image') images.push(new URL(request.url()).pathname)
  })
  await page.goto('/docs/react/')
  const trigger = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
  await trigger.locator('img').evaluate(image => (image as HTMLImageElement).decode())
  expect(images).toContain('/assets/images/ocean-sunset-preview.webp')
  expect(images).not.toContain('/assets/images/ocean-sunset.jpg')
  await trigger.click()
  await expect(
    page.locator('.medium-zoom-image--opened[src="/assets/images/ocean-sunset.jpg"]')
  ).toBeVisible()
  expect(images).toContain('/assets/images/ocean-sunset.jpg')
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('keyboard zoom survives interaction before hydration finishes loading', async ({ page }) => {
  let resume!: () => void
  const hydration = new Promise<void>(resolve => {
    resume = resolve
  })
  await page.route(/\/assets\/hydrate-.*\.js$/, async route => {
    await hydration
    await route.continue()
  })
  await page.goto('/docs/react/', { waitUntil: 'commit' })
  const trigger = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
  try {
    await trigger.focus()
    await page.keyboard.press('Tab')
    await expect(trigger).not.toBeFocused()
    await trigger.focus()
    await page.keyboard.press('Enter')
  } finally {
    resume()
  }
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
  await expect(trigger).toBeFocused()
})

test('live examples support keyboard zoom and controlled close requests', async ({ page }) => {
  const examples = [
    '/docs/react/',
    '/docs/guides/custom-react-triggers/',
    '/docs/guides/controlled-state/',
  ]
  for (const [index, example] of examples.entries()) {
    await page.goto(example)
    const trigger = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
    await trigger.locator('img').evaluate(image => (image as HTMLImageElement).decode())
    await trigger.focus()
    await page.keyboard.press(index === 1 ? 'Space' : 'Enter')
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    if (index === 2)
      await expect(page.locator('.docs-preview').getByRole('status')).toHaveText('Image is open')
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
    await expect(trigger).toBeFocused()
  }
  await expect(page.locator('.docs-preview').getByRole('status')).toHaveText('Image is closed')
  await page.getByRole('button', { name: 'Open image', exact: true }).click()
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await expect(page.locator('.docs-preview').getByRole('status')).toHaveText('Image is closed')
  await page.goto('/docs/javascript/')
  await page.getByRole('button', { name: 'Enlarge ocean sunset', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('code copy uses the displayed TypeScript example', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard read permission is available in Chromium.')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/docs/guides/controlled-state/')
  await page.getByRole('tab', { name: 'Code', exact: true }).click()
  await page.getByRole('button', { name: 'Copy controlled-photo.tsx', exact: true }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('open={open} onOpenChange={setOpen}')
  expect(copied).toContain("import * as ImageZoom from '@/components/ui/image-zoom'")
  expect(copied).not.toContain('<span')
  await expect(page.getByRole('status').filter({ hasText: 'Copied to clipboard' })).toBeVisible()
})

test('mobile navigation and outline work without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/docs/')
  const menu = page.locator('.docs-mobile-navigation details').first()
  await menu.locator('summary').focus()
  await page.keyboard.press('Enter')
  await menu.getByRole('link', { name: 'Controlled state', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Controlled state')
  const outline = page.locator('.docs-mobile-navigation details').last()
  await outline.locator('summary').click()
  await outline.getByRole('link', { name: 'Control the zoom', exact: true }).click()
  await expect(page).toHaveURL(/#control-the-zoom$/)
  await expect(page.locator('#control-the-zoom')).toBeInViewport()
  for (const [path] of pages) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1_024, height: 800 })
  await expect(page.locator('.docs-outline')).toBeHidden()
  await expect(page.locator('.docs-sidebar')).toBeVisible()
})

for (const theme of ['light', 'dark'] as const) {
  for (const [path] of pages) {
    test(`${path} is accessible in ${theme} theme on desktop and mobile`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      await page.goto(path)
      for (const width of [1_440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        if (width === 390)
          await page.locator('.docs-mobile-navigation details').first().locator('summary').click()
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze()
        expect(result.violations).toEqual([])
      }
    })
  }
}

test('section links and sticky navigation clear the header', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1_440, 1_024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/docs/reference/javascript/methods/#attach')
    const header = await page.locator('.site-header').boundingBox()
    const heading = await page.locator('#attach').boundingBox()
    expect(heading!.y - (header!.y + header!.height)).toBeGreaterThanOrEqual(24)
    expect(heading!.y - (header!.y + header!.height)).toBeLessThanOrEqual(40)
    for (const selector of ['.docs-sidebar', '.docs-outline']) {
      const navigation = page.locator(selector)
      if (await navigation.isVisible()) {
        const bounds = await navigation.boundingBox()
        expect(bounds!.y - (header!.y + header!.height)).toBeGreaterThanOrEqual(24)
      }
    }
    await page.goto('/docs/guides/hd-images/#data-zoom-src')
    const hd = await page.locator('#data-zoom-src').boundingBox()
    expect(hd!.y).toBeGreaterThanOrEqual(header!.height + 24)
  }
})

test('formatted code fits the article at desktop and mobile widths', async ({ page }) => {
  for (const width of [1_440, 1_024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [path] of pages) {
      await page.goto(path)
      const overflowing = await page
        .locator('.docs-article pre')
        .evaluateAll(
          blocks => blocks.filter(block => block.scrollWidth > block.clientWidth + 1).length
        )
      expect(overflowing).toBe(0)
    }
  }
})

test('each quickstart includes installation and a working image', async ({ page }) => {
  for (const language of ['JavaScript', 'React']) {
    await page.goto('/docs/')
    await page
      .getByRole('navigation', { name: 'Choose your setup' })
      .getByRole('link', { name: new RegExp(`${language} quickstart`) })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${language} quickstart`)
    await expect(page.getByRole('button', { name: 'Copy install command' })).toBeVisible()
    await expect(page.locator('.docs-preview img')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Related reference' })).toHaveCount(0)
  }
})

test('documentation navigation uses background hover states', async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 })
  await page.goto('/docs/')
  for (const link of [
    page.locator('.docs-sidebar a[href="/docs/javascript/"]'),
    page.locator('.docs-reference-links a').first(),
  ]) {
    await link.hover()
    await expect(link).toHaveCSS('text-decoration-line', 'none')
    await expect(link).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  }
  const articleLink = page.locator('article').getByRole('link', {
    name: 'HD images',
    exact: true,
  })
  await articleLink.hover()
  await expect(articleLink).toHaveCSS('text-decoration-line', 'underline')
  await page.setViewportSize({ width: 390, height: 844 })
  const menu = page.locator('.docs-mobile-navigation details').first()
  await menu.locator('summary').click()
  const mobileLink = menu.locator('a[href="/docs/javascript/"]')
  await mobileLink.hover()
  await expect(mobileLink).toHaveCSS('text-decoration-line', 'none')
  await expect(mobileLink).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
})

for (const theme of ['light', 'dark'] as const) {
  test(`shared tab controls retain readable text and background selection in ${theme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme })
    for (const path of ['/docs/javascript/', '/website.html', '/react']) {
      await page.goto(path)
      const values = await page
        .locator('.package-switch label, .demo-tabs button')
        .evaluateAll(elements => {
          const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number)
          const luminance = (color: number[]) =>
            color
              .slice(0, 3)
              .map(value => {
                const channel = value / 255
                return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
              })
              .reduce(
                (total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index],
                0
              )
          const contrast = (first: number[], second: number[]) => {
            const a = luminance(first),
              b = luminance(second)
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
          }
          const background = (element: Element): number[] => {
            const color = rgb(getComputedStyle(element).backgroundColor)
            return color.length === 4 && color[3] === 0 && element.parentElement
              ? background(element.parentElement)
              : color
          }
          return elements.map(element => {
            const style = getComputedStyle(element)
            const fill = background(element)
            const selected =
              element.classList.contains('is-selected') ||
              element.getAttribute('aria-selected') === 'true'

            return {
              label: element.textContent,
              text: contrast(rgb(style.color), fill),
              selected,
              shadow: style.boxShadow,
              fill: contrast(fill, background(element.parentElement!)),
            }
          })
        })
      expect(values.length).toBeGreaterThan(0)
      for (const value of values) {
        expect(value.text, `${path}: ${value.label}`).toBeGreaterThanOrEqual(4.5)
        if (value.selected) {
          expect(value.shadow).toBe('none')
          expect(value.fill, `${path}: ${value.label}`).toBeGreaterThan(1)
        }
      }
    }
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`article links use clearer underlines in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/docs/react/')
    const link = page.locator('article').getByRole('link', { name: 'Custom triggers', exact: true })
    const colors = await link.evaluate(element => ({
      underline: getComputedStyle(element).textDecorationColor,
      foreground: getComputedStyle(element).color,
      border: getComputedStyle(document.querySelector('.code-block')!).borderTopColor,
    }))
    expect(colors.underline).not.toBe(colors.foreground)
    expect(colors.underline).not.toBe(colors.border)
    await link.hover()
    await expect(link).toHaveCSS('text-decoration-color', colors.foreground)
    await page.mouse.move(0, 0)
    await link.focus()
    await expect(link).toHaveCSS('text-decoration-color', colors.foreground)
  })
}

test('image preview triggers follow the image bounds and corner radius', async ({ page }) => {
  for (const width of [1_440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of [
      '/docs/react/',
      '/docs/guides/custom-react-triggers/',
      '/docs/guides/controlled-state/',
    ]) {
      await page.goto(path)
      const trigger = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
      const image = trigger.locator('img')
      await image.evaluate(element => (element as HTMLImageElement).decode())
      const triggerBounds = await trigger.boundingBox()
      const imageBounds = await image.boundingBox()
      expect(triggerBounds).toEqual(imageBounds)
      const radius = await image.evaluate(element => getComputedStyle(element).borderRadius)
      await expect(trigger).toHaveCSS('border-radius', radius)
    }
  }
})

test('Documentation shares the section navigation across desktop and mobile', async ({ page }) => {
  for (const width of [1_440, 740, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [path, current] of [
      ['/website.html', 'JavaScript'],
      ['/react', 'React'],
      ['/docs/', 'Docs'],
    ]) {
      await page.goto(path)
      const sections =
        width <= 680
          ? page.getByRole('navigation', { name: 'Product navigation', exact: true })
          : page
              .getByRole('navigation', { name: 'Main navigation', exact: true })
              .locator('.section-links')
      for (const label of ['JavaScript', 'React', 'Docs']) {
        await expect(sections.getByRole('link', { name: label, exact: true })).toBeVisible()
        await expect(sections.getByRole('link', { name: label, exact: true })).toBeInViewport({
          ratio: 1,
        })
      }
      await expect(sections.getByRole('link', { name: current, exact: true })).toHaveAttribute(
        'aria-current',
        'page'
      )
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
    }
  }
})

test('named reference links use background hover states', async ({ page }) => {
  await page.goto('/docs/reference/javascript/options/')
  const navigation = page.getByRole('navigation', { name: 'Related reference', exact: true })
  for (const name of ['mediumZoom()', 'Methods']) {
    const link = navigation.getByRole('link', { name })
    await link.hover()
    await expect(link).toHaveCSS('text-decoration-line', 'none')
    await expect(link).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  }
  await navigation.getByRole('link', { name: 'Methods', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Methods')
})

test('documentation code headers are compact with usable copy buttons', async ({ page }) => {
  await page.goto('/docs/reference/javascript/medium-zoom/')
  for (const caption of await page.locator('.docs-code .code-caption').all()) {
    const bounds = await caption.boundingBox()
    expect(bounds!.height).toBeLessThanOrEqual(40)
    const button = await caption.getByRole('button').boundingBox()
    expect(button!.height).toBeGreaterThanOrEqual(24)
    expect(button!.width).toBeGreaterThanOrEqual(24)
  }
})

for (const theme of ['light', 'dark'] as const) {
  test(`code headers use the page background in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    for (const path of [
      '/docs/javascript/',
      '/docs/reference/javascript/medium-zoom/',
      '/website.html',
      '/react',
    ]) {
      await page.goto(path)
      const background = await page
        .locator('html')
        .evaluate(element => getComputedStyle(element).backgroundColor)
      const captions = page.locator('.code-block > .code-caption')
      await expect(captions.first()).toBeVisible()
      for (const caption of await captions.all()) {
        await expect(caption).toHaveCSS('background-color', background)
      }
    }
  })
}

test('the JavaScript preview opens on a pointer click and closes on the enlarged image', async ({
  page,
}) => {
  await page.goto('/docs/javascript/')
  const trigger = page.getByRole('button', { name: 'Enlarge ocean sunset', exact: true })
  await trigger.locator('img').evaluate(image => (image as HTMLImageElement).decode())
  await trigger.click()
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  const enlargedImage = page.locator('.medium-zoom-image--opened')
  await expect(enlargedImage).toBeVisible()
  await enlargedImage.click()
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
  await expect(enlargedImage).toHaveCount(0)
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('the gallery shows four independently zoomable images in two rows', async ({ page }) => {
  for (const width of [1_440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/docs/guides/galleries/')
    const triggers = page.locator('.docs-preview .photo-gallery [data-slot="image-zoom-trigger"]')
    await expect(triggers).toHaveCount(4)
    for (const trigger of await triggers.all()) {
      const image = trigger.locator('img')
      await image.evaluate(element => (element as HTMLImageElement).decode())
      const alt = await image.getAttribute('alt')
      await trigger.click()
      await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
      const enlarged = page.locator('.medium-zoom-image--opened')
      await expect(enlarged).toHaveAttribute('alt', alt!)
      await page.keyboard.press('Escape')
      await expect(enlarged).toHaveCount(0)
    }
    const bounds = await Promise.all(
      (await triggers.all()).map(async trigger => (await trigger.boundingBox())!)
    )
    expect(Math.abs(bounds[0].y - bounds[1].y)).toBeLessThan(1)
    expect(Math.abs(bounds[2].y - bounds[3].y)).toBeLessThan(1)
    expect(bounds[2].y).toBeGreaterThan(bounds[0].y + bounds[0].height)
    expect(Math.abs(bounds[0].x - bounds[2].x)).toBeLessThan(1)
    expect(Math.abs(bounds[1].x - bounds[3].x)).toBeLessThan(1)
  }
})

test('option and prop metadata separates types, defaults, and required values', async ({
  page,
}) => {
  await page.goto('/docs/reference/javascript/options/')
  const background = page.locator('#background + p + .docs-property-meta')
  await expect(background.getByRole('term')).toHaveText(['Type', 'Default'])
  await expect(background.getByRole('definition')).toHaveText(['string', "'#fff'"])
  await page.goto('/docs/reference/react/image-zoom/')
  const disabled = page.locator('.docs-prop').filter({
    has: page.getByRole('heading', { level: 3, name: 'disabled', exact: true }),
  })
  await expect(disabled.getByRole('definition')).toHaveText(['boolean', 'false'])
  const alt = page.locator('.docs-prop').filter({
    has: page.getByRole('heading', { level: 3, name: 'alt', exact: true }),
  })
  await expect(alt.getByText('Required', { exact: true })).toBeVisible()
  await expect(alt.getByRole('definition')).toHaveText(['string'])
  await page.goto('/docs/reference/react/composition/')
  const children = page.locator('.docs-prop').filter({
    has: page.getByRole('heading', { level: 3, name: 'children', exact: true }),
  })
  await expect(children.getByText('Required', { exact: true })).toBeVisible()
  await expect(children.getByRole('definition')).toHaveText(['ReactNode'])
})

test('every live photo preview explains how to zoom', async ({ page }) => {
  for (const path of [
    '/docs/javascript/',
    '/docs/react/',
    '/docs/guides/hd-images/',
    '/docs/guides/galleries/',
    '/docs/guides/styling/',
    '/docs/guides/custom-react-triggers/',
    '/docs/guides/controlled-state/',
  ]) {
    await page.goto(path)
    const preview = page.locator('.docs-preview')
    await expect(preview.getByText('Click to zoom', { exact: true })).toBeVisible()
    await expect(preview.getByText('Click, esc or scroll to close', { exact: true })).toBeVisible()
    await expect(preview.locator('.zoom-controls kbd')).toHaveText('esc')
    await expect(preview.getByRole('button').first()).toHaveCSS('cursor', 'zoom-in')
  }
})

test('example tabs expose copyable code and preserve the working preview', async ({
  page,
  browser,
}) => {
  await page.goto('/docs/guides/galleries/')
  const example = page.locator('.docs-example')
  await example.getByRole('tab', { name: 'Preview', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(example.getByRole('tab', { name: 'Code', exact: true })).toBeFocused()
  await expect(example.getByRole('button', { name: 'Copy gallery.tsx', exact: true })).toBeVisible()
  await expect(example.getByRole('button', { name: 'Copy gallery.css', exact: true })).toBeVisible()
  await expect(example.locator('.docs-preview')).toBeHidden()
  await page.keyboard.press('Home')
  await expect(example.locator('.docs-preview')).toBeVisible()
  await example.locator('img').first().click()
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const staticPage = await context.newPage()
    await staticPage.goto('/docs/guides/galleries/')
    await expect(staticPage.locator('.docs-example-code')).toBeVisible()
    await expect(staticPage.locator('.docs-example pre').first()).toContainText('ImageZoom')
  } finally {
    await context.close()
  }
})
