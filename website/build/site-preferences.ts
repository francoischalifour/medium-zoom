import type { Plugin } from 'vite'
import { packageManagerPreference, restorePackageManager } from '../src/package-manager-preference'

export function sitePreferences(): Plugin {
  return {
    name: 'medium-zoom-site-preferences',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `(${restorePackageManager.toString()})(${JSON.stringify(packageManagerPreference)})`,
          injectTo: 'head',
        },
      ]
    },
  }
}
