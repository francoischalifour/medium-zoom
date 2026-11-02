import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
assert.equal(realpathSync(process.cwd()), root, 'Run verification from this checkout root')
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
const dirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
console.log(
  `Verifying ${root} @ ${revision}${dirty ? ' (local changes)' : ''}; Bun ${process.versions.bun}; ${process.version}`
)
