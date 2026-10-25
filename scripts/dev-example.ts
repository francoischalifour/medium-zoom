import { parseArgs } from 'node:util'
import { createServer } from 'vite'
import { localExampleConfig } from '../vite.examples.config.mts'
import { exampleNames } from './example-names.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { port: { type: 'string' } },
})
const name = positionals[0]
if (!name || !exampleNames.includes(name))
  throw new Error(`Choose an example: ${exampleNames.join(', ')}`)
const config = await localExampleConfig({ name, command: 'serve' })
if (values.port !== undefined) {
  config.server = { ...config.server, port: Number(values.port), strictPort: true }
}
const server = await createServer(config)
await server.listen()
server.printUrls()
