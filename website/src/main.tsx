import './site.css'

const pendingActions: (() => void)[] = []
const listeners = new AbortController()
let hydrationStarted = false

function startHydration() {
  if (hydrationStarted) {
    return
  }
  hydrationStarted = true
  void import('./hydrate')
    .then(({ hydrateSite }) => hydrateSite())
    .finally(() => {
      // Release native actions even if the enhancement cannot load.
      listeners.abort()
      for (const replay of pendingActions) {
        replay()
      }
      pendingActions.length = 0
    })
}

function deferInteraction(event: Event, target: Node, replay: () => void) {
  event.preventDefault()
  event.stopImmediatePropagation()
  pendingActions.push(() => {
    if (target.isConnected) {
      replay()
    }
  })
  startHydration()
}

function isExternalLink(link: HTMLAnchorElement) {
  const url = new URL(link.href)
  return ['http:', 'https:'].includes(url.protocol) && url.origin !== location.origin
}

function deferClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) {
    return
  }
  const target = event.target.closest<HTMLElement>('button, input[type="radio"], a[href]')
  if (!target || (target instanceof HTMLAnchorElement && !isExternalLink(target))) {
    return
  }
  deferInteraction(event, target, () => {
    target.dispatchEvent(new MouseEvent('click', event))
  })
}

function deferKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    deferInteraction(event, document, () => {
      document.dispatchEvent(new KeyboardEvent('keydown', event))
    })
    return
  }
  if (!(event.target instanceof Element)) {
    return
  }
  const target = event.target.closest<HTMLElement>('button, a[href]')
  if (!target) {
    return
  }
  if (target instanceof HTMLAnchorElement && (!isExternalLink(target) || event.key !== 'Enter')) {
    return
  }

  const activatesControl = event.key === 'Enter' || event.key === ' '
  const navigatesTabs =
    target.getAttribute('role') === 'tab' &&
    ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  if (!activatesControl && !navigatesTabs) {
    return
  }
  deferInteraction(event, target, () => {
    const useDefaultAction = target.dispatchEvent(new KeyboardEvent('keydown', event))
    if (useDefaultAction && activatesControl) {
      target.click()
    }
  })
}

function deferRadioChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || target.type !== 'radio') {
    return
  }
  // Arrow keys change native radios before React owns their selected state.
  deferInteraction(event, target, () => target.click())
}

const options = { capture: true, signal: listeners.signal }
document.addEventListener('click', deferClick, options)
document.addEventListener('keydown', deferKeyDown, options)
document.addEventListener('change', deferRadioChange, options)

// Development has no prerendered content to paint before hydration.
if (!document.getElementById('root')?.hasChildNodes()) {
  startHydration()
} else if (PerformanceObserver.supportedEntryTypes.includes('paint')) {
  const observer = new PerformanceObserver(entries => {
    if (!entries.getEntries().some(entry => entry.name === 'first-contentful-paint')) {
      return
    }
    observer.disconnect()
    startHydration()
  })
  observer.observe({ type: 'paint', buffered: true })

  // Bound the wait for browsers that omit paint timing on some navigations.
  const startAfterLoad = () => {
    window.setTimeout(() => {
      observer.disconnect()
      startHydration()
    }, 1_000)
  }
  if (document.readyState === 'complete') {
    startAfterLoad()
  } else {
    window.addEventListener('load', startAfterLoad, { once: true })
  }
} else {
  requestAnimationFrame(() => requestAnimationFrame(startHydration))
}
