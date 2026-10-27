import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { setLogger } from 'release-please'
import { loadManifest } from './manifest.mjs'

setLogger({ debug() {}, info() {}, warn() {}, error() {} })

const root = new URL('../../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const versions = JSON.parse(await read('.github/.release-please-manifest.json'))
const baseline = versions['.']
const [major, minor, patch] = baseline.split('.').map(Number)
const commit = (message, files = ['src/core.ts']) => ({
  sha: 'a'.repeat(40),
  message,
  files,
})

// These website features also touched tests and build tooling outside website/.
const websiteCommits = [
  {
    sha: '164e7a89f723daa3a4e10fa07577b53eabe22f38',
    message: 'feat(website): refine docs navigation and shared site UI (#253)',
    files: [
      'website/src/site-shell.tsx',
      'tests/browser/website-docs.spec.ts',
      'tests/server.ts',
      'scripts/prerender-website.ts',
      'config/vite.website.config.mts',
    ],
  },
  {
    sha: '042704da336ea0a3661c6e0bcbccfdaf6c55adbe',
    message: 'feat(website): add searchable command palette (#252)',
    files: ['website/src/command-palette.tsx', 'tests/analytics/website.spec.ts'],
  },
  commit('fix(website): repair navigation'),
  commit('perf(website): reduce hydration overhead'),
  commit('feat(website)!: replace navigation\n\nBREAKING CHANGE: remove old routes'),
  commit('chore(website): prepare website launch\n\nRelease-As: 9.0.0'),
]

async function build(commits) {
  // Only the GitHub boundary is replaced; configuration, parsing, plugins,
  // versioning, changelog generation and file updaters are release-please's.
  const github = {
    repository: { owner: 'francoischalifour', repo: 'medium-zoom', defaultBranch: 'main' },
    getFileJson: async path => JSON.parse(await read(path)),
    getFileContentsOnBranch: async path => ({ parsedContent: await read(path) }),
    async *releaseIterator() {
      yield { tagName: baseline, sha: 'b'.repeat(40), notes: '' }
    },
    async *mergeCommitIterator() {
      yield* commits
      yield { sha: 'b'.repeat(40), message: `chore(release): ${baseline}`, files: [] }
    },
  }
  return (await loadManifest(github)).buildPullRequests()
}

test('website-only history does not propose a library release', async () => {
  assert.deepEqual(await build(websiteCommits), [])
})

for (const [message, version] of [
  ['fix: restore image focus', `${major}.${minor}.${patch + 1}`],
  ['perf(core): reduce zoom overhead', `${major}.${minor}.${patch + 1}`],
  ['feat(accessibility): add keyboard controls', `${major}.${minor + 1}.0`],
  ['feat(core)!: replace zoom API\n\nBREAKING CHANGE: remove old zoom API', `${major + 1}.0.0`],
]) {
  test(`mixed history preserves library release: ${message.split('\n')[0]}`, async () => {
    const [release] = await build([...websiteCommits, commit(message)])
    assert.equal(release.version.toString(), version)
    const changelog = release.updates.find(update => update.path === 'CHANGELOG.md')
    const content = changelog.updater.updateContent('')
    assert.match(content, new RegExp(version.replaceAll('.', '\\.')))
    assert.match(content, new RegExp(message.split(': ').at(-1).split('\n')[0]))
    assert.doesNotMatch(content, /website|navigation|palette|hydration|old routes|9\.0\.0/)
    assert.doesNotMatch(release.body.toString(), /website|palette|old routes/)
    const packageUpdate = release.updates.find(update => update.path === 'package.json')
    assert.equal(
      JSON.parse(packageUpdate.updater.updateContent(await read('package.json'))).version,
      version
    )
  })
}

test('library features remain eligible when their files are under website/', async () => {
  const [release] = await build([commit('feat: add library integration', ['website/src/demo.tsx'])])
  assert.equal(release.version.toString(), `${major}.${minor + 1}.0`)
})
