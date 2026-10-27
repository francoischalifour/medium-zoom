import { appendFileSync } from 'node:fs'
import { GitHub } from 'release-please'
import { loadManifest } from './manifest.mjs'

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
const github = await GitHub.create({
  owner,
  repo,
  token: process.env.GITHUB_TOKEN,
  defaultBranch: 'main',
})

// Verify the full candidate against GitHub without creating releases or PRs:
// npm run release -- --dry-run
if (process.argv.includes('--dry-run')) {
  const manifest = await loadManifest(github)
  console.log(
    JSON.stringify(
      {
        releases: await manifest.buildReleases(),
        pullRequests: (await manifest.buildPullRequests()).map(candidate => ({
          version: candidate.version.toString(),
          body: candidate.body.toString(),
        })),
      },
      null,
      2
    )
  )
  process.exit(0)
}

// Match release-please-action: tag merged release PRs before proposing the next
// release, then reload the manifest so it sees any release just created.
const releases = await (await loadManifest(github)).createReleases()
const release = releases.find(candidate => candidate && (candidate.path || '.') === '.')
appendFileSync(
  process.env.GITHUB_OUTPUT,
  `release_created=${Boolean(release)}\nsha=${release?.sha || ''}\n`
)
await (await loadManifest(github)).createPullRequests()
