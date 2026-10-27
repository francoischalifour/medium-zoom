import packageJson from '../../package.json'
import { test, expect } from './website-fixture'

const origin = 'https://medium-zoom.francoischalifour.com'

test('page aliases redirect permanently to their canonical URLs', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const docsPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(([, url]) => new URL(url!).pathname)
    .filter(path => path.startsWith('/docs/'))
  const aliases = [
    ['/index.html', '/'],
    ['/react/index.html', '/react'],
    ...docsPaths.flatMap(path => [
      [path.slice(0, -1), path],
      [`${path}index.html`, path],
    ]),
  ]

  for (const [alias, canonical] of aliases) {
    const response = await request.get(`${alias}?source=old-link`, { maxRedirects: 0 })
    expect(response.status(), alias).toBe(301)
    expect(response.headers().location, alias).toBe(`${canonical}?source=old-link`)
    expect((await request.get(canonical!)).status(), canonical).toBe(200)
  }
})

test('the React showcase owns /react and redirects its previous URLs', async ({
  page,
  request,
}) => {
  for (const alias of [
    '/examples/shadcn',
    '/examples/shadcn/',
    '/examples/shadcn/index.html',
    '/react/',
    '/react.html',
  ]) {
    const response = await request.get(`${alias}?source=old-link`, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toBe('/react?source=old-link')
  }
  await page.goto('/examples/shadcn/?source=old-link#usage-title')
  await expect(page).toHaveURL(/\/react\?source=old-link#usage-title$/)
  await expect(page.locator('.hero-install')).toContainText('shadcn@latest add')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/react`)
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain(`<loc>${origin}/react</loc>`)
  expect(sitemap).not.toContain('/examples/shadcn/')
})

// Exercise the built responses rather than injecting server-rendered markup in the test.
// Search and sharing metadata must be present before any client code runs.
test('both pages ship readable HTML and complete sharing metadata without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  try {
    for (const [path, canonical, heading, image, documentTitle] of [
      ['/', '/', 'Your images,', 'og-home.jpg', 'JavaScript image zoom • medium-zoom'],
      [
        '/react',
        '/react',
        'Your images,',
        'og-shadcn.jpg',
        'React image zoom for shadcn/ui • medium-zoom',
      ],
    ]) {
      await page.goto(path)
      await expect(page).toHaveTitle(documentTitle)
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        documentTitle
      )
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
        'content',
        documentTitle
      )
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
      if (canonical === '/') {
        const software = schema['@graph'].find(
          (entity: { '@type': string }) => entity['@type'] === 'SoftwareSourceCode'
        )
        expect(software.version).toBe(packageJson.version)
        expect(software.url).toBe(`${origin}/`)
        expect(software.sameAs).toEqual([
          'https://www.npmjs.com/package/medium-zoom',
          'https://github.com/francoischalifour/medium-zoom',
        ])
      }
      for (const favicon of ['/favicon.ico', '/favicon-96.png']) {
        expect((await context.request.get(favicon)).ok()).toBe(true)
      }
      const icon = await page
        .locator('head link[rel="icon"][type="image/svg+xml"]')
        .getAttribute('href')
      expect((await context.request.get(new URL(icon!, page.url()).href)).ok()).toBe(true)
      const sharingImage = await context.request.get(`/${image}`)
      expect(sharingImage.ok()).toBe(true)
      expect(sharingImage.headers()['content-type']).toBe('image/jpeg')
    }
    await expect(page.getByRole('article')).toHaveCount(6)
    const html = await (await context.request.get('/react')).text()
    expect(html).not.toContain('<div id="root"></div>')
    expect(html).not.toMatch(/rel="preload"[^>]*portrait/)
    expect(html).not.toMatch(/rel="preload"[^>]*panorama/)
    const sitemap = await (await context.request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`<loc>${origin}/</loc>`)
    expect(sitemap).toContain(`<loc>${origin}/react</loc>`)
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
    for (const path of ['/', '/react']) {
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
          expect((await context.request.get(href)).status(), href).toBe(200)
        }
      }
    }
    expect(titles.size).toBe(2)
    expect(descriptions.size).toBe(2)
    await expect(page).toHaveTitle(/React.*shadcn/)
    await page.goto('/examples/shadcn/playground.html')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
  } finally {
    await context.close()
  }
})
