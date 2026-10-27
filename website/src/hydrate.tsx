import { StrictMode, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { App } from './App'
import { NotFoundPage } from './NotFoundPage'
import { initSiteAnalytics } from './site-analytics'
import { getSitePage } from './site-data'

export async function hydrateSite() {
  initSiteAnalytics()

  const root = document.getElementById('root')!
  const page = getSitePage(location.pathname) ?? 'javascript'
  let content: ReactNode
  // Product pages do not need the documentation articles and their live examples.
  if (document.documentElement.dataset.page === 'not-found') {
    content = <NotFoundPage />
  } else if (page === 'docs') {
    const { DocsPage } = await import('./docs/DocsPage')
    content = <DocsPage path={location.pathname.replace(/\/?$/, '/')} />
  } else {
    content = <App page={page} />
  }
  const app = <StrictMode>{content}</StrictMode>
  // Attach handlers before the bootstrap replays queued interactions.
  flushSync(() => {
    if (root.hasChildNodes()) {
      hydrateRoot(root, app)
    } else {
      createRoot(root).render(app)
    }
  })
}
