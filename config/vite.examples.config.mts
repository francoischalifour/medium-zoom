import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfigFromFile, mergeConfig, type ConfigEnv, type UserConfig } from 'vite'

import { libraryConfig } from './vite.shared.config.mts'

export async function localExampleConfig({
  name,
  command,
}: {
  name: string
  command: ConfigEnv['command']
}): Promise<UserConfig> {
  const root = fileURLToPath(new URL(`../examples/${name}/`, import.meta.url))
  const mode = { build: 'production', serve: 'development' }[command]
  const loaded = await loadConfigFromFile({ command, mode }, resolve(root, 'vite.config.ts'), root)
  if (!loaded) {
    throw new Error(`Missing Vite config for ${name}`)
  }
  const config = mergeConfig(loaded.config, libraryConfig)
  const managed = mergeConfig(config, {
    configFile: false,
    root,
    envDir: fileURLToPath(new URL('../', import.meta.url)),
    base: `/examples/${name}/`,
    server: { host: '127.0.0.1' },
    build: {
      outDir: fileURLToPath(new URL(`../website/dist/examples/${name}/`, import.meta.url)),
      emptyOutDir: true,
    },
  })
  if (name === 'shadcn' && command === 'build') {
    // The website owns the public React integration page. This build adds its component fixture.
    managed.build!.emptyOutDir = false
    managed.build!.rolldownOptions!.input = { playground: resolve(root, 'playground.html') }
  }
  return managed
}
