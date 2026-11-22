import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import mediumZoom from 'medium-zoom'

const require = createRequire(import.meta.url)
assert.equal(typeof mediumZoom, 'function')
assert.equal(typeof require('medium-zoom'), 'function')
assert.match(require.resolve('medium-zoom'), /\/dist\/modern\/index.cjs$/)
for (const entry of [
  'modern',
  'modern/pure',
  'pure',
  'compat',
  'compat/pure',
]) {
  assert.equal(typeof require(`medium-zoom/${entry}`), 'function')
  assert.equal(
    typeof (await import(`medium-zoom/${entry}`)).default,
    'function'
  )
}
assert.equal(
  require.resolve('medium-zoom/style.css'),
  require.resolve('medium-zoom/modern/style.css')
)
assert.equal(
  require.resolve('medium-zoom/compat/style.css'),
  require.resolve('medium-zoom/dist/style.css')
)
