export const registryUrl = 'https://medium-zoom.francoischalifour.com/r/image-zoom.json'

export const libraryCommands = {
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
