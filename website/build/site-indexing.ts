import { docsPages } from '../src/docs/pages.ts'
import { productPages } from '../src/product-pages.ts'
import { siteOrigin } from '../src/site-url.ts'

const pagePaths = [
  ...Object.values(productPages).map(page => page.path),
  ...docsPages.map(page => page.path),
]

export function siteIndexingFiles(): Map<string, string> {
  return new Map([
    ['/sitemap.xml', sitemap()],
    ['/robots.txt', robots()],
  ])
}

function sitemap() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pagePaths.map(path => `  <url><loc>${siteOrigin}${path}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
}

function robots() {
  return [
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
    'Allow: /',
    '',
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n')
}
