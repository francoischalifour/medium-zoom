import type { APIRequestContext } from '@playwright/test'

import { test, expect } from './website-fixture'

const origin = 'https://medium-zoom.francoischalifour.com'

async function getText(request: APIRequestContext, url: string, contentType: string) {
  const response = await request.get(new URL(url, origin).pathname)
  expect(response.status(), url).toBe(200)
  expect(response.headers()['content-type'], url).toBe(`${contentType}; charset=utf-8`)
  return response.text()
}

async function readDocsPaths(request: APIRequestContext) {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(([, url]) => new URL(url!).pathname)
    .filter(path => path.startsWith('/docs/'))
}

test('each docs page links to a Markdown version of its article', async ({ page, request }) => {
  for (const path of await readDocsPaths(request)) {
    await page.goto(path)
    const title = await page.locator('h1').textContent()
    const href = await page
      .locator('head link[rel="alternate"][type="text/markdown"]')
      .getAttribute('href')
    expect(href, path).toBe(`${path.slice(0, -1)}.md`)

    const markdown = await getText(request, href!, 'text/markdown')
    // Markdown escapes a leading "<" in titles such as <ImageZoom>.
    expect(markdown.split('\n')[0]!.replace('\\<', '<'), path).toBe(`# ${title}`)
    expect(markdown, path).toContain(`Source: <${origin}${path}>`)
    // Prose outside code carries no MDX imports, components, or site-relative links.
    const prose = markdown.replace(/^```[^\n]*\n[\s\S]*?^```$/gm, '').replace(/`[^`\n]+`/g, '')
    expect(prose, path).not.toMatch(/^import |^export |(?<!\\)<[A-Z]\w*[\s/>]|\]\(\//m)
  }
})

test('Markdown pages replace interactive examples with their source', async ({ request }) => {
  const guide = await getText(request, '/docs/guides/hd-images.md', 'text/markdown')
  expect(guide).toContain('```tsx title="hd-photo.tsx"\n')
  expect(guide).toContain('data-zoom-src="/assets/images/ocean-sunset.jpg"')
  expect(guide).toContain(
    `- [Multiple images](${origin}/docs/guides/multiple-images/): Attach zoom behavior to several images.`
  )

  const quickstart = await getText(request, '/docs/javascript.md', 'text/markdown')
  expect(quickstart).toContain('```sh\nnpm install medium-zoom\n```')
  expect(quickstart).toContain('### Script tag\n')
  expect(quickstart).toContain('- Internet Explorer 10+')

  const events = await getText(request, '/docs/reference/javascript/events.md', 'text/markdown')
  expect(events).toMatch(/^\| `opened` +\| The opening animation completes\. +\|$/m)

  const reference = await getText(request, '/docs/reference/react/image-zoom.md', 'text/markdown')
  expect(reference).toContain('### `alt`\n\nDescribes the image')
  expect(reference).toContain('- Type: `string`\n- Required')
})

test('llms.txt indexes every docs page by its Markdown version', async ({ request }) => {
  const index = await getText(request, '/llms.txt', 'text/plain')
  expect(index).toMatch(/^# medium-zoom\n\n> /)
  expect(index).toContain(`[llms-full.txt](${origin}/llms-full.txt)`)

  const links = [...index.matchAll(/^- \[(.+?)\]\((.+?)\): /gm)].map(([, title, url]) => ({
    title: title!.replace(/^\\/, ''),
    url: url!,
  }))
  const docsPaths = await readDocsPaths(request)
  expect(links.map(({ url }) => new URL(url).pathname)).toEqual(
    docsPaths.map(path => `${path.slice(0, -1)}.md`)
  )
  for (const { title, url } of links) {
    expect(await getText(request, url, 'text/markdown')).toContain(`${title}\n`)
  }

  const full = await getText(request, '/llms-full.txt', 'text/plain')
  for (const path of docsPaths) {
    expect(full).toContain(await getText(request, `${path.slice(0, -1)}.md`, 'text/markdown'))
  }
})
