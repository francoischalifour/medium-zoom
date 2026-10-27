import { build } from 'vite'

import { localExampleConfig } from '../config/vite.examples.config.mts'
import { exampleNames } from './example-names.ts'

for (const name of exampleNames) {
  await build(await localExampleConfig({ name, command: 'build' }))
}
