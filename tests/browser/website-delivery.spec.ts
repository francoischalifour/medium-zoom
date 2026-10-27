import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { exampleNames } from '../../scripts/example-names'
import { docsOgImagePath } from '../../website/build/docs-sharing'
import { docsPages } from '../../website/src/docs/pages'
import { test, expect } from './website-fixture'

for (const doc of docsPages) {
  test(`${doc.path} shares a readable social card without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      await page.goto(doc.path)
      const image = `https://medium-zoom.francoischalifour.com${docsOgImagePath(doc.path)}`
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', image)
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', image)
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
        'content',
        doc.documentTitle
      )
      const url = new URL(docsOgImagePath(doc.path), page.url()).href
      const response = await context.request.get(url)
      expect(response.ok()).toBe(true)
      expect(response.headers()['content-type']).toBe('image/jpeg')
      await page.setContent(`<img src="${url}" alt="Social card">`)
      const card = page.getByRole('img', { name: 'Social card' })
      await expect
        .poll(() =>
          card.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])
        )
        .toEqual([1_200, 630])
    } finally {
      await context.close()
    }
  })
}

test('documentation social cards have distinct contents', async ({ request }) => {
  const images = new Set<string>()
  for (const doc of docsPages) {
    const response = await request.get(docsOgImagePath(doc.path))
    expect(response.ok()).toBe(true)
    images.add(
      createHash('sha256')
        .update(await response.body())
        .digest('hex')
    )
  }
  expect(images.size).toBe(docsPages.length)
})

test('demos remain usable but excluded from indexing', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  for (const name of exampleNames) {
    const path = name === 'shadcn' ? '/examples/shadcn/playground.html' : `/examples/${name}/`
    const response = await page.goto(path)
    expect(response!.status()).toBe(200)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
    expect(sitemap).not.toContain(path)
  }
})

test('unknown URLs serve a useful 404 before JavaScript runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    const response = await page.goto('/docs/unknown-page/')
    expect(response!.status()).toBe(404)
    await expect(page).toHaveTitle('Page not found • medium-zoom')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.locator('.eyebrow')).toHaveText('404 · Out of frame')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    const recovery = page.locator('.not-found-recovery')
    await expect(recovery.getByRole('heading', { level: 2 })).toHaveText('Find your way back.')
    await expect(recovery.getByRole('link')).toHaveCount(2)
    for (const link of await recovery.getByRole('link').all()) {
      const href = await link.getAttribute('href')
      expect((await context.request.get(href!)).status()).toBe(200)
    }
    await expect(page.locator('.closing-install')).toHaveCount(0)
    await page.getByRole('link', { name: 'Search docs', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  } finally {
    await context.close()
  }
})

test('404 search opens the existing documentation search with an empty query', async ({ page }) => {
  await page.goto('/missing-page/')
  await page.getByRole('link', { name: 'Search docs', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Search documentation' })).toBeVisible()
  await expect(page.getByRole('combobox')).toBeFocused()
  await expect(page.getByRole('combobox')).toHaveValue('')
  await page.getByRole('combobox').fill('galleries')
  await expect(page.getByRole('option').first()).toContainText('Galleries')
})

test('immutable caching applies only to fingerprinted build output', () => {
  const headers = readFileSync('website/dist/_headers', 'utf8')
  const rules = headers.trim().split(/\n\s*\n/)
  const immutable = rules.filter(rule => rule.includes('immutable'))
  expect(immutable.length).toBeGreaterThan(0)
  for (const rule of immutable) {
    const [path, policy] = rule.split('\n')
    expect(path).toMatch(/^\/assets\/[^/]+-[\w-]{8}\.[^.]+$/)
    expect(policy.trim()).toBe('Cache-Control: public, max-age=31536000, immutable')
  }
  expect(headers).not.toContain('/assets/*')
  expect(headers).not.toContain('/assets/images/')
  expect(headers).toContain('/examples/*\n  X-Robots-Tag: noindex, follow')
})
