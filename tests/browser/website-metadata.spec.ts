import { test, expect } from '@playwright/test'

const origin = 'https://medium-zoom.francoischalifour.com'

// Exercise the built responses rather than injecting server-rendered markup in the test.
// Search and sharing metadata must be present before any client code runs.
test('both pages ship readable HTML and complete sharing metadata without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  try {
    for (const [path, canonical, heading, image] of [
      ['/website.html', '/', 'Your images,', 'og-home.jpg'],
      ['/examples/shadcn/', '/examples/shadcn/', 'Your images,', 'og-shadcn.jpg'],
    ]) {
      await page.goto(path)
      await expect(page).toHaveTitle(/Lightweight/i)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        /lightweight.*lightbox alternative/i
      )
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
      await expect(page.locator('.hero-install')).toContainText(
        canonical === '/' ? 'npm install medium-zoom' : 'shadcn@latest add'
      )
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${origin}${canonical}`
      )
      await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute(
        'content',
        `${origin}${canonical}`
      )
      await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute(
        'content',
        `${origin}/${image}`
      )
      await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image'
      )
      const schema = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent()) || '{}'
      )
      expect(schema['@context']).toBe('https://schema.org')
      const icon = await page
        .locator('head link[rel="icon"][type="image/svg+xml"]')
        .getAttribute('href')
      expect((await context.request.get(new URL(icon!, page.url()).href)).ok()).toBe(true)
      const sharingImage = await context.request.get(`/${image}`)
      expect(sharingImage.ok()).toBe(true)
      expect(sharingImage.headers()['content-type']).toBe('image/jpeg')
    }
    await expect(page.getByRole('article')).toHaveCount(6)
    const html = await (await context.request.get('/examples/shadcn/')).text()
    expect(html).not.toContain('<div id="root"></div>')
    expect(html).not.toMatch(/rel="preload"[^>]*portrait/)
    expect(html).not.toMatch(/rel="preload"[^>]*panorama/)
    const sitemap = await (await context.request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`<loc>${origin}/</loc>`)
    expect(sitemap).toContain(`<loc>${origin}/examples/shadcn/</loc>`)
    expect(await (await context.request.get('/robots.txt')).text()).toContain(
      `Sitemap: ${origin}/sitemap.xml`
    )
  } finally {
    await context.close()
  }
})

test('search pages have distinct metadata and crawlable internal destinations', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  const titles = new Set<string>()
  const descriptions = new Set<string>()
  try {
    for (const path of ['/website.html', '/examples/shadcn/']) {
      const response = await page.goto(path)
      expect(response!.status()).toBe(200)
      expect(response!.headers()['x-robots-tag'] || '').not.toMatch(/noindex|nofollow/)
      titles.add(await page.title())
      descriptions.add((await page.locator('meta[name="description"]').getAttribute('content'))!)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'max-image-preview:large'
      )
      const links = await page
        .locator('a[href]')
        .evaluateAll(anchors =>
          anchors
            .map(anchor => (anchor as HTMLAnchorElement).getAttribute('href')!)
            .filter(href => href.startsWith('/') || href.startsWith('#'))
        )
      for (const href of new Set(links)) {
        if (href.startsWith('#')) {
          await expect(page.locator(href)).toHaveCount(1)
        } else {
          const destination = href === '/' ? '/website.html' : href
          expect((await context.request.get(destination)).status(), href).toBe(200)
        }
      }
    }
    expect(titles.size).toBe(2)
    expect(descriptions.size).toBe(2)
    await expect(page).toHaveTitle(/React.*shadcn/)
    await page.goto('/examples/shadcn/playground.html')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  } finally {
    await context.close()
  }
})
