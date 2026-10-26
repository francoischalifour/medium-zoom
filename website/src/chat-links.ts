const docsOrigin = 'https://medium-zoom.francoischalifour.com'

export function getChatLinks(query: string, referencePath: string) {
  if (!query.trim()) return []
  const prompt = [query.trim(), `Read ${docsOrigin + referencePath} and answer`].join('\n\n')
  return [
    { key: 'chatgpt', title: 'Ask ChatGPT', base: 'https://chatgpt.com/' },
    { key: 'claude', title: 'Ask Claude', base: 'https://claude.ai/new' },
  ].map(provider => {
    const url = new URL(provider.base)
    url.searchParams.set('q', prompt)
    return { key: provider.key, title: provider.title, url: url.href }
  })
}
