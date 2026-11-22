import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  candidateEntries,
  candidateManifest,
} from '../config/package.config.mts'
import pkg from '../package.json' with { type: 'json' }
import { packCandidate } from './pack-experimental.ts'
import { assertReleaseChannel } from './release-channel.ts'

export function previewManifest(version: string) {
  assertReleaseChannel(version, 'next')
  const candidate = candidateManifest('modern')
  return {
    name: pkg.name,
    version,
    description: pkg.description,
    keywords: pkg.keywords,
    homepage: pkg.homepage,
    license: pkg.license,
    author: pkg.author,
    repository: pkg.repository,
    main: candidate.main,
    module: candidate.module,
    types: candidate.types,
    files: candidate.files,
    sideEffects: candidate.sideEffects,
    typesVersions: candidate.typesVersions,
    exports: candidate.exports,
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
      tag: 'next',
    },
  }
}

export function validatePreview(root: string, version: string) {
  const expected = previewManifest(version)
  const actual = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.deepEqual(
    actual,
    expected,
    'The packed preview must match the deliberate publish manifest'
  )
  const required = new Set([
    'package.json',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    ...pkg.files,
    'dist/modern/style.css',
    ...candidateEntries.flatMap(entry => [
      entry.esm,
      entry.cjs,
      `dist/${entry.name}/index.d.mts`,
      `dist/${entry.name}/index.d.cts`,
      ...(entry.stylesheets || []).map(style => `dist/${style.fileName}`),
    ]),
  ])
  const packed = readdirSync(root, {
    recursive: true,
    encoding: 'utf8',
  }).filter(file => statSync(join(root, file)).isFile())
  assert.deepEqual(
    [...packed].sort(),
    [...required].sort(),
    'Preview files must contain all candidates and no unrelated build output'
  )
  for (const file of required) {
    assert(existsSync(join(root, file)), `Missing preview file: ${file}`)
    if (/\.(?:js|mjs|cjs)$/.test(file)) {
      assert(
        readFileSync(join(root, file), 'utf8').startsWith(
          `/*! medium-zoom ${version} |`
        ),
        `Wrong preview banner: ${file}`
      )
    }
  }
}

export function packPreview(version: string) {
  const artifact = packCandidate(previewManifest(version), 'CONTRIBUTING.md')
  try {
    validatePreview(artifact.root, version)
    return artifact
  } catch (error) {
    artifact.cleanup()
    throw error
  }
}
