import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer, type Manifest } from 'vite'

export async function prerenderWebsite(directory: string) {
  const root = fileURLToPath(new URL('../website/', import.meta.url))
  const manifest: Manifest = JSON.parse(
    readFileSync(resolve(directory, '.vite/manifest.json'), 'utf8')
  )
  const assets = new Map(
    Object.values(manifest)
      .filter(entry => entry.src && !/\.(?:js|css|html)$/.test(entry.file))
      .map(entry => [resolve(root, entry.src!), `/${entry.file}`])
  )
  // Use Vite's MDX and raw-source transforms for the same tree rendered in the browser.
  const server = await createServer({
    plugins: [
      {
        name: 'medium-zoom-prerender-assets',
        enforce: 'pre',
        load(id) {
          const [file, query] = id.split('?')
          const asset = (!query || query === 'url') && assets.get(file)
          if (asset) {
            return `export default ${JSON.stringify(asset)}`
          }
        },
      },
    ],
    mode: 'production',
    // Production dependency optimization must not replace a running dev server's React runtime.
    cacheDir: fileURLToPath(
      new URL('../.cache/vite-prerender/', import.meta.url)
    ),
    configFile: fileURLToPath(
      new URL('../website/vite.config.mts', import.meta.url)
    ),
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    appType: 'custom',
  })
  try {
    const renderer = await server.ssrLoadModule('/build/prerender.ts')
    await renderer.prerenderWebsite(directory)
  } finally {
    await server.close()
  }
}

if (import.meta.main) {
  await prerenderWebsite(
    fileURLToPath(new URL('../website/dist/', import.meta.url))
  )
}
