import type { APIRequestContext } from '@playwright/test'

import { test, expect } from './website-fixture'

const origin = 'https://medium-zoom.francoischalifour.com'

async function getText(request: APIRequestContext, url: string, contentType: string) {
  const response = await request.get(new URL(url, origin).pathname)
  expect(response.status(), url).toBe(200)
  expect(response.headers()['content-type'], url).toBe(`${contentType}; charset=utf-8`)
  return response.text()
}

async function readPagePaths(request: APIRequestContext) {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => new URL(url!).pathname)
}

// The home page's Markdown is /index.md; every other page's sits beside its route.
function markdownPath(path: string) {
  return path === '/' ? '/index.md' : path.replace(/\/?$/, '.md')
}

test('each page links to a Markdown version of its content', async ({ page, request }) => {
  const paths = await readPagePaths(request)
  expect(paths).toEqual(expect.arrayContaining(['/', '/react', '/docs/']))
  for (const path of paths) {
    await page.goto(path)
    const title = (await page.locator('h1').textContent())!.replace(/\s+/g, ' ').trim()
    const href = await page
      .locator('head link[rel="alternate"][type="text/markdown"]')
      .getAttribute('href')
    expect(href, path).toBe(markdownPath(path))

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

test('product page Markdown includes every usage example and the API table', async ({
  request,
}) => {
  const react = await getText(request, '/react.md', 'text/markdown')
  expect(react).toContain(`\`\`\`sh\nnpx shadcn@latest add ${origin}/r/image-zoom.json\n\`\`\``)
  for (const example of ['Basic', 'Composed', 'Controlled', 'With caption', 'Multiple images']) {
    expect(react).toContain(`### ${example}\n`)
  }
  expect(react).toContain('```tsx title="components/multiple-images.tsx"\n')
  expect(react).toMatch(/^\| `options\.margin` +\| Space around the zoomed image\. +\| `24` +\|$/m)

  const javascript = await getText(request, '/index.md', 'text/markdown')
  expect(javascript).toContain('```sh\nnpm install medium-zoom\n```')
  expect(javascript).toMatch(/^- \*\*\d+ kB\. Zero dependencies\.\*\* /m)
  expect(javascript).toContain('```js title="app.js"\nimport mediumZoom from \'medium-zoom\'')
  expect(javascript).toContain(`- [Vue](${origin}/docs/integrations/vue/): `)
})

test('llms.txt indexes every page by its Markdown version', async ({ request }) => {
  const index = await getText(request, '/llms.txt', 'text/plain')
  expect(index).toMatch(/^# medium-zoom\n\n> /)
  expect(index).toContain(`[llms-full.txt](${origin}/llms-full.txt)`)

  const links = [...index.matchAll(/^- \[(.+?)\]\((.+?)\): /gm)].map(([, title, url]) => ({
    title: title!.replace(/^\\/, ''),
    url: url!,
  }))
  const paths = await readPagePaths(request)
  expect(links.map(({ url }) => new URL(url).pathname)).toEqual(paths.map(markdownPath))
  for (const { title, url } of links) {
    expect(await getText(request, url, 'text/markdown')).toContain(`${title}\n`)
  }

  const full = await getText(request, '/llms-full.txt', 'text/plain')
  for (const path of paths) {
    expect(full).toContain(await getText(request, markdownPath(path), 'text/markdown'))
  }
})
