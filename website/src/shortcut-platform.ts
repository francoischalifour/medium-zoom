// Also runs inline in the document head. Keep this function self-contained.
export function restoreShortcutPlatform() {
  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.documentElement.dataset.shortcutPlatform = 'apple'
  }
}

export function usesAppleShortcuts() {
  return document.documentElement.dataset.shortcutPlatform === 'apple'
}
