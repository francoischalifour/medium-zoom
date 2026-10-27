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
    await expect(page.getByRole('option').first().locator('mark').first()).toHaveText('margin')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(search).toHaveValue('')
    await search.fill('margin')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/docs\/reference\/javascript\/options\/#margin$/)
    await expect(page.locator('#margin')).toBeInViewport()
    await page.goBack()
    await expect(page.getByRole('combobox')).toHaveValue('margin')
    expect(new URL(page.url()).searchParams.get('q')).toBe('margin')
  })
}

test('aliases, keyboard selection, empty state, and modal accessibility', async ({ page }) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.fill('toggle')
  await expect(page.getByRole('option').first()).toContainText('toggle()')
  await expect(page.getByRole('option', { name: /Switch to .* theme/ })).toHaveCount(0)
  await search.fill('nextjs')
  await expect(page.getByRole('option').first()).toContainText('Server rendering')
  await search.fill('high resolution')
  await expect(page.getByRole('option').first()).toContainText('HD images')
  await search.fill('nothing matches this query')
  await expect(page.getByText('No matches found')).toBeVisible()
  await expect(page.getByRole('option', { name: /Ask ChatGPT/ })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('0 matches')
  await expect(page.getByRole('option')).toHaveCount(2)
  await expect(page.getByRole('option', { name: /^Ask ChatGPT/ })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  const emptyReport = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(emptyReport.violations).toEqual([])
  await search.fill('')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { selected: true })).toContainText('React quickstart')
  const report = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(report.violations).toEqual([])
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/docs\/react\/$/)
})

test('the theme action updates the control and persists across reloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await page.getByRole('combobox').fill('theme')
  await page.getByRole('option', { name: 'Switch to dark theme' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /Search docs/ })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
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

test('query highlighting preserves API punctuation and works in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.fill('imagezoom')
  const first = page.getByRole('option').first()
  await expect(first).toHaveAccessibleName(/^<ImageZoom>/)
  await expect(first.locator('mark')).toHaveText(['ImageZoom', 'ImageZoom'])
  await search.fill('open()')
  await expect(first).toHaveAccessibleName(/^open\(\)/)
  await expect(first.locator('.command-title mark')).toHaveText('open')
  const report = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(report.violations).toEqual([])
})

for (const [query, path, highlight] of [
  ['javscript', '/docs/javascript/', 'JavaScript'],
  ['galery', '/docs/guides/galleries/', 'gallery'],
  ['gall', '/docs/guides/galleries/', 'Galleries'],
  ['react controled', '/docs/guides/controlled-state/', 'Controlled'],
  ['magrin', '/docs/reference/javascript/options/#margin', 'margin'],
  ['opne', '/docs/reference/javascript/methods/#open', 'open'],
  ['scroll distance', '/docs/reference/javascript/options/#scrolloffset', 'scroll'],
  ['scroll offset', '/docs/reference/javascript/options/#scrolloffset', 'scroll'],
  ['image zoom', '/docs/reference/react/image-zoom/', 'Image'],
  ['onopenchange', '/docs/reference/react/image-zoom/#state-props', 'onOpenChange'],
  ['on', '/docs/reference/javascript/methods/#on', 'on'],
  ['off', '/docs/reference/javascript/methods/#off', 'off'],
]) {
  test(`local search ranks and highlights ${query}`, async ({ page }) => {
    await page.goto('/docs/react/')
    await page.getByRole('button', { name: /Search docs/ }).click()
    await page.getByRole('combobox').fill(query)
    const results = page
      .getByRole('group', { name: 'Documentation', exact: true })
      .getByRole('option')
    await expect(results.first()).toHaveAttribute('href', path)
    await expect(
      results.first().locator('mark').filter({ hasText: highlight }).first()
    ).toBeVisible()
    if (query === 'scroll distance') {
      await expect(results.first().locator('.command-description')).toContainText(
        'scroll distance in pixels'
      )
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/docs\/reference\/javascript\/options\/#scrolloffset$/)
      await expect(page.locator('#scrolloffset')).toBeInViewport()
    }
    if (query === 'off') {
      await expect(results.filter({ hasText: 'scrollOffset' })).toHaveCount(0)
    }
  })
}

test('API query casing preserves the same results and ranking', async ({ page }) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  const results = page
    .getByRole('group', { name: 'Documentation', exact: true })
    .getByRole('option')
  for (const [lowercase, variants, firstPath] of [
    ['srcset', ['srcSet', 'SRCSET'], '/docs/guides/hd-images/'],
    [
      'onopenchange',
      ['onOpenChange', 'ONOPENCHANGE'],
      '/docs/reference/react/image-zoom/#state-props',
    ],
    ['imagezoom', ['ImageZoom', 'IMAGEZOOM'], '/docs/reference/react/image-zoom/'],
  ] as const) {
    await search.fill(lowercase)
    await expect(results.first()).toHaveAttribute('href', firstPath)
    const paths = await results.evaluateAll(elements =>
      elements.map(element => element.getAttribute('href'))
    )
    for (const variant of variants) {
      await search.fill(variant)
      await expect
        .poll(() =>
          results.evaluateAll(elements => elements.map(element => element.getAttribute('href')))
        )
        .toEqual(paths)
    }
  }
})

test('the search engine loads on demand and is reused after closing the palette', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', request => {
    if (request.url().includes('_virtual_docs-search-')) {
      requests.push(request.url())
    }
  })
  await page.goto('/docs/react/')
  await expect(page.getByRole('button', { name: /Search docs/ })).toBeVisible()
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: /Search docs/ }).click()
  await expect(page.getByRole('option').first()).toBeVisible()
  expect(requests).toHaveLength(1)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await page.getByRole('combobox').fill('scroll distance')
  await expect(page.getByRole('option').first()).toHaveAttribute(
    'href',
    '/docs/reference/javascript/options/#scrolloffset'
  )
  expect(requests).toHaveLength(1)
})

for (const [name, hostname, pathname] of [
  ['ChatGPT', 'chatgpt.com', '/'],
  ['Claude', 'claude.ai', '/new'],
]) {
  test(`opens a contextual question in ${name}`, async ({ page, context }) => {
    // Verify the handoff without submitting test prompts to an external assistant.
    await context.route(`https://${hostname}/**`, route =>
      route.fulfill({ body: '<title>Chat handoff</title>', contentType: 'text/html' })
    )
    await page.goto('/docs/react/')
    await page.getByRole('button', { name: /Search docs/ }).click()
    await expect(page.getByRole('option', { name: `Ask ${name}` })).toHaveCount(0)
    const question = 'How do I control React zoom state? & preserve focus #1'
    await page.getByRole('combobox').fill(question)
    await expect(
      page.getByRole('option', { name: `Ask ${name}` }).locator('.command-detail')
    ).toHaveText(question)
    const popupPromise = page.waitForEvent('popup')
    if (name === 'ChatGPT') {
      await page.keyboard.press('Enter')
    } else {
      await page.getByRole('option', { name: new RegExp(`Ask ${name}`) }).click()
    }
    const popup = await popupPromise
    await popup.waitForLoadState()
    const url = new URL(popup.url())
    expect(url.hostname).toBe(hostname)
    expect(url.pathname).toBe(pathname)
    expect(url.searchParams.get('q')).toBe(
      `${question}\n\nRead https://medium-zoom.francoischalifour.com/docs/react/ and answer`
    )
    expect(await popup.evaluate(() => window.opener)).toBeNull()
    await popup.close()
  })
}

test('balances actions, matching documentation, and chat handoffs', async ({ page }) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const groups = page.getByRole('dialog').getByRole('group')
  await expect(groups.nth(0)).toHaveAccessibleName('Get started')
  await expect(groups.nth(1)).toHaveAccessibleName('Actions')
  await expect(groups.nth(2)).toHaveAccessibleName('Popular')
  const search = page.getByRole('combobox')
  await search.fill('inst')
  await expect(groups.nth(0)).toHaveAccessibleName('Actions')
  await expect(groups.nth(1)).toHaveAccessibleName('Documentation')
  await expect(groups.nth(2)).toHaveAccessibleName('Open in chat')
  await expect(page.getByRole('option').first()).toContainText('Copy React install command')
  await expect(
    page.getByRole('group', { name: 'Documentation', exact: true }).getByRole('option')
  ).toHaveCount(5)
  await search.fill('margin')
  await expect(groups).toHaveCount(2)
  await expect(groups.nth(0)).toHaveAccessibleName('Documentation')
  await expect(groups.nth(1)).toHaveAccessibleName('Open in chat')
  await expect(page.getByRole('option').first()).toContainText('margin')
})

test('search URLs hydrate when the browser does not report paint timing', async ({ page }) => {
  await page.addInitScript(() => {
    window.PerformanceObserver = class extends PerformanceObserver {
      observe(options?: PerformanceObserverInit) {
        if (options?.type !== 'paint') {
          super.observe(options)
        }
      }
    }
  })
  await page.goto('/docs/javascript/?q=margin#install-the-package')
  await expect(page.getByRole('combobox')).toBeFocused()
  await expect(page.getByRole('combobox')).toHaveValue('margin')
  await expect(page.getByRole('option').first()).toContainText('margin')
})

test('search URLs preserve page context and reopen the same query', async ({ page }) => {
  await page.goto('/docs/javascript/?utm_source=search-test#install-the-package')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.fill('margin')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('margin')
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('search-test')
  expect(new URL(page.url()).hash).toBe('#install-the-package')
  await page.reload()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('margin')
  await expect(page.getByRole('option').first()).toContainText('margin')
  await search.fill('')
  await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false)
  await expect(page.getByRole('dialog')).toBeVisible()
  await search.fill('HD images')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('HD images')
  await page.keyboard.press('Escape')
  await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false)
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('search-test')
  expect(new URL(page.url()).hash).toBe('#install-the-package')
})

test('browser Back and Forward restore search and its destination', async ({ page }) => {
  await page.goto('/docs/?q=galleries')
  await expect(page.getByRole('option').first()).toHaveAccessibleName(/^Multiple images/)
  await page.getByRole('combobox').press('Enter')
  await expect(page).toHaveURL(/\/docs\/guides\/multiple-images\/$/)
  await page.goBack()
  await expect(page.getByRole('combobox')).toHaveValue('galleries')
  await page.goForward()
  await expect(page).toHaveURL(/\/docs\/guides\/multiple-images\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Multiple images' })).toBeVisible()
})

test('documentation results support opening in another tab', async ({ page, context }) => {
  await page.goto('/docs/?q=margin')
  const result = page.getByRole('option', { name: /^margin Options/ })
  await expect(result).toBeVisible()
  const popupPromise = context.waitForEvent('page')
  await expect(result).toHaveAttribute('href', '/docs/reference/javascript/options/#margin')
  await result.click({ modifiers: ['ControlOrMeta'] })
  const popup = await popupPromise
  await expect(popup).toHaveURL(/\/docs\/reference\/javascript\/options\/#margin$/)
  await expect(popup.getByRole('heading', { name: 'margin', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveValue('margin')
  await popup.close()
})

test('the search action keeps its accessible name at full and compact widths', async ({ page }) => {
  await page.goto('/docs/')
  const search = page.getByRole('button', { name: 'Search docs', exact: true })
  for (const width of [1_280, 900, 390]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(search).toBeVisible()
    await expect(search).toHaveAccessibleName('Search docs')
    await expect(search).toHaveAttribute('aria-keyshortcuts', /^(Meta|Control)\+K$/)
  }
})

test('the palette stays near the top as results change and fits short viewports', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1_280, height: 900 },
    { width: 982, height: 776 },
    { width: 740, height: 320 },
    { width: 390, height: 700 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/docs/')
    await page.getByRole('button', { name: /Search docs/ }).click()
    const dialog = page.getByRole('dialog')
    const initial = (await dialog.boundingBox())!
    const inset = viewport.width <= 680 ? 16 : Math.min(viewport.height * 0.08, 64)
    expect(Math.abs(initial.y - inset)).toBeLessThan(2)
    expect(initial.y + initial.height).toBeLessThanOrEqual(viewport.height - 15)
    await page.getByRole('combobox').fill('no matching documentation page')
    await expect(page.getByText('No matches found', { exact: true })).toBeVisible()
    expect((await dialog.boundingBox())!.y).toBe(initial.y)
    await expect(page.getByRole('combobox')).toBeFocused()
  }
})

test('search header focuses the input and install actions explain their purpose without metadata', async ({
  page,
}) => {
  await page.goto('/docs/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const input = page.getByRole('combobox')
  const close = page.getByRole('button', { name: 'Close search' })
  await close.focus()
  await page.locator('.command-search > svg').click()
  await expect(input).toBeFocused()
  await close.focus()
  await page.locator('.command-search').click({ position: { x: 8, y: 28 } })
  await expect(input).toBeFocused()
  await expect(
    page.getByRole('option', { name: 'Copy React install command with shadcn/ui', exact: true })
  ).toBeVisible()
  await expect(page.locator('.command-action .command-detail')).toHaveCount(0)
  await input.fill('Copy React install command with shadcn/ui')
  await expect(page.getByRole('option').first()).toHaveAccessibleName(
    'Copy React install command with shadcn/ui'
  )
  await close.click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

for (const dark of [false, true]) {
  test(`result and footer shortcuts share keycap styling in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
  }) => {
    await page.goto('/docs/')
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
    await page.getByRole('button', { name: /Search docs/ }).click()
    await expect(page.getByRole('option', { name: /JavaScript quickstart/ })).toBeVisible()
    const keycaps = page.locator('.command-enter, .command-footer kbd')
    const styles = await keycaps.evaluateAll(keys =>
      keys.map(key => {
        const style = getComputedStyle(key)
        return [
          key.tagName,
          style.backgroundImage,
          style.borderColor,
          style.boxShadow,
          style.borderRadius,
        ]
      })
    )
    expect(styles.length).toBeGreaterThan(1)
    for (const style of styles) {
      expect(style).toEqual(styles[0])
    }
  })
}

test('the command menu locks page scrolling while its results remain scrollable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 320 })
  await page.goto('/docs/')
  await page.evaluate(() => window.scrollTo(0, 300))
  await page.getByRole('button', { name: /Search docs/ }).click()
  await expect(page.getByRole('option', { name: /JavaScript quickstart/ })).toBeVisible()
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.move(5, 315)
  await page.mouse.wheel(0, 200)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  const results = page.locator('.command-results')
  await results.hover()
  await page.mouse.wheel(0, 200)
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.mouse.move(5, 315)
  await page.mouse.wheel(0, 200)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore)
})
