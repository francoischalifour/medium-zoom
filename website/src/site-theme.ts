const themeKey = 'medium-zoom-theme'
const themeEvent = 'medium-zoom:theme'

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
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const syncPreference = () => {
    let theme: string | null = null
    try {
      theme = localStorage.getItem(themeKey)
    } catch {}
    document.documentElement.classList.toggle('dark', theme === 'dark' || (!theme && media.matches))
    onChange()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeKey && event.key !== null) {
      return
    }
    syncPreference()
  }
  window.addEventListener(themeEvent, onChange)
  window.addEventListener('storage', onStorage)
  window.addEventListener('pageshow', syncPreference)
  media.addEventListener('change', syncPreference)
  return () => {
    window.removeEventListener(themeEvent, onChange)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pageshow', syncPreference)
    media.removeEventListener('change', syncPreference)
  }
}
