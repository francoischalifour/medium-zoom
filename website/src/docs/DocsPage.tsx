import { Children, isValidElement, type ReactNode } from 'react'
import { SiteHeader, SiteFooter, SectionLinks } from '../site-shell'
import { docsPages, headingId } from './pages'
import * as Overview from './overview.mdx'
import * as JavaScriptQuickstart from './javascript-quickstart.mdx'
import * as ReactQuickstart from './react-quickstart.mdx'
import * as HDImages from './hd-images.mdx'
import * as Galleries from './galleries.mdx'
import * as Styling from './styling.mdx'
import * as CustomReactTriggers from './custom-react-triggers.mdx'
import * as ControlledState from './controlled-state.mdx'
import * as ServerRendering from './server-rendering.mdx'
import * as JavaScriptAPI from './javascript-api.mdx'
import * as Options from './options.mdx'
import * as Methods from './methods.mdx'
import * as Events from './events.mdx'
import * as ImageZoom from './image-zoom.mdx'
import * as CompositionAPI from './composition-api.mdx'
import { CodeFence } from './doc-components'
import './docs.css'

const pageContent = {
  '/docs/': Overview,
  '/docs/javascript/': JavaScriptQuickstart,
  '/docs/react/': ReactQuickstart,
  '/docs/guides/hd-images/': HDImages,
  '/docs/guides/galleries/': Galleries,
  '/docs/guides/styling/': Styling,
  '/docs/guides/custom-react-triggers/': CustomReactTriggers,
  '/docs/guides/controlled-state/': ControlledState,
  '/docs/guides/server-rendering/': ServerRendering,
  '/docs/reference/javascript/medium-zoom/': JavaScriptAPI,
  '/docs/reference/javascript/options/': Options,
  '/docs/reference/javascript/methods/': Methods,
  '/docs/reference/javascript/events/': Events,
  '/docs/reference/react/image-zoom/': ImageZoom,
  '/docs/reference/react/composition/': CompositionAPI,
} satisfies Record<(typeof docsPages)[number]['path'], typeof Overview>

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
  const page = docsPages.find(page => page.path === path)
  if (!page) throw new Error(`Unknown documentation page: ${path}`)
  const { default: Content, outline } = pageContent[page.path]
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
    <nav aria-label="On this page">
      <p>On this page</p>
      {outline.map(item => (
        <a key={item.id} href={`#${item.id}`}>
          {item.title}
        </a>
      ))}
    </nav>
  )
  return (
    <div className={`site-shell docs-shell${isOverview ? ' docs-overview' : ''}`}>
      <SiteHeader
        page="docs"
        reactContext={page.group.includes('React') || page.path === '/docs/react/'}
      />
      <noscript>
        <style>
          {
            '.docs-example-code[hidden] { display: block !important; } .docs-example [role=tablist] { display: none; }'
          }
        </style>
      </noscript>
      <div className="docs-mobile-navigation">
        <nav className="section-links" aria-label="Product navigation">
          <SectionLinks page="docs" />
        </nav>
        <details>
          <summary>Documentation</summary>
          {navigation}
        </details>
        {!isOverview && (
          <details>
            <summary>On this page</summary>
            {contents}
          </details>
        )}
      </div>
      <div className="docs-layout">
        <div className="docs-sidebar">{navigation}</div>
        <main id="main" className="docs-main">
          <article className="docs-article">
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
        {!isOverview && <div className="docs-outline">{contents}</div>}
      </div>
      <SiteFooter />
    </div>
  )
}
