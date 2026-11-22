/**
 * Size benchmark: one report, two views.
 *
 *   bun run size                 Print both tables and fail when a budget is exceeded.
 *   bun run size --markdown      Print the sizes that changed, as tables for a pull request.
 *   bun run size --update        Record the current sizes as the comparison baseline.
 *
 * Consumers are what a bundler ships for a set of imports: the built entries are
 * rebundled and minified together, so shared code is counted once. Artifacts are the
 * files in `dist`, each with a budget in `config/size.config.mts`, which also caps some
 * consumers as a share of others.
 */
import assert from 'node:assert/strict'
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
import budgets, { compositions, ratios } from '../config/size.config.mts'
import { pack } from './pack'
import { packExperimental } from './pack-experimental'
import {
  baselineSource,
  bytes,
  change,
  markdownTable,
  table,
} from './size-report'

interface Baseline {
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
const updating = process.argv.includes('--update')
const markdown = process.argv.includes('--markdown')
const gzip = (code: string | Uint8Array) => gzipSync(code, { level: 9 }).length
const fileSize = (path: string) => gzip(readFileSync(path))

// A consumer imports exports as `entry/export`, or a preset's default export.
interface Consumer {
  imports: string[]
  preset?: string
}
const exportOf = (entry: (typeof extensionEntries)[number]) =>
  `${entry.name}/${entry.primaryExport}`
const [core, ...extensions] = extensionEntries
const importSets: Record<string, Consumer> = Object.fromEntries([
  ...releaseEntries.map(({ path, esm }) => [
    path,
    { imports: [], preset: esm },
  ]),
  ...profileEntries
    .filter(({ profile }) => profile === 'modern')
    .map(({ path, esm }) => [path, { imports: [], preset: esm }]),
  [core!.name, { imports: [exportOf(core!)] }],
  ...extensions.map(entry => [
    `${core!.name} + ${entry.name}`,
    { imports: [exportOf(core!), exportOf(entry)] },
  ]),
  ['everything composed', { imports: extensionEntries.map(exportOf) }],
  ...Object.entries(compositions).map(([name, imports]) => [name, { imports }]),
])

/**
 * Code that only some exports bring: a consumer's bundle contains the marker exactly when
 * it imports one of them. `preset` stands for the fixed presets.
 */
const markers: [marker: string, exports: string[]][] = [
  ['showModal', ['renderers/dialog']],
  ['canPrevious', ['gallery/createGallery', 'gallery/galleryControls']],
  [
    'ArrowLeft',
    [
      'gallery/bindGalleryKeyboard',
      'gallery/bindGalleryGestures',
      'gallery/galleryControls',
    ],
  ],
  ['pointerdown', ['gallery/bindGalleryGestures', 'gallery/galleryControls']],
  ['medium-zoom-control', ['gallery/galleryControls']],
  ['translateX(', ['transitions/slide']],
  // The runner clears the effect's animations on every frame's subtree.
  ['subtree:', ['transitions/galleryTransition', 'transitions/slide']],
  ['isContentEditable', ['triggers/bindZoomTriggers']],
  ['data-zoom-src', ['loaders/loadHdImage', 'preset']],
  ['.content.cloneNode', ['content/templateContent', 'preset']],
  ['right:0,bottom:0', ['viewport/containerBounds', 'preset']],
  ['opacity 150ms', ['preset']],
]

function entrySource({ imports, preset }: Consumer) {
  if (preset) {
    return `import zoom from ${JSON.stringify(resolve(preset))}\nglobalThis.zoom = zoom('img')`
  }
  const names = imports.map(name => name.split('/')[1]!)
  return `${imports
    .map(name => {
      const [entry, exported] = name.split('/')
      return `import { ${exported} } from ${JSON.stringify(resolve(`dist/${entry}/index.mjs`))}`
    })
    .join('\n')}\nglobalThis.exports = [${names.join(', ')}]`
}

/** The stylesheets of the entries imported; presets inject theirs or ship `style.css`. */
function css({ imports, preset }: Consumer) {
  if (preset) {
    const entry = [...releaseEntries, ...profileEntries].find(
      ({ esm }) => esm === preset
    )
    return entry?.injected || !entry?.css ? 0 : fileSize(entry.css)
  }
  const files = new Set(
    imports.flatMap(name => {
      const entry = extensionEntries.find(
        ({ name: entryName }) => entryName === name.split('/')[0]
      )
      return entry?.css ? [entry.css] : []
    })
  )
  return [...files].reduce((total, file) => total + fileSize(file), 0)
}

async function measureConsumers() {
  const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-size-'))
  const results: Record<string, { js: number; css: number }> = {}
  try {
    for (const [index, [name, consumer]] of Object.entries(
      importSets
    ).entries()) {
      const input = join(directory, `${index}.ts`)
      const output = join(directory, `output-${index}`)
      writeFileSync(input, entrySource(consumer))
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
      const imported = consumer.preset ? ['preset'] : consumer.imports
      for (const [marker, exports] of markers) {
        assert.equal(
          code.includes(marker),
          exports.some(exported => imported.includes(exported)),
          `${name}: ${marker} should appear only with ${exports.join(' or ')}`
        )
      }
      results[name] = { js: gzip(code), css: css(consumer) }
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

function measurePackageSizes(create: () => ReturnType<typeof pack>) {
  const artifact = create()
  try {
    return artifact.sizes
  } finally {
    artifact.cleanup()
  }
}

const total = (name: string) => consumers[name]!.js + consumers[name]!.css
const ratioRows = ratios.map(({ consumer, reference, maxRatio }) => {
  const ratio = total(consumer) / total(reference)
  return {
    over: ratio > maxRatio,
    cells: [
      `${consumer} / ${reference}`,
      `${(ratio * 100).toFixed(1)}%`,
      `${(maxRatio * 100).toFixed(1)}%`,
    ],
  }
})
const source = baselineSource('config/size-baseline.json')

if (updating) {
  const next: Baseline = {
    consumers,
    artifacts,
    packages: {
      release: measurePackageSizes(pack),
      candidate: measurePackageSizes(packExperimental),
    },
  }
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(
    'Recorded the size baseline in config/size-baseline.json. Commit it with the change.'
  )
} else if (markdown) {
  const consumerRows = Object.entries(consumers).flatMap(([name, sizes]) => {
    const before = baseline.consumers[name]
    const now = sizes.js + sizes.css
    const then = before && before.js + before.css
    return now === then
      ? []
      : [[name, then ? bytes(then) : '—', bytes(now), change(now, then)]]
  })
  const artifactRows = budgets.flatMap(({ path, maxBytes }) => {
    const size = artifacts[path]!
    const before = baseline.artifacts[path]
    return size === before
      ? []
      : [
          [
            `\`${path}\``,
            before === undefined ? '—' : bytes(before),
            bytes(size),
            change(size, before),
            bytes(maxBytes),
          ],
        ]
  })
  console.log(`Gzip level 9, compared with \`${source}\`.\n`)
  if (consumerRows.length) {
    markdownTable(['Imports', 'Before', 'After', 'Change'], consumerRows)
    console.log()
  }
  if (artifactRows.length) {
    markdownTable(['File', 'Before', 'After', 'Change', 'Budget'], artifactRows)
    console.log()
  }
  if (!consumerRows.length && !artifactRows.length) {
    console.log('No size changes.\n')
  }
  markdownTable(
    ['Ratio', 'Now', 'Limit'],
    ratioRows.map(({ cells }) => cells)
  )
} else {
  assertCatalog()
  console.log(`medium-zoom size · gzip level 9 · compared with ${source}\n`)
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
  console.log('\nRATIOS · consumers capped as a share of another')
  table(
    ['Consumers', 'Ratio', 'Limit'],
    ratioRows.map(({ cells }) => cells)
  )
  const overRatio = ratioRows.filter(({ over }) => over)
  assert.equal(
    overRatio.length,
    0,
    `Over ratio: ${overRatio.map(({ cells }) => cells[0]).join(', ')}. Shrink the code or change the limit on purpose.`
  )
  console.log(
    `\n${budgets.length} artifacts within budget and every ratio within its limit.`
  )
}
