import { spawn } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

import { exampleNames } from './example-names.ts'

const directory = mkdtempSync(join(tmpdir(), 'medium-zoom-examples-'))
try {
  const names = exampleNames.values()
  // Keep independent installs and builds busy without oversubscribing CI runners.
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(4, exampleNames.length) }, async () => {
      for (const name of names) {
        await checkExample(name)
      }
    })
  )
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason)
  if (errors.length) {
    throw new AggregateError(errors, 'Standalone example checks failed')
  }
} finally {
  // Wait for every worker before deleting directories used by running children.
  rmSync(directory, { recursive: true, force: true })
}

async function checkExample(name: string) {
  const root = join(directory, name)
  cpSync(resolve('examples', name), root, {
    recursive: true,
    filter: path => !['node_modules', 'dist'].includes(basename(path)),
  })
  if (name === 'shadcn') {
    cpSync(resolve('assets/images'), join(root, 'public/assets/images'), { recursive: true })
  }
  const run = (args: string[]) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn('npm', args, { cwd: root, stdio: 'inherit' })
      child.once('error', reject)
      child.once('close', (code, signal) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`${name}: npm ${args.join(' ')} failed (${signal || code})`))
        }
      })
    })
  console.log(`Checking standalone ${name}`)
  await run(['install', '--no-audit', '--no-fund', '--package-lock=false'])
  await run(['run', 'typecheck'])
  await run(['run', 'build'])
  const output = resolve('website/dist/standalone-examples', name)
  rmSync(output, { recursive: true, force: true })
  cpSync(join(root, 'dist'), output, { recursive: true })
}
