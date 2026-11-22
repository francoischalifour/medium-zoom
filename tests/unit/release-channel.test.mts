import assert from 'node:assert/strict'
import { test } from 'node:test'

import { candidateManifest } from '../../config/package.config.mts'
import pkg from '../../package.json' with { type: 'json' }
import { previewManifest } from '../../scripts/pack-preview.ts'
import {
  assertReleaseChannel,
  previewMajor,
} from '../../scripts/release-channel.ts'

void test('release channels reject ambiguous, injected and cross-channel versions', () => {
  assert.equal(previewMajor, Number(pkg.version.split('.')[0]) + 1)
  for (const version of ['2.0.0-next.0', '2.0.0-next.12']) {
    assert.doesNotThrow(() => assertReleaseChannel(version, 'next'))
  }
  for (const version of ['1.1.2', '1.2.0']) {
    assert.doesNotThrow(() => assertReleaseChannel(version, 'latest'))
  }
  for (const version of [
    '',
    'v2.0.0-next.1',
    '2.0.0',
    '2.0.0-next.01',
    '2.0.0-next.-1',
    '2.0.0-next.1+build',
    '2.1.0-next.0',
    '1.2.0-next.1',
    '2.0.0-next.1\n',
    '2.0.0-next.1; echo unsafe',
    '2.0.0-next.9007199254740992',
  ]) {
    assert.throws(() => assertReleaseChannel(version, 'next'))
  }
  for (const version of ['2.0.0-next.0', '2.0.0', '1.2.0-next.0', '1.02.0']) {
    assert.throws(() => assertReleaseChannel(version, 'latest'))
  }
  assert.throws(() => assertReleaseChannel('2.0.0-next.0', 'other'))
})

void test('preview manifest deliberately promotes candidates without changing v1 or private fixtures', () => {
  const before = JSON.stringify(pkg)
  const preview = previewManifest('2.0.0-next.0')
  assert.equal(preview.name, 'medium-zoom')
  assert.equal(preview.version, '2.0.0-next.0')
  assert.equal(preview.publishConfig.tag, 'next')
  assert.equal(preview.main, 'dist/modern/index.cjs')
  assert.deepEqual(preview.exports, candidateManifest('modern').exports)
  for (const key of [
    'private',
    'scripts',
    'workspaces',
    'devDependencies',
    'dependencies',
  ]) {
    assert(!(key in preview))
  }
  assert.equal(candidateManifest().private, true)
  assert.equal(JSON.stringify(pkg), before)
})

void test('a preset selection keeps JavaScript, declarations, pure and CSS aligned', () => {
  for (const profile of ['modern', 'compat'] as const) {
    const manifest = candidateManifest(profile)
    assert.deepEqual(
      manifest.exports['./pure'],
      manifest.exports[`./${profile}/pure`]
    )
    assert.deepEqual(
      manifest.typesVersions['*'].pure,
      manifest.typesVersions['*'][`${profile}/pure`]
    )
    assert.equal(
      manifest.exports['./style.css'],
      manifest.exports[`./${profile}/style.css`]
    )
    if (profile === 'modern') {
      assert.deepEqual(manifest.exports['.'], manifest.exports['./modern'])
    } else {
      assert.equal(manifest.main, pkg.main)
      assert.equal(manifest.types, pkg.types)
    }
  }
})
