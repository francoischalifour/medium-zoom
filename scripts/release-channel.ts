import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const stableVersion = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version as string
export const stableMajor = Number(stableVersion.split('.')[0])
export const previewMajor = stableMajor + 1

export function assertReleaseChannel(version: string, tag: string) {
  const pattern =
    tag === 'next'
      ? new RegExp(`^${previewMajor}\\.0\\.0-next\\.(0|[1-9]\\d*)$`)
      : new RegExp(`^${stableMajor}\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$`)
  assert(['latest', 'next'].includes(tag), 'Only latest and next are supported')
  assert(
    typeof version === 'string' &&
      version.trim() === version &&
      pattern.test(version),
    `Invalid ${tag} version: ${version}`
  )
  assert(
    version
      .split(/[.-]/)
      .filter(part => /^\d+$/.test(part))
      .every(part => Number.isSafeInteger(Number(part))),
    'Version numbers must be safe integers'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version
  assertReleaseChannel(version, process.argv[2] || '')
}
