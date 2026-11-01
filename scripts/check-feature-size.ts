import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { build } from 'tsdown'

import { bytes, table } from './size-report'

interface Variant {
  features?: string[]
  modal?: boolean
  session?: boolean
  gallery?: boolean
  keyboard?: boolean
  transition?: boolean
  entry?: string
}
const variants: Record<string, Variant> = {
  core: {},
  'core + session': { session: true },
  'core + HD': { features: ['hdImage'] },
  'core + container': { features: ['container'] },
  'core + template': { features: ['template'] },
  'core + legacy features': { features: ['hdImage', 'container', 'template'] },
  'core + dialog': { modal: true },
  'dialog + accessibility': { modal: true, features: ['accessibility'] },
  'dialog + headless gallery': { modal: true, gallery: true },
  'gallery + session': { modal: true, gallery: true, session: true },
  'gallery + keyboard': { modal: true, gallery: true, session: true, keyboard: true },
  'accessible gallery': {
    modal: true,
    gallery: true,
    session: true,
    keyboard: true,
    features: ['accessibility'],
  },
  'gallery + all features': {
    modal: true,
    gallery: true,
    session: true,
    keyboard: true,
    features: ['accessibility', 'hdImage', 'container', 'template'],
  },
  'gallery + custom transition': { modal: true, gallery: true, session: true, transition: true },
  full: { entry: 'dist/medium-zoom.esm.js' },
  'pure full': { entry: 'dist/pure/index.mjs' },
  'compat full': { entry: 'dist/compat/index.mjs' },
  'compat pure': { entry: 'dist/compat/pure/index.mjs' },
  'modern full': { entry: 'dist/modern/index.mjs' },
}
const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-size-'))
const path = (name: string) => JSON.stringify(resolve(`dist/${name}/index.mjs`))
try {
  const results: Record<string, number> = {}
  for (const [index, [name, variant]] of Object.entries(variants).entries()) {
    const {
      features = [],
      modal = false,
      session = false,
      gallery = false,
      keyboard = false,
      transition = false,
      entry: full,
    } = variant
    const entry = join(directory, `${index}.ts`)
    const source = full
      ? `import zoom from ${JSON.stringify(resolve(full))};globalThis.zoom=zoom('img');`
      : `
      import {createMediumZoom} from ${path('core')};
      import {hdImage,container,template,accessibility} from ${path('features')};
      ${modal ? `import {dialog} from ${path('renderers')};` : ''}
      ${session ? `import {createZoomSession} from ${path('session')};` : ''}
      ${gallery ? `import {createGallery,bindGalleryKeyboard} from ${path('gallery')};` : ''}
      const zoom=createMediumZoom({${modal ? `renderer:dialog({${keyboard ? 'content:({element,zoom})=>bindGalleryKeyboard(element,createGallery(zoom)),' : ''}${transition ? 'transition:({incoming,signal})=>Promise.all(incoming.map(frame=>{const animation=frame.element.animate([{opacity:0},{opacity:1}],{duration:120});signal.addEventListener("abort",()=>animation.cancel(),{once:true});return animation.finished})).then(()=>undefined),' : ''}}),` : ''}features:[${features.map(feature => `${feature}()`).join(',')}]})('img');
      ${session ? 'globalThis.session=createZoomSession(zoom);' : ''}
      globalThis.zoom=zoom;
      ${gallery ? 'globalThis.gallery=createGallery(zoom);' : ''}`
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
    results[name] = gzipSync(code, { level: 9 }).length
    assert.equal(
      code.includes('prefers-reduced-motion:reduce'),
      !!full && !['pure full', 'compat pure'].includes(name),
      `${name}: CSS injection`
    )
    assert.equal(code.includes('showModal'), modal, `${name}: modal isolation`)
    assert(
      !code.includes('Previous image') && !code.includes('Close image'),
      `${name}: no built-in UI`
    )
    assert.equal(
      code.includes('ArrowLeft'),
      keyboard,
      `${name}: optional keyboard binding isolation`
    )
    assert.equal(
      code.includes('snapshot') || code.includes('getSnapshot'),
      gallery,
      `${name}: headless controller isolation`
    )
    assert.equal(
      code.includes('aria-haspopup'),
      features.includes('accessibility'),
      `${name}: keyboard adapter isolation`
    )
    const included = full ? ['hdImage', 'container', 'template'] : features
    assert.equal(
      code.includes('data-zoom-src'),
      included.includes('hdImage'),
      `${name}: HD isolation`
    )
    assert.equal(
      code.includes('opacity 150ms'),
      included.includes('template'),
      `${name}: template isolation`
    )
    assert.equal(
      code.includes('right:0,bottom:0'),
      included.includes('container'),
      `${name}: container isolation`
    )
    if (!full || name === 'modern full') {
      assert(!code.includes('initCustomEvent'))
      assert(!code.includes('.keyCode'))
    }
  }
  const featureCodes: Record<string, string> = {
    hdImage: 'H',
    container: 'C',
    template: 'T',
    accessibility: 'A',
  }
  const cssSize = (path: string) => gzipSync(readFileSync(path), { level: 9 }).length
  const modernCss = cssSize('dist/modern/style.css')
  const compatCss = cssSize('dist/style.css')
  const comparison: Record<string, string> = {
    'core + session': 'core',
    'core + HD': 'core',
    'core + container': 'core',
    'core + template': 'core',
    'core + legacy features': 'core',
    'core + dialog': 'core',
    'dialog + accessibility': 'core + dialog',
    'dialog + headless gallery': 'core + dialog',
    'gallery + session': 'dialog + headless gallery',
    'gallery + keyboard': 'gallery + session',
    'accessible gallery': 'gallery + keyboard',
    'gallery + all features': 'accessible gallery',
    'gallery + custom transition': 'gallery + session',
  }
  const stylesFor = (name: string, variant: Variant) =>
    variant.entry ? (['pure full', 'compat pure'].includes(name) ? compatCss : 0) : modernCss
  const total = (name: string) => results[name]! + stylesFor(name, variants[name]!)
  console.log('\nCONSUMER MATRIX · private candidate API · tree-shaken ESM · gzip level 9')
  console.log(
    'Exports below are subpaths of ONE medium-zoom package, not separate npm dependencies.'
  )
  console.log(
    'Every row includes core; modal/gallery/session/keyboard requirements are listed explicitly.'
  )
  console.log(
    'Columns map to renderers/session/gallery exports. Keyboard is an opt-in gallery helper. Features: H=hdImage, C=container, T=template, A=accessibility.'
  )
  const rows = (names: string[]) =>
    names.map(name => {
      const variant = variants[name]!
      const base = comparison[name]
      const delta = base ? total(name) - total(base) : undefined
      return [
        name,
        ['hdImage', 'container', 'template', 'accessibility']
          .filter(feature => variant.features?.includes(feature))
          .map(feature => featureCodes[feature])
          .join(' ') || '—',
        variant.modal ? 'yes' : '—',
        variant.session ? 'yes' : '—',
        variant.gallery ? 'yes' : '—',
        variant.keyboard ? 'yes' : '—',
        variant.gallery ? (variant.transition ? 'custom' : 'instant') : '—',
        bytes(results[name]!),
        bytes(stylesFor(name, variant)),
        bytes(total(name)),
        delta === undefined ? '—' : `${delta >= 0 ? '+' : '−'}${bytes(Math.abs(delta))}`,
        base || '—',
      ]
    })
  const selected = Object.keys(variants).filter(name => !variants[name]!.entry)
  for (const [title, names] of [
    ['ENGINE + OPTIONAL FEATURES', selected.filter(name => !variants[name]!.modal)],
    ['MODAL + GALLERY COMPOSITIONS', selected.filter(name => variants[name]!.modal)],
  ] as const) {
    console.log(`\n${title}`)
    table(
      [
        'Composition',
        'Features',
        'Dialog',
        'Session',
        'Gallery',
        'Keyboard',
        'Switch',
        'JS gzip',
        'CSS gzip',
        'Total*',
        'Δ total',
        'Compared with',
      ],
      rows(names)
    )
  }
  console.log(
    '\nPRESET CONSUMERS · these include HD/container/template, never dialog/session/gallery'
  )
  const presetImports: Record<string, string> = {
    full: 'medium-zoom',
    'pure full': 'medium-zoom/pure',
    'compat full': 'medium-zoom/compat',
    'compat pure': 'medium-zoom/compat/pure',
    'modern full': 'medium-zoom/modern',
  }
  table(
    ['Import', 'Availability', 'JS gzip', 'Separate CSS', 'Total*'],
    Object.entries(variants)
      .filter(([, variant]) => variant.entry)
      .map(([name, variant]) => [
        presetImports[name]!,
        name === 'full' ? 'release manifest' : 'private candidate',
        bytes(results[name]!),
        bytes(stylesFor(name, variant)),
        bytes(total(name)),
      ])
  )
  console.log(
    '\n* Total sums independently gzipped JS/CSS assets. Injected CSS is already in JS; standalone CSS is counted once.'
  )
  console.log(
    'Application-owned control markup/styles and visible close UI are excluded; no runtime entry supplies them.'
  )
  console.log(
    'Deltas compare complete rows, not standalone module sizes. No React runtime or application styles are included.'
  )
  console.log(
    'Custom-transition row includes its example strategy. Default navigation is instant; no animation library is bundled.'
  )
  console.log(
    'Features barrel is tree-shaken; its factories are not separate packages. See tests/experimental/PACKAGING.md.'
  )

  assert(results.core < results.full!)
  assert(results['gallery + session']! < results['gallery + keyboard']!)
  assert(results.core! <= 3_800, 'Core consumer JS exceeds the 3,800 B gzip ceiling')
  assert(results['pure full']! < results.full!)
} finally {
  rmSync(directory, { recursive: true, force: true })
}
