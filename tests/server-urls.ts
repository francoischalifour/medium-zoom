export const testPort = Number(process.env.MEDIUM_ZOOM_TEST_PORT ?? 4_175)
export const testUrl = `http://127.0.0.1:${testPort}`
export const svelteDevUrl = `http://127.0.0.1:${testPort + 1}/examples/svelte/`
export const shadcnDevUrl = `http://127.0.0.1:${testPort + 2}/examples/shadcn/`
