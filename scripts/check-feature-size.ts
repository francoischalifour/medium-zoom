import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'tsdown'

// Measure complete consumer bundles with and without injected CSS.
// Import every feature in each fixture to verify unused exports are eliminated.
const variants = {
  core: [],
  'core + HD': ['hdImage'],
  'core + container': ['container'],
  'core + template': ['template'],
  'core + all features': ['hdImage', 'container', 'template'],
  full: null,
} satisfies Record<string, string[] | null>
const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-size-'))
try {
  const results: Record<string, number> = {}
  for (const pure of [false, true]) {
    for (const [index, [name, features]] of Object.entries(variants).entries()) {
      const entry = join(directory, `${pure ? 'pure-' : ''}${index}.ts`)
      const source = features
        ? `import { createMediumZoom } from ${JSON.stringify(resolve(pure ? 'dist/core/pure/index.mjs' : 'dist/core/index.mjs'))};
         import { hdImage, container, template } from ${JSON.stringify(resolve('dist/features/index.mjs'))};
         globalThis.zoom = createMediumZoom({ features: [${features.map(name => `${name}()`).join(',')}] })('img');`
        : `import mediumZoom from ${JSON.stringify(resolve(pure ? 'dist/pure/index.mjs' : 'dist/medium-zoom.esm.js'))}; globalThis.zoom = mediumZoom('img');`
      writeFileSync(entry, source)
      const output = join(directory, `output-${pure ? 'pure-' : ''}${index}`)
      await build({
        config: false,
        entry: { index: entry },
        outDir: output,
        platform: 'browser',
        target: 'es2015',
        format: 'esm',
        minify: true,
        dts: false,
        logLevel: 'silent',
        outputOptions: { entryFileNames: 'index.js' },
      })
      const code = readFileSync(join(output, 'index.js'), 'utf8')
      const label = pure ? `pure ${name}` : name
      results[label] = gzipSync(code, { level: 9 }).length
      assert.equal(code.includes('prefers-reduced-motion:reduce'), !pure, `${label}: CSS injection`)
      const included = features || variants['core + all features']
      assert.equal(
        code.includes('data-zoom-src'),
        included.includes('hdImage'),
        `${name}: HD loading`
      )
      assert.equal(
        code.includes('opacity 150ms'),
        included.includes('template'),
        `${name}: templates`
      )
      assert.equal(
        code.includes('.right'),
        included.includes('container'),
        `${name}: custom containers`
      )
      console.log(
        `${label.padEnd(26)} ${results[label].toLocaleString('en-US').padStart(6)} B gzip`
      )
    }
  }
  assert(results['pure core'] < results.core, 'Pure core must omit CSS injection')
  assert(results['pure full'] < results.full, 'Pure full must omit CSS injection')
  assert(results.core < results.full, 'The core consumer must be smaller than the full consumer')
} finally {
  rmSync(directory, { recursive: true, force: true })
}
