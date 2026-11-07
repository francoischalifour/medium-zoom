import type { ReactNode } from 'react'

import { productFeatures, productPages, type FeatureIcon } from './product-pages'
import { Icon } from './site-components'
import type { SitePage } from './site-data'
import { TypeScriptIcon } from './technology-icons'

export function ProductFeatures({ page }: { page: SitePage }) {
  return (
    <section className="details-strip" aria-label={productPages[page].featuresLabel}>
      {productFeatures(page, __MEDIUM_ZOOM_GZIP_BYTES__).map(feature => (
        <div key={feature.title}>
          {featureIcons[feature.icon]}
          <h2>{feature.title}</h2>
          <p>{feature.description}</p>
        </div>
      ))}
    </section>
  )
}

const featureIcons: Record<FeatureIcon, ReactNode> = {
  code: <Icon name="code" />,
  keyboard: <Icon name="keyboard" />,
  feather: <Icon name="feather" />,
  typescript: <TypeScriptIcon />,
  image: <Icon name="image" />,
}
