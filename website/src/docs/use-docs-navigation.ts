import { useEffect, useState } from 'react'

export function useDocsNavigation(path: string) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const article = document.querySelector('.docs-article')!
    const headings = [...article.querySelectorAll<HTMLElement>('h2[id]')]
    let pending: HTMLElement | null = null
    let highlighted: HTMLElement | null = null
    let focusDestination = false
    let settleTimer = 0
    let highlightTimer = 0
    let frame = 0
    let restoreTabIndex = () => {}

    const updateActive = () => {
      frame = 0
      const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
      let current = ''
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > offset + 8) break
        current = heading.id
      }
      // The last section may be too short to reach the top of the viewport.
      if (
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      ) {
        current = headings.at(-1)?.id || current
      }
      setActiveId(current)
    }
    const clearHighlight = () => {
      window.clearTimeout(highlightTimer)
      highlighted?.removeAttribute('data-anchor-arrival')
      highlighted = null
    }
    const arrive = () => {
      window.clearTimeout(settleTimer)
      if (!pending) return
      const target = pending
      const shouldFocus = focusDestination
      pending = null
      focusDestination = false
      const bounds = target.getBoundingClientRect()
      if (bounds.bottom < 0 || bounds.top >= window.innerHeight) return
      // Older deep links can point at empty compatibility markers.
      let content = target
      while (content.matches('div:empty') && content.nextElementSibling instanceof HTMLElement) {
        content = content.nextElementSibling
      }
      highlighted = content
      content.setAttribute('data-anchor-arrival', '')
      if (shouldFocus && !target.matches('div:empty')) {
        restoreTabIndex()
        // Keep focus until the reader moves on, without adding a tab stop.
        const tabindex = target.getAttribute('tabindex')
        restoreTabIndex = () => {
          target.removeEventListener('blur', restoreTabIndex)
          if (tabindex === null) target.removeAttribute('tabindex')
          else target.setAttribute('tabindex', tabindex)
        }
        target.setAttribute('tabindex', '-1')
        target.addEventListener('blur', restoreTabIndex, { once: true })
        target.focus({ preventScroll: true })
      }
      highlightTimer = window.setTimeout(clearHighlight, 1_800)
    }
    const scheduleArrival = (hash: string, focus = false) => {
      clearHighlight()
      window.clearTimeout(settleTimer)
      pending = null
      focusDestination = focus
      let id: string
      try {
        id = decodeURIComponent(hash.slice(1))
      } catch {
        return
      }
      const target = document.getElementById(id)
      pending = target instanceof HTMLElement && article.contains(target) ? target : null
      // Covers instant navigation, repeated anchors, and browsers without scrollend.
      if (pending) settleTimer = window.setTimeout(arrive, 160)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActive)
      if (pending) {
        window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(arrive, 160)
      }
    }
    const onHashChange = () => scheduleArrival(window.location.hash, focusDestination)
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      const url = new URL(link.href)
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        url.search !== location.search ||
        !url.hash
      )
        return
      const menu = link.closest<HTMLDetailsElement>('.docs-mobile-navigation details')
      if (menu) menu.open = false
      scheduleArrival(url.hash, true)
    }
    const onLoad = () => scheduleArrival(window.location.hash)

    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scrollend', arrive)
    window.addEventListener('resize', onScroll)
    window.addEventListener('load', onLoad)
    updateActive()
    if (document.readyState === 'complete') onLoad()

    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scrollend', arrive)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('load', onLoad)
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      clearHighlight()
      restoreTabIndex()
    }
  }, [path])

  return activeId
}
