import * as React from 'react'

import { AnalyticsPreferences } from './analytics-preferences'
import { CommandPalette } from './command-palette'
import { Icon, SiteLink } from './site-components'
import { githubStars, githubStarLabel, repositoryUrl, type SitePage } from './site-data'
import { getTheme, getServerTheme, setTheme, subscribeTheme } from './site-theme'
import { JavaScriptIcon, ReactIcon } from './technology-icons'

const siteSections = [
  {
    id: 'javascript',
    href: '/',
    label: 'JavaScript',
    footerLabel: 'JavaScript',
    icon: <JavaScriptIcon className="documentation-mark" />,
  },
  {
    id: 'react',
    href: '/react',
    label: 'React',
    footerLabel: 'React',
    icon: <ReactIcon className="documentation-mark" />,
  },
  {
    id: 'docs',
    href: '/docs/',
    label: 'Docs',
    footerLabel: 'Documentation',
    icon: <Icon name="book" className="documentation-mark" />,
  },
] as const

export function SectionLinks({ page }: { page?: SitePage | 'docs' }) {
  return (
    <>
      {siteSections.map(({ id, href, label, icon }) => (
        <SiteLink key={href} href={href} aria-current={page === id ? 'page' : undefined}>
          {icon}
          {label}
        </SiteLink>
      ))}
    </>
  )
}

export function SiteHeader({
  page,
  searchFramework = page === 'react' ? 'react' : 'javascript',
}: {
  page?: SitePage | 'docs'
  searchFramework?: SitePage
}) {
  const dark = React.useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  return (
    <>
      <SiteLink className="skip-link" href="#main">
        Skip to content
      </SiteLink>
      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <SiteLink className="brand" href="/" aria-label="medium-zoom home">
            <img className="brand-mark" src="/brand/mark.svg" alt="" width="24" height="24" />
            <span className="brand-name">medium-zoom</span>
          </SiteLink>
          <div className="section-links">
            <SectionLinks page={page} />
          </div>
          <div className="nav-links">
            <CommandPalette framework={searchFramework} />
            <SiteLink
              className="button button-ghost github-link"
              href={repositoryUrl}
              externalIcon={false}
              aria-label={`GitHub repository, ${githubStarLabel} stars`}
              title={`${githubStars.toLocaleString('en')} stars on GitHub`}
            >
              <Icon name="github" />
              <span>{githubStarLabel}</span>
            </SiteLink>
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

export function SiteFooter({ page }: { page?: SitePage | 'docs' }) {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <SiteLink className="brand footer-brand" href="/">
          <img src="/brand/mark.svg" width="24" height="24" alt="" />
          medium-zoom
        </SiteLink>
        <p>Image zoom inspired by Medium. Since 2016.</p>
        <p className="footer-credit">
          By{' '}
          <SiteLink href="https://francoischalifour.com" externalIcon={false}>
            François Chalifour
          </SiteLink>
          {' · '}
          <SiteLink href={`https://www.npmjs.com/package/medium-zoom/v/${__MEDIUM_ZOOM_VERSION__}`}>
            v{__MEDIUM_ZOOM_VERSION__}
          </SiteLink>
        </p>
        <AnalyticsPreferences />
      </div>
      <nav aria-label="Footer navigation">
        <div className="footer-nav-group">
          <p>Explore</p>
          <ul>
            {siteSections.map(({ id, href, footerLabel }) => (
              <li key={href}>
                <SiteLink href={href} aria-current={page === id ? 'page' : undefined}>
                  {footerLabel}
                </SiteLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-nav-group">
          <p>Project</p>
          <ul>
            <li>
              <SiteLink href={repositoryUrl}>GitHub</SiteLink>
            </li>
            <li>
              <SiteLink href={`${repositoryUrl}/blob/main/CHANGELOG.md`}>Changelog</SiteLink>
            </li>
            <li>
              <SiteLink href={`${repositoryUrl}/blob/main/LICENSE`}>MIT license</SiteLink>
            </li>
          </ul>
        </div>
      </nav>
    </footer>
  )
}
