import type { DocspotPageActionsProps, DocspotPreviewProps } from 'docspot'
import * as React from 'react'

// Scoped to `.docs-*`, so product pages can load it with the preview.
import './docs/docs.css'

// Prerendered pages already hold the article with highlighted code, so the preview shows the page
// exactly as it reads, from the same cached response the browser uses to open it.
const articles = new Map<string, Promise<string | null>>()

// Parts of the article that only work on the page itself.
const pageOnly = [
  'script',
  'style',
  'button',
  'dialog',
  'iframe',
  '.docs-breadcrumb',
  '.docs-anchor',
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
  for (const element of article.querySelectorAll(pageOnly)) {
    element.remove()
  }
  // The page under the dialog keeps its ids; Docspot opens the preview at `data-docspot-anchor`.
  for (const element of article.querySelectorAll('[id]')) {
    element.setAttribute('data-docspot-anchor', element.id)
    element.removeAttribute('id')
  }
  for (const element of article.querySelectorAll('[aria-controls], [aria-labelledby], [aria-describedby]')) {
    element.removeAttribute('aria-controls')
    element.removeAttribute('aria-labelledby')
    element.removeAttribute('aria-describedby')
  }
  for (const image of article.querySelectorAll('img')) {
    image.loading = 'lazy'
    image.decoding = 'async'
  }
  return article.innerHTML
}

function loadArticle(url: string) {
  const path = new URL(url, window.location.href).pathname
  let article = articles.get(path)
  if (!article) {
    article = fetch(path, { credentials: 'same-origin' })
      .then(response => (response.ok ? response.text() : null))
      .then(html => (html ? extractArticle(html) : null))
      .catch(() => null)
    articles.set(path, article)
    // A failed load retries the next time the result is previewed.
    void article.then(value => {
      if (value === null) {
        articles.delete(path)
      }
    })
  }
  return article
}

export default function SearchPreview({ result }: DocspotPreviewProps) {
  const article = React.use(loadArticle(result.url))
  if (!article) {
    // Pages served without prerendering, as in development, preview their matched passage.
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

// Matches build/site-markdown.ts, which runs in Node and stays out of the browser bundle.
function markdownPath(path: string) {
  return path === '/' ? '/index.md' : path.replace(/\/?$/, '.md')
}

function copyMarkdown(path: string) {
  const markdown = fetch(markdownPath(path)).then(response => {
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.blob()
  })
  // A pending ClipboardItem keeps the click's user activation in Safari while the page loads.
  if (typeof ClipboardItem === 'function' && navigator.clipboard.write) {
    return navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': markdown.then(
          blob => new Blob([blob], { type: 'text/plain' })
        ),
      }),
    ])
  }
  return markdown
    .then(blob => blob.text())
    .then(text => navigator.clipboard.writeText(text))
}

export function PageActions({ result, notify }: DocspotPageActionsProps) {
  return (
    <button
      type="button"
      className="docspot-button docspot-button-ghost"
      onClick={() => {
        copyMarkdown(new URL(result.url, window.location.href).pathname).then(
          () => notify('Page copied as Markdown'),
          () => notify('Couldn’t copy the page')
        )
      }}
    >
      Copy Markdown
    </button>
  )
}
