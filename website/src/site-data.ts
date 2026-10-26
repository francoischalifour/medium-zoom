// GitHub repository star count, checked via its API on 2026-10-26.
export const githubStars = 3_941
export const githubStarLabel = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
  .format(githubStars)
  .toLowerCase()

export const repositoryUrl = 'https://github.com/francoischalifour/medium-zoom'

export type SitePage = 'library' | 'shadcn'
