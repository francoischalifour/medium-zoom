import { cpSync, existsSync, readFile } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ResolvedConfig } from 'vite'

// The complete site owns the photos. Standalone exports include a local copy.
export function galleryAssets(): Plugin {
  const shared = fileURLToPath(new URL('../../assets/images/', import.meta.url))
  const local = fileURLToPath(new URL('./public/assets/images/', import.meta.url))
  const directory = existsSync(local) ? local : shared
  let config: ResolvedConfig
  return {
    name: 'medium-zoom-gallery-assets',
    config(value) {
      const requested = value.base === '/examples/shadcn/' ? '/' : value.base || '/'
      const base = requested.endsWith('/') ? requested : `${requested}/`
      return { define: { __MEDIUM_ZOOM_GALLERY_BASE__: JSON.stringify(`${base}assets/`) } }
    },
    configResolved(value) {
      config = value
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url || '/', 'http://localhost').pathname
        const prefix = ['/assets/images/', `${config.base}assets/images/`].find(prefix =>
          path.startsWith(prefix)
        )
        if (!prefix) return next()
        const name = path.slice(prefix.length)
        if (!/^[\w.-]+$/.test(name)) {
          response.statusCode = 400
          response.end()
          return
        }
        readFile(resolve(directory, name), (error, contents) => {
          if (error) {
            response.statusCode = 404
            response.end()
            return
          }
          response.setHeader(
            'Content-Type',
            name.endsWith('.webp')
              ? 'image/webp'
              : name.endsWith('.png')
                ? 'image/png'
                : name.endsWith('.jpg')
                  ? 'image/jpeg'
                  : 'text/plain; charset=utf-8'
          )
          response.end(contents)
        })
      })
    },
    closeBundle() {
      // Managed example builds share the site's root assets; standalone builds carry them.
      if (config.command !== 'build' || config.base === '/examples/shadcn/' || directory === local)
        return
      const destination = resolve(config.root, config.build.outDir, 'assets/images')
      if (destination !== resolve(directory)) cpSync(directory, destination, { recursive: true })
    },
  }
}
