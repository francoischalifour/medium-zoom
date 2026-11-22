// Runs the format and lint checks in place and in a copy of the repository's files under
// an empty home folder, as CI sees them. Tools that find configs, ignore files or
// dependencies above the checkout, such as a nested worktree's parent, make the two differ.
import { spawn, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const checks = [['format', '--check'], ['lint']]

const listed = spawnSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' }
)
if (listed.status !== 0) {
  throw new Error(`git ls-files failed: ${listed.stderr}`)
}
const files = listed.stdout.split('\0').filter(file => file && existsSync(file))

if (!existsSync('node_modules')) {
  throw new Error(
    'Run `bun install` in this checkout: without node_modules, tools resolve from parent directories.'
  )
}

const directory = realpathSync(
  mkdtempSync(join(tmpdir(), 'medium-zoom-isolated-'))
)
try {
  const copy = join(directory, 'repository')
  const home = join(directory, 'home')
  mkdirSync(home)
  for (const file of files) {
    mkdirSync(join(copy, dirname(file)), { recursive: true })
    cpSync(file, join(copy, file))
  }
  // Dependencies are not tracked; link each installed workspace's.
  for (const manifest of files.filter(file => file.endsWith('package.json'))) {
    const modules = join(dirname(manifest), 'node_modules')
    if (existsSync(modules)) {
      symlinkSync(realpathSync(modules), join(copy, modules))
    }
  }
  // Ignore files apply inside a Git work tree, as in CI's checkout.
  spawnSync('git', ['init', '--quiet'], { cwd: copy })

  const isolatedEnv = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: join(home, '.config'),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
  }
  const results = await Promise.all(
    checks.flatMap(check => [
      run(check, process.cwd(), process.env),
      run(check, copy, isolatedEnv),
    ])
  )
  const failures = checks.flatMap((check, index) => {
    const [inPlace, isolated] = results.slice(index * 2, index * 2 + 2)
    if (inPlace.code === isolated.code && isolated.code === 0) {
      return []
    }
    const verdict =
      inPlace.code === isolated.code
        ? 'fails'
        : 'differs between this checkout and a clean copy'
    return [
      `bun run ${check.join(' ')} ${verdict} (in place: ${inPlace.code}, clean copy: ${isolated.code}).\n${isolated.output}`,
    ]
  })
  if (failures.length) {
    console.error(failures.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Format and lint agree in place and in a clean copy.')
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}

function run(script: string[], cwd: string, env: NodeJS.ProcessEnv) {
  return new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn('bun', ['run', ...script], { cwd, env })
      let output = ''
      child.stdout.on('data', chunk => (output += chunk))
      child.stderr.on('data', chunk => (output += chunk))
      child.once('error', reject)
      child.once('close', code => resolve({ code, output }))
    }
  )
}
