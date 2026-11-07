import { ExampleRail } from './example-rail'
import { javascriptUsageCode } from './gallery'
import { ProductFeatures } from './product-features'
import { integrationsSection, productPages } from './product-pages'
import { trackSiteEvent } from './site-analytics'
import { CopyButton, CodeTokens, InlineCopy } from './site-components'

import './javascript.css'

export function JavaScriptPage() {
  const { usage } = productPages.javascript
  const { featured, integrations } = integrationsSection
  return (
    <>
      <ExampleRail kind="javascript" />
      <ProductFeatures page="javascript" />

      <section className="guide-section" id="usage" aria-labelledby="usage-title">
        <div className="guide-heading">
          <div>
            <h2 id="usage-title" tabIndex={-1}>
              {usage.title}
            </h2>
            <p>
              <InlineCopy copy={usage.description} />
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
          <InlineCopy copy={usage.note} />{' '}
          <a href={usage.link.href}>
            {usage.link.label} <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>
      <section className="integration-section" aria-labelledby="integrations-title">
        <div className="section-heading integration-heading">
          <div>
            <h2 id="integrations-title">{integrationsSection.title}</h2>
            <p>{integrationsSection.description}</p>
          </div>
        </div>
        <a className="integration-card featured-integration" href={featured.href}>
          <span className="integration-symbol" aria-hidden="true">
            <span className="shadcn-mark"></span>
          </span>
          <div>
            <span className="integration-tag">{featured.tag}</span>
            <h3>{featured.title}</h3>
            <p>{featured.description}</p>
            <span className="integration-action">
              {featured.action} <span aria-hidden="true">→</span>
            </span>
          </div>
        </a>
        <div className="integration-grid">
          {integrations.map(integration => (
            <a key={integration.href} className="integration-card" href={integration.href}>
              <span className="stack-name">{integration.name}</span>
              <span>{integration.description}</span>
              <span className="card-arrow" aria-hidden="true">
                →
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}
