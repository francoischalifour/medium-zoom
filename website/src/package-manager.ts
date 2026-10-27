import { useSyncExternalStore } from 'react'

import {
  packageManagerPreference,
  restorePackageManager,
  type PackageManager,
} from './package-manager-preference'
export type { PackageManager } from './package-manager-preference'
export const packageManagers = packageManagerPreference.values
const changeEvent = 'medium-zoom:package-manager'

export function getPackageManager(): PackageManager {
  const value = document.documentElement.dataset.packageManager
  return packageManagers.find(manager => manager === value) ?? packageManagerPreference.fallback
}

export function getServerPackageManager(): PackageManager {
  return packageManagerPreference.fallback
}

export function setPackageManager(manager: PackageManager) {
  document.documentElement.dataset.packageManager = manager
  try {
    localStorage.setItem(packageManagerPreference.storageKey, manager)
  } catch {
    // Keep the current page usable when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent))
}

export function subscribePackageManager(onChange: () => void) {
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  const restore = () => {
    restorePackageManager(packageManagerPreference)
    onChange()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === packageManagerPreference.storageKey || event.key === null) {
      restore()
    }
  }
  window.addEventListener(changeEvent, onChange, options)
  window.addEventListener('storage', onStorage, options)
  window.addEventListener('pageshow', restore, options)
  return () => listeners.abort()
}

export function usePackageManager() {
  return useSyncExternalStore(subscribePackageManager, getPackageManager, getServerPackageManager)
}
