import type {
  Blockquote,
  Code,
  Heading,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
} from 'mdast'

import { splitInlineCode } from '../src/product-pages.ts'

// Small mdast builders shared by the site's Markdown pages and llms.txt.

export function text(value: string): PhrasingContent {
  return { type: 'text', value }
}

export function paragraph(children: PhrasingContent[]): Paragraph {
  return { type: 'paragraph', children }
}

export function heading(depth: Heading['depth'], children: PhrasingContent[]): Heading {
  return { type: 'heading', depth, children }
}

export function link(url: string, children: PhrasingContent[]): Link {
  return { type: 'link', url, children }
}

export function listItem(children: PhrasingContent[]): ListItem {
  return { type: 'listItem', spread: false, children: [paragraph(children)] }
}

export function list(items: PhrasingContent[][]): List {
  return { type: 'list', ordered: false, spread: false, children: items.map(listItem) }
}

export function blockquote(value: string): Blockquote {
  return { type: 'blockquote', children: [paragraph([text(value)])] }
}

// A code block titled by its file name, with the language taken from the extension.
export function codeBlock({ code, title }: { code: string; title: string }): Code {
  return {
    type: 'code',
    lang: title.split('.').pop(),
    meta: `title="${title}"`,
    value: code.trim(),
  }
}

// Shared page copy, where backticks mark inline code.
export function inlineCopy(copy: string): PhrasingContent[] {
  return splitInlineCode(copy)
    .map((value, index): PhrasingContent =>
      index % 2 === 1 ? { type: 'inlineCode', value } : text(value)
    )
    .filter(node => node.type !== 'text' || node.value !== '')
}
