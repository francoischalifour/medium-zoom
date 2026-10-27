// The rebuilt documentation launched on this date; update each page when its content changes.
export const docsPublishedOn = '2026-10-26'

// Complete pages own their route, navigation, and sharing metadata.
export const docsPages = [
  {
    path: '/docs/',
    source: 'overview.mdx',
    updatedOn: '2026-10-26',
    title: 'Overview',
    documentTitle: 'Documentation • medium-zoom',
    group: 'Get started',
    description:
      'Choose a JavaScript or React quickstart, follow task guides, and look up the medium-zoom API.',
  },
  {
    path: '/docs/javascript/',
    source: 'javascript-quickstart.mdx',
    updatedOn: '2026-10-27',
    title: 'JavaScript quickstart',
    documentTitle: 'JavaScript quickstart • medium-zoom',
    group: 'Get started',
    description:
      'Install medium-zoom and make your first image zoomable with HTML, JavaScript, and a working example.',
  },
  {
    path: '/docs/react/',
    source: 'react-quickstart.mdx',
    updatedOn: '2026-10-26',
    title: 'React quickstart',
    documentTitle: 'React quickstart • medium-zoom',
    group: 'Get started',
    description:
      'Install the React image zoom component and render your first accessible zoomable image.',
  },
  {
    path: '/docs/guides/hd-images/',
    source: 'hd-images.mdx',
    updatedOn: '2026-10-26',
    title: 'HD images',
    documentTitle: 'High-resolution images • medium-zoom',
    group: 'Guides',
    description:
      'Load a high-resolution image when zooming while displaying a smaller preview in JavaScript or React.',
  },
  {
    path: '/docs/guides/galleries/',
    source: 'galleries.mdx',
    updatedOn: '2026-10-26',
    title: 'Galleries',
    documentTitle: 'Image galleries • medium-zoom',
    group: 'Guides',
    description:
      'Make multiple images zoomable with one JavaScript instance or separate React image zoom components.',
  },
  {
    path: '/docs/guides/styling/',
    source: 'styling.mdx',
    updatedOn: '2026-10-26',
    title: 'Styling',
    documentTitle: 'Image zoom styling • medium-zoom',
    group: 'Guides',
    description:
      'Style medium-zoom images, captions, layouts, and overlay colors in JavaScript and React.',
  },
  {
    path: '/docs/guides/custom-react-triggers/',
    source: 'custom-react-triggers.mdx',
    updatedOn: '2026-10-26',
    title: 'Custom triggers',
    documentTitle: 'Custom React triggers • medium-zoom',
    group: 'React guides',
    description:
      'Build a custom React image zoom trigger with an accessible label, badge, and native button props.',
  },
  {
    path: '/docs/guides/controlled-state/',
    source: 'controlled-state.mdx',
    updatedOn: '2026-10-26',
    title: 'Controlled state',
    documentTitle: 'Controlled React zoom • medium-zoom',
    group: 'React guides',
    description:
      'Control React image zoom from a parent component with open and onOpenChange state props.',
  },
  {
    path: '/docs/guides/server-rendering/',
    source: 'server-rendering.mdx',
    updatedOn: '2026-10-26',
    title: 'Server rendering',
    documentTitle: 'React SSR and Server Components • medium-zoom',
    group: 'React guides',
    description:
      'Render React image zoom with SSR and React Server Components, using client boundaries for state and handlers.',
  },
  {
    path: '/docs/reference/javascript/medium-zoom/',
    source: 'javascript-api.mdx',
    updatedOn: '2026-10-26',
    title: 'mediumZoom()',
    documentTitle: 'mediumZoom() API • medium-zoom',
    group: 'JavaScript reference',
    description:
      'JavaScript mediumZoom() factory reference covering selectors, options, image elements, and collections.',
  },
  {
    path: '/docs/reference/javascript/options/',
    source: 'options.mdx',
    updatedOn: '2026-10-26',
    title: 'Options',
    documentTitle: 'JavaScript options • medium-zoom',
    group: 'JavaScript reference',
    description:
      'JavaScript medium-zoom option types and defaults for margins, backgrounds, scrolling, containers, and templates.',
  },
  {
    path: '/docs/reference/javascript/methods/',
    source: 'methods.mdx',
    updatedOn: '2026-10-26',
    title: 'Methods',
    documentTitle: 'JavaScript methods • medium-zoom',
    group: 'JavaScript reference',
    description:
      'JavaScript zoom instance method reference for opening, closing, attaching images, options, and listeners.',
  },
  {
    path: '/docs/reference/javascript/events/',
    source: 'events.mdx',
    updatedOn: '2026-10-26',
    title: 'Events',
    documentTitle: 'JavaScript events • medium-zoom',
    group: 'JavaScript reference',
    description:
      'JavaScript medium-zoom event reference with event names, transition timing, listener options, and event details.',
  },
  {
    path: '/docs/reference/react/image-zoom/',
    source: 'image-zoom.mdx',
    updatedOn: '2026-10-26',
    title: '<ImageZoom>',
    documentTitle: 'React ImageZoom API • medium-zoom',
    group: 'React reference',
    description:
      'React ImageZoom component reference covering native image props, options, defaults, state, and refs.',
  },
  {
    path: '/docs/reference/react/composition/',
    source: 'composition-api.mdx',
    updatedOn: '2026-10-26',
    title: 'Composition',
    documentTitle: 'React composition API • medium-zoom',
    group: 'React reference',
    description:
      'React image zoom composition reference covering Root, Trigger, Image, native props, state, and refs.',
  },
] as const

export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
