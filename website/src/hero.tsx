import { InstallCommand } from './install-command'
import { registryUrl } from './install-commands'
import { MonthlyDownloads } from './monthly-downloads'
import { Icon, SiteLink } from './site-components'
import type { SitePage } from './site-data'
import { SectionLinks } from './site-shell'
import { ReactIcon } from './technology-icons'

export function Hero({ page }: { page: SitePage }) {
  const isReact = page === 'react'
  return (
    <section className="hero" aria-labelledby="page-title">
      <nav className="section-links mobile-section-links" aria-label="Product navigation">
        <SectionLinks page={page} />
      </nav>
      <span className="eyebrow">
        {isReact && <span className="shadcn-mark" aria-hidden="true" />}
        {isReact ? 'Image zoom for shadcn/ui' : 'Image zoom for the web. Since 2016.'}
      </span>
      <h1 id="page-title">
        Your images,
        <br />
        <span>a little closer.</span>
      </h1>
      <p>
        {isReact
          ? 'Medium-style image zoom for React.'
          : 'Medium-style image zoom in a few lines of JavaScript.'}
        <br />
        {isReact
          ? 'Install with shadcn/ui. Keep the source.'
          : 'No dependencies. Works with any framework.'}
      </p>
      <div className="hero-actions">
        <SiteLink className="button button-primary" href="#usage-title">
          Start building
        </SiteLink>
        {isReact ? (
          <SiteLink className="button button-secondary" href={registryUrl}>
            <Icon name="code" /> View source
          </SiteLink>
        ) : (
          <SiteLink className="button button-secondary" href="/react">
            <ReactIcon className="documentation-mark" /> React component
          </SiteLink>
        )}
      </div>
      <InstallCommand page={page} id="installation" className="hero-install" />
      <MonthlyDownloads />
    </section>
  )
}
