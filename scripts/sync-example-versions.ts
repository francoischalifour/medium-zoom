import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { version } from '../package.json' with { type: 'json' }
import { exampleNames } from './example-names.ts'

// A retried job from an older release must never downgrade the examples on main.
if (process.argv[2] !== version) {
  throw new Error(
    `Expected published version ${version}, got ${process.argv[2]}`
  )
}

for (const name of exampleNames) {
  const path = join('examples', name, 'package.json')
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  if (
    manifest.dependencies?.['medium-zoom'] === undefined ||
    manifest.dependencies['medium-zoom'] === version
  ) {
    continue
  }
  manifest.dependencies['medium-zoom'] = version
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
}
