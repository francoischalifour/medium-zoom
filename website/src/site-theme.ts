export const themeKey = 'medium-zoom-theme'
const themeEvent = 'medium-zoom:theme'

// Also runs inline in the document head. Keep this function self-contained.
export function restoreTheme(key: string) {
  let theme: string | null = null
  try {
    theme = localStorage.getItem(key)
  } catch {
    // System appearance still applies when storage is unavailable.
  }
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches)
  )
}

export function getTheme() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function getServerTheme() {
  return false
}

export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(themeKey, dark ? 'dark' : 'light')
  } catch {
    // The current page still works when storage is unavailable.
  }
  window.dispatchEvent(new Event(themeEvent))
}

export function subscribeTheme(onChange: () => void) {
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const syncPreference = () => {
    restoreTheme(themeKey)
    onChange()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeKey && event.key !== null) {
      return
    }
    syncPreference()
  }
  window.addEventListener(themeEvent, onChange, options)
  window.addEventListener('storage', onStorage, options)
  window.addEventListener('pageshow', syncPreference, options)
  media.addEventListener('change', syncPreference, options)
  return () => listeners.abort()
}
