import { Manifest } from 'release-please'
import { ManifestPlugin } from 'release-please/build/src/plugin.js'

// Filter before versioning and changelog generation. Hiding changelog sections
// alone still lets website features and breaking changes bump the library.
export class ExcludeWebsite extends ManifestPlugin {
  processCommits(commits) {
    return commits.filter(commit => commit.scope !== 'website')
  }
}

export async function loadManifest(github) {
  const manifest = await Manifest.fromManifest(
    github,
    'main',
    '.github/release-please-config.json',
    '.github/.release-please-manifest.json'
  )
  manifest.plugins.unshift(new ExcludeWebsite(github, 'main', manifest.repositoryConfig))
  return manifest
}
