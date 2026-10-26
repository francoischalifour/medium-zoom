import * as React from 'react'
import { Icon } from './site-components'
import { githubStars, githubStarLabel, repositoryUrl, type SitePage } from './site-data'
import { getTheme, getServerTheme, setTheme, subscribeTheme } from './site-theme'

export function SectionLinks({ page }: { page: SitePage | 'docs' }) {
  return (
    <>
      <a href="/" aria-current={page === 'library' ? 'page' : undefined}>
        <span className="library-mark" aria-hidden="true" />
        JavaScript
      </a>
      <a href="/examples/shadcn/" aria-current={page === 'shadcn' ? 'page' : undefined}>
        <span className="shadcn-mark" aria-hidden="true" />
        React
      </a>
      <a href="/docs/" aria-current={page === 'docs' ? 'page' : undefined}>
        <Icon name="book" className="documentation-mark" />
        Docs
      </a>
    </>
  )
}

export function SiteHeader({ page }: { page: SitePage | 'docs' }) {
  const dark = React.useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <a className="brand" href="/" aria-label="medium-zoom home">
            <img className="brand-mark" src="/brand/mark.svg" alt="" width="24" height="24" />
            <span className="brand-name">medium-zoom</span>
          </a>
          <div className="section-links">
            <SectionLinks page={page} />
          </div>
          <div className="nav-links">
            <a
              className="button button-ghost github-link"
              href={repositoryUrl}
              aria-label={`GitHub repository, ${githubStarLabel} stars`}
              title={`${githubStars.toLocaleString('en')} stars on GitHub`}
            >
              <Icon name="github" />
              <span>{githubStarLabel}</span>
            </a>
            <button
              className="icon-button"
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => setTheme(!dark)}
            >
              <Icon name="contrast" />
            </button>
          </div>
        </nav>
      </header>
    </>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <a className="brand footer-brand" href="/">
          <img src="/brand/mark.svg" width="20" height="20" alt="" />
          medium-zoom
        </a>
        <p>
          By <a href="https://francoischalifour.com">François Chalifour</a>
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/docs/">Documentation</a>
        <a href={`${repositoryUrl}/blob/main/LICENSE`}>MIT license</a>
        <a href={repositoryUrl}>GitHub</a>
      </nav>
    </footer>
  )
}
