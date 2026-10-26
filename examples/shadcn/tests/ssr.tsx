import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { Fixture } from './Fixture'
import { CompoundFixture } from './CompoundFixture'

const Page = process.argv.includes('--compound') ? CompoundFixture : Fixture

// Run in a fresh process without browser globals; this markup is also hydrated in Playwright.
process.stdout.write(
  renderToString(
    <StrictMode>
      <Page />
    </StrictMode>
  )
)
