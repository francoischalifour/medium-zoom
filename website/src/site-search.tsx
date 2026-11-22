import {
  createSearch,
  defineItem,
  Docspot,
  type DocspotEvent,
  type DocspotItem,
  type DocspotResult,
  type DocspotResultIconProps,
  highlightTerms,
  recentItems,
} from 'docspot'
import { chatGptHandoff, claudeHandoff } from 'docspot/handoffs'
import * as React from 'react'

import 'docspot/styles.css'

import type { SearchResult } from './docs-search'
import { componentCommands, javascriptCommands } from './install-commands'
import { getPackageManager } from './package-manager'
import { trackInstallCopied, trackSiteEvent } from './site-analytics'
import { Icon } from './site-components'
import type { SitePage } from './site-data'
import { getTheme, setTheme } from './site-theme'
import { siteOrigin } from './site-url'

import './site-search.css'

// The index and the preview load together: once the page is idle, when the trigger is hovered or
// focused, or when search opens. Neither ships with the page.
const loadIndex = () =>
  import('virtual:docs-search').then(module => module.default)
const loadPreview = () => import('./site-search-preview')
const SearchPreview = React.lazy(loadPreview)
const PageActions = React.lazy(() =>
  loadPreview().then(module => ({ default: module.PageActions }))
)

function toResult(entry: SearchResult): DocspotResult {
  const terms = entry.matchedTerms ?? []
  const breadcrumb = entry.parent ? [entry.group, entry.parent] : [entry.group]
  return {
    url: entry.path,
    title: entry.title,
    pageTitle: entry.parent ?? entry.title,
    breadcrumb,
    excerpt: entry.description,
    type: entry.parent ? 'section' : 'page',
    highlights: {
      title: highlightTerms(entry.title, terms),
      breadcrumb: breadcrumb.map(part => highlightTerms(part, terms)),
      excerpt: entry.description
        ? highlightTerms(entry.description, terms)
        : undefined,
    },
  }
}

// One search per framework, so the tuned ranking keeps favoring the reader's framework.
function createSiteSearch(framework: SitePage) {
  return createSearch(
    async ({ query }) => (await loadIndex())(query, framework).map(toResult),
    {
      preload() {
        void loadIndex()
        void loadPreview()
      },
    }
  )
}
const searches = {
  javascript: createSiteSearch('javascript'),
  react: createSiteSearch('react'),
} satisfies Record<SitePage, unknown>

// The assistant reads the best match, or the framework's quickstart, before answering.
function createHandoffs(framework: SitePage) {
  const fallback = framework === 'react' ? '/docs/react/' : '/docs/javascript/'
  const prompt = ({
    query,
    results,
  }: {
    query: string
    results: DocspotResult[]
  }) =>
    `${query}\n\nRead ${siteOrigin}${results[0]?.url ?? fallback} and answer`
  return [chatGptHandoff({ prompt }), claudeHandoff({ prompt })]
}
const handoffs = {
  javascript: createHandoffs('javascript'),
  react: createHandoffs('react'),
}

function copyCommand(commands: Record<string, string>) {
  return () => {
    navigator.clipboard
      .writeText(commands[getPackageManager()])
      .then(trackInstallCopied, () => {})
  }
}

const installJavaScript = defineItem({
  id: 'install-javascript',
  title: 'Copy JavaScript install command',
  description:
    'Copies the medium-zoom install command for your package manager.',
  keywords: [
    'install',
    'installation',
    'npm',
    'pnpm',
    'yarn',
    'bun',
    'vanilla',
  ],
  group: 'Actions',
  icon: <Icon name="copy" />,
  action: copyCommand(javascriptCommands),
})

const installReact = defineItem({
  id: 'install-react',
  title: 'Copy React install command',
  description:
    'Copies the shadcn/ui command that adds the <ImageZoom> component to your project.',
  keywords: [
    'install',
    'installation',
    'shadcn',
    'component',
    'npm',
    'pnpm',
    'yarn',
    'bun',
  ],
  group: 'Actions',
  icon: <Icon name="copy" />,
  action: copyCommand(componentCommands),
})

function themeItem(dark: boolean): DocspotItem {
  return {
    id: 'theme',
    title: `Switch to ${dark ? 'light' : 'dark'} theme`,
    keywords: [
      'theme',
      'appearance',
      'color',
      'mode',
      'light',
      'dark',
      'night',
    ],
    group: 'Actions',
    icon: <Icon name={dark ? 'sun' : 'moon'} />,
    action: () => setTheme(!getTheme()),
  }
}

const getStarted = {
  javascript: { url: '/docs/javascript/', title: 'JavaScript quickstart' },
  react: { url: '/docs/react/', title: 'React quickstart' },
}
const popular: DocspotResult[] = [
  { url: '/docs/guides/hd-images/', title: 'HD images', group: 'Popular' },
  {
    url: '/docs/guides/multiple-images/',
    title: 'Multiple images',
    group: 'Popular',
  },
  {
    url: '/docs/reference/javascript/options/',
    title: 'Options',
    group: 'Popular',
  },
  {
    url: '/docs/reference/react/image-zoom/',
    title: '<ImageZoom>',
    group: 'Popular',
  },
]

function ResultIcon({ result }: DocspotResultIconProps) {
  return <Icon name={result.type === 'section' ? 'code' : 'book'} />
}

// Count a search once the reader settles on it, not on every keystroke.
function useSearchAnalytics() {
  const timer = React.useRef<number>(undefined)
  const tracked = React.useRef('')
  return React.useCallback((event: DocspotEvent) => {
    if (event.type !== 'search.results' && event.type !== 'search.select') {
      return
    }
    const query = event.query.trim()
    window.clearTimeout(timer.current)
    const track = () => {
      if (query && query !== tracked.current) {
        tracked.current = query
        trackSiteEvent('Searched', { search_term: query })
      }
    }
    if (event.type === 'search.select') {
      track()
    } else {
      timer.current = window.setTimeout(track, 800)
    }
  }, [])
}

export function SiteSearch({
  framework,
  dark,
}: {
  framework: SitePage
  dark: boolean
}) {
  const onEvent = useSearchAnalytics()
  const theme = themeItem(dark)
  const install =
    framework === 'react'
      ? [installReact, installJavaScript]
      : [installJavaScript, installReact]
  const other = framework === 'react' ? 'javascript' : 'react'
  return (
    <Docspot.Root
      search={searches[framework]}
      siteUrl={siteOrigin}
      history
      syncUrl
      items={[...install, theme]}
      defaultItems={[
        recentItems,
        { ...getStarted[framework], group: 'Get started' },
        { ...getStarted[other], group: 'Get started' },
        ...install,
        theme,
        ...popular,
      ]}
      handoffs={handoffs[framework]}
      slots={{
        preview: SearchPreview,
        pageActions: PageActions,
        resultIcon: ResultIcon,
      }}
      messages={{ search: { placeholder: 'Search documentation…' } }}
      onEvent={onEvent}
    >
      <Docspot.SearchTrigger
        title="Search documentation"
        // The site's own trigger styles replace Docspot's.
        render={(props, { open }) => (
          <button {...props} className="search-trigger" aria-expanded={open} />
        )}
      >
        <Icon name="search" />
        <span>Search docs</span>
        {/* The head script picks the label before the first paint, so it never swaps on hydration. */}
        <kbd aria-hidden="true">
          <span data-shortcut-label="apple">⌘ K</span>
          <span data-shortcut-label="other">Ctrl K</span>
        </kbd>
      </Docspot.SearchTrigger>
      <Docspot.SearchDialog />
    </Docspot.Root>
  )
}
