import { readFileSync } from 'node:fs'
import type { PreviewServer, ViteDevServer, Plugin } from 'vite'
import { headingId } from '../src/docs/pages.ts'

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
