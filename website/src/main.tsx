import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { App } from './App'
import { DocsPage } from './docs/DocsPage'
import { initSiteAnalytics } from './site-analytics'
import { getSitePage } from './site-data'

import './site.css'

initSiteAnalytics()

const root = document.getElementById('root')!
const page = getSitePage(location.pathname) ?? 'javascript'
const app = (
  <StrictMode>
    {page === 'docs' ? (
      <DocsPage path={location.pathname.replace(/\/?$/, '/')} />
    ) : (
      <App page={page} />
    )}
  </StrictMode>
)
if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
