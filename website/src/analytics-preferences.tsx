import { useEffect, useRef, useState, useSyncExternalStore, type ComponentRef } from 'react'

import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
} from './analytics-consent'
import { siteAnalyticsEnabled } from './site-analytics'

const getServerConsent = () => undefined

export function AnalyticsPreferences() {
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsent,
    getServerConsent
  )
  const preview =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('analytics-consent') === 'preview'
  const [preferencesOpen, setPreferencesOpen] = useState(preview)
  const preferencesButton = useRef<ComponentRef<'button'>>(null)

  if ((!siteAnalyticsEnabled && !preview) || consent === undefined) {
    return null
  }
  const panelVisible = preferencesOpen || consent === null

  function closePreferences() {
    setPreferencesOpen(false)
    if (preferencesOpen) {
      preferencesButton.current?.focus({ preventScroll: true })
    }
  }

  function saveConsent(choice: AnalyticsConsent) {
    setAnalyticsConsent(choice)
    closePreferences()
  }

  return (
    <>
      <button
        ref={preferencesButton}
        className="analytics-preferences"
        aria-expanded={panelVisible}
        aria-controls="analytics-consent"
        onClick={() => setPreferencesOpen(true)}
      >
        Analytics preferences
      </button>
      {panelVisible && (
        <AnalyticsConsentPanel
          focusOnOpen={preferencesOpen}
          onChoose={saveConsent}
          onDismiss={consent === null ? undefined : closePreferences}
        />
      )}
    </>
  )
}

function AnalyticsConsentPanel({
  focusOnOpen,
  onChoose,
  onDismiss,
}: {
  focusOnOpen: boolean
  onChoose: (consent: AnalyticsConsent) => void
  onDismiss?: () => void
}) {
  const panel = useRef<ComponentRef<'section'>>(null)
  const acceptButton = useRef<ComponentRef<'button'>>(null)

  useEffect(() => {
    if (focusOnOpen) {
      acceptButton.current?.focus({ preventScroll: true })
    }
  }, [focusOnOpen])

  useEffect(() => {
    const panelElement = panel.current!
    const root = document.documentElement
    const listeners = new AbortController()
    const updateClearance = () => {
      const clearance =
        panelElement.getBoundingClientRect().height +
        Number.parseFloat(getComputedStyle(panelElement).bottom) +
        16
      root.style.setProperty('--analytics-consent-clearance', `${clearance}px`)
    }
    const keepFocusedControlVisible = (event: FocusEvent) => {
      const target = event.target
      if (
        !(target instanceof HTMLElement) ||
        panelElement.contains(target) ||
        target.closest('dialog')
      ) {
        return
      }
      const controlBounds = target.getBoundingClientRect()
      const panelBounds = panelElement.getBoundingClientRect()
      if (
        controlBounds.bottom > panelBounds.top &&
        controlBounds.right > panelBounds.left &&
        controlBounds.left < panelBounds.right
      ) {
        target.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    }
    const observer = new ResizeObserver(updateClearance)
    observer.observe(panelElement)
    window.addEventListener('resize', updateClearance, { signal: listeners.signal })
    document.addEventListener('focusin', keepFocusedControlVisible, { signal: listeners.signal })
    updateClearance()
    return () => {
      observer.disconnect()
      listeners.abort()
      root.style.removeProperty('--analytics-consent-clearance')
    }
  }, [])

  return (
    <section
      ref={panel}
      id="analytics-consent"
      className="analytics-consent"
      aria-label="Analytics preferences"
      aria-describedby="analytics-consent-description"
      onKeyDown={event => {
        if (event.key === 'Escape' && onDismiss) {
          event.stopPropagation()
          onDismiss()
        }
      }}
    >
      <p className="analytics-consent-title">Help improve the project</p>
      <p id="analytics-consent-description">
        Allow analytics with Altertable to help us improve the library? Change your choice anytime
        in the footer.
      </p>
      <div className="analytics-consent-actions">
        <button onClick={() => onChoose('denied')}>No thanks</button>
        <button ref={acceptButton} onClick={() => onChoose('granted')}>
          Accept
        </button>
      </div>
    </section>
  )
}
