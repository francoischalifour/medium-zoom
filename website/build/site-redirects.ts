import { readFileSync } from 'node:fs'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

export function readExactRedirects(file: string | URL) {
  const redirects = new Map<string, string>()
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [source, destination] = line.trim().split(/\s+/)
    if (source.startsWith('/') && destination && !line.includes('*')) {
      redirects.set(source, destination)
    }
  }
  return redirects
}

// Hosting owns wildcard asset redirects; mirror exact page redirects locally.
export function siteRedirects(): Plugin {
  const redirects = readExactRedirects(new URL('../public/_redirects', import.meta.url))
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
