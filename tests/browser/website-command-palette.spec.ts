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
    await expect(page.getByRole('option').first().locator('.command-title mark')).toHaveText(
      'margin'
    )
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
  await search.fill('nextjs')
  await expect(page.getByRole('option').first()).toContainText('Server rendering')
  await search.fill('high resolution')
  await expect(page.getByRole('option').first()).toContainText('HD images')
  await search.fill('nothing matches this query')
  await expect(page.getByText('No matches found')).toBeVisible()
  await expect(page.getByRole('option', { name: /Ask ChatGPT/ })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('0 matches')
  await expect(page.getByRole('option')).toHaveCount(2)
  await expect(page.locator('.command-chat .command-detail')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toBeVisible()
  const emptyReport = await new AxeBuilder({ page }).include('.command-palette').analyze()
  expect(emptyReport.violations).toEqual([])
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

test('query highlighting preserves API punctuation and works in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.fill('imagezoom')
  const first = page.getByRole('option').first()
  await expect(first.locator('.command-title')).toHaveText('<ImageZoom>')
  await expect(first.locator('.command-title mark')).toHaveText('ImageZoom')
  await expect(first.locator('.command-description mark')).toHaveText('ImageZoom')
  await search.fill('open()')
  await expect(first.locator('.command-title')).toHaveText('open()')
  await expect(first.locator('.command-title mark')).toHaveText('open')
  const report = await new AxeBuilder({ page }).include('.command-palette').analyze()
  expect(report.violations).toEqual([])
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
    const popupPromise = page.waitForEvent('popup')
    await page.getByRole('option', { name: new RegExp(`Ask ${name}`) }).click()
    const popup = await popupPromise
    await popup.waitForLoadState()
    const url = new URL(popup.url())
    expect(url.hostname).toBe(hostname)
    expect(url.pathname).toBe(pathname)
    expect(url.searchParams.get('q')).toContain(question)
    expect(url.searchParams.get('q')).toBe(
      `${question}\n\nRead https://medium-zoom.francoischalifour.com/docs/react/ and answer`
    )
    expect(url.searchParams.get('q')).toContain(
      'https://medium-zoom.francoischalifour.com/docs/react/'
    )
    expect(url.searchParams.get('q')).not.toContain('127.0.0.1')
    expect(url.searchParams.get('q')!.match(/https:\/\//g)).toHaveLength(1)
    expect(await popup.evaluate(() => window.opener)).toBeNull()
    await popup.close()
  })
}

test('moving the selection preserves row and text geometry', async ({ page }) => {
  await page.goto('/docs/javascript/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await page.getByRole('combobox').fill('hd images')
  const rows = page.getByRole('option')
  await expect(rows.first()).toContainText('HD images')
  const geometry = () =>
    rows.evaluateAll(elements =>
      elements.map(element => {
        const row = element.getBoundingClientRect()
        const content = element.querySelector('.command-result-content')!.getBoundingClientRect()
        return {
          x: row.x,
          y: row.y,
          width: row.width,
          height: row.height,
          contentWidth: content.width,
        }
      })
    )
  const description = rows.first().locator('.command-description')
  const fullWidth = await description.evaluate(element => {
    const row = element.closest('.command-result')!
    const rightPadding = parseFloat(getComputedStyle(row).paddingRight)
    return {
      actual: element.getBoundingClientRect().right,
      expected: row.getBoundingClientRect().right - rightPadding,
    }
  })
  expect(fullWidth.actual).toBeCloseTo(fullWidth.expected, 1)
  const highlight = rows.first().locator('.command-title mark').first()
  expect(await highlight.evaluate(element => getComputedStyle(element).fontWeight)).toBe(
    await rows
      .first()
      .locator('.command-title')
      .evaluate(element => getComputedStyle(element).fontWeight)
  )
  const before = await geometry()
  await page.keyboard.press('ArrowDown')
  expect(await geometry()).toEqual(before)
  await rows.nth(2).hover()
  expect(await geometry()).toEqual(before)
})

test('balances actions, matching documentation, and chat handoffs', async ({ page }) => {
  await page.goto('/docs/react/')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await expect(page.locator('.command-group')).toHaveText(['Get started', 'Actions', 'Popular'])
  const search = page.getByRole('combobox')
  await search.fill('inst')
  await expect(page.locator('.command-group')).toHaveText([
    'Actions',
    'Documentation',
    'Open in chat',
  ])
  await expect(page.getByRole('option').first()).toContainText('Copy React install command')
  await expect(page.locator('.command-result:not(.command-action):not(.command-chat)')).toHaveCount(
    5
  )
  await search.fill('margin')
  await expect(page.locator('.command-group')).toHaveText(['Documentation', 'Open in chat'])
  await expect(page.getByRole('option').first().locator('.command-title')).toHaveText('margin')
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
  await expect(page.getByRole('option').first().locator('.command-title')).toHaveText('margin')
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

test('browser history restores the search query', async ({ page }) => {
  await page.goto('/docs/?q=margin')
  await expect(page.getByRole('combobox')).toHaveValue('margin')
  await page.evaluate(() => history.pushState(null, '', '/docs/?q=galleries'))
  await page.goBack()
  await expect(page.getByRole('combobox')).toHaveValue('margin')
  await page.goForward()
  await expect(page.getByRole('combobox')).toHaveValue('galleries')
})
