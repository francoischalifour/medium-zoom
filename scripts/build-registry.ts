import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import registryDefinition from '../registry.json' with { type: 'json' }
import { version } from '../package.json' with { type: 'json' }

const registry = {
  ...registryDefinition,
  items: registryDefinition.items.map(item => ({
    ...item,
    dependencies: item.dependencies.map(dependency =>
      dependency === 'medium-zoom' ? `medium-zoom@^${version}` : dependency
    ),
  })),
}

const output = resolve('website/public/r')
mkdirSync(output, { recursive: true })
writeFileSync(resolve(output, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`)
for (const item of registry.items) {
  writeFileSync(
    resolve(output, `${item.name}.json`),
    `${JSON.stringify(
      {
        $schema: 'https://ui.shadcn.com/schema/registry-item.json',
        ...item,
        files: item.files.map(file => ({ ...file, content: readFileSync(file.path, 'utf8') })),
      },
      null,
      2
    )}\n`
  )
}
