import type { Plugin } from 'vite'

import {
  packageManagerPreference,
  restorePackageManager,
} from '../src/package-manager-preference.ts'
import { restoreTheme, themeKey } from '../src/site-theme.ts'

export function sitePreferences(): Plugin {
  return {
    name: 'medium-zoom-site-preferences',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `(${restoreTheme.toString()})(${JSON.stringify(themeKey)});(${restorePackageManager.toString()})(${JSON.stringify(packageManagerPreference)})`,
          injectTo: 'head',
        },
      ]
    },
  }
}
