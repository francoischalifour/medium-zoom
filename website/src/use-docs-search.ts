import { useEffect, useState } from 'react'

import type { DocsSearch } from './docs-search'

type DocsSearchState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; search: DocsSearch }

export function useDocsSearch(open: boolean): DocsSearchState {
  const [state, setState] = useState<DocsSearchState>({ status: 'idle' })
  const search = state.status === 'ready' ? state.search : null

  useEffect(() => {
    if (!open || search) {
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    import('virtual:docs-search').then(
      module => {
        if (!cancelled) {
          setState({ status: 'ready', search: module.default })
        }
      },
      () => {
        if (!cancelled) {
          setState({ status: 'error' })
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [open, search])

  return state
}
