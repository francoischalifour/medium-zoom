import type { DocspotPreviewProps } from 'docspot'
import * as React from 'react'

const articleRequests = new Map<string, Promise<string | null>>()

// Parts of the article that only work on the page itself.
const pageOnlySelector = [
  'script',
  'style',
  '.copy-control',
  'dialog',
  'iframe',
  '.docs-breadcrumb',
  '.docs-anchor',
  '.docs-preview-hint',
  '.demo-toolbar',
  '[role="tablist"]',
].join(', ')

function extractArticle(html: string) {
  const article = new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('.docs-article')
  if (!article?.querySelector('h1')) {
    return null
  }
  for (const element of article.querySelectorAll(pageOnlySelector)) {
    element.remove()
  }
  for (const button of article.querySelectorAll('button')) {
    if (button.querySelector('img, picture, video')) {
      const media = article.ownerDocument.createElement('div')
      for (const attribute of ['class', 'style', 'data-slot']) {
        const value = button.getAttribute(attribute)
        if (value !== null) {
          media.setAttribute(attribute, value)
        }
      }
      media.append(...button.childNodes)
      button.replaceWith(media)
    } else {
      button.remove()
    }
  }
  // The page under the dialog keeps its ids; Docspot opens the preview at `data-docspot-anchor`.
  for (const element of article.querySelectorAll('[id]')) {
    element.setAttribute('data-docspot-anchor', element.id)
    element.removeAttribute('id')
  }
  for (const element of article.querySelectorAll(
    '[aria-controls], [aria-labelledby], [aria-describedby]'
  )) {
    element.removeAttribute('aria-controls')
    element.removeAttribute('aria-labelledby')
    element.removeAttribute('aria-describedby')
  }
  for (const image of article.querySelectorAll('img')) {
    image.removeAttribute('aria-hidden')
    image.loading = 'lazy'
    image.decoding = 'async'
  }
  return article.innerHTML
}

async function fetchArticle(path: string): Promise<string | null> {
  const previewUrl = import.meta.env.DEV
    ? `${path}?preview`
    : `${path}preview.html`
  try {
    const response = await fetch(previewUrl, { credentials: 'same-origin' })
    if (!response.ok) {
      return null
    }
    return extractArticle(await response.text())
  } catch {
    return null
  }
}

function loadArticle(url: string) {
  const path = new URL(url, window.location.href).pathname
  const cachedRequest = articleRequests.get(path)
  if (cachedRequest) {
    return cachedRequest
  }
  const request = fetchArticle(path)
  articleRequests.set(path, request)
  return request
}

export default function SearchPreview({ result }: DocspotPreviewProps) {
  const article = React.use(loadArticle(result.url))
  if (!article) {
    return (
      <div className="site-search-preview">
        <h2>{result.title}</h2>
        {result.excerpt && <p>{result.excerpt}</p>}
      </div>
    )
  }
  return (
    <div
      className="site-search-preview docs-article"
      // Same-origin, prerendered from this repository's MDX, with scripts removed.
      dangerouslySetInnerHTML={{ __html: article }}
    />
  )
}
