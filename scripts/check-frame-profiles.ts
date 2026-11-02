import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { FrameProfile } from '../src/engine/frame-profile'
import type * as source from '../src/engine/profile'
import type * as core from '../src/engine/profile-core'
import type * as preset from '../src/engine/profile-preset'

// Independently type-check each aliased implementation against the complete engine call sites.
type AssertProfile<T extends FrameProfile> = T
export type VerifiedProfiles = [
  AssertProfile<typeof source>,
  AssertProfile<typeof core>,
  AssertProfile<typeof preset>,
]
const root = resolve('.')
const config = JSON.parse(readFileSync('tsconfig.json', 'utf8'))
const paths = Object.fromEntries(
  Object.entries(config.compilerOptions.paths as Record<string, string[]>).map(([name, values]) => [
    name,
    values.map(value => resolve(value)),
  ])
)
mkdirSync('.cache', { recursive: true })
const directory = mkdtempSync(resolve('.cache/frame-profiles-'))
try {
  for (const name of ['profile', 'profile-core', 'profile-preset']) {
    const file = join(directory, `${name}.json`)
    writeFileSync(
      file,
      JSON.stringify({
        extends: join(root, 'tsconfig.json'),
        compilerOptions: {
          paths: { ...paths, '#engine-profile': [join(root, `src/engine/${name}.ts`)] },
        },
      })
    )
    execFileSync('node', [resolve('node_modules/typescript/bin/tsc'), '-p', file], {
      stdio: 'inherit',
    })
    console.log(`Frame profile ${name}: engine and source contracts checked`)
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
