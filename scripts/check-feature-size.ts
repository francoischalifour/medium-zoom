import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { build } from 'tsdown'

// Measure consumers targeting ES2020, including styled compat and modern full entries.
// Import every feature in each fixture to verify unused exports are eliminated.
const variants = {
  core: [],
  'core + session': [],
  'core + HD': ['hdImage'],
  'core + container': ['container'],
  'core + template': ['template'],
  'core + all features': ['hdImage', 'container', 'template'],
  'core + dialog': [],
  'dialog + all features': ['hdImage', 'container', 'template'],
  'dialog + accessibility': ['accessibility'],
  'dialog + gallery': ['gallery'],
  'dialog + accessible gallery': ['accessibility', 'gallery'],
  'dialog + gallery + all': ['accessibility', 'gallery', 'hdImage', 'container', 'template'],
  full: null,
  'pure full': null,
  'compat full': null,
  'compat pure': null,
  'modern full': null,
} satisfies Record<string, string[] | null>
const fullEntries: Record<string, string> = {
  full: 'dist/medium-zoom.esm.js',
  'pure full': 'dist/pure/index.mjs',
  'compat full': 'dist/compat/index.mjs',
  'compat pure': 'dist/compat/pure/index.mjs',
  'modern full': 'dist/modern/index.mjs',
}
const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-size-'))
try {
  const results: Record<string, number> = {}
  for (const [index, [name, features]] of Object.entries(variants).entries()) {
    const entry = join(directory, `${index}.ts`)
    const modal = name.includes('dialog')
    const session = name.includes('session')
    const source = features
      ? `import { createMediumZoom } from ${JSON.stringify(resolve('dist/core/index.mjs'))};
         import { hdImage, container, template, accessibility, gallery } from ${JSON.stringify(resolve('dist/features/index.mjs'))};
         ${modal ? `import { dialog } from ${JSON.stringify(resolve('dist/renderers/index.mjs'))};` : ''}
         ${session ? `import { createZoomSession } from ${JSON.stringify(resolve('dist/session/index.mjs'))};` : ''}
         globalThis.zoom = ${session ? 'createZoomSession(' : ''}createMediumZoom({ ${modal ? 'renderer: dialog(),' : ''} features: [${features.map(name => `${name}()`).join(',')}] })('img')${session ? ')' : ''};`
      : `import mediumZoom from ${JSON.stringify(resolve(fullEntries[name]))}; globalThis.zoom = mediumZoom('img');`
    writeFileSync(entry, source)
    const output = join(directory, `output-${index}`)
    await build({
      config: false,
      entry: { index: entry },
      outDir: output,
      platform: 'browser',
      target: 'es2020',
      format: 'esm',
      minify: true,
      dts: false,
      logLevel: 'silent',
      outputOptions: { entryFileNames: 'index.js' },
    })
    const code = readFileSync(join(output, 'index.js'), 'utf8')
    const label = name
    results[label] = gzipSync(code, { level: 9 }).length
    assert.equal(
      code.includes('prefers-reduced-motion:reduce'),
      !features && !['pure full', 'compat pure'].includes(name),
      `${label}: CSS injection`
    )
    if (features || name === 'modern full') {
      assert(!code.includes('initCustomEvent'), `${name}: no legacy event fallback`)
      assert(!code.includes('.keyCode'), `${name}: no legacy keyboard fallback`)
    }
    assert.equal(
      code.includes('WeakMap'),
      session ||
        (features as string[] | null)?.includes('accessibility') ||
        (features as string[] | null)?.includes('gallery') ||
        false,
      `${name}: session and gallery isolation`
    )
    assert.equal(code.includes('showModal'), modal, `${name}: dialog renderer isolation`)
    const included = features || variants['core + all features']
    assert.equal(
      code.includes('Previous image'),
      included.includes('gallery'),
      `${name}: gallery isolation`
    )
    assert.equal(
      code.includes('aria-haspopup'),
      included.includes('accessibility'),
      `${name}: accessibility isolation`
    )
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
    console.log(`${label.padEnd(26)} ${results[label].toLocaleString('en-US').padStart(6)} B gzip`)
  }

  assert(results['pure full'] < results.full, 'Pure full must omit CSS injection')
  assert(results.core < results.full, 'The core consumer must be smaller than the full consumer')
} finally {
  rmSync(directory, { recursive: true, force: true })
}
