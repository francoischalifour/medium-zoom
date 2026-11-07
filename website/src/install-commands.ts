import type { SitePage } from './site-data.ts'
import { siteOrigin } from './site-url.ts'

export const registryUrl = `${siteOrigin}/r/image-zoom.json`

export const javascriptCommands = {
  npm: 'npm install medium-zoom',
  pnpm: 'pnpm add medium-zoom',
  yarn: 'yarn add medium-zoom',
  bun: 'bun add medium-zoom',
}

export const componentCommands = {
  npm: `npx shadcn@latest add ${registryUrl}`,
  pnpm: `pnpm dlx shadcn@latest add ${registryUrl}`,
  yarn: `yarn dlx shadcn@latest add ${registryUrl}`,
  bun: `bunx shadcn@latest add ${registryUrl}`,
}

// The install command each product page offers.
export const installCommands = {
  javascript: javascriptCommands,
  react: componentCommands,
} satisfies Record<SitePage, Record<string, string>>
