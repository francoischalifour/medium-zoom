import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const exampleNames = readdirSync('examples', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join('examples', entry.name, 'package.json')))
  .map(entry => entry.name)
  .sort()
