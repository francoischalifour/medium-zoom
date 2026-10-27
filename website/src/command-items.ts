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
  const searching = Boolean(query.trim())
  const matchingDocs = searchDocs(entries, query, framework)
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
    description: entry.description,
  }))
  const frameworks: SitePage[] =
    framework === 'react' ? ['react', 'javascript'] : ['javascript', 'react']
  const installActions = frameworks.map(value => ({
    id: `install-${value}`,
    kind: 'copy' as const,
    title: `Copy ${value === 'react' ? 'React' : 'JavaScript'} install command`,
    detail: value === 'react' ? `shadcn · ${packageManager}` : packageManager,
    icon: 'copy' as const,
    text: (value === 'react' ? componentCommands : javascriptCommands)[packageManager],
    keywords: `copy ${value} ${value === 'react' ? 'shadcn' : ''} install installation npm pnpm yarn bun`,
  }))
  const queryTerms = getSearchTerms(query)
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
  ].filter(action => queryTerms.every(term => action.keywords.includes(term)))
  const referencePath =
    matchingDocs[0]?.path ?? (framework === 'react' ? '/docs/react/' : '/docs/javascript/')
  const chat: CommandItem[] = getChatLinks(query, referencePath).map(provider => ({
    id: provider.key,
    kind: 'chat',
    title: provider.title,
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
