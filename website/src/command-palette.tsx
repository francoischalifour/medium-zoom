import * as React from 'react'
import { Icon } from './site-components'
import { searchDocs, type SearchEntry } from './docs-search'
import { getTheme, getServerTheme, setTheme, subscribeTheme } from './site-theme'
import { usePackageManager } from './package-manager'
import { javascriptCommands, componentCommands } from './install-commands'
import { trackInstallCopied } from './site-analytics'
import { getChatLinks } from './chat-links'
import './command-palette.css'

function Highlight({ text, query }: { text: string; query: string }) {
  const words = [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? [])].sort(
    (a, b) => b.length - a.length
  )
  if (!words.length) return text
  // Tokens contain only letters and numbers, so the expression treats user input literally.
  return text
    .split(new RegExp(`(${words.join('|')})`, 'gi'))
    .map((part, index) =>
      words.includes(part.toLowerCase()) ? <mark key={index}>{part}</mark> : part
    )
}

export function CommandPalette({ react }: { react: boolean }) {
  const trigger = React.useRef<HTMLButtonElement>(null)
  const dialog = React.useRef<HTMLDialogElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const returnFocus = React.useRef<HTMLElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const [entries, setEntries] = React.useState<SearchEntry[] | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const [mac, setMac] = React.useState(false)
  const dark = React.useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  const manager = usePackageManager()
  const id = React.useId()

  function show() {
    if (dialog.current?.open) return
    returnFocus.current =
      document.activeElement === document.body
        ? trigger.current
        : (document.activeElement as HTMLElement | null)
    setQuery('')
    setActive(0)
    setStatus('')
    dialog.current?.showModal()
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
      )
        return
      const target = event.target
      if (
        !dialog.current?.open &&
        target instanceof HTMLElement &&
        (target.closest('input, textarea, select') || target.isContentEditable)
      )
        return
      event.preventDefault()
      if (dialog.current?.open) close()
      else show()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  React.useEffect(() => {
    if (!open || entries) return
    let cancelled = false
    setLoadError(false)
    import('virtual:docs-search').then(
      module => {
        if (!cancelled) setEntries(module.default)
      },
      () => {
        if (!cancelled) setLoadError(true)
      }
    )
    return () => {
      cancelled = true
    }
  }, [open, entries])

  const docs = entries ? searchDocs(entries, query, react) : []
  const actions = [
    {
      key: 'javascript',
      title: 'Copy JavaScript install command',
      detail: manager,
      icon: 'copy' as const,
      terms: 'copy javascript install installation npm pnpm yarn bun',
    },
    {
      key: 'react',
      title: 'Copy React install command',
      detail: `shadcn · ${manager}`,
      icon: 'copy' as const,
      terms: 'copy react shadcn install installation npm pnpm yarn bun',
    },
    {
      key: 'theme',
      title: `Switch to ${dark ? 'light' : 'dark'} theme`,
      detail: '',
      icon: 'contrast' as const,
      terms: 'switch theme appearance light dark mode',
    },
  ].filter(action =>
    query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .every(word => action.terms.includes(word))
  )
  const docResults = docs.map((entry, index) => ({
    key: entry.path,
    section: query.trim() ? 'Documentation' : index < 2 ? 'Get started' : 'Popular',
    title: entry.title,
    detail: entry.parent
      ? `${entry.parent} › ${entry.group}`
      : entry.group === 'Get started' && !query.trim()
        ? ''
        : entry.group,
    description: entry.parent ? '' : entry.description,
    icon: entry.path.includes('#') ? ('code' as const) : ('book' as const),
    href: entry.path,
    chatUrl: undefined,
  }))
  const actionResults = actions
    .sort(
      (a, b) =>
        Number(b.key === (react ? 'react' : 'javascript')) -
        Number(a.key === (react ? 'react' : 'javascript'))
    )
    .map(action => ({
      ...action,
      section: 'Actions',
      href: undefined,
      description: '',
      chatUrl: undefined,
    }))
  const chatResults = getChatLinks(query, docs, react).map(provider => ({
    key: provider.key,
    section: 'Open in chat',
    title: provider.title,
    detail: query.trim(),
    description: '',
    icon: 'chat' as const,
    href: undefined,
    chatUrl: provider.url,
  }))
  const results = query.trim()
    ? [...actionResults, ...docResults, ...chatResults]
    : [...docResults.slice(0, 2), ...actionResults, ...docResults.slice(2)]
  const selected = Math.min(active, Math.max(0, results.length - 1))

  React.useEffect(() => {
    if (open) document.getElementById(`${id}-${selected}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, id, selected, query, entries])

  async function activate(index: number) {
    const result = results[index]
    if (!result) return
    if (result.chatUrl) {
      window.open(result.chatUrl, '_blank', 'noopener,noreferrer')
    } else if (result.href) {
      close()
      window.location.assign(result.href)
    } else if (result.key === 'theme') {
      setTheme(!dark)
      setStatus(`Switched to ${dark ? 'light' : 'dark'} theme`)
    } else {
      const command = (result.key === 'react' ? componentCommands : javascriptCommands)[manager]
      try {
        await navigator.clipboard.writeText(command)
        trackInstallCopied()
        setStatus('Copied to clipboard')
      } catch {
        setStatus(`Could not copy. Select and copy this command: ${command}`)
      }
    }
  }

  return (
    <>
      <button
        ref={trigger}
        className="search-trigger"
        aria-label={`Search docs ${mac ? '⌘' : 'Ctrl'} K`}
        aria-haspopup="dialog"
        onClick={show}
      >
        <Icon name="search" />
        <span>Search docs</span>
        <kbd>{mac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="command-palette"
        aria-label="Search documentation"
        onClose={() => {
          setOpen(false)
          returnFocus.current?.focus()
        }}
        onClick={event => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div className="command-panel">
          <div className="command-search">
            <Icon name="search" />
            <input
              ref={input}
              placeholder="Search documentation…"
              aria-label="Search documentation"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-results`}
              aria-autocomplete="list"
              aria-activedescendant={results.length ? `${id}-${selected}` : undefined}
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setActive(0)
                setStatus('')
              }}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing) return
                if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && results.length) {
                  // Home/End retain normal text editing unless combined with Control/Command.
                  if (
                    (event.key === 'Home' || event.key === 'End') &&
                    !(event.ctrlKey || event.metaKey)
                  )
                    return
                  event.preventDefault()
                  setActive(
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? results.length - 1
                        : (selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
                          results.length
                  )
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  void activate(selected)
                }
              }}
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
            className="command-results"
            role="listbox"
            id={`${id}-results`}
            aria-label="Search results"
          >
            {!entries && (
              <p className="command-empty">
                {loadError
                  ? 'Documentation search could not load. Close and reopen to retry.'
                  : 'Loading documentation…'}
              </p>
            )}
            {entries && !docs.length && !actions.length && (
              <p className="command-empty">
                No results for “{query}”. Try “React”, “margin”, or “HD images”.
              </p>
            )}
            {results.map((result, index) => (
              <React.Fragment key={result.key}>
                {result.section !== results[index - 1]?.section && (
                  <div className="command-group" role="presentation">
                    {result.section}
                  </div>
                )}
                <div
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={selected === index}
                  className={`command-result${result.chatUrl ? ' command-chat' : result.href ? '' : ' command-action'}`}
                  onMouseDown={event => event.preventDefault()}
                  onPointerMove={() => setActive(index)}
                  onClick={() => void activate(index)}
                >
                  <span className="command-result-icon">
                    <Icon name={result.icon} />
                  </span>
                  <div className="command-result-content">
                    <span className="command-title">
                      <Highlight text={result.title} query={query} />
                    </span>
                    {result.detail && (
                      <span className="command-detail">
                        <Highlight text={result.detail} query={result.chatUrl ? '' : query} />
                      </span>
                    )}
                    {query.trim() && result.description && (
                      <span className="command-description">
                        <Highlight text={result.description} query={query} />
                      </span>
                    )}
                  </div>
                  <span className="command-result-tail" aria-hidden="true">
                    {result.chatUrl ? (
                      <Icon name="external" className="command-external" />
                    ) : (
                      <span className="command-enter">↵</span>
                    )}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          {status && (
            <div className="command-feedback" role="status">
              {status}
            </div>
          )}
          <footer className="command-footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> Navigate
            </span>
            <span>
              <kbd>↵</kbd> {results[selected]?.chatUrl ? 'Ask' : 'Open'}
            </span>
            <span className="command-count" role={status ? undefined : 'status'}>
              {entries ? `${results.length} results` : ''}
            </span>
          </footer>
        </div>
      </dialog>
    </>
  )
}
