// Browser checks run four servers on consecutive ports: fixtures, Svelte, shadcn, and Next.js.
export const testPortEnv = 'MEDIUM_ZOOM_TEST_PORT'
export const defaultTestPort = 4_175
export const testPortCount = 4

export function serverUrls(testPort: number) {
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

// Playwright configs reserve free ports and pass them to workers and servers through the environment.
export const { testPort, testUrl, svelteDevUrl, shadcnDevUrl } = serverUrls(
  Number(process.env[testPortEnv] ?? defaultTestPort)
)
