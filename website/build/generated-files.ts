import { extname } from 'node:path'

import type { Plugin } from 'vite'

const contentTypes: Record<string, string> = {
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

// Serves files generated from site data during development and emits them into the build.
// `generate` returns file contents keyed by public path, such as '/sitemap.xml'.
export function generatedFiles(name: string, generate: () => Map<string, string>): Plugin {
  return {
    name: `medium-zoom-${name}`,
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        const contentType = contentTypes[extname(path)]
        // Regenerate on each request so edits to the sources show up on reload.
        const content = contentType ? generate().get(path) : undefined
        if (content === undefined) {
          return next()
        }
        response.setHeader('Content-Type', contentType!)
        response.end(content)
      })
    },
    generateBundle() {
      for (const [path, source] of generate()) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source })
      }
    },
  }
}
