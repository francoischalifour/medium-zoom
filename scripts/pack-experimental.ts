import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
  return packCandidate({
    ...JSON.parse(readFileSync('package.json', 'utf8')),
    ...candidateManifest(),
  })
}

export function packCandidate(
  manifest: Record<string, unknown>,
  readme = 'README.md'
): ReturnType<typeof pack> {
  const staging = mkdtempSync(join(tmpdir(), 'medium-zoom-experimental-'))
  try {
    const root = join(staging, 'fixture')
    mkdirSync(root)
    const metadata = JSON.parse(readFileSync('package.json', 'utf8'))
    writeFileSync(join(root, 'package.json'), JSON.stringify(manifest))
    cpSync(resolve('dist'), join(root, 'dist'), { recursive: true })
    for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE']) {
      copyFileSync(file === 'README.md' ? readme : file, join(root, file))
    }
    if (
      typeof manifest.version === 'string' &&
      manifest.version !== metadata.version
    ) {
      const before = `/*! ${metadata.name} ${metadata.version} |`
      const after = `/*! ${metadata.name} ${manifest.version} |`
      for (const file of readdirSync(join(root, 'dist'), {
        recursive: true,
        encoding: 'utf8',
      })) {
        if (!/\.(?:js|mjs|cjs)$/.test(file)) {
          continue
        }
        const path = join(root, 'dist', file)
        const code = readFileSync(path, 'utf8')
        if (!code.startsWith(before)) {
          throw new Error(`Unexpected banner: ${file}`)
        }
        writeFileSync(path, after + code.slice(before.length))
      }
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
