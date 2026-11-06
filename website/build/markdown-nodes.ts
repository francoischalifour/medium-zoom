import type { Heading, Link, List, ListItem, Paragraph, PhrasingContent } from 'mdast'

// Small mdast builders shared by the docs Markdown and llms.txt output.

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
