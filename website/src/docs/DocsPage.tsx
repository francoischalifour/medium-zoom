import { Children, isValidElement, useEffect, useRef, type ReactNode } from 'react'

import { ScrollArea, revealInScrollArea } from '../scroll-area'
import { Icon, SiteLink } from '../site-components'
import { BrandLink, SiteHeader, SiteFooter } from '../site-shell'
import { CodeFence } from './doc-components'
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

// The sidebar only fits wider screens, so phones open it as a sheet from the breadcrumb.
function DocsNavigationSheet({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button
        type="button"
        className="icon-button docs-sheet-trigger"
        aria-label="Open documentation navigation"
        aria-haspopup="dialog"
        aria-controls="docs-navigation-sheet"
        onClick={() => dialog.current?.showModal()}
      >
        <Icon name="sidebar" />
      </button>
      <dialog
        ref={dialog}
        id="docs-navigation-sheet"
        className="docs-sheet"
        aria-label="Documentation"
        onClick={event => {
          // Close on backdrop clicks and on links that load another page.
          if (event.target === event.currentTarget || (event.target as Element).closest('a')) {
            dialog.current?.close()
          }
        }}
      >
        <div className="docs-sheet-header">
          <BrandLink />
          <button
            type="button"
            className="icon-button"
            aria-label="Close documentation navigation"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <ScrollArea className="docs-sheet-body">{children}</ScrollArea>
      </dialog>
    </>
  )
}

function DocsBreadcrumb({
  page,
  navigation,
  children,
}: {
  page: (typeof docsPages)[number]
  navigation: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="docs-breadcrumb">
      <DocsNavigationSheet>{navigation}</DocsNavigationSheet>
      <nav aria-label="Breadcrumb">
        <ol>
          <li>{page.group}</li>
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

type DocsPageEntry = (typeof docsPages)[number]

const paginationLabels = { prev: 'Previous', next: 'Next' } as const

function DocsPaginationLink({ rel, page }: { rel: 'prev' | 'next'; page: DocsPageEntry }) {
  return (
    <a href={page.path} rel={rel}>
      <span>
        <Icon name="arrow" width={14} height={14} />
        {paginationLabels[rel]}
      </span>
      <strong>{page.title}</strong>
    </a>
  )
}

function DocsPagination({ previous, next }: { previous?: DocsPageEntry; next?: DocsPageEntry }) {
  if (!previous && !next) {
    return null
  }
  return (
    <nav className="docs-pagination" aria-label="Documentation pages">
      {previous && <DocsPaginationLink rel="prev" page={previous} />}
      {next && <DocsPaginationLink rel="next" page={next} />}
    </nav>
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
          <article ref={articleRef} className="docs-article">
            <header className="docs-heading">
              <DocsBreadcrumb page={page} navigation={navigation}>
                {!isOverview && <DocsOutlineMenu outline={outline} activeId={activeHeadingId} />}
              </DocsBreadcrumb>
              <h1>{page.title}</h1>
            </header>
            <Content components={{ h2: ArticleHeading, pre: CodeFence, a: SiteLink }} />
          </article>
          <DocsPagination previous={previous} next={next} />
        </main>
        {!isOverview && (
          <ScrollArea className="docs-outline">
            <DocsOutline outline={outline} activeId={activeHeadingId} />
          </ScrollArea>
        )}
        <SiteFooter page="docs" />
      </div>
    </div>
  )
}
