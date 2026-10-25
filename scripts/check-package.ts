import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdirSync, symlinkSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { parse, tokenizer } from 'acorn'
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping'
import { pack } from './pack.ts'

const artifact = pack()
try {
  const metadata = JSON.parse(readFileSync(join(artifact.root, 'package.json'), 'utf8'))
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

  const javascript = files.filter(path => path.endsWith('.js'))
  assert.deepEqual(
    files.filter(path => path.endsWith('.map')).sort(),
    javascript.map(path => `${path}.map`).sort(),
    'Ship exactly one source map for each JavaScript artifact'
  )
  for (const path of javascript) {
    const code = readFileSync(join(artifact.root, 'dist', path), 'utf8')
    assert(!code.includes('sourceMappingURL='), `${path} must keep its source map hidden`)
    const map = JSON.parse(readFileSync(join(artifact.root, 'dist', `${path}.map`), 'utf8'))
    assert.equal(map.file, basename(path))
    assert(!map.sourceRoot, `${path} must use relative source paths`)
    assert(map.sources.length > 0, `${path} must include maintained sources`)
    assert.equal(map.sourcesContent.length, map.sources.length)
    for (const [index, source] of map.sources.entries()) {
      assert(!isAbsolute(source) && !source.includes('\\') && !source.includes(':'), source)
      const sourcePath = resolve('dist', dirname(path), source)
      assert.match(relative(resolve('src'), sourcePath), /^[\w/-]+\.js$/, source)
      assert.equal(map.sourcesContent[index], readFileSync(sourcePath, 'utf8'), source)
    }
    const trace = new TraceMap(map)
    // Tokens survive bundling, ES5 conversion, and minification. Check both source
    // modules at real generated locations after the final transforms.
    const anchors = [
      { token: 'createEvent', source: 'src/utils.js', text: "document.createEvent('CustomEvent')" },
      {
        token: 'medium-zoom:opened',
        source: 'src/medium-zoom.js',
        text: "createCustomEvent('medium-zoom:opened'",
      },
    ]
    for (const anchor of anchors) {
      const token = [...tokenizer(code, { ecmaVersion: 2_015, locations: true })].find(token => {
        const text = code.slice(token.start, token.end)
        return text === anchor.token || text.slice(1, -1) === anchor.token
      })
      assert(token?.loc, `${path} needs a generated ${anchor.token} location`)
      const original = originalPositionFor(trace, token.loc.start)
      const expectedLine =
        readFileSync(anchor.source, 'utf8')
          .split('\n')
          .findIndex(line => line.includes(anchor.text)) + 1
      assert(expectedLine > 0)
      assert(original.source, `${path}: ${anchor.token} needs an original source`)
      assert.equal(resolve('dist', dirname(path), original.source), resolve(anchor.source), path)
      assert.equal(
        original.line,
        expectedLine,
        `${path}: ${anchor.token} must map to original source`
      )
    }
    const esm = path.endsWith('.esm.js') || path === 'pure/index.js'
    parse(code, { ecmaVersion: esm ? 2_015 : 5, sourceType: esm ? 'module' : 'script' })
    // ESM syntax is intentionally retained; its implementation must still be ES5.
    if (esm) parse(code.replace(/export\s*\{[^}]+\};?\s*$/, ''), { ecmaVersion: 5 })
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
    const declaration = readFileSync(join(artifact.root, path), 'utf8')
    assert.equal(declaration, declarations)
    assert(!declaration.includes('sourceMappingURL='), `${path} must not reference missing maps`)
  }
  const css = readFileSync(join(artifact.root, 'dist/style.css'), 'utf8')
  assert(css.includes('cursor:pointer') && css.includes('cursor:zoom-in'))
  assert(css.includes('cursor:zoom-out'))

  const consumer = join(artifact.directory, 'consumer')
  mkdirSync(join(consumer, 'node_modules'), { recursive: true })
  symlinkSync(artifact.root, join(consumer, 'node_modules/medium-zoom'), 'dir')
  copyFileSync('tests/types/consumer.ts', join(consumer, 'consumer.ts'))
  execFileSync(
    resolve('node_modules/.bin/tsc'),
    [
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2020',
      join(consumer, 'consumer.ts'),
    ],
    { cwd: consumer, stdio: 'inherit' }
  )
  console.log(
    'Packed package paths, modules, ES5 syntax, CSS, license, declarations, and source maps verified.'
  )
} finally {
  artifact.cleanup()
}
