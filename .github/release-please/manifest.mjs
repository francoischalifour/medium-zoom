import { Manifest } from 'release-please'
import { ManifestPlugin } from 'release-please/build/src/plugin.js'

const EXCLUDED_SCOPES = new Set(['website'])

// Filter before versioning and changelog generation. Hiding changelog sections
// alone still lets website features and breaking changes bump the library.
export class ExcludeScopes extends ManifestPlugin {
  processCommits(commits) {
    return commits.filter(commit => !EXCLUDED_SCOPES.has(commit.scope))
  }
}

export async function loadManifest(github) {
  const manifest = await Manifest.fromManifest(
    github,
    'main',
    '.github/release-please-config.json',
    '.github/.release-please-manifest.json'
  )
  manifest.plugins.unshift(new ExcludeScopes(github, 'main', manifest.repositoryConfig))
  return manifest
}
