import mediumZoom, { type Zoom } from 'medium-zoom'
import * as React from 'react'

import { CopyButton, HighlightedCode, ZoomControls } from '../site-components'
import { TabList } from '../site-tabs'
import { docsPages } from './pages'
import { supportedBrowsers } from './supported-browsers'

export function DocCode({ code, title = 'Example' }: { code: string; title?: string }) {
  const snippet = code.trim()
  const isSingleLine = !snippet.includes('\n')
  const copyButton = <CopyButton text={snippet} label={`Copy ${title}`} />
  return (
    <div className="code-block docs-code">
      <div className="code-caption">
        <span>{title}</span>
        {!isSingleLine && copyButton}
      </div>
      {isSingleLine ? (
        <div className="code-row">
          <HighlightedCode code={snippet} />
          {copyButton}
        </div>
      ) : (
        <HighlightedCode code={snippet} />
      )}
    </div>
  )
}

export function CodeFence({
  children,
}: {
  children: React.ReactElement<{ children: string; className?: string }>
}) {
  return (
    <DocCode
      code={children.props.children}
      title={children.props.className?.replace('language-', '') || 'Example'}
    />
  )
}

export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-preview">
      {children}
      <div className="docs-preview-hint">
        <ZoomControls />
      </div>
    </div>
  )
}

export function Example({
  children,
  code,
  title,
  styles,
}: {
  children: React.ReactNode
  code: string
  title: string
  styles?: { code: string; title: string }
}) {
  const [tab, setTab] = React.useState<'preview' | 'code'>('preview')
  const id = React.useId()
  return (
    <div className="docs-example">
      <div className="demo-toolbar">
        <TabList
          id={id}
          label={`${title} view`}
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'preview', label: 'Preview' },
            { value: 'code', label: 'Code' },
          ]}
        />
        <span className="example-kind">{title}</span>
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
        <div hidden={tab !== 'preview'}>
          <Preview>{children}</Preview>
        </div>
        <div className="docs-example-code" hidden={tab !== 'code'}>
          <DocCode code={code} title={title} />
          {styles && <DocCode code={styles.code} title={styles.title} />}
        </div>
      </div>
    </div>
  )
}

export function PropertyMeta({ type, defaultValue }: { type: string; defaultValue?: string }) {
  return (
    <dl className="docs-property-meta">
      <div>
        <dt>Type</dt>
        <dd>
          <code>{type}</code>
        </dd>
      </div>
      {defaultValue !== undefined && (
        <div>
          <dt>Default</dt>
          <dd>
            <code>{defaultValue}</code>
          </dd>
        </div>
      )}
    </dl>
  )
}

export function Prop({
  name,
  type,
  defaultValue,
  required,
  children,
}: {
  name: string
  type: string
  defaultValue?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="docs-prop">
      <div className="docs-prop-heading">
        <h3>
          <code>{name}</code>
        </h3>
        {required && <span>Required</span>}
      </div>
      <div className="docs-prop-description">{children}</div>
      <PropertyMeta type={type} defaultValue={defaultValue} />
    </div>
  )
}

// The quickstart's live result; the props match the image markup the page shows.
export function JavaScriptPreview({
  src,
  alt,
  width,
  height,
  label,
}: {
  src: string
  alt: string
  width: number
  height: number
  label: string
}) {
  const imageRef = React.useRef<HTMLImageElement>(null)
  const zoomRef = React.useRef<Zoom | null>(null)
  React.useEffect(() => {
    const zoom = mediumZoom(imageRef.current!)
    zoomRef.current = zoom
    return () => {
      zoomRef.current = null
      if (zoom.getZoomedImage()) {
        zoom.on('closed', () => zoom.detach(), { once: true })
        void zoom.close()
      } else {
        zoom.detach()
      }
    }
  }, [])
  return (
    <Preview>
      <button
        type="button"
        aria-label={label}
        onClick={event => {
          // Image clicks already reach medium-zoom's delegated listener.
          if (event.target === event.currentTarget) {
            void zoomRef.current?.open()
          }
        }}
      >
        <img ref={imageRef} src={src} alt={alt} width={width} height={height} />
      </button>
    </Preview>
  )
}

type DocsPath = (typeof docsPages)[number]['path']

export function RelatedPages({ pages }: { pages: readonly DocsPath[] }) {
  return (
    <nav aria-label="Related pages">
      <ul className="docs-related-pages">
        {pages.map(path => {
          const page = docsPages.find(page => page.path === path)!
          return (
            <li key={path}>
              <a href={path}>{page.title}</a>
              <span>{page.summary}</span>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Cards linking to the quickstarts; each card's children describe when to choose it.
export function EntryPoints({ children }: { children: React.ReactNode }) {
  return (
    <nav className="docs-entry-points" aria-label="Choose your setup">
      {children}
    </nav>
  )
}

export function EntryPoint({ path, children }: { path: DocsPath; children: React.ReactNode }) {
  return (
    <a href={path}>
      <strong>{docsPages.find(page => page.path === path)!.title}</strong>
      <span>{children}</span>
    </a>
  )
}

// Columns of reference links; each group's children are its links.
export function ReferenceLinks({ children }: { children: React.ReactNode }) {
  return <div className="docs-reference-links">{children}</div>
}

export function ReferenceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function BrowserSupport() {
  return (
    <dl className="docs-browser-support" aria-label="Minimum browser versions">
      {supportedBrowsers.map(browser => (
        <div key={browser.name}>
          <dt>{browser.name}</dt>
          <dd>{browser.version}+</dd>
        </div>
      ))}
    </dl>
  )
}
