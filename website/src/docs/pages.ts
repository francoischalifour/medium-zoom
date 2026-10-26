// Complete pages own their route, navigation, and sharing metadata.
export const docsPages = [
  {
    path: '/docs/',
    title: 'Overview',
    group: 'Get started',
    description:
      'Choose a JavaScript or React quickstart, follow task guides, and look up the medium-zoom API.',
  },
  {
    path: '/docs/javascript/',
    title: 'JavaScript quickstart',
    group: 'Get started',
    description:
      'Install medium-zoom and make your first image zoomable with HTML, JavaScript, and a working example.',
  },
  {
    path: '/docs/react/',
    title: 'React quickstart',
    group: 'Get started',
    description:
      'Install the React image zoom component and render your first accessible zoomable image.',
  },
  {
    path: '/docs/guides/hd-images/',
    title: 'HD images',
    group: 'Guides',
    description:
      'Load a high-resolution image when zooming while displaying a smaller preview in JavaScript or React.',
  },
  {
    path: '/docs/guides/galleries/',
    title: 'Galleries',
    group: 'Guides',
    description:
      'Make multiple images zoomable with one JavaScript instance or separate React image zoom components.',
  },
  {
    path: '/docs/guides/styling/',
    title: 'Styling',
    group: 'Guides',
    description:
      'Style medium-zoom images, captions, layouts, and overlay colors in JavaScript and React.',
  },
  {
    path: '/docs/guides/custom-react-triggers/',
    title: 'Custom triggers',
    group: 'React guides',
    description:
      'Build a custom React image zoom trigger with an accessible label, badge, and native button props.',
  },
  {
    path: '/docs/guides/controlled-state/',
    title: 'Controlled state',
    group: 'React guides',
    description:
      'Control React image zoom from a parent component with open and onOpenChange state props.',
  },
  {
    path: '/docs/guides/server-rendering/',
    title: 'Server rendering',
    group: 'React guides',
    description:
      'Render React image zoom with SSR and React Server Components, using client boundaries for state and handlers.',
  },
  {
    path: '/docs/reference/javascript/medium-zoom/',
    title: 'mediumZoom()',
    group: 'JavaScript reference',
    description:
      'JavaScript mediumZoom() factory reference covering selectors, options, image elements, and collections.',
  },
  {
    path: '/docs/reference/javascript/options/',
    title: 'Options',
    group: 'JavaScript reference',
    description:
      'JavaScript medium-zoom option types and defaults for margins, backgrounds, scrolling, containers, and templates.',
  },
  {
    path: '/docs/reference/javascript/methods/',
    title: 'Methods',
    group: 'JavaScript reference',
    description:
      'JavaScript zoom instance method reference for opening, closing, attaching images, options, and listeners.',
  },
  {
    path: '/docs/reference/javascript/events/',
    title: 'Events',
    group: 'JavaScript reference',
    description:
      'JavaScript medium-zoom event reference with event names, transition timing, listener options, and event details.',
  },
  {
    path: '/docs/reference/react/image-zoom/',
    title: '<ImageZoom>',
    group: 'React reference',
    description:
      'React ImageZoom component reference covering native image props, options, defaults, state, and refs.',
  },
  {
    path: '/docs/reference/react/composition/',
    title: 'Composition',
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
