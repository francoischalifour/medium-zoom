import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import type { Plugin } from 'vite'
import { docsPages, headingId } from '../src/docs/pages.ts'

function getOutline(source: string) {
  const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
  return [...prose.matchAll(/^## (.+)$/gm)].map(([, heading]) => {
    const title = heading.replace(/`/g, '')
    return { title, id: headingId(title) }
  })
}

function getSearchExcerpt(source: string) {
  const paragraph = source
    .replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .find(block => block && !/^(?:import\b|export\b|#|<)/.test(block))
  return paragraph
    ?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// The authored headings own both the article anchors and its server-rendered outline.
export function docsPlugin(): Plugin {
  return {
    name: 'medium-zoom-docs',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'virtual:docs-search') return '\0virtual:docs-search'
    },
    load(id) {
      if (id !== '\0virtual:docs-search') return
      const entries = docsPages.flatMap(page => {
        const file = fileURLToPath(new URL(`../src/docs/${page.source}`, import.meta.url))
        this.addWatchFile(file)
        const source = readFileSync(file, 'utf8')
        return [
          {
            title: page.title,
            path: page.path,
            group: page.group,
            description: getSearchExcerpt(source) ?? page.description,
          },
          ...getOutline(source).map(heading => ({
            title: heading.title,
            path: `${page.path}#${heading.id}`,
            parent: page.title,
            group: page.group,
          })),
        ]
      })
      return `export default ${JSON.stringify(entries)}`
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.mdx')) return
      const search = server.moduleGraph.getModuleById('\0virtual:docs-search')
      if (search) server.moduleGraph.invalidateModule(search)
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
          isPartOf: {
            '@type': 'WebSite',
            name: 'medium-zoom',
            url: 'https://medium-zoom.francoischalifour.com/',
          },
        }
        const html = template
          .replaceAll('__DOC_TITLE__', escapeHtml(`${page.title} — medium-zoom documentation`))
          .replaceAll('__DOC_DESCRIPTION__', escapeHtml(page.description))
          .replaceAll('__DOC_URL__', escapeHtml(url))
          .replace('"__DOC_SCHEMA__"', JSON.stringify(schema).replaceAll('<', '\\u003c'))
        const file = fileURLToPath(new URL(`..${page.path}index.html`, import.meta.url))
        mkdirSync(dirname(file), { recursive: true })
        if (!existsSync(file) || readFileSync(file, 'utf8') !== html) writeFileSync(file, html)
        entries[page.path.slice(1).replaceAll('/', '-')] = file
      }
      return { build: { rolldownOptions: { input: entries } } }
    },
    transform(source, id) {
      if (!id.endsWith('.mdx')) return
      const outline = getOutline(source)
      return `${source}\n\nexport const outline = ${JSON.stringify(outline)}\n`
    },
  }
}
