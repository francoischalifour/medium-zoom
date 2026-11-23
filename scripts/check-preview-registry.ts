import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

import { assertReleaseChannel, previewMajor } from './release-channel.ts'

const version = process.argv[2] || ''
assertReleaseChannel(version, 'next')
const versions: string[] = JSON.parse(
  execFileSync(
    'npm',
    [
      'view',
      'medium-zoom',
      'versions',
      '--json',
      '--registry',
      'https://registry.npmjs.org/',
    ],
    { encoding: 'utf8' }
  )
)
assert(Array.isArray(versions), 'Expected registry version history')
assert(
  !versions.includes(version),
  'Never overwrite or retry an already published version'
)
const milestone = Number(version.split('.').at(-1))
for (const published of versions) {
  if (new RegExp(`^${previewMajor}\\.0\\.0-next\\.\\d+$`).test(published)) {
    assert(
      milestone > Number(published.split('.').at(-1)),
      'Next milestone must increase; do not move next backwards'
    )
  }
}
