import * as React from 'react'
import { Icon } from './site-components'
import { JavaScriptIcon, ReactIcon } from './technology-icons'
import { githubStars, githubStarLabel, repositoryUrl, type SitePage } from './site-data'
import { getTheme, getServerTheme, setTheme, subscribeTheme } from './site-theme'

const siteSections = [
  {
    page: 'javascript',
    href: '/',
    label: 'JavaScript',
    title: 'JavaScript',
    mark: <JavaScriptIcon className="documentation-mark" />,
  },
  {
    page: 'react',
    href: '/react',
    label: 'React',
    title: 'React',
    mark: <ReactIcon className="documentation-mark" />,
  },
  {
    page: 'docs',
    href: '/docs/',
    label: 'Docs',
    title: 'Documentation',
    mark: <Icon name="book" className="documentation-mark" />,
  },
] as const

export function SectionLinks({ page }: { page: SitePage | 'docs' }) {
  return (
    <>
      {siteSections.map(({ page: section, href, label, mark }) => (
        <a key={href} href={href} aria-current={page === section ? 'page' : undefined}>
          {mark}
          {label}
        </a>
      ))}
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

export function SiteFooter({ page }: { page: SitePage | 'docs' }) {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <a className="brand footer-brand" href="/">
          <img src="/brand/mark.svg" width="24" height="24" alt="" />
          medium-zoom
        </a>
        <p className="footer-description">Image zoom for the web.</p>
        <p className="footer-credit">
          By <a href="https://francoischalifour.com">François Chalifour</a>
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <div className="footer-nav-group">
          <p>Explore</p>
          <ul>
            {siteSections.map(({ page: section, href, title }) => (
              <li key={href}>
                <a href={href} aria-current={page === section ? 'page' : undefined}>
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-nav-group">
          <p>Project</p>
          <ul>
            <li>
              <a href={repositoryUrl}>GitHub</a>
            </li>
            <li>
              <a href={`${repositoryUrl}/blob/main/CHANGELOG.md`}>Changelog</a>
            </li>
            <li>
              <a href={`${repositoryUrl}/blob/main/LICENSE`}>MIT license</a>
            </li>
          </ul>
        </div>
      </nav>
    </footer>
  )
}
