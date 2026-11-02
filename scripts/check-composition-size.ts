import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { build } from 'tsdown'

import baseline from '../tests/experimental/bundle-baseline.json' with { type: 'json' }
import { bytes, table } from './size-report'

interface Variant {
  loader?: boolean
  viewport?: boolean
  content?: boolean
  triggers?: boolean
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
  'core + HD': { loader: true },
  'core + container': { viewport: true },
  'core + HD + container': { loader: true, viewport: true },
  'core + dialog': { modal: true },
  'dialog + template': { modal: true, content: true },
  'dialog + accessibility': { modal: true, triggers: true },
  'dialog + headless gallery': { modal: true, gallery: true },
  'gallery + session': { modal: true, gallery: true, session: true },
  'gallery + keyboard': { modal: true, gallery: true, session: true, keyboard: true },
  'accessible gallery': {
    modal: true,
    gallery: true,
    session: true,
    keyboard: true,
    triggers: true,
  },
  'gallery + all capabilities': {
    modal: true,
    gallery: true,
    session: true,
    keyboard: true,
    triggers: true,
    loader: true,
    viewport: true,
    content: true,
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
const gzip = (path: string) => gzipSync(readFileSync(path), { level: 9 }).length
try {
  const results: Record<string, number> = {}
  for (const [index, [name, variant]] of Object.entries(variants).entries()) {
    const {
      loader = false,
      viewport = false,
      content = false,
      triggers = false,
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
      import {createZoom} from ${path('core')};
      ${loader ? `import {loadHdImage} from ${path('loaders')};` : ''}
      ${viewport ? `import {containerBounds} from ${path('viewport')};` : ''}
      ${content ? `import {templateContent} from ${path('content')};` : ''}
      ${triggers ? `import {bindZoomTriggers} from ${path('triggers')};` : ''}
      ${modal ? `import {dialog} from ${path('renderers')};` : ''}
      ${session ? `import {createZoomSession} from ${path('session')};` : ''}
      ${gallery ? `import {createGallery,bindGalleryKeyboard} from ${path('gallery')};` : ''}
      const zoom=createZoom('img',{
        ${loader ? 'loader:loadHdImage,' : ''}
        ${viewport ? 'viewport:containerBounds(document.body),' : ''}
        ${
          modal
            ? `renderer:dialog({
          ${content ? 'content:templateContent("#caption"),' : ''}
          ${keyboard ? 'content:({element,zoom})=>bindGalleryKeyboard(element,createGallery(zoom)),' : ''}
          ${transition ? 'transition:({incoming,signal})=>Promise.all(incoming.map(frame=>{const animation=frame.element.animate([{opacity:0},{opacity:1}],{duration:120});signal.addEventListener("abort",()=>animation.cancel(),{once:true});return animation.finished})).then(()=>undefined),' : ''}
        }),`
            : ''
        }
      });
      ${session ? 'globalThis.session=createZoomSession(zoom);' : ''}
      ${gallery ? 'globalThis.gallery=createGallery(zoom);' : ''}
      ${triggers ? 'globalThis.unbind=bindZoomTriggers(zoom);' : ''}
      globalThis.zoom=zoom;`
    // When both content helpers are selected, the application composes their cleanups.
    const composedSource =
      content && keyboard
        ? source
            .replace('content:templateContent("#caption"),', '')
            .replace(
              'content:({element,zoom})=>bindGalleryKeyboard(element,createGallery(zoom)),',
              'content:view=>{const content=templateContent("#caption")(view);const unbind=bindGalleryKeyboard(view.element,createGallery(view.zoom));return()=>{unbind();content?.()}},'
            )
        : source
    writeFileSync(entry, composedSource)
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
    assert.equal(code.includes('showModal'), modal, `${name}: renderer isolation`)
    assert(
      !code.includes('Previous image') && !code.includes('Close image'),
      `${name}: no controls`
    )
    assert.equal(code.includes('ArrowLeft'), keyboard, `${name}: keyboard isolation`)
    assert.equal(code.includes('getSnapshot'), gallery, `${name}: controller isolation`)
    assert.equal(code.includes('.repeat'), triggers, `${name}: trigger binding isolation`)
    assert.equal(code.includes('data-zoom-src'), !!full || loader, `${name}: loader isolation`)
    assert.equal(
      code.includes('.content.cloneNode'),
      !!full || content,
      `${name}: content isolation`
    )
    assert.equal(
      code.includes('opacity 150ms'),
      !!full,
      `${name}: legacy template fade stays in preset`
    )
    assert.equal(
      code.includes('right:0,bottom:0'),
      !!full || viewport,
      `${name}: viewport isolation`
    )
    if (full) {
      assert(!code.includes('.acceptsTrigger'), `${name}: modal orchestration stays out of presets`)
    }
    if (!full || name === 'modern full') {
      assert(!code.includes('initCustomEvent'))
      assert(!code.includes('.keyCode'))
    }
  }
  const modernCss = gzip('dist/modern/style.css'),
    compatCss = gzip('dist/style.css')
  const css = (name: string) =>
    variants[name]!.entry
      ? ['pure full', 'compat pure'].includes(name)
        ? compatCss
        : 0
      : modernCss
  const total = (name: string) => results[name]! + css(name)
  const comparison: Record<string, string> = {
    'core + session': 'core',
    'core + HD': 'core',
    'core + container': 'core',
    'core + HD + container': 'core + HD',
    'core + dialog': 'core',
    'dialog + template': 'core + dialog',
    'dialog + accessibility': 'core + dialog',
    'dialog + headless gallery': 'core + dialog',
    'gallery + session': 'dialog + headless gallery',
    'gallery + keyboard': 'gallery + session',
    'accessible gallery': 'gallery + keyboard',
    'gallery + all capabilities': 'accessible gallery',
    'gallery + custom transition': 'gallery + session',
  }
  console.log(
    '\nCONSUMER MATRIX · explicit strategies/controllers/bindings · one private medium-zoom package'
  )
  console.log(
    'Every row includes core. Imports: L=loaders/loadHdImage, V=viewport/containerBounds, C=content/templateContent, T=triggers/bindZoomTriggers.'
  )
  console.log(
    'Content and keyboard helpers compose in the renderer slot. Controllers/bindings install explicitly after instance creation.'
  )
  const selected = Object.keys(variants).filter(name => !variants[name]!.entry)
  for (const [title, names] of [
    ['ENGINE + OPTIONAL STRATEGIES', selected.filter(name => !variants[name]!.modal)],
    ['MODAL + GALLERY COMPOSITIONS', selected.filter(name => variants[name]!.modal)],
  ] as const) {
    console.log(`\n${title}`)
    table(
      [
        'Composition',
        'Imports',
        'Dialog',
        'Session',
        'Gallery',
        'Keys',
        'Switch',
        'JS gzip',
        'CSS gzip',
        'Total*',
        'Δ total',
        'Compared with',
      ],
      names.map(name => {
        const variant = variants[name]!,
          base = comparison[name]
        const delta = base ? total(name) - total(base) : undefined
        return [
          name,
          [
            variant.loader ? 'L' : '',
            variant.viewport ? 'V' : '',
            variant.content ? 'C' : '',
            variant.triggers ? 'T' : '',
          ]
            .filter(Boolean)
            .join(' ') || '—',
          variant.modal ? 'yes' : '—',
          variant.session ? 'yes' : '—',
          variant.gallery ? 'yes' : '—',
          variant.keyboard ? 'yes' : '—',
          variant.gallery ? (variant.transition ? 'custom' : 'instant') : '—',
          bytes(results[name]!),
          bytes(css(name)),
          bytes(total(name)),
          delta === undefined ? '—' : `${delta >= 0 ? '+' : '−'}${bytes(Math.abs(delta))}`,
          base || '—',
        ]
      })
    )
  }
  const presetImports: Record<string, string> = {
    full: 'medium-zoom',
    'pure full': 'medium-zoom/pure',
    'compat full': 'medium-zoom/compat',
    'compat pure': 'medium-zoom/compat/pure',
    'modern full': 'medium-zoom/modern',
  }
  console.log(
    '\nPRESET CONSUMERS · legacy HD/container/template options, no dialog/session/gallery/bindings'
  )
  table(
    ['Import', 'Availability', 'JS gzip', 'Separate CSS', 'Total*'],
    Object.keys(presetImports).map(name => [
      presetImports[name]!,
      name === 'full' ? 'release manifest' : 'private candidate',
      bytes(results[name]!),
      bytes(css(name)),
      bytes(total(name)),
    ])
  )
  console.log(`\nBEFORE / AFTER · selected compositions vs ${baseline.revision} · gzip level 9`)
  const before = baseline.consumers as Record<string, { js: number; css: number }>
  table(
    ['Composition', 'Before JS', 'After JS', 'Δ JS', 'CSS'],
    selected
      .filter(name => before[name])
      .map(name => {
        const old = before[name]!,
          delta = results[name]! - old.js
        return [
          name,
          bytes(old.js),
          bytes(results[name]!),
          `${delta >= 0 ? '+' : '−'}${bytes(Math.abs(delta))}`,
          `${bytes(old.css)} → ${bytes(css(name))}`,
        ]
      })
  )
  console.log('\nPRESET COMPARISON · legacy behavior retained')
  const presetBefore = baseline.presets as Record<string, { js: number; css: number }>
  table(
    ['Import', 'Before JS', 'After JS', 'Δ JS', 'Separate CSS'],
    Object.entries(presetImports).map(([name, specifier]) => {
      const before = presetBefore[specifier]!,
        delta = results[name]! - before.js
      return [
        specifier,
        bytes(before.js),
        bytes(results[name]!),
        `${delta >= 0 ? '+' : '−'}${bytes(Math.abs(delta))}`,
        bytes(css(name)),
      ]
    })
  )
  console.log(
    '\n* Total sums independently gzipped JS/CSS; injected CSS is already in JS. App-owned UI/styles and React are excluded.'
  )
  console.log(
    'The custom-transition row includes its example strategy. No animation library is bundled.'
  )
  console.log(
    'Legacy presets retain loader sequencing, late-callback guards and strategy-failure cleanup; fixed image frame bindings reduce their implementation cost.'
  )
  console.log(
    'Historical template-bearing comparisons are omitted because template ownership and close animation changed: new templateContent uses the renderer slot; legacy presets retain body templates and their fade.'
  )
  console.log(
    `Baseline Bun ${baseline.bun}; current Bun ${process.versions.bun || 'unavailable'}. Raw modules are not additive consumer costs.`
  )
  assert(results.core! <= 3_800, 'Core consumer JS exceeds the 3,800 B gzip ceiling')
  assert(results['gallery + session']! < results['gallery + keyboard']!)
  assert(results['pure full']! < results.full!)
} finally {
  rmSync(directory, { recursive: true, force: true })
}
