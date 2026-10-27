import type { SitePage } from './site-data'

export type SearchEntry = {
  title: string
  path: string
  parent?: string
  group: string
  description?: string
  content?: string
  keywords?: string
}

export type SearchResult = SearchEntry & { matchedTerms?: string[] }
export type DocsSearch = (query: string, framework: SitePage) => SearchResult[]

export function getSearchTerms(value: string): string[] {
  return (
    value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? []
  )
}
