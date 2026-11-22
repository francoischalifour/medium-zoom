import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { createServer } from 'vite'

import { localExampleConfig } from './example-config.ts'
import { viteExampleNames } from './example-names.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { port: { type: 'string' } },
})
const name = positionals[0]
if (!name || !viteExampleNames.includes(name)) {
  console.error(
    `Choose an example: ${viteExampleNames.join(', ')}.\n` +
      'Framework CLI examples (Angular, Astro, VitePress) run with `bun run examples`.'
  )
  process.exit(1)
}
if (!existsSync('dist/medium-zoom.esm.js')) {
  console.error(
    'Build the library first: `bun run build`, or `bun run dev` to watch it.'
  )
  process.exit(1)
}
const config = await localExampleConfig({ name, command: 'serve' })
if (values.port !== undefined) {
  config.server = {
    ...config.server,
    port: Number(values.port),
    strictPort: true,
  }
}
const server = await createServer(config)
await server.listen()
server.printUrls()
