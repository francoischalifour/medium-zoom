import { useEffect, useRef, useState } from 'react'

import { ScrollArea, revealInScrollArea } from '../scroll-area'
import { Icon } from '../site-components'

type OutlineItem = { title: string; id: string }

export function DocsOutline({
  outline,
  activeId,
  onSelect,
}: {
  outline: OutlineItem[]
  activeId: string
  onSelect?: () => void
}) {
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="location"]')
    if (active) {
      revealInScrollArea(active)
    }
  }, [activeId])

  return (
    <nav ref={navRef} className="docs-contents" aria-label="On this page">
      <p className="docs-contents-title">On this page</p>
      {outline.map(item => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={activeId === item.id ? 'location' : undefined}
          onClick={onSelect}
        >
          {item.title}
        </a>
      ))}
    </nav>
  )
}

// The outline column only fits wide screens, so narrower ones open it from the breadcrumb.
export function DocsOutlineMenu({
  outline,
  activeId,
}: {
  outline: OutlineItem[]
  activeId: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const root = rootRef.current!
    const currentLink =
      root.querySelector<HTMLElement>('.docs-contents [aria-current]') ??
      root.querySelector<HTMLElement>('.docs-contents a')
    currentLink?.focus()
    const listeners = new AbortController()
    document.addEventListener(
      'pointerdown',
      event => {
        if (!root.contains(event.target as Node)) {
          setOpen(false)
        }
      },
      { signal: listeners.signal }
    )
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') {
          setOpen(false)
          buttonRef.current?.focus()
        }
      },
      { signal: listeners.signal }
    )
    root.addEventListener(
      'focusout',
      event => {
        if (event.relatedTarget instanceof Node && !root.contains(event.relatedTarget)) {
          setOpen(false)
        }
      },
      { signal: listeners.signal }
    )
    return () => listeners.abort()
  }, [open])

  return (
    <div ref={rootRef} className="docs-outline-menu">
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-label="On this page"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <Icon name="ellipsis" width={16} height={16} />
      </button>
      {open && (
        <ScrollArea className="docs-outline-menu-panel">
          <DocsOutline outline={outline} activeId={activeId} onSelect={() => setOpen(false)} />
        </ScrollArea>
      )}
    </div>
  )
}
