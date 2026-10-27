import type { ComponentProps } from 'react'

import { getChatLinks } from './chat-links'
import { getSearchTerms, searchDocs, type SearchEntry } from './docs-search'
import { componentCommands, javascriptCommands } from './install-commands'
import type { PackageManager } from './package-manager'
import type { Icon } from './site-components'
import type { SitePage } from './site-data'

export type CommandItem = {
  id: string
  title: string
  icon: ComponentProps<typeof Icon>['name']
  detail?: string
  description?: string
} & (
  | { kind: 'navigate'; url: string }
  | { kind: 'chat'; url: string }
  | { kind: 'copy'; text: string }
  | { kind: 'theme'; dark: boolean }
)

export const commandVerbs = { navigate: 'Open', chat: 'Ask', copy: 'Copy', theme: 'Switch' }

export function getCommandGroups({
  entries,
  query,
  framework,
  packageManager,
  dark,
}: {
  entries: SearchEntry[]
  query: string
  framework: SitePage
  packageManager: PackageManager
  dark: boolean
}): { title: string; items: CommandItem[] }[] {
  const searchQuery = query.trim()
  const searching = searchQuery.length > 0
  const matchingDocs = searchDocs(entries, searchQuery, framework)
  const documentation: CommandItem[] = matchingDocs.map(entry => ({
    id: entry.path,
    kind: 'navigate',
    url: entry.path,
    title: entry.title,
    icon: entry.parent ? 'code' : 'book',
    detail: entry.parent
      ? `${entry.parent} › ${entry.group}`
      : !searching && entry.group === 'Get started'
        ? undefined
        : entry.group,
    description: searching ? entry.description : undefined,
  }))
  const installActions = [
    {
      id: 'install-javascript',
      kind: 'copy' as const,
      title: 'Copy JavaScript install command',
      icon: 'copy' as const,
      text: javascriptCommands[packageManager],
      keywords: 'installation npm pnpm yarn bun',
    },
    {
      id: 'install-react',
      kind: 'copy' as const,
      title: 'Copy React install command with shadcn/ui',
      icon: 'copy' as const,
      text: componentCommands[packageManager],
      keywords: 'installation npm pnpm yarn bun',
    },
  ]
  if (framework === 'react') {
    installActions.reverse()
  }
  const queryTerms = getSearchTerms(searchQuery)
  const actions: CommandItem[] = [
    ...installActions,
    {
      id: 'theme',
      kind: 'theme' as const,
      title: `Switch to ${dark ? 'light' : 'dark'} theme`,
      icon: 'contrast' as const,
      dark: !dark,
      keywords: 'switch theme appearance light dark mode',
    },
  ].filter(action => {
    const text = `${action.title} ${action.keywords}`.toLowerCase()
    return queryTerms.every(term => text.includes(term))
  })
  const referencePath =
    matchingDocs[0]?.path ?? (framework === 'react' ? '/docs/react/' : '/docs/javascript/')
  const chat: CommandItem[] = getChatLinks(searchQuery, referencePath).map(provider => ({
    id: provider.key,
    kind: 'chat',
    title: provider.title,
    detail: searchQuery,
    url: provider.url,
    icon: 'chat',
  }))
  const groups = searching
    ? [
        { title: 'Actions', items: actions },
        { title: 'Documentation', items: documentation },
        { title: 'Open in chat', items: chat },
      ]
    : [
        { title: 'Get started', items: documentation.slice(0, 2) },
        { title: 'Actions', items: actions },
        { title: 'Popular', items: documentation.slice(2) },
      ]
  return groups.filter(group => group.items.length > 0)
}
