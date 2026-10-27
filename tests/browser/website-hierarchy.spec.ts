import { test, expect } from './website-fixture'

test('overview separates quickstarts, task guides, and the two API references', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1_440, height: 900 })
  await page.goto('/docs/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  await expect(page.getByRole('button', { name: 'Copy install command' })).toHaveCount(0)
  const navigation = page
    .locator('.docs-sidebar')
    .getByRole('navigation', { name: 'Documentation', exact: true })
  await expect(navigation.locator('.docs-nav-group > p')).toHaveText([
    'Get started',
    'Guides',
    'React guides',
    'JavaScript reference',
    'React reference',
  ])
  const choices = page.getByRole('navigation', { name: 'Choose your setup' })
  await expect(choices.getByRole('link', { name: /JavaScript quickstart/ })).toHaveAttribute(
    'href',
    '/docs/javascript/'
  )
  await expect(choices.getByRole('link', { name: /React quickstart/ })).toHaveAttribute(
    'href',
    '/docs/react/'
  )
})

test('page navigation follows the sidebar across section boundaries', async ({ page }) => {
  await page.goto('/docs/guides/video/')
  const navigation = page.getByRole('navigation', { name: 'Documentation pages', exact: true })
  await expect(navigation.locator('a[rel="prev"]')).toHaveAttribute(
    'href',
    '/docs/guides/generated-svg/'
  )
  await expect(navigation.locator('a[rel="next"]')).toHaveAttribute(
    'href',
    '/docs/guides/custom-react-triggers/'
  )
  await navigation.locator('a[rel="next"]').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Custom triggers')
  await expect(navigation.locator('a[rel="prev"]')).toHaveAttribute('href', '/docs/guides/video/')
})

test('earlier documentation URLs redirect to their new content owners', async ({
  page,
  request,
}) => {
  const aliases = [
    ['/docs/basic-usage/', '/docs/javascript/'],
    ['/docs/guides/galleries/', '/docs/guides/multiple-images/'],
    ['/docs/api/selectors/', '/docs/reference/javascript/medium-zoom/'],
    ['/docs/api/options/', '/docs/reference/javascript/options/'],
    ['/docs/api/methods/', '/docs/reference/javascript/methods/'],
    ['/docs/api/events/', '/docs/reference/javascript/events/'],
    ['/docs/api/attributes/', '/docs/guides/hd-images/'],
    ['/docs/react/installation/', '/docs/react/'],
    ['/docs/react/basic-usage/', '/docs/react/'],
    ['/docs/react/composition/', '/docs/guides/custom-react-triggers/'],
    ['/docs/react/controlled-state/', '/docs/guides/controlled-state/'],
    ['/docs/react/server-rendering/', '/docs/guides/server-rendering/'],
  ]
  const manifest = await (await request.get('/_redirects')).text()
  const sitemap = await (await request.get('/sitemap.xml')).text()
  for (const [old, destination] of aliases) {
    expect(manifest).toContain(`${old} ${destination} 301`)
    expect(manifest).toContain(`${old.slice(0, -1)} ${destination} 301`)
    const response = await request.get(old, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toBe(destination)
    const withoutSlash = await request.get(old.slice(0, -1), { maxRedirects: 0 })
    expect(withoutSlash.status()).toBe(301)
    expect(withoutSlash.headers().location).toBe(destination)
    expect(sitemap).not.toContain(`<loc>https://medium-zoom.francoischalifour.com${old}</loc>`)
  }
  await page.goto('/docs/api/methods/#attach')
  await expect(page).toHaveURL(/\/docs\/reference\/javascript\/methods\/#attach$/)
  await expect(page.getByRole('heading', { name: 'attach()', exact: true })).toBeInViewport()
})

test('gallery and HD examples use the documented public components', async ({ page }) => {
  await page.goto('/docs/guides/multiple-images/')
  const triggers = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
  await expect(triggers).toHaveCount(4)
  for (const trigger of await triggers.all()) {
    await trigger.locator('img').evaluate(element => (element as HTMLImageElement).decode())
    await trigger.click()
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
  }
  await page.goto('/docs/guides/hd-images/')
  const preview = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
  await preview.click()
  const hd = page.locator('.medium-zoom-image--opened[src$="ocean-sunset.jpg"]')
  await expect(hd).toBeVisible()
  await hd.evaluate(element => (element as HTMLImageElement).decode())
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('previous and next cards preserve direction and stop only at the sidebar ends', async ({
  page,
}) => {
  await page.goto('/docs/guides/styling/')
  const navigation = page.getByRole('navigation', { name: 'Documentation pages', exact: true })
  const previous = navigation.locator('a[rel="prev"]')
  const next = navigation.locator('a[rel="next"]')
  await expect(previous).toContainText('Previous')
  await expect(previous).toContainText('Multiple images')
  await expect(previous).toHaveAttribute('href', '/docs/guides/multiple-images/')
  await expect(next).toContainText('Next')
  await expect(next).toHaveAttribute('href', '/docs/guides/generated-svg/')
  await expect(previous.locator('svg')).toHaveAttribute('aria-hidden', 'true')
  await expect(next.locator('svg')).toHaveAttribute('aria-hidden', 'true')
  await expect(previous.locator('svg')).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)')
  await previous.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Multiple images')
  await page.goto('/docs/')
  const reference = page.getByRole('navigation', { name: 'Documentation pages', exact: true })
  await expect(reference.locator('a[rel="prev"]')).toHaveCount(0)
  await expect(reference.locator('a[rel="next"]')).toHaveAttribute('href', '/docs/javascript/')
  await page.goto('/docs/reference/react/composition/')
  await expect(reference.locator('a[rel="next"]')).toHaveCount(0)
  await expect(reference.locator('a[rel="prev"]')).toHaveAttribute(
    'href',
    '/docs/reference/react/image-zoom/'
  )
})
