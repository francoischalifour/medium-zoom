import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { DocsPage, loadDocsArticle } from '../src/docs/DocsPage'

export async function renderDocsPreview(path: string) {
  const article = await loadDocsArticle(path)
  return renderToStaticMarkup(
    createElement(DocsPage, { path, article, searchPreview: true })
  )
}
