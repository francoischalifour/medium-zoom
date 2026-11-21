/**
 * Size benchmark: one report, two views.
 *
 *   bun run size                 Print both tables and fail when a budget is exceeded.
 *   bun run size:baseline        Record the current sizes as the comparison baseline.
 *
 * Consumers are what a bundler ships for a set of imports: the built entries are
 * rebundled and minified together, so shared code is counted once. Artifacts are the
 * files in `dist`, each with a budget in `config/size.config.mts`.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

import { build } from 'tsdown'

import {
  candidateEntries,
  candidateManifest,
  extensionEntries,
  profileEntries,
  releaseEntries,
} from '../config/package.config.mts'
import budgets from '../config/size.config.mts'
import { bytes, change, table } from './size-report'

interface Baseline {
  revision: string
  consumers: Record<string, { js: number; css: number }>
  artifacts: Record<string, number>
  packages: Record<
    'release' | 'candidate',
    { files: number; tarball: number; unpacked: number }
  >
}

const baselinePath = fileURLToPath(
  new URL('../config/size-baseline.json', import.meta.url)
)
const baseline: Baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const updating = process.argv.includes('--update-baseline')
const gzip = (code: string | Uint8Array) => gzipSync(code, { level: 9 }).length
const fileSize = (path: string) => gzip(readFileSync(path))

interface Composition {
  loader?: boolean
  viewport?: boolean
  content?: boolean
  triggers?: boolean
  dialog?: boolean
  session?: boolean
  gallery?: boolean
  keyboard?: boolean
  gestures?: boolean
  transition?: boolean
  controls?: boolean
  slide?: boolean
}
const compositions: Record<string, Composition> = {
  core: {},
  'core + HD loader': { loader: true },
  'core + container': { viewport: true },
  'core + HD loader + container': { loader: true, viewport: true },
  'core + session': { session: true },
  'core + dialog': { dialog: true },
  'core + dialog + template': { dialog: true, content: true },
  'core + dialog + triggers': { dialog: true, triggers: true },
  'core + dialog + gallery': { dialog: true, gallery: true },
  'core + dialog + gallery + session': {
    dialog: true,
    gallery: true,
    session: true,
  },
  'core + dialog + gallery + session + keyboard': {
    dialog: true,
    gallery: true,
    session: true,
    keyboard: true,
  },
  'core + dialog + gallery + gestures': {
    dialog: true,
    gallery: true,
    gestures: true,
  },
  'core + dialog + gallery + session + custom transition': {
    dialog: true,
    gallery: true,
    session: true,
    transition: true,
  },
  'everything composed': {
    dialog: true,
    gallery: true,
    session: true,
    keyboard: true,
    triggers: true,
    loader: true,
    viewport: true,
    content: true,
  },
  'stock gallery: HD loader + dialog + controls + slide + triggers': {
    loader: true,
    dialog: true,
    gallery: true,
    controls: true,
    slide: true,
    triggers: true,
  },
}
const presets: Record<string, { entry: string; css?: string }> = {
  'medium-zoom': { entry: 'dist/medium-zoom.esm.js' },
  'medium-zoom/dist/pure': {
    entry: 'dist/pure/index.js',
    css: 'dist/style.css',
  },
  'medium-zoom/modern': { entry: 'dist/modern/index.mjs' },
}

const entry = (name: string) =>
  JSON.stringify(resolve(`dist/${name}/index.mjs`))

function compositionSource(composition: Composition): string {
  const {
    loader,
    viewport,
    content,
    triggers,
    dialog,
    session,
    gallery,
    keyboard,
    gestures,
    transition,
    controls,
    slide,
  } = composition
  const contents = [
    content && 'templateContent("#caption")(view)',
    controls
      ? 'galleryControls()(view)'
      : keyboard &&
        'bindGalleryKeyboard(view.element, createGallery(view.zoom))',
    gestures && 'bindGalleryGestures(view)',
  ].filter(Boolean)
  return `
    import { createZoom } from ${entry('core')}
    ${loader ? `import { loadHdImage } from ${entry('loaders')}` : ''}
    ${viewport ? `import { containerBounds } from ${entry('viewport')}` : ''}
    ${content ? `import { templateContent } from ${entry('content')}` : ''}
    ${triggers ? `import { bindZoomTriggers } from ${entry('triggers')}` : ''}
    ${dialog ? `import { dialog } from ${entry('renderers')}` : ''}
    ${session ? `import { createZoomSession } from ${entry('session')}` : ''}
    ${gallery ? `import { createGallery, bindGalleryKeyboard${controls ? ', galleryControls' : ''}${gestures ? ', bindGalleryGestures' : ''} } from ${entry('gallery')}` : ''}
    ${transition ? `import { galleryTransition } from ${entry('transitions')}` : ''}
    ${slide ? `import { slide } from ${entry('transitions')}` : ''}
    const zoom = createZoom('img', {
      ${loader ? 'loader: loadHdImage,' : ''}
      ${viewport ? 'viewport: containerBounds(document.body),' : ''}
      ${
        dialog
          ? `renderer: dialog({
        ${
          contents.length
            ? `content: view => { const cleanups = [${contents.join(', ')}]; return () => cleanups.forEach(cleanup => cleanup && cleanup()) },`
            : ''
        }
        ${slide ? 'transition: slide(),' : ''}
        ${
          transition
            ? 'transition: galleryTransition(({ incoming, signal }) => Promise.all(incoming.map(frame => { const animation = frame.element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }); signal.addEventListener("abort", () => animation.cancel()); return animation.finished })).then(() => {})),'
            : ''
        }
      }),`
          : ''
      }
    })
    ${session ? 'const session = globalThis.session = createZoomSession(zoom)' : ''}
    ${gallery ? `globalThis.gallery = createGallery(zoom${session ? ', { commander: session }' : ''})` : ''}
    ${triggers ? `globalThis.unbind = bindZoomTriggers(zoom${session ? ', { commander: session }' : ''})` : ''}
    globalThis.zoom = zoom`
}

function assertIsolation(
  name: string,
  code: string,
  composition: Composition | undefined
) {
  const preset = !composition
  const expected: [marker: string, present: boolean, capability: string][] = [
    ['showModal', !!composition?.dialog, 'dialog'],
    [
      'ArrowLeft',
      !!(
        composition?.keyboard ||
        composition?.controls ||
        composition?.gestures
      ),
      'gallery keys',
    ],
    ['getSnapshot', !!composition?.gallery, 'gallery'],
    [
      'AbortController',
      !!(composition?.transition || composition?.slide),
      'transition runner',
    ],
    ['medium-zoom-control', !!composition?.controls, 'gallery controls'],
    [
      'pointerdown',
      !!(composition?.controls || composition?.gestures),
      'gallery gestures',
    ],
    ['translateX(', !!composition?.slide, 'slide transition'],
    ['isContentEditable', !!composition?.triggers, 'triggers'],
    ['data-zoom-src', preset || !!composition?.loader, 'HD loader'],
    [
      '.content.cloneNode',
      preset || !!composition?.content,
      'template content',
    ],
    [
      'right:0,bottom:0',
      preset || !!composition?.viewport,
      'container viewport',
    ],
    ['opacity 150ms', preset, 'v1 template fade'],
  ]
  for (const [marker, present, capability] of expected) {
    assert.equal(
      code.includes(marker),
      present,
      `${name}: ${capability} isolation`
    )
  }
}

async function measureConsumers() {
  const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-size-'))
  const results: Record<string, { js: number; css: number }> = {}
  const modernCss = fileSize('dist/modern/style.css')
  // The stylesheets an application loads for the composition: stock controls take the
  // combined one, a bare dialog adds its own to the core's.
  const compositionCss = ({ dialog, controls }: Composition) =>
    controls
      ? fileSize('dist/gallery.css')
      : modernCss + (dialog ? fileSize('dist/renderers/style.css') : 0)
  try {
    const inputs: {
      name: string
      source: string
      css: number
      composition?: Composition
    }[] = [
      ...Object.entries(presets).map(([name, preset]) => ({
        name,
        source: `import zoom from ${JSON.stringify(resolve(preset.entry))}\nglobalThis.zoom = zoom('img')`,
        css: preset.css ? fileSize(preset.css) : 0,
      })),
      ...Object.entries(compositions).map(([name, composition]) => ({
        name,
        source: compositionSource(composition),
        css: compositionCss(composition),
        composition,
      })),
    ]
    for (const [
      index,
      { name, source, css, composition },
    ] of inputs.entries()) {
      const input = join(directory, `${index}.ts`)
      const output = join(directory, `output-${index}`)
      writeFileSync(input, source)
      await build({
        config: false,
        entry: { index: input },
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
      assertIsolation(name, code, composition)
      results[name] = { js: gzip(code), css }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
  return results
}

function assertCatalog() {
  const release = JSON.parse(readFileSync('package.json', 'utf8'))
  const candidate = candidateManifest()
  assert.equal(candidate.private, true)
  const sourcePaths = JSON.parse(readFileSync('tsconfig.json', 'utf8'))
    .compilerOptions.paths
  for (const entry of candidateEntries) {
    assert.deepEqual(
      sourcePaths[entry.path],
      [`./${entry.source.esm}`],
      `${entry.path}: source alias drift`
    )
  }
  for (const entry of [
    ...releaseEntries,
    ...extensionEntries,
    ...profileEntries,
  ]) {
    for (const path of [entry.esm, entry.cjs, entry.umd, entry.css].filter(
      Boolean
    ) as string[]) {
      assert(
        budgets.some(budget => budget.path === path),
        `${entry.path}: missing artifact budget for ${path}`
      )
    }
  }
  for (const entry of releaseEntries) {
    assert(release.files.includes(entry.esm))
  }
  for (const entry of [...extensionEntries, ...profileEntries]) {
    assert(
      candidate.exports[`./${entry.path.slice('medium-zoom/'.length)}`],
      `${entry.path}: missing candidate export`
    )
    assert(
      !release.files.includes(entry.esm),
      `${entry.path}: unexpectedly in release package`
    )
  }
}

const consumers = await measureConsumers()
const artifacts = Object.fromEntries(
  budgets.map(({ path }) => [path, fileSize(path)])
)

if (updating) {
  const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  })
  const dirty = !!execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
  }).trim()
  const next: Baseline = {
    revision: `${revision.trim()}${dirty ? ' + local changes' : ''}`,
    consumers,
    artifacts,
    packages: baseline.packages,
  }
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(
    `Recorded ${next.revision} as the size baseline in config/size-baseline.json.`
  )
} else {
  assertCatalog()
  console.log(
    `medium-zoom size · gzip level 9 · compared with ${baseline.revision}\n`
  )
  console.log('CONSUMERS · what a bundler ships for these imports')
  table(
    ['Imports', 'JS', 'CSS', 'Total', 'Baseline', 'Change'],
    Object.entries(consumers).map(([name, { js, css }]) => {
      const before = baseline.consumers[name]
      return [
        name,
        bytes(js),
        css ? bytes(css) : 'in JS',
        bytes(js + css),
        before ? bytes(before.js + before.css) : '—',
        change(js + css, before && before.js + before.css),
      ]
    })
  )
  console.log('\nARTIFACTS · files in dist against their budgets')
  table(
    ['File', 'Size', 'Budget', 'Headroom', 'Baseline', 'Change'],
    budgets.map(({ path, maxBytes }) => {
      const size = artifacts[path]!
      const before = baseline.artifacts[path]
      return [
        path,
        bytes(size),
        bytes(maxBytes),
        size > maxBytes
          ? `OVER by ${bytes(size - maxBytes)}`
          : bytes(maxBytes - size),
        before === undefined ? '—' : bytes(before),
        change(size, before),
      ]
    })
  )
  const over = budgets.filter(
    ({ path, maxBytes }) => artifacts[path]! > maxBytes
  )
  assert.equal(
    over.length,
    0,
    `Over budget: ${over.map(({ path }) => path).join(', ')}. Shrink the code or change the budget on purpose.`
  )
  console.log(`\n${budgets.length} artifacts within budget.`)
}
