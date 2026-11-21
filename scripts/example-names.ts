import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const exampleNames = readdirSync('examples', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join('examples', entry.name, 'package.json')))
  .map(entry => entry.name)
  .sort()

// Examples with their own Vite config; the others are built by their framework CLI.
export const viteExampleNames = exampleNames.filter(name =>
  existsSync(join('examples', name, 'vite.config.ts'))
)
