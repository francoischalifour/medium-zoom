import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { parse } from 'acorn'

import { checkAnalyzers } from './check-package-analyzers.ts'
import { checkConsumers } from './check-package-consumers.ts'
import { pack } from './pack.ts'

const artifact = pack()
try {
  const metadata = JSON.parse(readFileSync(join(artifact.root, 'package.json'), 'utf8'))
  assert.equal(metadata.homepage, 'https://medium-zoom.francoischalifour.com')
  assert.match(metadata.description, /lightweight.*image zoom.*React.*shadcn/i)
  assert(metadata.keywords.includes('react'))
  assert(metadata.keywords.includes('shadcn'))
  assert.equal(metadata.main, 'dist/medium-zoom.min.js')
  assert.equal(metadata.module, 'dist/medium-zoom.esm.js')
  assert.equal(metadata.types, 'dist/medium-zoom.d.ts')
  assert.deepEqual(Object.keys(metadata.dependencies || {}), [])
  assert(!metadata.exports, 'Keep existing unrestricted dist imports')
  assert.equal(
    readFileSync(join(artifact.root, 'CHANGELOG.md'), 'utf8'),
    readFileSync('CHANGELOG.md', 'utf8'),
    'The npm tarball must include the complete changelog'
  )

  const files = readdirSync(join(artifact.root, 'dist'), { recursive: true, encoding: 'utf8' })
  assert.deepEqual(files.filter(path => path.endsWith('.js')).sort(), [
    'medium-zoom.esm.js',
    'medium-zoom.js',
    'medium-zoom.min.js',
    'pure/index.js',
    'pure/medium-zoom.min.umd.js',
    'pure/medium-zoom.umd.js',
  ])

  for (const path of files.filter(path => path.endsWith('.js'))) {
    const code = readFileSync(join(artifact.root, 'dist', path), 'utf8')
    const esm = path.endsWith('.esm.js') || path === 'pure/index.js'
    parse(code, { ecmaVersion: esm ? 2_015 : 5, sourceType: esm ? 'module' : 'script' })
    // ESM syntax is intentionally retained; its implementation must still be ES5.
    if (esm) {
      parse(code.replace(/export\s*\{[^}]+\};?\s*$/, ''), { ecmaVersion: 5 })
    }
    const banner = `/*! medium-zoom ${metadata.version} | MIT License | https://github.com/francoischalifour/medium-zoom */`
    assert(code.startsWith(banner + '\n'), `${path} must start with the release banner`)
    assert.equal(code.split(banner).length - 1, 1, `${path} must contain exactly one banner`)
    assert(!code.includes('__TEST__'), `${path} must not ship test branches`)
    if (esm) {
      assert.equal(
        typeof (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`))
          .default,
        'function'
      )
      continue
    }
    const context: Record<string, unknown> = {
      Promise: undefined,
      Symbol: undefined,
      Set: undefined,
      Map: undefined,
    }
    runInNewContext(code, context)
    assert.equal(typeof context.mediumZoom, 'function', `${path} browser global`)
    const commonjs = { exports: {} }
    runInNewContext(code, { module: commonjs, exports: commonjs.exports })
    assert.equal(typeof commonjs.exports, 'function', `${path} CommonJS export`)
    let amd: unknown
    const define = (_dependencies: string[], factory: () => unknown) => {
      amd = factory()
    }
    define.amd = true
    runInNewContext(code, { define })
    assert.equal(typeof amd, 'function', `${path} AMD export`)
  }

  const declarations = readFileSync('src/medium-zoom.d.ts', 'utf8')
  for (const path of ['dist/medium-zoom.d.ts', 'dist/pure/index.d.ts']) {
    assert.equal(readFileSync(join(artifact.root, path), 'utf8'), declarations)
  }
  const css = readFileSync(join(artifact.root, 'dist/style.css'), 'utf8')
  assert(css.includes('cursor:pointer') && css.includes('cursor:zoom-in'))
  assert(css.includes('cursor:zoom-out'))

  await checkAnalyzers(artifact.archive)
  await checkConsumers(artifact)
  console.log('Packed package paths, modules, ES5 syntax, CSS, license, and declarations verified.')
} finally {
  artifact.cleanup()
}
