import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import mediumZoom from 'medium-zoom'

const require = createRequire(import.meta.url)
const loaded = require('medium-zoom')
assert.equal(typeof loaded, 'function')
assert.equal(mediumZoom, loaded)
assert.equal(loaded.default, undefined, 'The UMD has no extra default property')
assert.match(require.resolve('medium-zoom'), /\/dist\/medium-zoom\.min\.js$/)
for (const path of [
  'dist/medium-zoom.js',
  'dist/medium-zoom.min.js',
  'dist/pure/medium-zoom.umd.js',
  'dist/pure/medium-zoom.min.umd.js',
]) {
  const specifier = `medium-zoom/${path}`
  assert.equal(typeof require(specifier), 'function', specifier)
  assert.equal(typeof (await import(specifier)).default, 'function', specifier)
}
for (const path of ['dist/medium-zoom.esm.js', 'dist/pure/index.js', 'dist/style.css'])
  assert(require.resolve(`medium-zoom/${path}`))
// Native Node ESM does not support the directory shorthand used by bundlers.
await assert.rejects(import('medium-zoom/dist/pure'), { code: 'ERR_UNSUPPORTED_DIR_IMPORT' })
