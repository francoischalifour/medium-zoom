import MiniSearch from 'minisearch'

import { getSearchTerms, type DocsSearch, type SearchEntry } from './docs-search'

const aliases: Record<string, string> = {
  '/docs/guides/server-rendering/': 'nextjs next.js ssr server components rsc',
  '/docs/guides/hd-images/': 'high resolution high-resolution retina srcset',
  '/docs/guides/galleries/': 'gallery multiple photos pictures',
  '/docs/guides/styling/': 'css styles caption overlay',
  '/docs/javascript/': 'install installation setup vanilla npm',
  '/docs/react/': 'install installation setup shadcn npm',
}

// Preserve complete API identifiers and also make their individual words searchable.
function tokenize(value: string) {
  return [
    ...new Set([
      ...getSearchTerms(value),
      ...getSearchTerms(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2')),
    ]),
  ]
}

function excerpt(text: string, terms: string[]) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const matching = sentences
    .map(sentence => ({
      sentence,
      score: tokenize(sentence).filter(term => terms.includes(term)).length,
    }))
    .sort((a, b) => b.score - a.score)[0].sentence
  if (matching.length <= 180) {
    return matching
  }
  const position = matching.toLowerCase().search(new RegExp(terms.join('|'), 'i'))
  const offset = Math.max(0, position - 60)
  const start = offset ? matching.lastIndexOf(' ', offset) + 1 : 0
  const end = matching.lastIndexOf(' ', start + 177)
  return `${start ? '…' : ''}${matching.slice(start, end > start ? end : start + 177)}…`
}

export function createDocsSearch(entries: SearchEntry[]): DocsSearch {
  const byPath = new Map(entries.map(entry => [entry.path, entry]))
  const index = new MiniSearch({
    idField: 'path',
    fields: ['title', 'keywords', 'parent', 'group', 'description', 'content', 'aliases'],
    tokenize,
    searchOptions: {
      combineWith: 'AND',
      boost: { title: 8, keywords: 8, parent: 3, aliases: 6, description: 2, group: 1, content: 1 },
      prefix: (term, position, terms) =>
        term.length >= 2 && !['on', 'off'].includes(term) && position === terms.length - 1,
      fuzzy: term => (term.length < 4 ? false : term.length < 8 ? 1 : 2),
    },
  })
  index.addAll(
    entries.map(entry => ({
      ...entry,
      aliases: aliases[entry.path.split('#')[0]] ?? '',
    }))
  )

  return (query, framework) => {
    const terms = getSearchTerms(query)
    if (!terms.length) {
      return [
        '/docs/javascript/',
        '/docs/react/',
        '/docs/guides/hd-images/',
        '/docs/guides/galleries/',
        '/docs/reference/react/image-zoom/',
      ].flatMap(path => (byPath.has(path) ? [byPath.get(path)!] : []))
    }
    const boostDocument = (path: string | number, term: string) => {
      const entry = byPath.get(String(path))!
      const exactName =
        getSearchTerms(entry.title).join(' ') === terms.join(' ') ||
        getSearchTerms(entry.keywords ?? '').includes(terms.join(' '))
      const preferredFramework = `${entry.group} ${entry.path}`.includes(framework)
      const pageBoost =
        !entry.parent && tokenize(`${entry.title} ${aliases[entry.path] ?? ''}`).includes(term)
          ? 3
          : 1
      // A topic alias should favor its landing page over incidental section matches.
      const aliasBoost = getSearchTerms(aliases[entry.path] ?? '').includes(term) ? 2 : 1
      const navigationBoost = /^(Related pages|Next steps|Guides|React guides|Reference)$/.test(
        entry.title
      )
        ? 0.3
        : 1
      return (
        (exactName ? 4 : 1) *
        (preferredFramework ? 1.15 : 1) *
        pageBoost *
        aliasBoost *
        navigationBoost
      )
    }
    let results = index.search(query, { boostDocument })
    if (!results.length) {
      // A swapped pair of letters costs two edits in MiniSearch's Levenshtein matching.
      results = index.search(query, {
        boostDocument,
        fuzzy: term => (term.length >= 5 ? 2 : term.length >= 4 ? 1 : false),
      })
    }
    return results.slice(0, 5).map(result => {
      const entry = byPath.get(String(result.id))!
      return {
        ...entry,
        matchedTerms: result.terms,
        description: excerpt(
          [entry.content, entry.description].filter(Boolean).join(' '),
          result.terms
        ),
      }
    })
  }
}
