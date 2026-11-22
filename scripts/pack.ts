import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function pack(cwd = process.cwd()) {
  const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-package-'))
  try {
    const output = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          directory,
          '--cache',
          join(directory, 'cache'),
        ],
        { cwd, encoding: 'utf8' }
      )
    )
    const archive = join(directory, output[0].filename)
    const unpacked = join(directory, 'unpacked')
    mkdirSync(unpacked)
    execFileSync('tar', ['-xzf', archive, '-C', unpacked])
    return {
      directory,
      archive,
      root: join(unpacked, 'package'),
      sizes: {
        files: output[0].files.length,
        tarball: output[0].size,
        unpacked: output[0].unpackedSize,
      },
      cleanup: () => rmSync(directory, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}
