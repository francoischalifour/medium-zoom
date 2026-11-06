import { readFileSync } from 'node:fs'

import { parse, parseExpressionAt, type Expression } from 'acorn'
import type { Code, List, PhrasingContent, RootContent } from 'mdast'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { docsPages } from '../src/docs/pages.ts'
import { supportedBrowsers } from '../src/docs/supported-browsers.ts'
import { componentCommands, javascriptCommands } from '../src/install-commands.ts'
import { heading, link, list, paragraph, text } from './markdown-nodes.ts'

type JsxElement = Extract<RootContent, { type: 'mdxJsxFlowElement' | 'mdxJsxTextElement' }>
type Convert<Props> = (
  props: Props,
  element: JsxElement,
  convertChildren: (nodes: readonly RootContent[]) => RootContent[]
) => RootContent[]

// Converts an authored docs page to plain Markdown. Interactive previews give way to the
// source they render, and every component needs an explicit mapping so none disappears silently.
export function mdxToMarkdown(file: URL): RootContent[] {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(readFileSync(file, 'utf8'))
  const scope = new Map<string, unknown>()
  for (const node of tree.children) {
    if (node.type === 'mdxjsEsm') {
      readRawImports(node.value, file, scope)
    }
  }
  resolveExpressions(tree, scope)
  return convertFlow(tree.children, scope)
}

// `{'<ImageZoom>'}` keeps literal text out of JSX parsing; it reads as plain text in Markdown.
function resolveExpressions(node: { children?: unknown[] }, scope: Map<string, unknown>) {
  if (!node.children) {
    return
  }
  node.children = node.children.map(child => {
    const expression = child as RootContent
    if (expression.type === 'mdxFlowExpression' || expression.type === 'mdxTextExpression') {
      return text(String(evaluate(parseExpression(expression.value), scope)))
    }
    resolveExpressions(expression as { children?: unknown[] }, scope)
    return expression
  })
}

// `import code from './example.tsx?raw'` makes the example's source available to attributes.
function readRawImports(source: string, file: URL, scope: Map<string, unknown>) {
  const program = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  for (const statement of program.body) {
    const specifier = statement.type === 'ImportDeclaration' ? String(statement.source.value) : ''
    const local = statement.type === 'ImportDeclaration' ? statement.specifiers[0]?.local.name : ''
    if (local && specifier.endsWith('?raw')) {
      scope.set(local, readFileSync(new URL(specifier.slice(0, -'?raw'.length), file), 'utf8'))
    }
  }
}

function convertFlow(nodes: readonly RootContent[], scope: Map<string, unknown>): RootContent[] {
  return nodes.flatMap((node): RootContent[] => {
    switch (node.type) {
      case 'mdxjsEsm':
        return []
      case 'mdxJsxFlowElement':
        return convertElement(node, scope)
      case 'text':
        return [paragraph([node])]
      case 'paragraph':
      case 'heading':
        return [{ ...node, children: convertPhrasing(node.children) }]
      case 'list':
      case 'listItem':
      case 'blockquote':
        return [{ ...node, children: convertFlow(node.children, scope) } as RootContent]
      default:
        return [node]
    }
  })
}

function convertPhrasing(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  return nodes.flatMap((node): PhrasingContent[] => {
    switch (node.type) {
      case 'mdxJsxTextElement':
        if (node.name === 'kbd') {
          return [{ type: 'inlineCode', value: textOf(node) }]
        }
        if (node.name === 'strong') {
          return [{ type: 'strong', children: convertPhrasing(node.children) }]
        }
        throw new Error(`No Markdown mapping for inline <${node.name}>`)
      case 'emphasis':
      case 'strong':
      case 'link':
        return [{ ...node, children: convertPhrasing(node.children) } as PhrasingContent]
      default:
        return [node]
    }
  })
}

function convertElement(element: JsxElement, scope: Map<string, unknown>): RootContent[] {
  const convert = element.name ? components[element.name] : undefined
  if (!convert) {
    throw new Error(`No Markdown mapping for <${element.name}>`)
  }
  const props: Record<string, unknown> = {}
  for (const attribute of element.attributes) {
    if (attribute.type !== 'mdxJsxAttribute') {
      throw new Error(`Spread attributes on <${element.name}> have no Markdown mapping`)
    }
    const { value } = attribute
    props[attribute.name] =
      value === null || value === undefined
        ? true
        : typeof value === 'string'
          ? value
          : evaluate(parseExpression(value.value), scope)
  }
  // Each mapping declares the props its component takes; MDX attributes are untyped.
  return convert(props as never, element, nodes => convertFlow(nodes, scope))
}

type CodeFile = { code: string; title: string }

const components: Record<string, Convert<never>> = {
  Example: ({ code, title, styles }: CodeFile & { styles?: CodeFile }) => [
    codeBlock({ code, title }),
    ...(styles ? [codeBlock(styles)] : []),
  ],
  DocCode: (file: CodeFile) => [codeBlock(file)],
  InstallCommand: ({ page }: { page: 'javascript' | 'react' }) => [
    {
      type: 'code',
      lang: 'sh',
      value: (page === 'javascript' ? javascriptCommands : componentCommands).npm,
    },
  ],
  // The live result of the quickstart's markup is the image itself.
  JavaScriptPreview: ({ src, alt }: { src: string; alt: string }) => [
    paragraph([{ type: 'image', url: src, alt }]),
  ],
  BrowserSupport: () => [
    list(supportedBrowsers.map(browser => [text(`${browser.name} ${browser.version}+`)])),
  ],
  RelatedPages: ({ pages }: { pages: string[] }) => [
    list(pages.map(path => [pageLink(path), text(`: ${findPage(path).summary}`)])),
  ],
  EntryPoints: (_, element) => [
    list(
      findElements(element, 'EntryPoint').map(entry => [
        pageLink(literalAttribute(entry, 'path')),
        text(`: ${textOf(entry).trim()}`),
      ])
    ),
  ],
  ReferenceLinks: (_, element, convertChildren) =>
    convertChildren(element.children as RootContent[]),
  ReferenceGroup: ({ title }: { title: string }, element) => [
    heading(3, [text(title)]),
    list(
      findElements(element, 'a').map(anchor => [
        link(literalAttribute(anchor, 'href'), [text(textOf(anchor))]),
      ])
    ),
  ],
  PropertyMeta: ({ type, defaultValue }: { type: string; defaultValue?: string }) => [
    propertyMeta(type, defaultValue),
  ],
  Prop: (
    {
      name,
      type,
      defaultValue,
      required,
    }: { name: string; type: string; defaultValue?: string; required?: boolean },
    element,
    convertChildren
  ) => [
    heading(3, [{ type: 'inlineCode', value: name }]),
    ...convertChildren(element.children as RootContent[]),
    propertyMeta(type, defaultValue, required === true),
  ],
  // Empty divs only keep anchors for retired headings.
  div: (_, element) => {
    if (element.children.length) {
      throw new Error('A <div> with content has no Markdown mapping')
    }
    return []
  },
  // A disclosure's summary becomes a subheading over its always-visible content.
  details: (_, element, convertChildren) =>
    (element.children as RootContent[]).flatMap(node =>
      node.type === 'paragraph' &&
      node.children.length === 1 &&
      node.children[0].type === 'mdxJsxTextElement' &&
      node.children[0].name === 'summary'
        ? [heading(3, [text(textOf(node.children[0]))])]
        : convertChildren([node])
    ),
  table: (_, element) => [
    {
      type: 'table',
      children: findElements(element, 'tr').map(row => ({
        type: 'tableRow',
        children: findElements(row, 'th', 'td').map(cell => ({
          type: 'tableCell',
          children: findElements(cell, 'code').length
            ? [{ type: 'inlineCode', value: textOf(cell).trim() }]
            : [text(textOf(cell).trim())],
        })),
      })),
    },
  ],
}

function findPage(path: string) {
  const page = docsPages.find(page => page.path === path)
  if (!page) {
    throw new Error(`Unknown docs page: ${path}`)
  }
  return page
}

function pageLink(path: string) {
  return link(path, [text(findPage(path).title)])
}

function literalAttribute(element: JsxElement, name: string) {
  const value = element.attributes.find(
    attribute => attribute.type === 'mdxJsxAttribute' && attribute.name === name
  )?.value
  if (typeof value !== 'string') {
    throw new Error(`<${element.name}> needs a literal ${name}`)
  }
  return value
}

// Finds the outermost descendants with these tag names, in document order.
function findElements(node: { children?: unknown[] }, ...names: string[]): JsxElement[] {
  return (node.children ?? []).flatMap(child => {
    const element = child as JsxElement
    return element.type.startsWith('mdxJsx') && names.includes(element.name ?? '')
      ? [element]
      : findElements(element, ...names)
  })
}

function parseExpression(source: string): Expression {
  return parseExpressionAt(source, 0, { ecmaVersion: 'latest' })
}

// The text content of an element, like the DOM's textContent.
function textOf(node: { value?: unknown; children?: unknown[] }): string {
  return typeof node.value === 'string'
    ? node.value
    : (node.children ?? []).map(child => textOf(child as typeof node)).join('')
}

// Docs attributes hold literals, arrays, objects, and imported identifiers; anything else is a bug.
function evaluate(expression: Expression, scope: Map<string, unknown>): unknown {
  switch (expression.type) {
    case 'Literal':
      return expression.value
    case 'Identifier':
      if (!scope.has(expression.name)) {
        throw new Error(`Unknown identifier in MDX expression: ${expression.name}`)
      }
      return scope.get(expression.name)
    case 'ArrayExpression':
      return expression.elements.map(element => evaluate(element as Expression, scope))
    case 'ObjectExpression':
      return Object.fromEntries(
        expression.properties.map(property => {
          if (property.type !== 'Property' || property.key.type !== 'Identifier') {
            throw new Error('Unsupported object property in MDX expression')
          }
          return [property.key.name, evaluate(property.value as Expression, scope)]
        })
      )
    default:
      throw new Error(`Unsupported MDX expression: ${expression.type}`)
  }
}

function codeBlock({ code, title }: CodeFile): Code {
  return {
    type: 'code',
    lang: title.split('.').pop(),
    meta: `title="${title}"`,
    value: code.trim(),
  }
}

function propertyMeta(type: string, defaultValue?: string, required = false): List {
  return list([
    [text('Type: '), { type: 'inlineCode', value: type }],
    ...(defaultValue === undefined
      ? []
      : [[text('Default: '), { type: 'inlineCode', value: defaultValue }] as PhrasingContent[]]),
    ...(required ? [[text('Required')]] : []),
  ])
}
