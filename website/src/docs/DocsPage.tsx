import { Children, isValidElement, type ReactNode } from 'react'
import { SiteHeader, SiteFooter, SectionLinks } from '../site-shell'
import { docsPages, headingId } from './pages'
import { CodeFence } from './doc-components'
import { useDocsNavigation } from './use-docs-navigation'
import { ScrollArea } from '../scroll-area'
import './docs.css'

const pageContent = import.meta.glob<typeof import('./overview.mdx')>('./*.mdx', { eager: true })

function getHeadingText(children: ReactNode): string {
  return Children.toArray(children)
    .map(child => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
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

export function DocsPage({ path }: { path: string }) {
  const { articleRef, activeHeadingId } = useDocsNavigation(path)
  const page = docsPages.find(page => page.path === path)
  if (!page) throw new Error(`Unknown documentation page: ${path}`)
  const { default: Content, outline } = pageContent[`./${page.source}`]
  const isOverview = page.path === '/docs/'
  const isReference = page.group === 'JavaScript reference' || page.group === 'React reference'
  const related = docsPages.filter(item => item.group === page.group && item.path !== path)
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
  const contents = (
    <nav className="docs-contents" aria-label="On this page">
      <p className="docs-contents-title">On this page</p>
      {outline.map(item => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={activeHeadingId === item.id ? 'location' : undefined}
        >
          {item.title}
        </a>
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
            {!isOverview && (
              <details>
                <summary>On this page</summary>
                <ScrollArea>{contents}</ScrollArea>
              </details>
            )}
          </div>
          <article ref={articleRef} className="docs-article">
            <header className="docs-heading">
              <p>{page.group}</p>
              <h1>{page.title}</h1>
            </header>
            {isReference && (
              <nav className="docs-api-index" aria-label="API index">
                {outline.map(item => (
                  <a key={item.id} href={`#${item.id}`}>
                    {item.title}
                  </a>
                ))}
              </nav>
            )}
            <Content components={{ h2: ArticleHeading, pre: CodeFence }} />
          </article>
          {isReference && (
            <nav className="docs-related" aria-label="Related reference">
              <p>Related reference</p>
              <div>
                {related.map(item => (
                  <a key={item.path} href={item.path}>
                    {item.title}
                  </a>
                ))}
              </div>
            </nav>
          )}
        </main>
        {!isOverview && <ScrollArea className="docs-outline">{contents}</ScrollArea>}
      </div>
      <SiteFooter page="docs" />
    </div>
  )
}
