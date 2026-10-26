import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { pack } from '../scripts/pack.ts'
import { testPort } from './server-urls.ts'
import { readExactRedirects } from '../website/build/site-redirects.ts'

const artifact = pack()
const roots: Record<string, string> = {
  package: artifact.root,
  baseline: resolve('node_modules/medium-zoom-baseline'),
  images: resolve('stories/images'),
  site: resolve('website/dist'),
  analytics: resolve('.cache/analytics-site'),
}
const pageRedirects = readExactRedirects(resolve(roots.site, '_redirects'))
const contentTypes: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end('<!doctype html><title>Medium Zoom package tests</title>')
    return
  }
  const destination = pageRedirects.get(url.pathname)
  if (destination) {
    response.writeHead(301, { Location: destination + url.search }).end()
    return
  }
  const [, root, ...segments] = decodeURIComponent(url.pathname).split('/')
  const directory = roots[root] || roots.site
  let relative = roots[root] ? segments.join('/') : [root, ...segments].join('/')
  if (relative === 'website.html') relative = 'index.html'
  if (!relative || relative.endsWith('/')) relative += 'index.html'
  let path = resolve(directory, relative)
  if (!path.startsWith(`${directory}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  if (!extname(path) && !existsSync(path)) path += '.html'
  try {
    const contents = readFileSync(path)
    const contentType = contentTypes[extname(path)] || 'application/octet-stream'
    // Native video players (including WebKit) request byte ranges when loading media.
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
    if (range) {
      const start = Number(range[1])
      const end = Math.min(Number(range[2] || contents.length - 1), contents.length - 1)
      if (start > end) {
        response.writeHead(416, { 'Content-Range': `bytes */${contents.length}` }).end()
        return
      }
      response.writeHead(206, {
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${contents.length}`,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
      })
      response.end(contents.subarray(start, end + 1))
      return
    }
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': contents.length,
      'Accept-Ranges': 'bytes',
    })
    response.end(contents)
  } catch {
    response.writeHead(404).end()
  }
})

server.listen(testPort, '127.0.0.1')
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => process.exit()))
process.on('exit', artifact.cleanup)
