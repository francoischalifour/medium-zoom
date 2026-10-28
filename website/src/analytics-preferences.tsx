import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
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
  const [editing, setEditing] = useState(preview)
  const trigger = useRef<HTMLButtonElement>(null)
  const accept = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const available = (siteAnalyticsEnabled || preview) && consent !== undefined
  const visible = available && (editing || consent === null)

  useEffect(() => {
    if (!visible || !panel.current) {
      return
    }
    const element = panel.current
    const root = document.documentElement
    const update = () => {
      const clearance =
        element.getBoundingClientRect().height +
        Number.parseFloat(getComputedStyle(element).bottom) +
        16
      root.style.setProperty('--analytics-consent-clearance', `${clearance}px`)
    }
    const revealFocus = (event: FocusEvent) => {
      const target = event.target
      if (
        !(target instanceof HTMLElement) ||
        element.contains(target) ||
        target.closest('dialog')
      ) {
        return
      }
      const focused = target.getBoundingClientRect()
      const panelBounds = element.getBoundingClientRect()
      if (
        focused.bottom > panelBounds.top &&
        focused.right > panelBounds.left &&
        focused.left < panelBounds.right
      ) {
        target.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)
    document.addEventListener('focusin', revealFocus)
    update()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      document.removeEventListener('focusin', revealFocus)
      root.style.removeProperty('--analytics-consent-clearance')
    }
  }, [visible])

  if (!available) {
    return null
  }

  function choose(value: 'granted' | 'denied') {
    setAnalyticsConsent(value)
    setEditing(false)
    if (editing) {
      trigger.current?.focus({ preventScroll: true })
    }
  }

  return (
    <>
      <button
        ref={trigger}
        className="analytics-preferences"
        aria-expanded={visible}
        aria-controls="analytics-consent"
        onClick={() => {
          setEditing(true)
          requestAnimationFrame(() => accept.current?.focus({ preventScroll: true }))
        }}
      >
        Analytics preferences
      </button>
      {visible && (
        <section
          ref={panel}
          id="analytics-consent"
          className="analytics-consent"
          aria-label="Analytics preferences"
          aria-describedby="analytics-consent-description"
          onKeyDown={event => {
            if (event.key === 'Escape' && editing && consent !== null) {
              event.stopPropagation()
              setEditing(false)
              trigger.current?.focus({ preventScroll: true })
            }
          }}
        >
          <p className="analytics-consent-title">Help improve the project</p>
          <p id="analytics-consent-description">
            Allow analytics with Altertable to help us improve the library? Change your choice
            anytime in the footer.
          </p>
          <div className="analytics-consent-actions">
            <button onClick={() => choose('denied')}>No thanks</button>
            <button ref={accept} onClick={() => choose('granted')}>
              Accept
            </button>
          </div>
        </section>
      )}
    </>
  )
}
