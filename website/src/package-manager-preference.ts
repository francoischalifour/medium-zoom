export const packageManagerPreference = {
  storageKey: 'medium-zoom-package-manager',
  values: ['npm', 'pnpm', 'yarn', 'bun'],
  fallback: 'npm',
} as const

export type PackageManager = (typeof packageManagerPreference.values)[number]

// Also runs inline in the document head. Keep this function self-contained.
export function restorePackageManager(preference: typeof packageManagerPreference): PackageManager {
  let value = document.documentElement.dataset.packageManager
  try {
    value = localStorage.getItem(preference.storageKey) ?? preference.fallback
  } catch {
    // Preserve the current document preference when browser storage is unavailable.
  }
  const manager = preference.values.find(manager => manager === value) ?? preference.fallback
  document.documentElement.dataset.packageManager = manager
  return manager
}
