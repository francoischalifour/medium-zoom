import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import type { PreviewServer, ViteDevServer, Plugin } from 'vite'
import { docsPages, headingId } from '../src/docs/pages.ts'

// Use the hosting manifest for local development and preview redirects too.
function redirectMovedDocs(server: ViteDevServer | PreviewServer) {
  const redirects = new Map(
    readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
      .split('\n')
      .filter(line => line.startsWith('/docs/'))
      .map(line => line.trim().split(/\s+/).slice(0, 2) as [string, string])
  )
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url || '/', 'http://localhost')
    const destination = redirects.get(url.pathname.replace(/\/?$/, '/'))
    if (!destination) return next()
    response.writeHead(301, { Location: destination + url.search }).end()
  })
}

// The authored headings own both the article anchors and its server-rendered outline.
export function docsPlugin(): Plugin {
  return {
    name: 'medium-zoom-docs',
    enforce: 'pre',
    config() {
      const template = readFileSync(new URL('./docs-template.html', import.meta.url), 'utf8')
      const entries: Record<string, string> = {}
      const escapeHtml = (value: string) =>
        value.replace(
          /[&<>"']/g,
          character =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            })[character]!
        )
      for (const page of docsPages) {
        const url = `https://medium-zoom.francoischalifour.com${page.path}`
        const schema = {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: page.title,
          description: page.description,
          url,
          isPartOf: {
            '@type': 'WebSite',
            name: 'medium-zoom',
            url: 'https://medium-zoom.francoischalifour.com/',
          },
        }
        const html = template
          .replaceAll('__DOC_TITLE__', escapeHtml(`${page.title} — medium-zoom documentation`))
          .replaceAll('__DOC_DESCRIPTION__', escapeHtml(page.description))
          .replaceAll('__DOC_URL__', escapeHtml(url))
          .replace('"__DOC_SCHEMA__"', JSON.stringify(schema).replaceAll('<', '\\u003c'))
        const file = fileURLToPath(new URL(`..${page.path}index.html`, import.meta.url))
        mkdirSync(dirname(file), { recursive: true })
        if (!existsSync(file) || readFileSync(file, 'utf8') !== html) writeFileSync(file, html)
        entries[page.path.slice(1).replaceAll('/', '-')] = file
      }
      return { build: { rolldownOptions: { input: entries } } }
    },
    configureServer: redirectMovedDocs,
    configurePreviewServer: redirectMovedDocs,
    transform(source, id) {
      if (!id.endsWith('.mdx')) return
      const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
      const outline = [...prose.matchAll(/^## (.+)$/gm)].map(([, heading]) => {
        const title = heading.replace(/`/g, '')
        return { title, id: headingId(title) }
      })
      return `${source}\n\nexport const outline = ${JSON.stringify(outline)}\n`
    },
  }
}
