export type SearchEntry = {
  title: string
  path: string
  parent: string
  group: string
  description: string
}

const aliases: Record<string, string> = {
  '/docs/guides/server-rendering/': 'nextjs next.js ssr server components rsc',
  '/docs/guides/hd-images/': 'high resolution high-resolution retina srcset',
  '/docs/guides/galleries/': 'gallery multiple photos pictures',
  '/docs/guides/styling/': 'css styles caption overlay',
  '/docs/javascript/': 'install installation setup vanilla npm',
  '/docs/react/': 'install installation setup shadcn npm',
}
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export function searchDocs(entries: SearchEntry[], query: string, react: boolean) {
  const normalized = normalize(query)
  if (!normalized) {
    const popular = [
      '/docs/javascript/',
      '/docs/react/',
      '/docs/guides/hd-images/',
      '/docs/guides/galleries/',
      '/docs/reference/react/image-zoom/',
    ]
    return popular.flatMap(path => entries.filter(entry => entry.path === path))
  }
  const words = normalized.split(/\s+/)
  return entries
    .map(entry => {
      const title = normalize(entry.title)
      const parent = normalize(entry.parent)
      const terms = normalize(
        `${entry.title} ${entry.parent} ${entry.group} ${entry.parent ? '' : entry.description} ${aliases[entry.path] ?? ''}`
      )
      if (!words.every(word => terms.includes(word))) return { entry, score: 0 }
      const score =
        (title === normalized
          ? 100
          : title.startsWith(normalized)
            ? 70
            : title.includes(normalized)
              ? 50
              : 0) +
        words.filter(word => title.includes(word)).length * 10 +
        words.filter(word => parent.includes(word)).length * 5 +
        (entry.group.toLowerCase().includes(react ? 'react' : 'javascript') ? 3 : 0) +
        1
      return { entry, score }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 9)
    .map(result => result.entry)
}
