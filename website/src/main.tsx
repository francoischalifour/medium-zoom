import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { DocsPage } from './docs/DocsPage'
import { initSiteAnalytics } from './site-analytics'
import './site.css'

initSiteAnalytics()

const root = document.getElementById('root')!
const page = location.pathname.startsWith('/examples/shadcn') ? 'shadcn' : 'library'
const app = (
  <StrictMode>
    {location.pathname.startsWith('/docs') ? (
      <DocsPage path={location.pathname.replace(/\/?$/, '/')} />
    ) : (
      <App page={page} />
    )}
  </StrictMode>
)
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
