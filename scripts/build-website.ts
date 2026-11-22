/**
 * Builds the website, the API stories, and the examples on the current library build.
 * `bun run build:website` builds the library first.
 */
const run = async (...command: string[]) => {
  const child = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit' })
  if ((await child.exited) !== 0) {
    throw new Error(`${command.join(' ')} failed`)
  }
}

await run('bun', 'scripts/build-registry.ts')
// The site build empties website/dist; stories and examples then add their folders.
await run('bunx', 'vite', 'build', 'website')
await run('bun', 'scripts/prerender-website.ts')
await Promise.all([
  run('bunx', 'vite', 'build', 'stories'),
  run('bun', 'scripts/build-examples.ts'),
])

export {}
