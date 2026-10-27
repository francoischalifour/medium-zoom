import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { App } from './App'
import { DocsPage } from './docs/DocsPage'
import { NotFoundPage } from './NotFoundPage'
import { initSiteAnalytics } from './site-analytics'
import { getSitePage } from './site-data'

export function hydrateSite() {
  initSiteAnalytics()

  const root = document.getElementById('root')!
  const page = getSitePage(location.pathname) ?? 'javascript'
  const app = (
    <StrictMode>
      {document.documentElement.dataset.page === 'not-found' ? (
        <NotFoundPage />
      ) : page === 'docs' ? (
        <DocsPage path={location.pathname.replace(/\/?$/, '/')} />
      ) : (
        <App page={page} />
      )}
    </StrictMode>
  )
  // Attach handlers before the bootstrap replays queued interactions.
  flushSync(() => {
    if (root.hasChildNodes()) {
      hydrateRoot(root, app)
    } else {
      createRoot(root).render(app)
    }
  })
}
