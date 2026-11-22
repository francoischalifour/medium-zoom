import { useEffect, useRef, useState } from 'react'

import { trackSiteEvent } from './site-analytics'

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

export function useCommandQuery(open: boolean) {
  const [query, setQuery] = useState('')
  const settledQuery = useRef('')

  // Settled queries update the URL and count as searches, including ones opened from a `?q=` link.
  function settleSearch(value: string) {
    const searchTerm = value.trim()
    replaceSearchQuery(searchTerm)
    if (searchTerm === settledQuery.current) {
      return
    }
    settledQuery.current = searchTerm
    if (searchTerm) {
      trackSiteEvent('Searched', { search_term: searchTerm })
    }
  }
  useEffect(() => {
    if (!open) {
      return
    }
    const timer = window.setTimeout(() => settleSearch(query), 300)
    return () => window.clearTimeout(timer)
  }, [open, query])

  return { query, setQuery, settleSearch }
}
