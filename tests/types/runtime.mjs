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
for (const path of ['dist/medium-zoom.esm.js', 'dist/pure/index.js', 'dist/style.css']) {
  assert(require.resolve(`medium-zoom/${path}`))
}
// Native Node ESM does not support the directory shorthand used by bundlers.
await assert.rejects(import('medium-zoom/dist/pure'), { code: 'ERR_UNSUPPORTED_DIR_IMPORT' })

// Keep v1's extension and directory resolution, including the trailing slash.
for (const path of [
  'dist/medium-zoom',
  'dist/medium-zoom.min',
  'dist/pure/index',
  'dist/pure/medium-zoom.umd',
  'dist/pure/medium-zoom.min.umd',
]) {
  assert.equal(require.resolve(`medium-zoom/${path}`), require.resolve(`medium-zoom/${path}.js`))
}
assert.equal(
  require.resolve('medium-zoom/dist/pure'),
  require.resolve('medium-zoom/dist/pure/index.js')
)
assert.equal(
  require.resolve('medium-zoom/dist/pure/'),
  require.resolve('medium-zoom/dist/pure/index.js')
)

// Neither candidate aliases nor raw experimental artifacts may escape the tarball.
for (const path of [
  'core',
  'features',
  'modern',
  'compat',
  'pure',
  'compat/pure',
  'style.css',
  'modern/style.css',
  'compat/style.css',
  'dist/core/index.mjs',
  'dist/core/index.cjs',
  'dist/core/index.d.mts',
  'dist/features/index.mjs',
  'dist/modern/index.mjs',
  'dist/compat/index.mjs',
  'dist/compat/pure/index.mjs',
  'dist/modern/style.css',
  'dist/pure/index.mjs',
  'dist/pure/index.cjs',
  'dist/pure/index.d.mts',
  'dist/pure/index.d.cts',
]) {
  assert.throws(() => require.resolve(`medium-zoom/${path}`), { code: 'MODULE_NOT_FOUND' })
}
