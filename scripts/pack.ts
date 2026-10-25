import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function pack() {
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
        { encoding: 'utf8' }
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
      cleanup: () => rmSync(directory, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}
