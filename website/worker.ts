import packageJson from '../package.json' with { type: 'json' }
import registry from '../registry.json' with { type: 'json' }
import { siteOrigin } from './src/site-url.ts'

const componentPaths = new Map(registry.items.map(item => [`/r/${item.name}.json`, item.name]))

async function trackDownload(apiKey: string, component: string, path: string) {
  try {
    const response = await fetch('https://api.altertable.ai/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(2_000),
      body: JSON.stringify([
        {
          // Audience events count downloads without identifying a developer, device, or project.
          mode: 'audience',
          event: 'Registry Component Downloaded',
          timestamp: new Date().toISOString(),
          properties: {
            site: 'medium-zoom',
            component,
            version: packageJson.version,
            path,
            status: 200,
          },
        },
      ]),
    })
    await response.body?.cancel()
    if (!response.ok) {
      console.warn('Registry analytics delivery failed', { status: response.status })
    }
  } catch {
    console.warn('Registry analytics delivery failed')
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: Pick<ExecutionContext, 'waitUntil'>) {
    const response = await env.ASSETS.fetch(request)
    const url = new URL(request.url)
    const component = componentPaths.get(url.pathname)
    if (
      request.method === 'GET' &&
      url.origin === siteOrigin &&
      component &&
      response.status === 200 &&
      env.ALTERTABLE_API_KEY
    ) {
      ctx.waitUntil(trackDownload(env.ALTERTABLE_API_KEY, component, url.pathname))
    }
    return response
  },
} satisfies ExportedHandler<Env>
