import { resolve } from 'node:path'
import { build } from 'vite'
import { prerenderWebsite } from '../website/build/prerender'

// A public test key, with all delivery intercepted by the browser tests.
const output = resolve('.cache/analytics-site')
await build({
  configFile: resolve('config/vite.website.config.mts'),
  define: { 'import.meta.env.VITE_ALTERTABLE_API_KEY': JSON.stringify('website-test-key') },
  build: { outDir: output, emptyOutDir: true },
})
prerenderWebsite(output)
