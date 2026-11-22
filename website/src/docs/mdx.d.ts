declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const Content: ComponentType<{ components?: Record<string, unknown> }>
  export const snippets: import('../code-snippets').HighlightedSnippets
  export const outline: { title: string; id: string }[]
  export default Content
}

declare module 'virtual:highlighted-snippets' {
  const snippets: import('../code-snippets').HighlightedSnippets
  export default snippets
}

declare module 'virtual:highlighted-snippets/docs/*' {
  const snippets: import('../code-snippets').HighlightedSnippets
  export default snippets
}

declare module 'virtual:docs-search' {
  const search: import('../docs-search').DocsSearch
  export default search
}
