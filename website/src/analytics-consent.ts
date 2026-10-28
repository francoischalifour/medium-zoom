export type AnalyticsConsent = 'granted' | 'denied' | null
const storageKey = 'medium-zoom:analytics-consent'
const changeEvent = 'medium-zoom:analytics-consent'
let memoryConsent: AnalyticsConsent | undefined

export function getAnalyticsConsent(): AnalyticsConsent {
  if (memoryConsent !== undefined) {
    return memoryConsent
  }
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function setAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>) {
  try {
    localStorage.setItem(storageKey, consent)
    memoryConsent = undefined
  } catch {
    // Honor the choice for this page even when storage is unavailable.
    memoryConsent = consent
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
        memoryConsent = undefined
        onChange()
      }
    },
    options
  )
  return () => listeners.abort()
}
