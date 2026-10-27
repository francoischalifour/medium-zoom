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
  const restore = () => {
    restorePackageManager(packageManagerPreference)
    onChange()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === packageManagerPreference.storageKey || event.key === null) {
      restore()
    }
  }
  window.addEventListener(changeEvent, onChange)
  window.addEventListener('storage', onStorage)
  window.addEventListener('pageshow', restore)
  return () => {
    window.removeEventListener(changeEvent, onChange)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pageshow', restore)
  }
}

export function usePackageManager() {
  return useSyncExternalStore(subscribePackageManager, getPackageManager, getServerPackageManager)
}
