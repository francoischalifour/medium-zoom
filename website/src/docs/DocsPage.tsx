import { Children, isValidElement, useEffect, type ReactNode } from 'react'

import { ScrollArea, revealInScrollArea } from '../scroll-area'
import { Icon, SiteLink } from '../site-components'
import { SiteHeader, SiteFooter, SectionLinks } from '../site-shell'
import { CodeFence, PageNavigationCards } from './doc-components'
import { DocsOutline, DocsOutlineMenu } from './docs-outline'
import { docsPages, headingId } from './pages'
import { useDocsNavigation } from './use-docs-navigation'

import './docs.css'

const pageContent = import.meta.glob<typeof import('./overview.mdx')>('./*.mdx', { eager: true })

function getHeadingText(children: ReactNode): string {
  return Children.toArray(children)
    .map(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }
      return isValidElement<{ children?: ReactNode }>(child)
        ? getHeadingText(child.props.children)
        : ''
    })
    .join('')
}

function ArticleHeading({ children }: { children: ReactNode }) {
  const id = headingId(getHeadingText(children))
  return (
    <h2 id={id}>
      <a href={`#${id}`}>
        {children}
        <span className="docs-anchor" aria-hidden="true">
          #
        </span>
      </a>
    </h2>
  )
}

function DocsBreadcrumb({
  page,
  children,
}: {
  page: (typeof docsPages)[number]
  children?: ReactNode
}) {
  return (
    <div className="docs-breadcrumb">
      <nav aria-label="Breadcrumb">
        <ol>
          <li>
            <a href="/docs/">Docs</a>
          </li>
          <li>
            <Icon name="chevron" width={12} height={12} />
            {page.group}
          </li>
          <li aria-current="page">
            <Icon name="chevron" width={12} height={12} />
            <span>{page.title}</span>
          </li>
        </ol>
      </nav>
      {children}
    </div>
  )
}

export function DocsPage({ path }: { path: string }) {
  const { articleRef, activeHeadingId } = useDocsNavigation(path)
  // Keep the current page visible in a long sidebar, with its group as context when it fits.
  useEffect(() => {
    const active = document.querySelector('.docs-sidebar [aria-current="page"]')
    if (active) {
      revealInScrollArea(active.closest('.docs-nav-group') ?? active, active)
    }
  }, [path])
  const page = docsPages.find(page => page.path === path)
  if (!page) {
    throw new Error(`Unknown documentation page: ${path}`)
  }
  const { default: Content, outline } = pageContent[`./${page.source}`]
  const isOverview = page.path === '/docs/'
  const index = docsPages.findIndex(item => item.path === path)
  const previous = docsPages[index - 1]
  const next = docsPages[index + 1]
  const navigation = (
    <nav aria-label="Documentation">
      {[...new Set(docsPages.map(item => item.group))].map(group => (
        <div className="docs-nav-group" key={group}>
          <p>{group}</p>
          {docsPages
            .filter(item => item.group === group)
            .map(item => (
              <a
                key={item.path}
                href={item.path}
                aria-current={item.path === path ? 'page' : undefined}
              >
                {item.title}
              </a>
            ))}
        </div>
      ))}
    </nav>
  )
  return (
    <div className={`site-shell docs-shell${isOverview ? ' docs-overview' : ''}`}>
      <SiteHeader
        page="docs"
        searchFramework={
          page.group.includes('React') || page.path === '/docs/react/' ? 'react' : 'javascript'
        }
      />
      <noscript>
        <style>
          {
            '.docs-example-code[hidden] { display: block !important; } .docs-example [role=tablist] { display: none; }'
          }
        </style>
      </noscript>
      <div className="docs-layout">
        <ScrollArea className="docs-sidebar">{navigation}</ScrollArea>
        <main id="main" className="docs-main">
          <div className="docs-mobile-navigation">
            <nav className="section-links" aria-label="Product navigation">
              <SectionLinks page="docs" />
            </nav>
            <details>
              <summary>Documentation</summary>
              <ScrollArea>{navigation}</ScrollArea>
            </details>
          </div>
          <article ref={articleRef} className="docs-article">
            <header className="docs-heading">
              <DocsBreadcrumb page={page}>
                {!isOverview && <DocsOutlineMenu outline={outline} activeId={activeHeadingId} />}
              </DocsBreadcrumb>
              <h1>{page.title}</h1>
            </header>
            <Content components={{ h2: ArticleHeading, pre: CodeFence, a: SiteLink }} />
          </article>
          {(previous || next) && (
            <nav className="docs-pagination" aria-label="Documentation pages">
              <PageNavigationCards
                pages={[
                  ...(previous ? [{ path: previous.path, direction: 'prev' as const }] : []),
                  ...(next ? [{ path: next.path, direction: 'next' as const }] : []),
                ]}
              />
            </nav>
          )}
        </main>
        {!isOverview && (
          <ScrollArea className="docs-outline">
            <DocsOutline outline={outline} activeId={activeHeadingId} />
          </ScrollArea>
        )}
      </div>
      <SiteFooter page="docs" />
    </div>
  )
}
