export const packageManagerPreference = {
  storageKey: 'medium-zoom-package-manager',
  values: ['npm', 'pnpm', 'yarn', 'bun'],
  fallback: 'npm',
} as const

export type PackageManager = (typeof packageManagerPreference.values)[number]

// Keep this self-contained because the build embeds it in the document head.
export function restorePackageManager(
  preference: typeof packageManagerPreference
): PackageManager {
  let value = document.documentElement.dataset.packageManager
  try {
    value = localStorage.getItem(preference.storageKey) ?? preference.fallback
  } catch {
    // Preserve the current document preference when browser storage is unavailable.
  }
  const manager =
    preference.values.find(manager => manager === value) ?? preference.fallback
  document.documentElement.dataset.packageManager = manager
  return manager
}
