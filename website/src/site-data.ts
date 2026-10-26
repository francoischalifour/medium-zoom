// GitHub repository star count, checked via its API on 2026-10-26.
export const githubStars = 3_941
export const githubStarLabel = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
  .format(githubStars)
  .toLowerCase()

export const repositoryUrl = 'https://github.com/francoischalifour/medium-zoom'

export type SitePage = 'javascript' | 'react'

export function getSitePage(pathname: string): SitePage | 'docs' | null {
  const path = pathname.replace(/\/?$/, '/')
  if (path === '/') return 'javascript'
  if (path === '/examples/shadcn/') return 'react'
  if (path.startsWith('/docs/')) return 'docs'
  return null
}
