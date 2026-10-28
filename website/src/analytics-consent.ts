export type AnalyticsConsent = 'granted' | 'denied'
const storageKey = 'medium-zoom:analytics-consent'
const changeEvent = 'medium-zoom:analytics-consent'
let unsavedConsent: AnalyticsConsent | undefined

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (unsavedConsent !== undefined) {
    return unsavedConsent
  }
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    localStorage.setItem(storageKey, consent)
    unsavedConsent = undefined
  } catch {
    // Honor the choice for this page even when storage is unavailable.
    unsavedConsent = consent
  }
  window.dispatchEvent(new Event(changeEvent))
}

export function subscribeAnalyticsConsent(onChange: () => void) {
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  window.addEventListener(changeEvent, onChange, options)
  window.addEventListener('pageshow', onChange, options)
  window.addEventListener(
    'storage',
    event => {
      if (event.key === storageKey || event.key === null) {
        unsavedConsent = undefined
        onChange()
      }
    },
    options
  )
  return () => listeners.abort()
}
