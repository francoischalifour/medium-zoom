import { InstallCommand } from './install-command'
import { ProductLinks } from './site-shell'
import { Icon } from './site-components'
import { registryUrl } from './install-commands'
import type { SitePage } from './site-data'

export function Hero({ page }: { page: SitePage }) {
  const shadcn = page === 'shadcn'
  return (
    <section className="hero" aria-labelledby="page-title">
      <nav className="section-links mobile-section-links" aria-label="Product navigation">
        <ProductLinks page={page} />
      </nav>
      <span className="eyebrow">
        {shadcn && <span className="shadcn-mark" aria-hidden="true" />}
        {shadcn ? 'Image zoom for shadcn/ui' : 'Image zoom for the web. Since 2016.'}
      </span>
      <h1 id="page-title">
        Your images,
        <br />
        <span>a little closer.</span>
      </h1>
      <p>
        {shadcn
          ? 'Medium-style image zoom for React.'
          : 'Medium-style image zoom in a few lines of JavaScript.'}
        <br />
        {shadcn
          ? 'Install with shadcn/ui. Keep the source.'
          : 'No dependencies. Works with any framework.'}
      </p>
      <div className="hero-actions">
        <a className="button button-primary" href="#usage-title">
          Start building
        </a>
        {shadcn ? (
          <a className="button button-secondary" href={registryUrl}>
            <Icon name="code" /> View source
          </a>
        ) : (
          <a className="button button-secondary" href="/examples/shadcn/">
            <span className="shadcn-mark" aria-hidden="true" /> React component
          </a>
        )}
      </div>
      <InstallCommand page={page} id="installation" className="hero-install" />
    </section>
  )
}
