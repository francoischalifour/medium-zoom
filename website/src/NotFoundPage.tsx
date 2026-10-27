import { SiteHeader, SiteFooter } from './site-shell'
import { JavaScriptIcon, ReactIcon } from './technology-icons'

import './not-found.css'

export function NotFoundPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="page-content" id="main">
        <section className="hero not-found-hero" aria-labelledby="page-title">
          <span className="eyebrow">404 · Out of frame</span>
          <h1 id="page-title">Page not found.</h1>
          <p>This page may have moved. Search the docs or choose a quickstart.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/docs/?q=">
              Search docs
            </a>
            <a className="button button-secondary" href="/">
              Go home
            </a>
          </div>
        </section>
        <section className="not-found-recovery" aria-labelledby="quickstarts-title">
          <div className="section-heading">
            <h2 id="quickstarts-title">Find your way back.</h2>
            <p>Continue with the JavaScript library or React component.</p>
          </div>
          <div className="not-found-quickstarts">
            <a className="integration-card" href="/docs/javascript/">
              <h3>
                <JavaScriptIcon /> JavaScript
              </h3>
              <p>Add image zoom in a few lines. Use it with any framework.</p>
              <span>
                Read the quickstart <span aria-hidden="true">→</span>
              </span>
            </a>
            <a className="integration-card" href="/docs/react/">
              <h3>
                <ReactIcon /> React
              </h3>
              <p>Install with shadcn/ui and make the component your own.</p>
              <span>
                Read the quickstart <span aria-hidden="true">→</span>
              </span>
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
