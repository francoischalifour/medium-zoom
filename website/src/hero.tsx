import type { ReactNode } from 'react'

import { InstallCommand } from './install-command'
import { registryUrl } from './install-commands'
import { MonthlyDownloads } from './monthly-downloads'
import { headline, productPages } from './product-pages'
import { HeroCrop, Icon, SiteLink } from './site-components'
import type { SitePage } from './site-data'
import { SectionLinks } from './site-shell'
import { JavaScriptIcon, ReactIcon } from './technology-icons'

export function Hero({ page }: { page: SitePage }) {
  const copy = productPages[page]
  const { eyebrowMark, technologyIcon, secondaryAction } = heroMedia[page]
  return (
    <section className="hero" aria-labelledby="page-title">
      <nav className="section-links mobile-section-links" aria-label="Product navigation">
        <SectionLinks page={page} />
      </nav>
      <span className="eyebrow">
        {eyebrowMark}
        {copy.eyebrow}
      </span>
      <HeroCrop>
        <h1 id="page-title">
          {headline}{' '}
          <span className="hero-technology">
            with{' '}
            <span className="hero-technology-name">
              {technologyIcon}
              {copy.technology}
            </span>
          </span>
        </h1>
        <p>
          {copy.tagline[0]} <br />
          {copy.tagline[1]}
        </p>
      </HeroCrop>
      <div className="hero-actions">
        <SiteLink className="button button-primary" href="#usage-title">
          Start building
        </SiteLink>
        {secondaryAction}
      </div>
      <InstallCommand page={page} id="installation" className="hero-install" />
      <MonthlyDownloads />
    </section>
  )
}

// The marks and links each page's hero shows in its own way.
const heroMedia: Record<
  SitePage,
  { eyebrowMark: ReactNode; technologyIcon: ReactNode; secondaryAction: ReactNode }
> = {
  javascript: {
    eyebrowMark: null,
    technologyIcon: <JavaScriptIcon />,
    secondaryAction: (
      <SiteLink className="button button-secondary" href="/react">
        <ReactIcon className="documentation-mark" /> React component
      </SiteLink>
    ),
  },
  react: {
    eyebrowMark: <span className="shadcn-mark" aria-hidden="true" />,
    technologyIcon: <ReactIcon className="hero-react-mark" />,
    secondaryAction: (
      <SiteLink className="button button-secondary" href={registryUrl}>
        <Icon name="code" /> View source
      </SiteLink>
    ),
  },
}
