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
assert.equal(typeof (await import('medium-zoom/dist/pure')).default, 'function')

for (const [entry, names] of Object.entries({
  core: ['createMediumZoom'],
  features: ['hdImage', 'container', 'template'],
})) {
  const esm = await import(`medium-zoom/${entry}`)
  const cjs = require(`medium-zoom/${entry}`)
  for (const name of names) {
    assert.equal(typeof esm[name], 'function')
    assert.equal(typeof cjs[name], 'function')
  }
}

for (const path of [
  'medium-zoom',
  'medium-zoom.min',
  'medium-zoom.esm',
  'pure/index',
  'pure/medium-zoom.umd',
  'pure/medium-zoom.min.umd',
]) {
  assert.equal(
    require.resolve(`medium-zoom/dist/${path}`),
    require.resolve(`medium-zoom/dist/${path}.js`)
  )
}

assert.equal(typeof (await import('medium-zoom/pure')).default, 'function')
assert.equal(typeof require('medium-zoom/pure'), 'function')

assert.equal(
  require.resolve('medium-zoom/style.css'),
  require.resolve('medium-zoom/dist/style.css')
)
assert.match(require.resolve('medium-zoom/modern/style.css'), /\/dist\/modern\/style\.css$/)
assert.equal(
  require.resolve('medium-zoom/compat/style.css'),
  require.resolve('medium-zoom/dist/style.css')
)

for (const profile of ['compat', 'compat/pure', 'modern']) {
  assert.equal(typeof (await import(`medium-zoom/${profile}`)).default, 'function')
  assert.equal(typeof require(`medium-zoom/${profile}`), 'function')
}

assert.notEqual(require.resolve('medium-zoom/compat/pure'), require.resolve('medium-zoom/pure'))
