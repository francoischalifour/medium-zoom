import type { Root, RootContent } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

import packageJson from '../../package.json' with { type: 'json' }
import { docsPages } from '../src/docs/pages.ts'
import { headline, productPages } from '../src/product-pages.ts'
import { siteOrigin } from '../src/site-url.ts'
import { blockquote, heading, link, list, paragraph, text } from './markdown-nodes.ts'
import { mdxToMarkdown } from './mdx-to-markdown.ts'
import { productMarkdown } from './product-markdown.ts'

type MarkdownPage = {
  path: string
  title: string
  summary: string
  group: string
  content: () => RootContent[]
}

// Every page in sitemap order: the product pages, then the docs in sidebar order.
const markdownPages: MarkdownPage[] = [
  ...(['javascript', 'react'] as const).map(page => ({
    path: productPages[page].path,
    title: `${headline} with ${productPages[page].technology}`,
    summary: productPages[page].tagline.join(' '),
    group: 'Product pages',
    content: () => productMarkdown(page),
  })),
  ...docsPages.map(page => ({
    path: page.path,
    title: page.title,
    summary: page.description,
    group: page.group,
    content: () => mdxToMarkdown(new URL(`../src/docs/${page.source}`, import.meta.url)),
  })),
]

// Each page's Markdown sits beside its route: / → /index.md, /react → /react.md, and
// /docs/guides/hd-images/ → /docs/guides/hd-images.md
export function markdownPath(path: string) {
  return path === '/' ? '/index.md' : path.replace(/\/?$/, '.md')
}

// Every page as Markdown beside its route, plus an llms.txt index and an llms-full.txt with
// every page (https://llmstxt.org), keyed by public path.
export function siteMarkdownFiles(): Map<string, string> {
  const pages = markdownPages.map(page => ({
    path: markdownPath(page.path),
    markdown: stringify(pageMarkdown(page)),
  }))
  return new Map([
    ...pages.map(({ path, markdown }) => [path, markdown] as const),
    ['/llms.txt', stringify(llmsIndex())],
    ['/llms-full.txt', pages.map(({ markdown }) => markdown).join('\n')],
  ])
}

function pageMarkdown(page: MarkdownPage): RootContent[] {
  const url = siteOrigin + page.path
  return [
    heading(1, [text(page.title)]),
    blockquote(page.summary),
    paragraph([text('Source: '), link(url, [text(url)])]),
    ...page.content(),
  ]
}

function llmsIndex(): RootContent[] {
  const groups = [...new Set(markdownPages.map(page => page.group))]
  return [
    heading(1, [text(packageJson.name)]),
    blockquote(packageJson.description),
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
        markdownPages
          .filter(page => page.group === group)
          .map(page => [
            link(markdownPath(page.path), [text(page.title)]),
            text(`: ${page.summary}`),
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
