import type { SitePage } from './site-data.ts'

// Copy shared by the product pages and their Markdown versions. Backticks mark inline code.

export const headline = 'Bring images closer'

export const productPages = {
  javascript: {
    path: '/',
    technology: 'JavaScript',
    eyebrow: 'Image zoom for the web. Since 2016.',
    tagline: [
      'Lightweight image zoom for the web.',
      'Zero dependencies, any framework, React via shadcn.',
    ],
    featuresLabel: 'Library features',
    usage: {
      title: 'Pick your images.',
      description:
        'Add `data-zoomable` to your images, then attach the zoom. Styles come included.',
      note: 'Set the spacing, match your background, or load a sharper image on zoom.',
      link: { label: 'Read the API reference', href: '/docs/reference/javascript/medium-zoom/' },
    },
    closing: 'Start with a few lines of JavaScript.',
  },
  react: {
    path: '/react',
    technology: 'React',
    eyebrow: 'Install with shadcn/ui',
    tagline: ['Lightweight image zoom for React.', 'Keep the source. Make it yours.'],
    featuresLabel: 'Component features',
    usage: {
      title: 'Add zoom to an image.',
      description: 'Use it like an image. Add your source, alt text, and styles.',
      note: 'Image attributes and the forwarded ref reach the underlying `<img>`.',
      link: { label: 'Explore all zoom options', href: '/docs/reference/javascript/options/' },
    },
    closing: 'Install with shadcn/ui. Make the component yours.',
  },
} as const satisfies Record<SitePage, unknown>

export type FeatureIcon = 'code' | 'keyboard' | 'feather' | 'typescript' | 'image'

type ProductFeature = { icon: FeatureIcon; title: string; description: string }

// Callers pass the gzip size: the app gets it from the Vite define, the Markdown from dist.
export function productFeatures(page: SitePage, gzipBytes: number): ProductFeature[] {
  const leadingFeatures: Record<SitePage, ProductFeature[]> = {
    javascript: [
      {
        icon: 'feather',
        title: `${(gzipBytes / 1_000).toFixed(0)} kB. Zero dependencies.`,
        description: 'A lightweight lightbox alternative.',
      },
      {
        icon: 'typescript',
        title: 'Any framework. TypeScript ready.',
        description: 'Use with React, Angular, Vue, Svelte, Astro, or plain HTML.',
      },
    ],
    react: [
      {
        icon: 'code',
        title: 'Yours to change.',
        description: 'Typed React source. Install with shadcn/ui.',
      },
      {
        icon: 'keyboard',
        title: 'Keyboard and theme ready.',
        description: 'Accessible controls. Match your background.',
      },
    ],
  }
  return [
    ...leadingFeatures[page],
    {
      icon: 'image',
      title: 'High-resolution on demand.',
      description: 'Load sharper images only when zooming.',
    },
  ]
}

export const integrationsSection = {
  title: 'Start with your stack.',
  description: 'The same zoom, wherever you build.',
  featured: {
    tag: 'React + TypeScript',
    title: 'A component you own.',
    description: 'Install with the shadcn CLI. Own the source. Match your theme.',
    action: 'Explore shadcn/ui',
    href: '/react',
  },
  integrations: [
    {
      name: 'Angular',
      description: 'A directive for Angular and Angular SSR.',
      href: '/docs/integrations/angular/',
    },
    { name: 'Vue', description: 'A component for Vue and Nuxt.', href: '/docs/integrations/vue/' },
    {
      name: 'Svelte',
      description: 'A component for Svelte and SvelteKit.',
      href: '/docs/integrations/svelte/',
    },
    {
      name: 'Solid',
      description: 'A component for Solid and SolidStart.',
      href: '/docs/integrations/solid/',
    },
    {
      name: 'Astro',
      description: 'A component for optimized Astro images.',
      href: '/docs/integrations/astro/',
    },
    { name: 'JavaScript', description: 'Attach zoom with a selector.', href: '/docs/javascript/' },
  ],
}

export const imageZoomApi = {
  title: 'Small API. Sensible defaults.',
  description:
    'Pass image attributes and zoom options to `ImageZoom`. Compose its parts for custom layouts.',
  props: [
    { name: 'options.margin', description: 'Space around the zoomed image.', default: '`24`' },
    {
      name: 'options.background',
      description: 'Overlay color, resolved from your theme.',
      default: '`--background`',
    },
    {
      name: 'data-zoom-src',
      description: 'A higher-resolution source to open.',
      default: 'Original image',
    },
    {
      name: 'open',
      description: 'Control whether the image is zoomed.',
      default: 'Internal state',
    },
    {
      name: 'onOpenChange',
      description: 'Set the next open value when controlling state.',
      default: '—',
    },
    { name: 'disabled', description: 'Disable zoom; keep the image visible.', default: '`false`' },
  ],
}

export const closingTitle = 'Add zoom to your project.'

// Splits copy into text and inline code: 'Add `data-zoomable`' → ['Add ', 'data-zoomable'].
// Odd indexes are code.
export function splitInlineCode(copy: string) {
  return copy.split('`')
}
