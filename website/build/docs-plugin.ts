import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseExpressionAt } from 'acorn'
import type { Plugin } from 'vite'

import type { SearchEntry } from '../src/docs-search.ts'
import { docsPages, docsPublishedOn, headingId } from '../src/docs/pages.ts'
import { docsOgImagePath } from './docs-sharing.ts'

function getOutline(source: string) {
  const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
  return [...prose.matchAll(/^## (.+)$/gm)].map(([, heading]) => {
    const title = heading.replace(/`/g, '')
    return { title, id: headingId(title) }
  })
}

function getSearchText(source: string) {
  return (
    source
      .replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
      .replace(/^import .+$/gm, '')
      .replace(/`([^`\n]+)`/g, (_, code: string) => code.replace(/[<>]/g, ''))
      .replace(/<Prop\s+name="([^"]+)"/g, '$1 <Prop')
      // Decode literal MDX text in the same pass as tags so '<ImageZoom>' stays text.
      .replace(
        /\{\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\}|<\/?[A-Za-z](?:[^<>"']|"[^"]*"|'[^']*')*>/g,
        (_, literal: string | undefined) => {
          if (!literal) {
            return ' '
          }
          const expression = parseExpressionAt(literal, 0, { ecmaVersion: 'latest' })
          return expression.type === 'Literal' && typeof expression.value === 'string'
            ? expression.value
            : ''
        }
      )
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/[`*_]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function getSearchEntries(source: string, page: (typeof docsPages)[number]): SearchEntry[] {
  const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
  const [introduction, ...sections] = prose.split(/^## (.+)$/gm)
  return [
    {
      title: page.title,
      path: page.path,
      group: page.group,
      description: page.description,
      content: getSearchText(introduction),
    },
    ...getOutline(source).map((heading, index) => ({
      title: heading.title,
      path: `${page.path}#${heading.id}`,
      parent: page.title,
      group: page.group,
      content: getSearchText(sections[index * 2 + 1]),
      keywords: [...sections[index * 2 + 1].matchAll(/<Prop\s+name="([^"]+)"/g)]
        .map(([, name]) => name)
        .join(' '),
    })),
  ]
}

// The authored headings own both the article anchors and its server-rendered outline.
export function docsPlugin(): Plugin {
  return {
    name: 'medium-zoom-docs',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'virtual:docs-search') {
        return '\0virtual:docs-search'
      }
    },
    load(id) {
      if (id !== '\0virtual:docs-search') {
        return
      }
      const entries = docsPages.flatMap(page => {
        const file = fileURLToPath(new URL(`../src/docs/${page.source}`, import.meta.url))
        this.addWatchFile(file)
        const source = readFileSync(file, 'utf8')
        return getSearchEntries(source, page)
      })
      const searchModule = fileURLToPath(new URL('../src/docs-search-index.ts', import.meta.url))
      return `import { createDocsSearch } from ${JSON.stringify(searchModule)};\nexport default createDocsSearch(${JSON.stringify(entries)})`
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.mdx')) {
        return
      }
      const search = server.moduleGraph.getModuleById('\0virtual:docs-search')
      if (search) {
        server.moduleGraph.invalidateModule(search)
      }
      server.ws.send({ type: 'full-reload' })
    },
    config() {
      const template = readFileSync(new URL('./docs-template.html', import.meta.url), 'utf8')
      const entries: Record<string, string> = {}
      const escapeHtml = (value: string) =>
        value.replace(
          /[&<>"']/g,
          character =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            })[character]!
        )
      for (const page of docsPages) {
        const url = `https://medium-zoom.francoischalifour.com${page.path}`
        const schema = {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: page.title,
          description: page.description,
          url,
          image: `https://medium-zoom.francoischalifour.com${docsOgImagePath(page.path)}`,
          author: {
            '@type': 'Person',
            name: 'François Chalifour',
            url: 'https://francoischalifour.com',
          },
          datePublished: docsPublishedOn,
          dateModified: page.updatedOn,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { name: 'Home', item: 'https://medium-zoom.francoischalifour.com/' },
                ...(page.path === '/docs/'
                  ? []
                  : [
                      {
                        name: 'Documentation',
                        item: 'https://medium-zoom.francoischalifour.com/docs/',
                      },
                    ]),
                { name: page.path === '/docs/' ? 'Documentation' : page.title, item: url },
              ].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
            },
          },
          isPartOf: {
            '@type': 'WebSite',
            name: 'medium-zoom',
            url: 'https://medium-zoom.francoischalifour.com/',
          },
        }
        const html = template
          .replaceAll('__DOC_TITLE__', escapeHtml(page.documentTitle))
          .replaceAll('__DOC_DESCRIPTION__', escapeHtml(page.description))
          .replaceAll('__DOC_URL__', escapeHtml(url))
          .replaceAll('__DOC_IMAGE__', docsOgImagePath(page.path))
          .replace('"__DOC_SCHEMA__"', JSON.stringify(schema).replaceAll('<', '\\u003c'))
        const file = fileURLToPath(new URL(`..${page.path}index.html`, import.meta.url))
        mkdirSync(dirname(file), { recursive: true })
        if (!existsSync(file) || readFileSync(file, 'utf8') !== html) {
          writeFileSync(file, html)
        }
        entries[page.path.slice(1).replaceAll('/', '-')] = file
      }
      return { build: { rolldownOptions: { input: entries } } }
    },
    transform(source, id) {
      if (!id.endsWith('.mdx')) {
        return
      }
      const outline = getOutline(source)
      return `${source}\n\nexport const outline = ${JSON.stringify(outline)}\n`
    },
  }
}
