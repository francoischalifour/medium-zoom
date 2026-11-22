/**
 * The released package's built files, byte for byte, against the digests in
 * `config/release-digests.json`. Changes to the engine, the build or its dependencies
 * must leave the published v1 files alone unless the change is meant for v1.
 *
 *   bun run check:release                 Fail when a released file differs.
 *   bun run check:release --update        Record the current files' digests.
 *   bun run check:release --diff <ref>    Build <ref> in a worktree and show what changed.
 *
 * Run `bun run build` first.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const digestsPath = 'config/release-digests.json'
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const files: string[] = manifest.files.filter((file: string) =>
  file.startsWith('dist/')
)
const digest = (path: string) =>
  `sha256-${createHash('sha256').update(readFileSync(path)).digest('base64')}`

function current(root = '.') {
  return Object.fromEntries(
    files.map(file => {
      const path = join(root, file)
      assert(
        existsSync(path),
        `${path} is missing: run \`bun run build\` first.`
      )
      return [file, digest(path)]
    })
  )
}

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1] || ''
}

if (process.argv.includes('--update')) {
  writeFileSync(digestsPath, `${JSON.stringify(current(), null, 2)}\n`)
  console.log(
    `Recorded ${files.length} released files in ${digestsPath}. Say in the pull request why they changed.`
  )
} else if (argument('--diff') !== undefined) {
  const ref = argument('--diff')
  assert(ref, 'Name the commit to compare with: --diff origin/main')
  const commit = execFileSync('git', ['rev-parse', '--short', ref], {
    encoding: 'utf8',
  }).trim()
  const worktree = resolve(`.cache/release-${commit}`)
  const run = (command: string, args: string[], cwd: string) => {
    const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
    assert.equal(
      result.status,
      0,
      `${command} ${args.join(' ')} failed in ${cwd}`
    )
  }
  if (!existsSync(worktree)) {
    run('git', ['worktree', 'add', '--detach', worktree, commit], '.')
  }
  try {
    run('bun', ['install', '--frozen-lockfile'], worktree)
    run('bun', ['run', 'build'], worktree)
    const before = current(worktree)
    const after = current()
    const changed = files.filter(file => before[file] !== after[file])
    if (!changed.length) {
      console.log(`The released files match ${commit} byte for byte.`)
    }
    for (const file of changed) {
      spawnSync(
        'git',
        ['diff', '--no-index', '--stat', join(worktree, file), file],
        { stdio: 'inherit' }
      )
      // A minified file is one line; the unminified build and declarations read well.
      if (readFileSync(file, 'utf8').split('\n').length > 10) {
        spawnSync(
          'git',
          ['--no-pager', 'diff', '--no-index', join(worktree, file), file],
          { stdio: 'inherit' }
        )
      }
    }
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', worktree])
    rmSync(worktree, { recursive: true, force: true })
  }
} else {
  const recorded: Record<string, string> = JSON.parse(
    readFileSync(digestsPath, 'utf8')
  )
  const now = current()
  const changed = [
    ...new Set([...Object.keys(recorded), ...Object.keys(now)]),
  ].filter(file => recorded[file] !== now[file])
  assert.equal(
    changed.length,
    0,
    `Released files changed: ${changed.join(', ')}.
See what changed with \`bun run check:release --diff origin/main\`. If the change is meant for v1, record it with \`bun run check:release --update\` and say why in the pull request.`
  )
  console.log(`${files.length} released files match ${digestsPath}.`)
}
