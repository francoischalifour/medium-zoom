import { Icon } from './site-components'
import { ExampleRail } from './example-rail'
import { UsageExamples } from './usage-examples'
import { repositoryUrl } from './site-data'

export function ReactPage() {
  return (
    <>
      <ExampleRail />

      <section className="details-strip" aria-label="Component features">
        <div>
          <Icon name="code" />
          <h2>Yours to change.</h2>
          <p>The source lives in your project.</p>
        </div>
        <div>
          <Icon name="keyboard" />
          <h2>Keyboard included.</h2>
          <p>Enter or Space to open. Escape to close.</p>
        </div>
        <div>
          <Icon name="sun" />
          <h2>Follows your theme.</h2>
          <p>An overlay that matches your background.</p>
        </div>
      </section>

      <section className="guide-section" id="usage" aria-labelledby="usage-title">
        <div className="guide-heading">
          <div>
            <h2 id="usage-title" tabIndex={-1}>
              Add zoom to an image.
            </h2>
            <p>Use it like an image. Add your source, alt text, and styles.</p>
          </div>
        </div>
        <UsageExamples />
      </section>

      <section className="api-section" aria-labelledby="api-title">
        <div className="section-heading">
          <h2 id="api-title">Small API. Sensible defaults.</h2>
          <p>
            Pass image attributes and zoom options to <code>ImageZoom</code>. Compose its parts for
            custom layouts.
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
              <tr>
                <td>
                  <code>options.margin</code>
                </td>
                <td>Space around the zoomed image.</td>
                <td>
                  <code>24</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>options.background</code>
                </td>
                <td>Overlay color, resolved from your theme.</td>
                <td>
                  <code>--background</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>data-zoom-src</code>
                </td>
                <td>A higher-resolution source to open.</td>
                <td>Original image</td>
              </tr>
              <tr>
                <td>
                  <code>open</code>
                </td>
                <td>Control whether the image is zoomed.</td>
                <td>Internal state</td>
              </tr>
              <tr>
                <td>
                  <code>onOpenChange</code>
                </td>
                <td>Set the next open value when controlling state.</td>
                <td>—</td>
              </tr>
              <tr>
                <td>
                  <code>disabled</code>
                </td>
                <td>Disable zoom; keep the image visible.</td>
                <td>
                  <code>false</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="guide-note">
          Image attributes and the forwarded ref reach the underlying <code>&lt;img&gt;</code>.{' '}
          <a href={`${repositoryUrl}#options`}>
            Explore all zoom options <span aria-hidden="true">↗</span>
          </a>
        </p>
      </section>
    </>
  )
}
