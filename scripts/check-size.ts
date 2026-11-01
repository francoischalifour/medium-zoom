import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import {
  releaseEntries,
  extensionEntries,
  profileEntries,
  type PackageEntry,
} from '../config/package.config.mts'
import budgets from '../config/size.config.mts'
import baseline from '../tests/experimental/bundle-baseline.json' with { type: 'json' }
import { bytes, table } from './size-report'

const size = (path: string) => gzipSync(readFileSync(path), { level: 9 }).length
const failures: string[] = []
for (const { path, maxBytes } of budgets) {
  const measured = size(path)
  if (measured > maxBytes) {
    failures.push(`${path}: ${bytes(measured)} > ${bytes(maxBytes)}`)
  }
}
const release = JSON.parse(readFileSync('package.json', 'utf8'))
const candidate = JSON.parse(readFileSync('tests/experimental/package.json', 'utf8'))
assert.equal(candidate.private, true)
const inventory = [...releaseEntries, ...extensionEntries, ...profileEntries]
for (const entry of inventory) {
  for (const path of [entry.esm, entry.cjs, entry.umd, entry.css].filter(Boolean) as string[]) {
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
  assert(!release.files.includes(entry.esm), `${entry.path}: unexpectedly in release package`)
}
function report(title: string, entries: PackageEntry[]) {
  console.log(`\n${title}`)
  table(
    ['Import', 'Role', 'Includes', 'ESM gzip', 'CJS gzip', 'UMD gzip', 'CSS gzip'],
    entries.map(entry => [
      entry.path,
      entry.kind,
      entry.includes,
      bytes(size(entry.esm)),
      entry.cjs ? bytes(size(entry.cjs)) : '—',
      entry.umd ? bytes(size(entry.umd)) : '—',
      entry.css ? `${bytes(size(entry.css))}${entry.injected ? ' injected*' : ' explicit'}` : '—',
    ])
  )
}
console.log('PACKAGE INVENTORY · one medium-zoom npm package · current build · gzip level 9')
report('RELEASE MANIFEST · existing v1 entries', releaseEntries)
report('PRIVATE CANDIDATE · opt-in building blocks', extensionEntries)
report('PRIVATE CANDIDATE · alternate presets/aliases (not extensions)', profileEntries)
console.log(`\nRAW ESM COMPARISON · ${baseline.revision} → current · gzip level 9`)
table(
  ['Entry', 'Before', 'After', 'Change'],
  ['core', 'compat', 'modern', 'renderers', 'session', 'gallery'].map(name => {
    const before = (baseline.rawEsm as Record<string, number>)[name]!,
      after = size(`dist/${name}/index.mjs`),
      delta = after - before
    return [
      `medium-zoom/${name}`,
      bytes(before),
      bytes(after),
      `${delta >= 0 ? '+' : '−'}${bytes(Math.abs(delta))}`,
    ]
  })
)
console.log(
  '\n* Injected CSS is already inside JS; do not add it again. Explicit CSS is a separate asset.'
)
console.log(
  'Raw entry sizes are not consumer totals: tree shaking and shared compression change the result.'
)
console.log(
  'Internal target adapters/geometry/frames have no package export. React/shadcn UI remains application source.'
)
console.log(
  `Budgets: ${budgets.length} artifacts checked; ${failures.length ? 'FAILED' : 'passed'}. Use --artifacts for file-level detail.`
)
if (process.argv.includes('--artifacts')) {
  table(
    ['Artifact', 'Gzip', 'Budget', 'Headroom'],
    budgets.map(({ path, maxBytes }) => [
      path,
      bytes(size(path)),
      bytes(maxBytes),
      bytes(maxBytes - size(path)),
    ])
  )
}
assert.equal(failures.length, 0, failures.join('\n'))
