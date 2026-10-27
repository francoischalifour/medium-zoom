import { useEffect, useRef, useState } from 'react'

function focusAnchorTarget(target: HTMLElement) {
  const previousTabIndex = target.getAttribute('tabindex')
  const restoreTabIndex = () => {
    target.removeEventListener('blur', restoreTabIndex)
    if (previousTabIndex === null) {
      target.removeAttribute('tabindex')
    } else {
      target.setAttribute('tabindex', previousTabIndex)
    }
  }
  target.setAttribute('tabindex', '-1')
  target.addEventListener('blur', restoreTabIndex, { once: true })
  target.focus({ preventScroll: true })
  return restoreTabIndex
}

export function useDocsNavigation(path: string) {
  const articleRef = useRef<HTMLElement>(null)
  const [activeHeadingId, setActiveHeadingId] = useState('')

  useEffect(() => {
    const headings = [...articleRef.current!.querySelectorAll<HTMLElement>('h2[id]')]
    let frame = 0
    const updateActiveHeading = () => {
      frame = 0
      const offset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
      let currentId = ''
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > offset + 8) {
          break
        }
        currentId = heading.id
      }
      // The last section may be too short to reach the top of the viewport.
      if (
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      ) {
        currentId = headings.at(-1)?.id || currentId
      }
      setActiveHeadingId(currentId)
    }
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateActiveHeading)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    updateActiveHeading()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.cancelAnimationFrame(frame)
    }
  }, [path])

  useEffect(() => {
    const article = articleRef.current!
    let pendingDestination: { element: HTMLElement; focusAfterScroll: boolean } | null = null
    let highlightedElement: HTMLElement | null = null
    let scrollIdleTimer = 0
    let highlightTimer = 0
    let restoreTargetFocus: (() => void) | undefined

    const clearHighlight = () => {
      window.clearTimeout(highlightTimer)
      highlightedElement?.removeAttribute('data-anchor-arrival')
      highlightedElement = null
    }
    const showDestination = () => {
      window.clearTimeout(scrollIdleTimer)
      const destination = pendingDestination
      pendingDestination = null
      if (!destination) {
        return
      }
      const { element: target, focusAfterScroll } = destination
      const bounds = target.getBoundingClientRect()
      if (bounds.bottom < 0 || bounds.top >= window.innerHeight) {
        return
      }
      // Older deep links can point at empty compatibility markers.
      let highlightTarget = target
      while (
        highlightTarget.matches('div:empty') &&
        highlightTarget.nextElementSibling instanceof HTMLElement
      ) {
        highlightTarget = highlightTarget.nextElementSibling
      }
      highlightedElement = highlightTarget
      highlightTarget.setAttribute('data-anchor-arrival', '')
      if (focusAfterScroll && !target.matches('div:empty')) {
        restoreTargetFocus?.()
        restoreTargetFocus = focusAnchorTarget(target)
      }
      highlightTimer = window.setTimeout(clearHighlight, 1_800)
    }
    const waitForScroll = () => {
      if (!pendingDestination) {
        return
      }
      window.clearTimeout(scrollIdleTimer)
      scrollIdleTimer = window.setTimeout(showDestination, 160)
    }
    const scheduleArrival = (hash: string, focusAfterScroll = false) => {
      const previousDestination = pendingDestination
      pendingDestination = null
      clearHighlight()
      window.clearTimeout(scrollIdleTimer)
      let id: string
      try {
        id = decodeURIComponent(hash.slice(1))
      } catch {
        return
      }
      const target = document.getElementById(id)
      if (!(target instanceof HTMLElement) || !article.contains(target)) {
        return
      }
      pendingDestination = {
        element: target,
        focusAfterScroll:
          focusAfterScroll ||
          (previousDestination?.element === target && previousDestination.focusAfterScroll),
      }
      waitForScroll()
    }
    const onHashChange = () => scheduleArrival(window.location.hash)
    const onLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) {
        return
      }
      const url = new URL(link.href)
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search ||
        !url.hash
      ) {
        return
      }
      const menu = link.closest<HTMLDetailsElement>('.docs-mobile-navigation details')
      if (menu) {
        menu.open = false
      }
      scheduleArrival(url.hash, true)
    }
    const onLoad = () => scheduleArrival(window.location.hash)

    document.addEventListener('click', onLinkClick)
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('scroll', waitForScroll, { passive: true })
    window.addEventListener('scrollend', showDestination)
    window.addEventListener('resize', waitForScroll)
    window.addEventListener('load', onLoad)
    if (document.readyState === 'complete') {
      onLoad()
    }

    return () => {
      document.removeEventListener('click', onLinkClick)
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('scroll', waitForScroll)
      window.removeEventListener('scrollend', showDestination)
      window.removeEventListener('resize', waitForScroll)
      window.removeEventListener('load', onLoad)
      window.clearTimeout(scrollIdleTimer)
      clearHighlight()
      restoreTargetFocus?.()
    }
  }, [path])

  return { articleRef, activeHeadingId }
}
