import { Icon, CopyButton, CodeTokens } from './site-components'
import { ExampleRail } from './example-rail'
import { javascriptUsageCode } from './gallery'
import { trackSiteEvent } from './site-analytics'
import './javascript.css'

export function JavaScriptPage() {
  return (
    <>
      <ExampleRail kind="javascript" />
      <section className="details-strip" aria-label="Library features">
        <div>
          <Icon name="code" />
          <h2>Zero dependencies.</h2>
          <p>A small library. Nothing else to install.</p>
        </div>
        <div>
          <Icon name="layers" />
          <h2>Any framework.</h2>
          <p>Use it with React, Vue, Svelte, or plain HTML.</p>
        </div>
        <div>
          <Icon name="image" />
          <h2>High-resolution ready.</h2>
          <p>Load high-resolution images on zoom.</p>
        </div>
      </section>

      <section className="guide-section" id="usage" aria-labelledby="usage-title">
        <div className="guide-heading">
          <div>
            <h2 id="usage-title" tabIndex={-1}>
              Pick your images.
            </h2>
            <p>
              Add <code>data-zoomable</code> to your images, then attach the zoom. Styles come
              included.
            </p>
          </div>
        </div>
        <div className="code-block">
          <div className="code-caption">
            <span>app.js</span>
            <CopyButton
              text={javascriptUsageCode}
              label="Copy usage code"
              onCopied={() => trackSiteEvent('Code Copied', { snippet: 'usage' })}
            />
          </div>
          <pre tabIndex={0}>
            <code id="usage-code">
              <CodeTokens code={javascriptUsageCode} />
            </code>
          </pre>
        </div>
        <p className="guide-note">
          Set the spacing, match your background, or load a sharper image on zoom.{' '}
          <a href="/docs/reference/javascript/medium-zoom/">Read the API reference</a>
        </p>
      </section>
      <section className="integration-section" aria-labelledby="integrations-title">
        <div className="section-heading integration-heading">
          <div>
            <h2 id="integrations-title">Start with your stack.</h2>
            <p>The same zoom, wherever you build.</p>
          </div>
        </div>
        <a className="integration-card featured-integration" href="/examples/shadcn/">
          <span className="integration-symbol" aria-hidden="true">
            <span className="shadcn-mark"></span>
          </span>
          <div>
            <span className="integration-tag">React + TypeScript</span>
            <h3>A component you own.</h3>
            <p>Install with the shadcn CLI. Own the source. Match your theme.</p>
            <span className="integration-action">
              Explore shadcn/ui <span aria-hidden="true">→</span>
            </span>
          </div>
        </a>
        <div className="integration-grid">
          <a className="integration-card" href="/examples/react/">
            <span className="stack-name">React</span>
            <span>Attach zoom with a component.</span>
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="integration-card" href="/examples/vue/">
            <span className="stack-name">Vue</span>
            <span>Wrap an image in a component.</span>
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="integration-card" href="/examples/svelte/">
            <span className="stack-name">Svelte</span>
            <span>Wrap an image in a component.</span>
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="integration-card" href="/examples/vanilla/">
            <span className="stack-name">JavaScript</span>
            <span>Attach zoom with a selector.</span>
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </section>
    </>
  )
}
