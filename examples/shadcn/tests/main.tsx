import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { CompoundFixture } from './CompoundFixture'
import { Fixture } from './Fixture'

import './style.css'

const Page = new URLSearchParams(location.search).has('compound')
  ? () => <CompoundFixture initiallyOpen={new URLSearchParams(location.search).has('open')} />
  : Fixture

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <Page />
  </StrictMode>
)
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
