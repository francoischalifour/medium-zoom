import type { SearchEntry } from './docs-search'

const docsOrigin = 'https://medium-zoom.francoischalifour.com'

export function getChatLinks(question: string, results: SearchEntry[], react: boolean) {
  if (!question.trim()) return []
  const reference = results[0]?.path ?? (react ? '/docs/react/' : '/docs/javascript/')
  const prompt = [question.trim(), `Read ${docsOrigin + reference} and answer`].join('\n\n')
  return [
    { key: 'chatgpt', title: 'Ask ChatGPT', base: 'https://chatgpt.com/' },
    { key: 'claude', title: 'Ask Claude', base: 'https://claude.ai/new' },
  ].map(provider => {
    const url = new URL(provider.base)
    url.searchParams.set('q', prompt)
    return { key: provider.key, title: provider.title, url: url.href }
  })
}
