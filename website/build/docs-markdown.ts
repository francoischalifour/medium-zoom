import type { Root, RootContent } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

import packageJson from '../../package.json' with { type: 'json' }
import { docsPages, markdownPath } from '../src/docs/pages.ts'
import { siteOrigin } from '../src/site-url.ts'
import { heading, link, list, paragraph, text } from './markdown-nodes.ts'
import { mdxToMarkdown } from './mdx-to-markdown.ts'

type DocsPage = (typeof docsPages)[number]

// Every docs page as Markdown beside its route, plus an llms.txt index and an llms-full.txt
// with every page (https://llmstxt.org), keyed by public path.
export function docsMarkdownFiles(): Map<string, string> {
  const pages = docsPages.map(page => ({
    path: markdownPath(page.path),
    markdown: stringify(pageMarkdown(page)),
  }))
  return new Map([
    ...pages.map(({ path, markdown }) => [path, markdown] as const),
    ['/llms.txt', stringify(llmsIndex())],
    ['/llms-full.txt', pages.map(({ markdown }) => markdown).join('\n')],
  ])
}

function pageMarkdown(page: DocsPage): RootContent[] {
  const url = siteOrigin + page.path
  return [
    heading(1, [text(page.title)]),
    { type: 'blockquote', children: [paragraph([text(page.description)])] },
    paragraph([text('Source: '), link(url, [text(url)])]),
    ...mdxToMarkdown(new URL(`../src/docs/${page.source}`, import.meta.url)),
  ]
}

function llmsIndex(): RootContent[] {
  const groups = [...new Set(docsPages.map(page => page.group))]
  return [
    heading(1, [text(packageJson.name)]),
    { type: 'blockquote', children: [paragraph([text(packageJson.description)])] },
    paragraph([
      text('The documentation covers the framework-agnostic JavaScript library, published as '),
      { type: 'inlineCode', value: 'medium-zoom' },
      text(' on npm, and the React '),
      { type: 'inlineCode', value: '<ImageZoom>' },
      text(' component, installed from the shadcn registry. '),
      link('/llms-full.txt', [text('llms-full.txt')]),
      text(' contains every page in one file.'),
    ]),
    ...groups.flatMap(group => [
      heading(2, [text(group)]),
      list(
        docsPages
          .filter(page => page.group === group)
          .map(page => [
            link(markdownPath(page.path), [text(page.title)]),
            text(`: ${page.description}`),
          ])
      ),
    ]),
  ]
}

function stringify(children: RootContent[]) {
  const root: Root = { type: 'root', children }
  absolutizeLinks(root)
  return unified()
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-', fences: true })
    .stringify(root)
}

// Agents read these files away from the site, so site-relative links need its origin.
function absolutizeLinks(node: Root | RootContent) {
  if ((node.type === 'link' || node.type === 'image') && node.url.startsWith('/')) {
    node.url = siteOrigin + node.url
  }
  if ('children' in node) {
    node.children.forEach(absolutizeLinks)
  }
}
