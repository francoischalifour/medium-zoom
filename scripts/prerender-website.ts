import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

export async function prerenderWebsite(directory: string) {
  // Use Vite's MDX and raw-source transforms for the same tree rendered in the browser.
  const server = await createServer({
    mode: 'production',
    // Production dependency optimization must not replace a running dev server's React runtime.
    cacheDir: fileURLToPath(new URL('../.cache/vite-prerender/', import.meta.url)),
    configFile: fileURLToPath(new URL('../config/vite.website.config.mts', import.meta.url)),
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    appType: 'custom',
  })
  try {
    const renderer = await server.ssrLoadModule('/build/prerender.ts')
    renderer.prerenderWebsite(directory)
  } finally {
    await server.close()
  }
}

if (import.meta.main) {
  await prerenderWebsite(fileURLToPath(new URL('../website/dist/', import.meta.url)))
}
