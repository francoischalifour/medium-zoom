// Keep this self-contained because the build embeds it in the document head.
export function restoreShortcutPlatform() {
  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.documentElement.dataset.shortcutPlatform = 'apple'
  }
}

export function usesAppleShortcuts() {
  return document.documentElement.dataset.shortcutPlatform === 'apple'
}
