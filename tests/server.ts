import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { pack } from '../scripts/pack.ts'

const artifact = pack()
const roots: Record<string, string> = {
  package: artifact.root,
  baseline: resolve('node_modules/medium-zoom-baseline'),
  images: resolve('stories/images'),
  site: resolve('website/dist'),
}
const contentTypes: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end('<!doctype html><title>Medium Zoom package tests</title>')
    return
  }
  const [, root, ...segments] = decodeURIComponent(url.pathname).split('/')
  const directory = roots[root] || roots.site
  let relative = roots[root] ? segments.join('/') : [root, ...segments].join('/')
  if (relative === 'website.html') relative = 'index.html'
  if (!relative || relative.endsWith('/')) relative += 'index.html'
  const path = resolve(directory, relative)
  if (!path.startsWith(`${directory}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    const contents = readFileSync(path)
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(path)] || 'application/octet-stream',
    })
    response.end(contents)
  } catch {
    response.writeHead(404).end()
  }
})

server.listen(4_175, '127.0.0.1')
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => process.exit()))
process.on('exit', artifact.cleanup)
