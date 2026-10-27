import { testUrl } from '../server-urls.ts'
import { test, expect } from './website-fixture'

for (const path of ['/website.html', '/react']) {
  test(`${path} hydrates saved preferences without losing server-rendered content`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })
    await page.addInitScript(() => {
      if (!localStorage.getItem('medium-zoom-theme')) {
        localStorage.setItem('medium-zoom-theme', 'dark')
      }
      localStorage.setItem('medium-zoom-package-manager', 'bun')
    })
    await page.route(`${testUrl}/`, async route => {
      const response = await route.fetch({ url: `${testUrl}/website.html` })
      await route.fulfill({ response })
    })
    const response = await page.goto(path)
    const html = await response!.text()
    expect(html).toContain('Your images,')
    expect(html).toContain('Add zoom to your project.')
    await expect(
      page.locator('.hero-install').getByRole('radio', { name: 'bun', exact: true })
    ).toBeChecked()
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
    const mark = page.getByRole('link', { name: 'medium-zoom home' }).locator('img')
    await mark.evaluate(image => (image as HTMLImageElement).decode())
    await page.getByRole('button', { name: 'Switch to light theme' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page
      .getByRole('navigation', { name: 'Main navigation', exact: true })
      .locator('.section-links')
      .locator(`a[href="${path === '/website.html' ? '/react' : '/'}"]`)
      .click()
    await expect(
      page.locator('.hero-install').getByRole('radio', { name: 'bun', exact: true })
    ).toBeChecked()
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

for (const path of ['/website.html', '/react']) {
  test(`${path} shows the saved install command before React loads`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })
    await page.addInitScript(() => {
      localStorage.setItem('medium-zoom-package-manager', 'bun')
    })
    let resume!: () => void
    const hydration = new Promise<void>(resolve => {
      resume = resolve
    })
    await page.route(/\/assets\/hydrate-.*\.js$/, async route => {
      await hydration
      await route.continue()
    })
    await page.goto(path, { waitUntil: 'commit' })
    try {
      for (const panel of [page.locator('.hero-install'), page.locator('.closing-install')]) {
        await expect(panel.locator('pre [data-package-manager-option="bun"]')).toBeVisible()
        await expect(panel.locator('pre [data-package-manager-option="npm"]')).toBeHidden()
        await expect(panel.locator('pre')).toHaveJSProperty(
          'innerText',
          path === '/website.html'
            ? '$ bun add medium-zoom'
            : '$ bunx shadcn@latest add https://medium-zoom.francoischalifour.com/r/image-zoom.json'
        )
      }
    } finally {
      resume()
    }
    await expect(
      page.locator('.hero-install').getByRole('radio', { name: 'bun', exact: true })
    ).toBeChecked()
    await page.locator('.closing-install').getByRole('radio', { name: 'pnpm', exact: true }).check()
    await expect(
      page.locator('.hero-install').getByRole('radio', { name: 'pnpm', exact: true })
    ).toBeChecked()
    expect(errors).toEqual([])
  })
}

for (const interaction of ['pointer', 'keyboard'] as const) {
  test(`package manager ${interaction} changes survive before hydration`, async ({ page }) => {
    let resume!: () => void
    const hydration = new Promise<void>(resolve => {
      resume = resolve
    })
    await page.route(/\/assets\/hydrate-.*\.js$/, async route => {
      await hydration
      await route.continue()
    })
    await page.goto('/react', { waitUntil: 'commit' })
    const installation = page.locator('.hero-install')
    try {
      if (interaction === 'pointer') {
        await installation.locator('label[data-package-manager-option="pnpm"]').click()
      } else {
        await installation.getByRole('radio', { name: 'npm', exact: true }).focus()
        await page.keyboard.press('ArrowRight')
      }
    } finally {
      resume()
    }
    for (const panel of [installation, page.locator('.closing-install')]) {
      await expect(panel.getByRole('radio', { name: 'pnpm', exact: true })).toBeChecked()
      await expect(panel.locator('pre [data-package-manager-option="pnpm"]')).toBeVisible()
    }
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('medium-zoom-package-manager')))
      .toBe('pnpm')
  })
}

test('installation snippets default to npm when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('/website.html')
    for (const panel of [page.locator('.hero-install'), page.locator('.closing-install')]) {
      await expect(panel.locator('pre [data-package-manager-option="npm"]')).toBeVisible()
      await expect(panel.locator('pre [data-package-manager-option="bun"]')).toBeHidden()
    }
  } finally {
    await context.close()
  }
})

for (const storage of ['invalid', 'unavailable'] as const) {
  test(`installation remains usable with ${storage} storage`, async ({ page }) => {
    await page.addInitScript(mode => {
      if (mode === 'invalid') {
        localStorage.setItem('medium-zoom-package-manager', 'unknown')
      } else {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Storage is unavailable', 'SecurityError')
          },
        })
      }
    }, storage)
    await page.goto('/website.html')
    const top = page.locator('.hero-install')
    const bottom = page.locator('.closing-install')
    await expect(top.getByRole('radio', { name: 'npm', exact: true })).toBeChecked()
    await expect(top.locator('pre [data-package-manager-option="npm"]')).toBeVisible()
    await bottom.getByRole('radio', { name: 'bun', exact: true }).check()
    await expect(top.getByRole('radio', { name: 'bun', exact: true })).toBeChecked()
    await expect(top.locator('pre [data-package-manager-option="bun"]')).toBeVisible()
    await expect(bottom.locator('pre [data-package-manager-option="bun"]')).toBeVisible()
  })
}
