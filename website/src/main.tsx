import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import './site.css'

const root = document.getElementById('root')!
const page = location.pathname.startsWith('/examples/shadcn') ? 'shadcn' : 'library'
const app = (
  <StrictMode>
    <App page={page} />
  </StrictMode>
)
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
