import { altertable, type Altertable, type EventProperties } from '@altertable/altertable-js'
import { getPackageManager } from './package-manager'
import { getSitePage } from './site-data'

const apiKey = import.meta.env.VITE_ALTERTABLE_API_KEY
const enabled =
  import.meta.env.PROD &&
  !!apiKey &&
  typeof window !== 'undefined' &&
  window.location.origin === 'https://medium-zoom.francoischalifour.com'
let initialized = false
let client: Altertable | null | undefined

function getClient() {
  if (client !== undefined) return client
  try {
    let lastPage: string | undefined
    let lastSearch = ''
    altertable.init(apiKey, {
      trackingConsent: 'granted',
      transformEvent(event) {
        const url = event.properties?.$url
        const path = new URL(typeof url === 'string' ? url : location.href).pathname
        const page = getSitePage(path)
        if (!page) return null
        if (event.event === '$pageview') {
          const query = typeof event.properties?.q === 'string' ? event.properties.q : ''
          // Query changes are searches; clearing search and following anchors are not pageviews.
          if (lastPage === path && (!query || lastSearch === query)) return null
          lastPage = path
          lastSearch = query
        }
        return {
          ...event,
          properties: {
            ...event.properties,
            site: 'medium-zoom',
            page,
            path,
            title: document.title,
          },
        }
      },
    })
    client = altertable
  } catch {
    client = null
  }
  return client
}

type SiteEvent = 'Install Command Copied' | 'Code Copied' | 'Image Zoomed' | 'Outbound Click'
export function trackSiteEvent(event: SiteEvent, properties: EventProperties = {}) {
  if (!enabled) return
  try {
    getClient()?.track(event, properties)
  } catch {
    // Analytics must not interrupt the website.
  }
}

export function trackInstallCopied() {
  trackSiteEvent('Install Command Copied', { package_manager: getPackageManager() })
}

export function initSiteAnalytics() {
  if (!enabled || initialized) return
  initialized = true
  const start = () => {
    getClient()
  }
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(start, { timeout: 3_000 })
  else if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })

  document.addEventListener(
    'medium-zoom:opened',
    event => {
      const image = event.target
      if (!(image instanceof HTMLImageElement) || !image.dataset.zoomable) return
      trackSiteEvent('Image Zoomed', {
        image: image.dataset.zoomable,
        rail: image.closest<HTMLElement>('[data-example-rail]')?.dataset.exampleRail,
      })
    },
    true
  )
  document.addEventListener('click', event => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return
    const link = event.target.closest('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    const url = new URL(link.href)
    if (!['https:', 'http:'].includes(url.protocol) || url.origin === location.origin) return
    trackSiteEvent('Outbound Click', {
      destination: `${url.origin}${url.pathname}`,
      placement: link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content',
    })
    // Start the SDK's keepalive delivery before a same-tab navigation unloads the page.
    void getClient()
      ?.flush()
      .catch(() => {})
  })
}
