export const themeKey = 'medium-zoom-theme'
const themeEvent = 'medium-zoom:theme'

// Keep this self-contained because the build embeds it in the document head.
export function restoreTheme(key: string) {
  let theme: string | null = null
  try {
    theme = localStorage.getItem(key)
  } catch {
    // System appearance still applies when storage is unavailable.
  }
  const dark =
    theme === 'dark' ||
    (!theme && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  // Docspot reads `data-theme`, so its overlay and scrollbars follow the site rather than the system.
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function getTheme() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  )
}

export function getServerTheme() {
  return false
}

export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  try {
    localStorage.setItem(themeKey, dark ? 'dark' : 'light')
  } catch {}
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
