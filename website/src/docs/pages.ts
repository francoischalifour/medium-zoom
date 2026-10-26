// Only complete pages appear in navigation.
export const docsPages = [
  { path: '/docs/', title: 'Overview', group: 'Get started' },
  { path: '/docs/javascript/', title: 'JavaScript quickstart', group: 'Get started' },
  { path: '/docs/react/', title: 'React quickstart', group: 'Get started' },
  { path: '/docs/guides/hd-images/', title: 'HD images', group: 'Guides' },
  { path: '/docs/guides/galleries/', title: 'Galleries', group: 'Guides' },
  { path: '/docs/guides/styling/', title: 'Styling', group: 'Guides' },
  { path: '/docs/guides/custom-react-triggers/', title: 'Custom triggers', group: 'React guides' },
  { path: '/docs/guides/controlled-state/', title: 'Controlled state', group: 'React guides' },
  { path: '/docs/guides/server-rendering/', title: 'Server rendering', group: 'React guides' },
  {
    path: '/docs/reference/javascript/medium-zoom/',
    title: 'mediumZoom()',
    group: 'JavaScript reference',
  },
  { path: '/docs/reference/javascript/options/', title: 'Options', group: 'JavaScript reference' },
  { path: '/docs/reference/javascript/methods/', title: 'Methods', group: 'JavaScript reference' },
  { path: '/docs/reference/javascript/events/', title: 'Events', group: 'JavaScript reference' },
  { path: '/docs/reference/react/image-zoom/', title: '<ImageZoom>', group: 'React reference' },
  {
    path: '/docs/reference/react/composition/',
    title: 'Composition',
    group: 'React reference',
  },
] as const

export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
