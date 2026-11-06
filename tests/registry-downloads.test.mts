import assert from 'node:assert/strict'
import { test } from 'node:test'

import packageJson from '../package.json' with { type: 'json' }
import worker from '../website/worker.ts'

const origin = 'https://medium-zoom.francoischalifour.com'
const path = '/r/image-zoom.json'

function serve(
  request: Request,
  response = Response.json({ name: 'image-zoom' }),
  apiKey = 'test-key'
) {
  const pending: Promise<unknown>[] = []
  const env: Env = {
    ALTERTABLE_API_KEY: apiKey,
    ASSETS: {
      fetch: async () => response,
      connect() {
        throw new Error('Asset downloads must use fetch')
      },
    },
  }
  return {
    response,
    pending,
    result: worker.fetch(request, env, {
      waitUntil(promise) {
        pending.push(promise)
      },
    }),
  }
}

test('serves the original JSON while analytics is pending and sends only download metadata', async t => {
  let finishDelivery!: (response: Response) => void
  const delivery = new Promise<Response>(resolve => {
    finishDelivery = resolve
  })
  const ingest = t.mock.method(globalThis, 'fetch', () => delivery)
  t.after(() => ingest.mock.restore())
  const request = new Request(`${origin}${path}?secret=never-send`, {
    headers: { 'User-Agent': 'private-user-agent', 'CF-Connecting-IP': '192.0.2.1' },
  })
  const download = serve(request)
  const response = await download.result
  assert.equal(response, download.response)
  assert.deepEqual(await response.json(), { name: 'image-zoom' })
  assert.equal(download.pending.length, 1)
  assert.equal(ingest.mock.callCount(), 1)
  const [url, init] = ingest.mock.calls[0].arguments as [string, RequestInit]
  assert.equal(url, 'https://api.altertable.ai/track')
  assert.equal(init.method, 'POST')
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' })
  assert.equal(typeof init.body, 'string')
  const body = init.body as string
  const [event] = JSON.parse(body)
  assert.deepEqual(Object.keys(event).sort(), ['event', 'mode', 'properties', 'timestamp'])
  assert.equal(event.mode, 'audience')
  assert.equal(event.event, 'Registry Component Downloaded')
  assert.ok(!Number.isNaN(Date.parse(event.timestamp)))
  assert.deepEqual(event.properties, {
    site: 'medium-zoom',
    component: 'image-zoom',
    version: packageJson.version,
    path,
    status: 200,
  })
  assert.ok(!body.includes('never-send'))
  assert.ok(!body.includes('192.0.2.1'))
  assert.ok(!body.includes('private-user-agent'))
  finishDelivery(new Response(null, { status: 202 }))
  await Promise.all(download.pending)
})

test('ignores previews, index files, missing components, non-GET requests, and missing keys', async t => {
  const ingest = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 202 }))
  t.after(() => ingest.mock.restore())
  for (const [url, method, status, key] of [
    [`https://preview.workers.dev${path}`, 'GET', 200, 'test-key'],
    [`http://localhost:8787${path}`, 'GET', 200, 'test-key'],
    [`${origin}/r/registry.json`, 'GET', 200, 'test-key'],
    [`${origin}/r/unknown.json`, 'GET', 200, 'test-key'],
    [`${origin}/`, 'GET', 200, 'test-key'],
    [`${origin}${path}`, 'GET', 404, 'test-key'],
    [`${origin}${path}`, 'GET', 304, 'test-key'],
    [`${origin}${path}`, 'HEAD', 200, 'test-key'],
    [`${origin}${path}`, 'POST', 200, 'test-key'],
    [`${origin}${path}`, 'GET', 200, ''],
  ] as const) {
    const response = new Response(null, { status })
    const download = serve(new Request(url, { method }), response, key)
    assert.equal(await download.result, response)
    assert.equal(download.pending.length, 0, `${method} ${url} (${status})`)
  }
  assert.equal(ingest.mock.callCount(), 0)
})

test('analytics errors and rejected requests leave downloads successful', async t => {
  const warning = t.mock.method(console, 'warn', () => {})
  t.after(() => warning.mock.restore())
  for (const failure of [new Error('network unavailable'), new Response(null, { status: 503 })]) {
    const ingest = t.mock.method(globalThis, 'fetch', async () => {
      if (failure instanceof Error) {
        throw failure
      }
      return failure
    })
    const download = serve(new Request(`${origin}${path}`))
    assert.equal((await download.result).status, 200)
    await Promise.all(download.pending)
    ingest.mock.restore()
  }
  assert.equal(warning.mock.callCount(), 2)
})

test('a hanging analytics request is aborted without delaying the download', async t => {
  const warning = t.mock.method(console, 'warn', () => {})
  const ingest = t.mock.method(
    globalThis,
    'fetch',
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true })
      })
  )
  t.after(() => {
    ingest.mock.restore()
    warning.mock.restore()
  })
  // Keep Node alive while AbortSignal.timeout's unreferenced timer runs.
  const keepAlive = setInterval(() => {}, 10_000)
  t.after(() => clearInterval(keepAlive))
  const download = serve(new Request(`${origin}${path}`))
  assert.equal((await download.result).status, 200)
  assert.equal(warning.mock.callCount(), 0)
  await Promise.all(download.pending)
  assert.equal(warning.mock.callCount(), 1)
})
