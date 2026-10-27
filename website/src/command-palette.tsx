import * as React from 'react'

import { getCommandGroups, commandVerbs, type CommandItem } from './command-items'
import { getSearchTerms, type DocsSearch } from './docs-search'
import { usePackageManager } from './package-manager'
import { trackInstallCopied } from './site-analytics'
import { Icon, Kbd } from './site-components'
import type { SitePage } from './site-data'
import { getTheme, getServerTheme, setTheme, subscribeTheme } from './site-theme'

import './command-palette.css'

function Highlight({
  text,
  query,
  matchedTerms,
}: {
  text: string
  query: string
  matchedTerms?: string[]
}) {
  const words = [...new Set(matchedTerms ?? getSearchTerms(query))].sort(
    (a, b) => b.length - a.length
  )
  if (!words.length) {
    return text
  }
  // Tokens contain only letters and numbers, so the expression treats user input literally.
  return text
    .split(new RegExp(`(${words.join('|')})`, 'gi'))
    .map((part, index) =>
      words.includes(part.toLowerCase()) ? <mark key={index}>{part}</mark> : part
    )
}

function CommandOption({
  command,
  query,
  selected,
  id,
  onSelect,
  onActivate,
}: {
  command: CommandItem
  query: string
  selected: boolean
  id: string
  onSelect: () => void
  onActivate: () => void
}) {
  const isChat = command.kind === 'chat'
  const isLink = command.kind === 'navigate' || isChat
  const resultClass = isChat ? 'command-chat' : isLink ? '' : 'command-action'
  const OptionElement = isLink ? 'a' : 'button'
  return (
    <OptionElement
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      type={isLink ? undefined : 'button'}
      href={isLink ? command.url : undefined}
      target={isChat ? '_blank' : undefined}
      rel={isChat ? 'noopener noreferrer' : undefined}
      className={`command-result ${resultClass}`}
      onMouseDown={event => {
        if (event.button === 0) {
          event.preventDefault()
        }
      }}
      onPointerMove={onSelect}
      onClick={onActivate}
    >
      <span className="command-result-icon">
        <Icon name={command.icon} />
      </span>
      <span className="command-result-content">
        <span className="command-title">
          <Highlight text={command.title} query={query} matchedTerms={command.matchedTerms} />
        </span>
        {command.detail && (
          <span className="command-detail">
            {isChat ? (
              command.detail
            ) : (
              <Highlight text={command.detail} query={query} matchedTerms={command.matchedTerms} />
            )}
          </span>
        )}
        {command.description && (
          <span className="command-description">
            <Highlight
              text={command.description}
              query={query}
              matchedTerms={command.matchedTerms}
            />
          </span>
        )}
      </span>
      <span className="command-result-tail" aria-hidden="true">
        {isChat ? (
          <Icon name="external" className="command-external" />
        ) : (
          <Kbd className="command-enter">⏎</Kbd>
        )}
      </span>
    </OptionElement>
  )
}

function replaceSearchQuery(query: string) {
  const url = new URL(window.location.href)
  const value = query.trim()
  if (value) {
    url.searchParams.set('q', value)
  } else {
    url.searchParams.delete('q')
  }
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', url)
  }
}

export function CommandPalette({ framework }: { framework: SitePage }) {
  const trigger = React.useRef<HTMLButtonElement>(null)
  const dialog = React.useRef<HTMLDialogElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const returnFocus = React.useRef<HTMLElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [search, setSearch] = React.useState<DocsSearch | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const [mac, setMac] = React.useState(false)
  const dark = React.useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  const packageManager = usePackageManager()
  const id = React.useId()

  function show(value = new URLSearchParams(window.location.search).get('q') ?? '') {
    if (!dialog.current?.open) {
      returnFocus.current =
        document.activeElement === document.body
          ? trigger.current
          : (document.activeElement as HTMLElement | null)
      dialog.current?.showModal()
    }
    setQuery(value)
    setActiveIndex(0)
    input.current?.focus()
    setOpen(true)
  }
  function close() {
    dialog.current?.close()
  }
  React.useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform))
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.isComposing ||
        event.altKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'k'
      ) {
        return
      }
      const target = event.target
      if (
        !dialog.current?.open &&
        target instanceof HTMLElement &&
        (target.closest('input, textarea, select') || target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      if (dialog.current?.open) {
        close()
      } else {
        show()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  React.useEffect(() => {
    function syncFromUrl() {
      const value = new URLSearchParams(window.location.search).get('q')
      if (value !== null) {
        show(value)
      } else {
        close()
      }
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener('pageshow', syncFromUrl)
    return () => {
      window.removeEventListener('popstate', syncFromUrl)
      window.removeEventListener('pageshow', syncFromUrl)
    }
  }, [])
  React.useEffect(() => {
    if (!open) {
      return
    }
    const timer = window.setTimeout(() => replaceSearchQuery(query), 300)
    return () => window.clearTimeout(timer)
  }, [open, query])
  React.useEffect(() => {
    if (!open || search) {
      return
    }
    let cancelled = false
    setLoadError(false)
    import('virtual:docs-search').then(
      module => {
        if (!cancelled) {
          setSearch(() => module.default)
        }
      },
      () => {
        if (!cancelled) {
          setLoadError(true)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [open, search])

  const groups = React.useMemo(
    () => getCommandGroups({ search, query, framework, packageManager, dark }),
    [search, query, framework, packageManager, dark]
  )
  const commands = groups.flatMap(group => group.items)
  const matchCount = commands.filter(command => command.kind !== 'chat').length
  const noMatches = search !== null && Boolean(query.trim()) && matchCount === 0
  const selectedIndex = Math.min(activeIndex, Math.max(0, commands.length - 1))
  const selectedCommand = commands[selectedIndex]
  const selectedId = selectedCommand ? `${id}-${selectedCommand.id}` : undefined

  React.useEffect(() => {
    if (open && selectedId) {
      document.getElementById(selectedId)?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, selectedId])

  async function activate(command: CommandItem) {
    switch (command.kind) {
      case 'navigate':
        // Preserve the previous search when following the native link, including Back navigation.
        replaceSearchQuery(query)
        break
      case 'theme':
        setTheme(command.dark)
        close()
        break
      case 'copy':
        try {
          const copied = navigator.clipboard.writeText(command.text)
          close()
          await copied
          trackInstallCopied()
        } catch {
          close()
        }
        break
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (selectedId) {
        document.getElementById(selectedId)?.click()
      }
      return
    }
    if (!commands.length) {
      return
    }

    let nextIndex: number
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (selectedIndex + 1) % commands.length
        break
      case 'ArrowUp':
        nextIndex = (selectedIndex + commands.length - 1) % commands.length
        break
      case 'Home':
      case 'End':
        // Unmodified Home and End retain their normal text-editing behavior.
        if (!(event.ctrlKey || event.metaKey)) {
          return
        }
        nextIndex = event.key === 'Home' ? 0 : commands.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    setActiveIndex(nextIndex)
  }

  return (
    <>
      <button
        ref={trigger}
        className="search-trigger"
        aria-haspopup="dialog"
        aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}
        title={`Search documentation (${mac ? '⌘K' : 'Ctrl+K'})`}
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        onClick={() => show()}
      >
        <Icon name="search" />
        <span>Search docs</span>
        <Kbd aria-hidden="true">{mac ? '⌘' : 'Ctrl'} K</Kbd>
      </button>
      <dialog
        ref={dialog}
        id={`${id}-dialog`}
        className="command-palette"
        aria-label="Search documentation"
        onClose={() => {
          setOpen(false)
          replaceSearchQuery('')
          returnFocus.current?.focus()
        }}
        onClick={event => {
          if (event.target === event.currentTarget) {
            close()
          }
        }}
      >
        <div className="command-panel">
          <div
            className="command-search"
            onClick={event => {
              if (
                !(event.target as Element).closest(
                  'input, button, a, select, textarea, [contenteditable="true"]'
                )
              ) {
                input.current?.focus()
              }
            }}
          >
            <Icon name="search" />
            <input
              ref={input}
              autoFocus
              placeholder="Search documentation…"
              aria-label="Search documentation"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-results`}
              aria-autocomplete="list"
              aria-activedescendant={selectedId}
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              className="command-dismiss"
              aria-label="Close search"
              title="Esc"
              onClick={close}
            >
              <span>Close</span>
            </button>
          </div>
          <div
            className={`command-results${noMatches ? ' is-empty' : ''}`}
            role="listbox"
            id={`${id}-results`}
            aria-label="Search results"
          >
            {!search && (
              <p className="command-empty">
                {loadError
                  ? 'Documentation search could not load. Close and reopen to retry.'
                  : 'Loading documentation…'}
              </p>
            )}
            {noMatches && (
              <div className="command-empty">
                <p className="command-empty-title">No matches found</p>
                <p>Try another search, or ask your question in chat.</p>
              </div>
            )}
            {groups.map(group => (
              <div role="group" aria-label={group.title} key={group.title}>
                <div className="command-group" aria-hidden="true">
                  {group.title}
                </div>
                {group.items.map(command => (
                  <CommandOption
                    key={command.id}
                    id={`${id}-${command.id}`}
                    command={command}
                    query={query}
                    selected={command === selectedCommand}
                    onSelect={() => setActiveIndex(commands.indexOf(command))}
                    onActivate={() => void activate(command)}
                  />
                ))}
              </div>
            ))}
          </div>
          <span className="sr-only" role="status">
            {search
              ? query.trim()
                ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`
                : `${commands.length} shortcuts`
              : ''}
          </span>
          <footer className="command-footer">
            <span>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Navigate
            </span>
            <span>
              <Kbd aria-label="Enter">⏎</Kbd>{' '}
              {selectedCommand ? commandVerbs[selectedCommand.kind] : 'Open'}
            </span>
          </footer>
        </div>
      </dialog>
    </>
  )
}
