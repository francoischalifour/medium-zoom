import { ExampleRail } from './example-rail'
import { ProductFeatures } from './product-features'
import { imageZoomApi, productPages } from './product-pages'
import { InlineCopy } from './site-components'
import { UsageExamples } from './usage-examples'

export function ReactPage() {
  const { usage } = productPages.react
  return (
    <>
      <ExampleRail />

      <ProductFeatures page="react" />

      <section className="guide-section" id="usage" aria-labelledby="usage-title">
        <div className="guide-heading">
          <div>
            <h2 id="usage-title" tabIndex={-1}>
              {usage.title}
            </h2>
            <p>{usage.description}</p>
          </div>
        </div>
        <UsageExamples />
      </section>

      <section className="api-section" aria-labelledby="api-title">
        <div className="section-heading">
          <h2 id="api-title">{imageZoomApi.title}</h2>
          <p>
            <InlineCopy copy={imageZoomApi.description} />
          </p>
        </div>
        <div className="api-table-scroll" role="region" aria-label="ImageZoom props" tabIndex={0}>
          <table>
            <caption className="sr-only">ImageZoom component props</caption>
            <thead>
              <tr>
                <th>Prop</th>
                <th>What it does</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {imageZoomApi.props.map(prop => (
                <tr key={prop.name}>
                  <td>
                    <code>{prop.name}</code>
                  </td>
                  <td>{prop.description}</td>
                  <td>
                    <InlineCopy copy={prop.default} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="guide-note">
          <InlineCopy copy={usage.note} />{' '}
          <a href={usage.link.href}>
            {usage.link.label} <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>
    </>
  )
}
