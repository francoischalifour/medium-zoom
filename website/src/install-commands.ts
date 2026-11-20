import type { SitePage } from './site-data.ts'
import { siteOrigin } from './site-url.ts'

export const registryUrl = `${siteOrigin}/r/image-zoom.json`

// The shadcn registry index maps the @medium-zoom namespace to this site's /r/{name}.json.
export const registryItem = '@medium-zoom/image-zoom'

export const javascriptCommands = {
  npm: 'npm install medium-zoom',
  pnpm: 'pnpm add medium-zoom',
  yarn: 'yarn add medium-zoom',
  bun: 'bun add medium-zoom',
}

export const componentCommands = {
  npm: `npx shadcn@latest add ${registryItem}`,
  pnpm: `pnpm dlx shadcn@latest add ${registryItem}`,
  yarn: `yarn dlx shadcn@latest add ${registryItem}`,
  bun: `bunx shadcn@latest add ${registryItem}`,
}

// The install command each product page offers.
export const installCommands = {
  javascript: javascriptCommands,
  react: componentCommands,
} satisfies Record<SitePage, Record<string, string>>
