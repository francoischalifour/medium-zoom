import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { candidateManifest } from '../config/package.config.mts'
import { pack } from './pack.ts'

// Stage proposed exports outside the release package. Never modify its manifest.
export function packExperimental(): ReturnType<typeof pack> {
  const staging = mkdtempSync(join(tmpdir(), 'medium-zoom-experimental-'))
  try {
    const root = join(staging, 'fixture')
    mkdirSync(root)
    const metadata = JSON.parse(readFileSync('package.json', 'utf8'))
    const proposal = candidateManifest()
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ ...metadata, ...proposal })
    )
    cpSync(resolve('dist'), join(root, 'dist'), { recursive: true })
    for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE']) {
      copyFileSync(file, join(root, file))
    }
    const artifact = pack(root)
    return {
      ...artifact,
      cleanup() {
        artifact.cleanup()
        rmSync(staging, { recursive: true, force: true })
      },
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
}
