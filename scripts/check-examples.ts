import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { exampleNames } from './example-names.ts'

const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-examples-'))
try {
  for (const name of exampleNames) {
    const root = join(directory, name)
    cpSync(resolve('examples', name), root, {
      recursive: true,
      filter: path => !['node_modules', 'dist'].includes(basename(path)),
    })
    const run = (args: string[]) =>
      execFileSync('npm', args, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, npm_config_cache: join(directory, 'npm-cache') },
      })
    console.log(`Checking standalone ${name}`)
    run(['install', '--no-audit', '--no-fund', '--package-lock=false'])
    run(['run', 'typecheck'])
    run(['run', 'build'])
    const output = resolve('website/dist/standalone-examples', name)
    rmSync(output, { recursive: true, force: true })
    cpSync(join(root, 'dist'), output, { recursive: true })
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
