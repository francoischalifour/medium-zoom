import { existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'

import { buildGalleryExample } from '../scripts/build-gallery-example.ts'
import { packExperimental } from '../scripts/pack-experimental.ts'
import { pack } from '../scripts/pack.ts'
import { readExactHeaders } from '../website/build/site-headers.ts'
import { readExactRedirects } from '../website/build/site-redirects.ts'
import { testPort } from './server-urls.ts'

await buildGalleryExample()
const artifact = pack()
const experimental = packExperimental()
const roots: Record<string, string> = {
  package: artifact.root,
  experimental: experimental.root,
  experiments: resolve('tests/experimental'),
  composition: resolve('.cache/gallery-composition'),
  baseline: resolve('node_modules/medium-zoom-baseline'),
  images: resolve('stories/images'),
  site: resolve('website/dist'),
  analytics: resolve('.cache/analytics-site'),
}
const pageRedirects = readExactRedirects(resolve(roots.site, '_redirects'))
const pageHeaders = readExactHeaders(resolve(roots.site, '_headers'))
// Bun infers the rest from the extension; these match the production headers.
const contentTypes: Record<string, string> = {
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

const server = Bun.serve({
  port: testPort,
  hostname: '127.0.0.1',
  fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/fixture.html') {
      return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Medium Zoom package tests</title>',
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
    const destination = pageRedirects.get(url.pathname)
    if (destination) {
      return Response.redirect(destination + url.search, 301)
    }
    const [, root, ...segments] = decodeURIComponent(url.pathname).split('/')
    const directory = roots[root!] || roots.site!
    let relative = roots[root!]
      ? segments.join('/')
      : [root, ...segments].join('/')
    if (!relative || relative.endsWith('/')) {
      relative += 'index.html'
    }
    let path = resolve(directory, relative)
    if (!path.startsWith(`${directory}${sep}`)) {
      return new Response(null, { status: 403 })
    }
    if (!extname(path) && !existsSync(path)) {
      path += '.html'
    }
    const file = Bun.file(path)
    if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
      return new Response(Bun.file(resolve(roots.site!, '404.html')), {
        status: 404,
      })
    }
    const type = contentTypes[extname(path)] || file.type
    // Native video players (including WebKit) request byte ranges when loading media.
    const range = request.headers.get('range')?.match(/^bytes=(\d+)-(\d*)$/)
    if (range) {
      const start = Number(range[1])
      const end = Math.min(Number(range[2] || file.size - 1), file.size - 1)
      if (start > end) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${file.size}` },
        })
      }
      return new Response(file.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Type': type,
          'Content-Range': `bytes ${start}-${end}/${file.size}`,
          'Accept-Ranges': 'bytes',
        },
      })
    }
    return new Response(file, {
      headers: {
        ...pageHeaders.get(url.pathname),
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
      },
    })
  },
})

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    void server.stop()
    process.exit()
  })
}
process.on('exit', () => {
  artifact.cleanup()
  experimental.cleanup()
})
