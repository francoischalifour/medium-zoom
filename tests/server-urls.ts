import { connect } from 'node:net'

// Browser checks run four servers on consecutive ports: fixtures, Svelte, shadcn, and Next.js.
const testPortEnv = 'MEDIUM_ZOOM_TEST_PORT'
const defaultTestPort = 4_175
const testPortCount = 4

function serverUrls(testPort: number) {
  return {
    testPort,
    testUrl: `http://127.0.0.1:${testPort}`,
    sveltePort: testPort + 1,
    svelteDevUrl: `http://127.0.0.1:${testPort + 1}/examples/svelte/`,
    shadcnPort: testPort + 2,
    shadcnDevUrl: `http://127.0.0.1:${testPort + 2}/examples/shadcn/`,
    rscPort: testPort + 3,
    rscUrl: `http://127.0.0.1:${testPort + 3}`,
  }
}

const attempts = 50

function isListening(port: number) {
  return new Promise<boolean>(resolve => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function isFreeRange(start: number) {
  const ports = Array.from(
    { length: testPortCount },
    (_, offset) => start + offset
  )
  const listening = await Promise.all(ports.map(isListening))
  return !listening.includes(true)
}

async function findFreeRange() {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const start = defaultTestPort + attempt * 10
    if (await isFreeRange(start)) {
      return start
    }
  }
  throw new Error(
    `No free test ports from ${defaultTestPort}. Set ${testPortEnv} to a free port range.`
  )
}

/**
 * Picks the first free block of test ports so concurrent worktrees don't collide.
 * Playwright loads the config again in each worker; the environment keeps them on the same ports.
 */
export async function reserveTestPorts() {
  process.env[testPortEnv] ??= String(await findFreeRange())
  return serverUrls(Number(process.env[testPortEnv]))
}

// Playwright configs reserve free ports and pass them to workers and servers through the environment.
export const {
  testPort,
  testUrl,
  svelteDevUrl,
  shadcnDevUrl,
  rscPort,
  rscUrl,
} = serverUrls(Number(process.env[testPortEnv] ?? defaultTestPort))
