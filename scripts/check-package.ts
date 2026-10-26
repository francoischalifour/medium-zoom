import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { parse } from 'acorn'

import { checkAnalyzers } from './check-package-analyzers.ts'
import { checkConsumers } from './check-package-consumers.ts'
import { packExperimental } from './pack-experimental.ts'
import { pack } from './pack.ts'

async function checkPackage(artifact: ReturnType<typeof pack>, experimental: boolean) {
  try {
    const metadata = JSON.parse(readFileSync(join(artifact.root, 'package.json'), 'utf8'))
    assert.equal(metadata.main, 'dist/medium-zoom.min.js')
    assert.equal(metadata.module, 'dist/medium-zoom.esm.js')
    assert.equal(metadata.types, 'dist/medium-zoom.d.ts')
    assert.deepEqual(Object.keys(metadata.dependencies || {}), [])
    assert.equal(
      !!metadata.exports,
      experimental,
      'Only the unpublished fixture can declare proposed exports'
    )
    assert.equal(
      !!metadata.typesVersions,
      experimental,
      'Do not expose prototype types in release metadata'
    )
    assert.equal(metadata.private === true, experimental)
    assert.equal(
      readFileSync(join(artifact.root, 'CHANGELOG.md'), 'utf8'),
      readFileSync('CHANGELOG.md', 'utf8'),
      'The npm tarball must include the complete changelog'
    )

    const files = readdirSync(join(artifact.root, 'dist'), { recursive: true, encoding: 'utf8' })
    const releasedFiles = [
      'medium-zoom.d.ts',
      'medium-zoom.esm.js',
      'medium-zoom.js',
      'medium-zoom.min.js',
      'pure/index.d.ts',
      'pure/index.js',
      'pure/medium-zoom.min.umd.js',
      'pure/medium-zoom.umd.js',
      'style.css',
    ]
    if (!experimental) {
      const packedFiles = readdirSync(artifact.root, { recursive: true, encoding: 'utf8' }).filter(
        path => statSync(join(artifact.root, path)).isFile()
      )
      assert.deepEqual(
        packedFiles.sort(),
        [
          'package.json',
          'README.md',
          'LICENSE',
          'CHANGELOG.md',
          ...releasedFiles.map(path => `dist/${path}`),
        ].sort(),
        'The release tarball must not contain private sources, fixtures, or experimental outputs'
      )
      assert.deepEqual(
        files.filter(path => statSync(join(artifact.root, 'dist', path)).isFile()).sort(),
        releasedFiles.sort(),
        'The npm tarball must contain only the existing v1 distributions'
      )
    }
    const expectedScripts = releasedFiles.filter(path => path.endsWith('.js'))
    if (experimental) {
      expectedScripts.push(
        'compat/index.cjs',
        'compat/index.mjs',
        'compat/pure/index.cjs',
        'compat/pure/index.mjs',
        'core/index.cjs',
        'core/index.mjs',
        'features/index.cjs',
        'features/index.mjs',
        'modern/index.cjs',
        'modern/index.mjs',
        'pure/index.cjs',
        'pure/index.mjs',
        'renderers/index.cjs',
        'renderers/index.mjs'
      )
    }
    assert.deepEqual(
      files.filter(path => /\.(?:[mc])?js$/.test(path)).sort(),
      expectedScripts.sort()
    )

    for (const path of files.filter(path => /\.(?:[mc])?js$/.test(path))) {
      const code = readFileSync(join(artifact.root, 'dist', path), 'utf8')
      const esm = path.endsWith('.mjs') || path.endsWith('.esm.js') || path === 'pure/index.js'
      const modern = /^(core|features|modern|renderers)\//.test(path)
      parse(code, {
        ecmaVersion: modern ? 2_020 : esm ? 2_015 : 5,
        sourceType: esm ? 'module' : 'script',
      })
      // ESM syntax is intentionally retained; its implementation must still be ES5.
      if (esm && !modern) {
        parse(code.replace(/export\s*\{[^}]+\};?\s*$/, ''), { ecmaVersion: 5 })
      }
      const banner = `/*! medium-zoom ${metadata.version} | MIT License | https://github.com/francoischalifour/medium-zoom */`
      assert(code.startsWith(banner + '\n'), `${path} must start with the release banner`)
      assert.equal(code.split(banner).length - 1, 1, `${path} must contain exactly one banner`)
      assert(!code.includes('#platform'), `${path} must resolve its platform at build time`)
      if (!modern) {
        for (const fallback of [
          'initCustomEvent',
          '.keyCode',
          '.addListener(',
          'documentElement.scrollTop',
        ]) {
          assert(code.includes(fallback), `${path} must retain ${fallback}`)
        }
      }
      if (modern) {
        for (const fallback of [
          'initCustomEvent',
          '.keyCode',
          '.addListener(',
          'documentElement.scrollTop',
        ]) {
          assert(!code.includes(fallback), `${path} must not ship ${fallback}`)
        }
      }
      assert(!code.includes('__TEST__'), `${path} must not ship test branches`)
      if (esm) {
        const loaded = await import(
          `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
        )
        assert.equal(
          typeof (path.startsWith('core/')
            ? loaded.createMediumZoom
            : path.startsWith('features/')
              ? loaded.hdImage
              : path.startsWith('renderers/')
                ? loaded.dialog
                : loaded.default),
          'function'
        )
        continue
      }
      if (path.endsWith('.cjs')) {
        const commonjs = { exports: {} as Record<string, unknown> }
        runInNewContext(code, { module: commonjs, exports: commonjs.exports })
        assert.equal(
          typeof (!/^(core|features|renderers)\//.test(path)
            ? commonjs.exports
            : commonjs.exports[
                path.startsWith('core/')
                  ? 'createMediumZoom'
                  : path.startsWith('renderers/')
                    ? 'dialog'
                    : 'hdImage'
              ]),
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

    assert.equal(
      readFileSync(join(artifact.root, 'dist/medium-zoom.d.ts'), 'utf8'),
      readFileSync(join(artifact.root, 'dist/pure/index.d.ts'), 'utf8')
    )
    assert(
      !readFileSync(join(artifact.root, 'dist/medium-zoom.d.ts'), 'utf8').includes('trigger?:'),
      'Release declarations must not expose modal trigger options'
    )
    const css = readFileSync(join(artifact.root, 'dist/style.css'), 'utf8')
    assert(css.includes('cursor:pointer') && css.includes('cursor:zoom-in'))
    assert(css.includes('cursor:zoom-out'))

    if (experimental) {
      const modernCss = readFileSync(join(artifact.root, 'dist/modern/style.css'), 'utf8')
      assert(!modernCss.includes('cursor:pointer'))
      assert(modernCss.includes('cursor:zoom-in') && modernCss.includes('cursor:zoom-out'))
    }

    await checkAnalyzers(artifact.archive, experimental)
    await checkConsumers(artifact, experimental)
    console.log(
      `${experimental ? 'Unpublished experimental fixture' : 'Release package'} paths, modules, syntax, CSS, license, and declarations verified.`
    )
  } finally {
    artifact.cleanup()
  }
}

const releaseManifest = readFileSync('package.json', 'utf8')
await checkPackage(pack(), false)
await checkPackage(packExperimental(), true)
assert.equal(
  readFileSync('package.json', 'utf8'),
  releaseManifest,
  'Private fixture checks must not mutate release metadata'
)
