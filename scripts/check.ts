/**
 * Runs the checks CI runs, each as soon as the steps it needs have passed.
 *
 *   bun run check                  Every step.
 *   bun run check lint typecheck   These steps and the ones they need.
 *   bun run check --changed        The steps that this branch's changes can affect,
 *                                  chosen by scripts/ci-scope.sh as in CI.
 *
 *   bun run check --no-cache       Run cached steps again.
 *
 * A step's output is printed when it ends. A failed step skips the steps that need it,
 * and the others still run. A step with a cache is skipped when its inputs match its
 * last pass, and its outputs are restored.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

type Scope = 'format' | 'website' | 'library'
interface Step {
  command: string[]
  needs?: string[]
  /** The narrowest scope that runs it; `library` runs every step. */
  scope: Scope
  /** Paths the step reads, and paths it writes that later steps need. */
  cache?: { inputs: string[]; outputs?: string[] }
}

// Browser steps run one after another: together they would compete for the CPU.
const steps: Record<string, Step> = {
  format: { command: ['bun', 'run', 'format', '--check'], scope: 'format' },
  lint: { command: ['bun', 'run', 'lint'], scope: 'website' },
  isolated: { command: ['bun', 'scripts/check-isolated.ts'], scope: 'website' },
  unit: { command: ['bun', 'test'], scope: 'website' },
  build: { command: ['bun', 'run', 'build'], scope: 'website' },
  typecheck: {
    command: ['bun', 'run', 'typecheck'],
    needs: ['build'],
    scope: 'website',
  },
  size: { command: ['bun', 'run', 'size'], needs: ['build'], scope: 'library' },
  release: {
    command: ['bun', 'run', 'check:release'],
    needs: ['build'],
    scope: 'library',
  },
  package: {
    command: ['bun', 'run', 'test:package'],
    needs: ['build'],
    scope: 'library',
    cache: {
      inputs: [
        'dist',
        'package.json',
        'bun.lock',
        'README.md',
        'LICENSE',
        'CHANGELOG.md',
        'config',
        'baselines/size.json',
        'scripts',
        'tests/types',
        'tests/experimental',
      ],
    },
  },
  website: {
    command: ['bun', 'scripts/build-website.ts'],
    needs: ['build'],
    scope: 'website',
  },
  examples: {
    // Installs the published package, so the library build is not an input.
    command: ['bun', 'run', 'test:examples'],
    needs: ['website'],
    scope: 'website',
    cache: {
      inputs: ['examples', 'assets', 'scripts'],
      outputs: ['website/dist/standalone-examples'],
    },
  },
  browser: {
    command: ['bun', 'run', 'test:browser'],
    needs: ['website', 'examples'],
    scope: 'website',
  },
  bench: {
    command: ['bun', 'run', 'bench'],
    needs: ['browser'],
    scope: 'library',
  },
}

const git = (...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args])
  return result.success ? result.stdout.toString().trim() : undefined
}
function changedScope(): Scope {
  const base = git('merge-base', 'HEAD', 'origin/main')
  if (!base) {
    return 'library'
  }
  const files = [
    git('diff', '--name-only', base),
    git('ls-files', '--others', '--exclude-standard'),
  ].join('\n')
  const scope = Bun.spawnSync(['bash', 'scripts/ci-scope.sh'], {
    stdin: new TextEncoder().encode(files),
  })
  return scope.stdout.toString().trim() as Scope
}

const names = process.argv.slice(2).filter(name => !name.startsWith('--'))
for (const name of names) {
  if (!steps[name]) {
    throw new Error(
      `No step named ${name}. Steps: ${Object.keys(steps).join(', ')}.`
    )
  }
}
const scope = process.argv.includes('--changed') ? changedScope() : 'library'
const rank: Record<Scope, number> = { format: 0, website: 1, library: 2 }
const selected = new Set<string>()
const select = (name: string) => {
  if (!selected.has(name)) {
    selected.add(name)
    steps[name]!.needs?.forEach(select)
  }
}
;(names.length ? names : Object.keys(steps))
  .filter(name => names.length || rank[steps[name]!.scope] <= rank[scope])
  .forEach(select)
// A website change only runs the website's browser suites.
if (scope === 'website' && selected.has('browser')) {
  steps.browser!.command.push('tests/browser/website', 'tests/analytics')
}

/**
 * Hashes the inputs: Git's blob for each unchanged tracked file, and the contents of
 * modified, untracked, and ignored files, such as the build in `dist`.
 */
function cacheKey(name: string, inputs: string[]) {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(`${Bun.version} ${steps[name]!.command.join(' ')}\n`)
  const changed = new Set(
    git('ls-files', '-m', '-o', '--exclude-standard', '--', ...inputs)
      ?.split('\n')
      .filter(Boolean)
  )
  for (const line of git('ls-files', '-s', '--', ...inputs)?.split('\n') ||
    []) {
    const [, blob, , path] = line.split(/\s+/)
    if (path && !changed.has(path)) {
      hasher.update(`${path} ${blob}\n`)
    }
  }
  const ignored = inputs.filter(
    input => Bun.spawnSync(['git', 'check-ignore', '-q', input]).success
  )
  const files = [
    ...changed,
    ...ignored.flatMap(input =>
      [...new Bun.Glob('**/*').scanSync({ cwd: input, dot: true })].map(file =>
        join(input, file)
      )
    ),
  ].sort()
  for (const file of files) {
    if (existsSync(file)) {
      hasher.update(`${file} `)
      hasher.update(readFileSync(file))
    }
  }
  return hasher.digest('hex')
}
const useCache = !process.argv.includes('--no-cache')

type Result = 'passed' | 'failed' | 'skipped'
const results = new Map<string, { result: Result; seconds: number }>()
const running = new Map<string, Promise<void>>()
const start = performance.now()

function run(name: string): Promise<void> {
  const existing = running.get(name)
  if (existing) {
    return existing
  }
  const step = steps[name]!
  const promise = (async () => {
    const needs = (step.needs || []).filter(need => selected.has(need))
    await Promise.all(needs.map(run))
    if (needs.some(need => results.get(need)!.result !== 'passed')) {
      results.set(name, { result: 'skipped', seconds: 0 })
      return
    }
    const began = performance.now()
    const cacheDirectory = `.cache/check/${name}`
    const key = step.cache && cacheKey(name, step.cache.inputs)
    const keyFile = join(cacheDirectory, 'key')
    if (
      key &&
      useCache &&
      existsSync(keyFile) &&
      readFileSync(keyFile, 'utf8') === key
    ) {
      for (const output of step.cache!.outputs || []) {
        rmSync(output, { recursive: true, force: true })
        cpSync(join(cacheDirectory, output), output, { recursive: true })
      }
      results.set(name, { result: 'passed', seconds: 0 })
      console.log(`✓ ${name} · cached`)
      return
    }
    const child = Bun.spawn(step.command, {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' },
    })
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    const seconds = (performance.now() - began) / 1_000
    const result = code === 0 ? 'passed' : 'failed'
    results.set(name, { result, seconds })
    console.log(
      `${result === 'passed' ? '✓' : '✗'} ${name} · ${step.command.join(' ')} · ${seconds.toFixed(1)} s`
    )
    if (result === 'failed') {
      process.stdout.write(output + errors)
    } else if (key) {
      rmSync(cacheDirectory, { recursive: true, force: true })
      mkdirSync(cacheDirectory, { recursive: true })
      for (const output of step.cache!.outputs || []) {
        cpSync(output, join(cacheDirectory, output), { recursive: true })
      }
      await Bun.write(keyFile, key)
    }
  })()
  running.set(name, promise)
  return promise
}

console.log(
  `Checking ${[...selected].join(', ')}${scope === 'library' ? '' : ` for ${scope} changes`}.\n`
)
await Promise.all([...selected].map(run))

const failed = [...results].filter(([, { result }]) => result !== 'passed')
console.log(
  `\n${results.size - failed.length} of ${results.size} steps passed in ${((performance.now() - start) / 1_000).toFixed(0)} s.`
)
if (failed.length) {
  console.log(
    failed.map(([name, { result }]) => `${result}: ${name}`).join('\n')
  )
  process.exitCode = 1
}
