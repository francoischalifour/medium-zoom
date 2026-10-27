import { Icon } from './site-components'
import type { SitePage } from './site-data'
import { TypeScriptIcon } from './technology-icons'

export function ProductFeatures({ page }: { page: SitePage }) {
  const isReact = page === 'react'
  const gzipKilobytes = (__MEDIUM_ZOOM_GZIP_BYTES__ / 1_000).toFixed(0)
  const features = [
    ...(isReact
      ? [
          {
            icon: <Icon name="code" />,
            title: 'Yours to change.',
            description: 'Typed React source. Install with shadcn/ui.',
          },
          {
            icon: <Icon name="keyboard" />,
            title: 'Keyboard and theme ready.',
            description: 'Accessible controls. Match your background.',
          },
        ]
      : [
          {
            icon: <Icon name="feather" />,
            title: `${gzipKilobytes} kB. Zero dependencies.`,
            description: 'A lightweight lightbox alternative.',
          },
          {
            icon: <TypeScriptIcon />,
            title: 'Any framework. TypeScript ready.',
            description: 'Use with React, Vue, Svelte, or plain HTML.',
          },
        ]),
    {
      icon: <Icon name="image" />,
      title: 'High-resolution on demand.',
      description: 'Load sharper images only when zooming.',
    },
  ]

  return (
    <section
      className="details-strip"
      aria-label={isReact ? 'Component features' : 'Library features'}
    >
      {features.map(feature => (
        <div key={feature.title}>
          {feature.icon}
          <h2>{feature.title}</h2>
          <p>{feature.description}</p>
        </div>
      ))}
    </section>
  )
}
