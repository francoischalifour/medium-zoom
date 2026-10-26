import { readFileSync } from 'node:fs'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

// Hosting owns wildcard asset redirects; mirror exact page redirects locally.
export function siteRedirects(): Plugin {
  const redirects = new Map(
    readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
      .split('\n')
      .filter(line => line.startsWith('/') && !line.includes('*'))
      .map(line => line.trim().split(/\s+/).slice(0, 2) as [string, string])
  )
  const configure = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url || '/', 'http://localhost')
      const destination = redirects.get(url.pathname)
      if (!destination) return next()
      response.writeHead(301, { Location: destination + url.search }).end()
    })
  }
  return {
    name: 'medium-zoom-site-redirects',
    configureServer: configure,
    configurePreviewServer: configure,
  }
}
