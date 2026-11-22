import AxeBuilder from '@axe-core/playwright'

import { expect, test } from './website-fixture'

// Docspot owns the dialog's behavior and has its own suite. These tests cover how the site
// configures it: the index and its ranking, the trigger, items, handoffs, the preview, theming,
// URLs, and analytics-relevant flows.

const searchBox = (page: import('@playwright/test').Page) =>
  page.getByRole('combobox', { name: 'Search documentation' })
const documentation = (page: import('@playwright/test').Page) =>
  page
    .getByRole('region', { name: 'Documentation', exact: true })
    .getByRole('option')

for (const shortcut of ['Meta+k', 'Control+k']) {
  test(`${shortcut} searches section anchors and restores focus`, async ({
    page,
  }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: /Search docs/ })
    await trigger.focus()
    await page.keyboard.press(shortcut)
    await expect(searchBox(page)).toBeFocused()
    await expect(
      page.getByRole('option', { name: /JavaScript quickstart/ })
    ).toBeVisible()
    await searchBox(page).fill('margin')
    const first = page.getByRole('dialog').getByRole('option').first()
    await expect(first).toContainText('margin')
    await expect(first).toContainText('Options')
    await expect(first.locator('mark').first()).toHaveText('margin')
    // The first Escape clears the query and the second closes search.
    await page.keyboard.press('Escape')
    await expect(searchBox(page)).toHaveValue('')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(searchBox(page)).toHaveValue('')
    await searchBox(page).fill('margin')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(
      /\/docs\/reference\/javascript\/options\/#margin$/
    )
    await expect(page.locator('#margin')).toBeInViewport()
    await page.goBack()
    await expect(searchBox(page)).toHaveValue('margin')
    expect(new URL(page.url()).searchParams.get('q')).toBe('margin')
  })
}

for (const { platform, label } of [
  { platform: 'MacIntel', label: '⌘ K' },
  { platform: 'Win32', label: 'Ctrl K' },
]) {
  test(`the search shortcut reads ${label} on ${platform} from the first paint`, async ({
    page,
  }) => {
    await page.addInitScript(value => {
      Object.defineProperty(Navigator.prototype, 'platform', {
        get: () => value,
      })
    }, platform)
    const trigger = page.getByRole('button', { name: /Search docs/ })
    await page.route('**/assets/*.js', route => route.abort())
    await page.goto('/')
    await expect(trigger.locator('kbd')).toHaveText(label, {
      useInnerText: true,
    })
    await page.unroute('**/assets/*.js')
    await page.reload()
    await expect(trigger).toHaveAttribute('aria-keyshortcuts', /Meta\+K/)
    await expect(trigger).toHaveAttribute('aria-keyshortcuts', /Control\+K/)
    await expect(trigger.locator('kbd')).toHaveText(label, {
      useInnerText: true,
    })
  })
}

test('the slash key opens search outside text fields', async ({ page }) => {
  await page.goto('/docs/')
  await page.locator('main h1').click()
  await page.keyboard.press('/')
  await expect(searchBox(page)).toBeFocused()
})

test('aliases, keyboard selection, empty state, and modal accessibility', async ({
  page,
}) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = searchBox(page)
  await search.fill('toggle')
  await expect(documentation(page).first()).toContainText('toggle()')
  await expect(
    page.getByRole('option', { name: /Switch to .* theme/ })
  ).toHaveCount(0)
  await search.fill('nextjs')
  await expect(documentation(page).first()).toContainText('Server rendering')
  await search.fill('high resolution')
  await expect(documentation(page).first()).toContainText('HD images')
  await search.fill('nothing matches this query')
  await expect(page.getByRole('option', { name: /Ask ChatGPT/ })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('option')).toHaveCount(2)
  const emptyReport = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(emptyReport.violations).toEqual([])
  await search.fill('')
  await expect(page.getByRole('option', { selected: true })).toContainText(
    'React quickstart'
  )
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { selected: true })).toContainText(
    'JavaScript quickstart'
  )
  const report = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(report.violations).toEqual([])
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/docs\/javascript\/$/)
})

test('the theme action updates the control and persists across reloads', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await searchBox(page).fill('theme')
  await page.getByRole('option', { name: 'Switch to dark theme' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /Search docs/ })).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Switch to light theme' })
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Switch to light theme' })
  ).toBeVisible()
  await page.getByRole('button', { name: /Search docs/ }).click()
  await searchBox(page).fill('theme')
  await expect(
    page.getByRole('option', { name: 'Switch to light theme' })
  ).toBeVisible()
})

test('search follows the site theme, not the system, in both directions', async ({
  page,
}) => {
  for (const [system, site] of [
    ['dark', 'light'],
    ['light', 'dark'],
  ] as const) {
    await page.emulateMedia({ colorScheme: system })
    await page.addInitScript(
      value => localStorage.setItem('medium-zoom-theme', value),
      site
    )
    await page.goto('/docs/')
    await page.getByRole('button', { name: /Search docs/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(
      await dialog.evaluate(element => getComputedStyle(element).colorScheme)
    ).toContain(site)
    expect(
      await dialog.evaluate(element => getComputedStyle(element).backgroundColor)
    ).toBe(await page.evaluate(() => getComputedStyle(document.body).backgroundColor))
  }
})

test('mobile search fits the viewport and dismisses with the close button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/docs/')
  const trigger = page.getByRole('button', { name: /Search docs/ })
  await trigger.click()
  await expect(searchBox(page)).toBeFocused()
  await expect(
    page.getByRole('dialog').getByRole('option').first()
  ).toBeVisible()
  const bounds = await page.getByRole('dialog').boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(700)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('query highlighting preserves API punctuation and works in dark mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const first = documentation(page).first()
  await searchBox(page).fill('imagezoom')
  await expect(first).toHaveAccessibleName(/^<ImageZoom>/)
  await expect(first.locator('.docspot-result-title mark')).toHaveText(
    'ImageZoom'
  )
  await searchBox(page).fill('open()')
  await expect(first).toHaveAccessibleName(/^open\(\)/)
  await expect(first.locator('.docspot-result-title mark')).toHaveText('open')
  const report = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(report.violations).toEqual([])
})

for (const [query, path, highlight] of [
  ['javscript', '/docs/javascript/', 'JavaScript'],
  ['galery', '/docs/guides/multiple-images/'],
  ['gall', '/docs/guides/multiple-images/'],
  ['react controled', '/docs/guides/controlled-state/', 'Controlled'],
  ['magrin', '/docs/reference/javascript/options/#margin', 'margin'],
  ['opne', '/docs/reference/javascript/methods/#open', 'open'],
  [
    'scroll distance',
    '/docs/reference/javascript/options/#scrolloffset',
    'scroll',
  ],
  [
    'scroll offset',
    '/docs/reference/javascript/options/#scrolloffset',
    'scroll',
  ],
  ['image zoom', '/docs/reference/react/image-zoom/', 'Image'],
  [
    'onopenchange',
    '/docs/reference/react/image-zoom/#state-props',
    'onOpenChange',
  ],
  ['on', '/docs/reference/javascript/methods/#on', 'on'],
  ['off', '/docs/reference/javascript/methods/#off', 'off'],
]) {
  test(`local search ranks and highlights ${query}`, async ({ page }) => {
    await page.goto('/docs/react/')
    await page.getByRole('button', { name: /Search docs/ }).click()
    await searchBox(page).fill(query)
    const results = documentation(page)
    await expect(results.first()).toHaveAttribute('href', path)
    if (highlight) {
      await expect(
        results.first().locator('mark').filter({ hasText: highlight }).first()
      ).toBeVisible()
    }
    if (query === 'scroll distance') {
      await expect(results.first()).toContainText('scroll distance in pixels')
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(
        /\/docs\/reference\/javascript\/options\/#scrolloffset$/
      )
      await expect(page.locator('#scrolloffset')).toBeInViewport()
    }
    if (query === 'off') {
      await expect(results.filter({ hasText: 'scrollOffset' })).toHaveCount(0)
    }
  })
}

test('search excerpts display page text, never MDX imports or expressions', async ({
  page,
}) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  for (const [query, path, text] of [
    ['plain html', '/docs/', 'Use the library with plain HTML or any framework.'],
    [
      'keyboard support',
      '/docs/',
      'Add an image component with a button and keyboard support.',
    ],
    ['reference', '/docs/#reference', '<ImageZoom>'],
  ]) {
    await searchBox(page).fill(query)
    const option = page.locator(`[role="option"][href="${path}"]`)
    await expect(option).toContainText(text)
    await expect(option).not.toContainText("{'")
    await expect(option).not.toContainText("from './")
  }
})

test('API query casing preserves the same results and ranking', async ({
  page,
}) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = searchBox(page)
  const results = documentation(page)
  const paths = () =>
    results.evaluateAll(elements =>
      elements.map(element => element.getAttribute('href'))
    )
  for (const [lowercase, variants, firstPath] of [
    ['srcset', ['srcSet', 'SRCSET'], '/docs/guides/hd-images/'],
    [
      'onopenchange',
      ['onOpenChange', 'ONOPENCHANGE'],
      '/docs/reference/react/image-zoom/#state-props',
    ],
    [
      'imagezoom',
      ['ImageZoom', 'IMAGEZOOM'],
      '/docs/reference/react/image-zoom/',
    ],
  ] as const) {
    await search.fill(lowercase)
    await expect(results.first()).toHaveAttribute('href', firstPath)
    const expected = await paths()
    for (const variant of variants) {
      await search.fill(variant)
      await expect.poll(paths).toEqual(expected)
    }
  }
})

test('the search index loads once and is reused after closing', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', request => {
    if (request.url().includes('_virtual_docs-search-')) {
      requests.push(request.url())
    }
  })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await searchBox(page).fill('margin')
  await expect(documentation(page).first()).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await searchBox(page).fill('scroll distance')
  await expect(documentation(page).first()).toHaveAttribute(
    'href',
    '/docs/reference/javascript/options/#scrolloffset'
  )
  expect(requests).toHaveLength(1)
})

test('search loading failures leave actions and handoffs available', async ({
  page,
}) => {
  await page.route('**/*_virtual_docs-search-*.js', route => route.abort())
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await searchBox(page).fill('theme')
  await expect(
    page.getByRole('dialog').getByRole('status')
  ).toContainText('unavailable')
  await expect(page.getByRole('option', { name: /Ask Claude/ })).toBeVisible()
  await page.getByRole('option', { name: /Switch to .* theme/ }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

for (const [name, hostname, pathname] of [
  ['ChatGPT', 'chatgpt.com', '/'],
  ['Claude', 'claude.ai', '/new'],
]) {
  test(`opens a contextual question in ${name}`, async ({ page, context }) => {
    // Verify the handoff without submitting test prompts to an external assistant.
    await context.route(`https://${hostname}/**`, route =>
      route.fulfill({
        body: '<title>Chat handoff</title>',
        contentType: 'text/html',
      })
    )
    await page.goto('/docs/react/')
    await page.getByRole('button', { name: /Search docs/ }).click()
    await expect(page.getByRole('option', { name: `Ask ${name}` })).toHaveCount(
      0
    )
    const question = 'nothing matches this question & keeps #1'
    await searchBox(page).fill(question)
    const popupPromise = page.waitForEvent('popup')
    await page.getByRole('option', { name: new RegExp(`Ask ${name}`) }).click()
    const popup = await popupPromise
    await popup.waitForLoadState()
    const url = new URL(popup.url())
    expect(url.hostname).toBe(hostname)
    expect(url.pathname).toBe(pathname)
    // Without a match, the assistant reads the quickstart for the page's framework.
    expect(url.searchParams.get('q')).toBe(
      `${question}\n\nRead https://medium-zoom.francoischalifour.com/docs/react/ and answer`
    )
    expect(await popup.evaluate(() => window.opener)).toBeNull()
    await popup.close()
  })
}

test('handoffs point the assistant at the best match', async ({ page }) => {
  await page.goto('/docs/?q=margin')
  const claude = page.getByRole('option', { name: /Ask Claude/ })
  await expect(claude).toHaveAttribute(
    'href',
    /Read\+https%3A%2F%2Fmedium-zoom\.francoischalifour\.com%2Fdocs%2Freference%2Fjavascript%2Foptions%2F%23margin\+and\+answer/
  )
})

test('defaults list getting started, actions, and popular pages, then recent ones', async ({
  page,
}) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const regions = page.getByRole('dialog').getByRole('region')
  await expect(regions.nth(0)).toHaveAccessibleName('Get started')
  await expect(regions.nth(1)).toHaveAccessibleName('Actions')
  await expect(regions.nth(2)).toHaveAccessibleName('Popular')
  await expect(page.getByRole('option').first()).toContainText(
    'React quickstart'
  )
  await searchBox(page).fill('inst')
  await expect(regions.nth(0)).toHaveAccessibleName('Actions')
  await expect(page.getByRole('option').first()).toContainText(
    'Copy React install command'
  )
  await searchBox(page).fill('margin')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#margin$/)
  await page.getByRole('button', { name: /Search docs/ }).click()
  await expect(regions.nth(0)).toHaveAccessibleName('Recent')
  await expect(regions.nth(0).getByRole('option').first()).toContainText(
    'margin'
  )
})

test('the preview shows the rendered page at the matched section', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await searchBox(page).fill('margin')
  const preview = page.getByRole('region', { name: 'Result preview' })
  const article = preview.locator('.site-search-preview')
  await expect(article.getByRole('heading', { level: 1 })).toHaveText('Options')
  // Page-only controls stay out, and ids move so the page keeps unique ones.
  await expect(article.locator('button, script')).toHaveCount(0)
  await expect(article.locator('[id]')).toHaveCount(0)
  await expect(article.locator('[data-docspot-anchor="margin"]')).toBeInViewport()
  await preview.getByRole('button', { name: 'Copy Markdown' }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'copied as Markdown'
  )
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /^# Options/
  )
  // Links in the preview open their page and close search.
  await article.getByRole('link', { name: 'update()' }).first().click()
  await expect(page).toHaveURL(/\/docs\/reference\/javascript\/methods\/#update$/)
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('search URLs hydrate when the browser does not report paint timing', async ({
  page,
}) => {
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
  await expect(searchBox(page)).toBeFocused()
  await expect(searchBox(page)).toHaveValue('margin')
  await expect(documentation(page).first()).toContainText('margin')
})

test('search URLs preserve page context and reopen the same query', async ({
  page,
}) => {
  await page.goto(
    '/docs/javascript/?utm_source=search-test#install-the-package'
  )
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = searchBox(page)
  await search.fill('margin')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'))
    .toBe('margin')
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('search-test')
  expect(new URL(page.url()).hash).toBe('#install-the-package')
  await page.reload()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('margin')
  await expect(documentation(page).first()).toContainText('margin')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false)
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('search-test')
  expect(new URL(page.url()).hash).toBe('#install-the-package')
})

test('documentation results open in another tab with a modifier', async ({
  page,
  context,
}) => {
  await page.goto('/docs/?q=margin')
  const pagePromise = context.waitForEvent('page')
  await documentation(page)
    .first()
    .click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] })
  const opened = await pagePromise
  await opened.waitForLoadState()
  expect(new URL(opened.url()).pathname).toBe(
    '/docs/reference/javascript/options/'
  )
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('the search trigger keeps its accessible name at full and compact widths', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/docs/')
    await expect(
      page.getByRole('button', { name: 'Search docs', exact: true })
    ).toBeVisible()
  }
})
