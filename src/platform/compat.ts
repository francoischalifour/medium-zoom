import type { ZoomInstance } from '@/zoom/types'

type ZoomEventDetail = { zoom: ZoomInstance; reason?: string; event?: Event }

// Preserve v1's no-Promise behavior without installing a global polyfill.
// This executes the zoom lifecycle but does not implement promise chaining.
export const getPromise = (): PromiseConstructor =>
  window.Promise ||
  (function Promise(
    executor: (resolve: () => void, reject: () => void) => void
  ) {
    function noop() {}
    executor(noop, noop)
  } as unknown as PromiseConstructor)

export const createCustomEvent = (
  type: string,
  detail: ZoomEventDetail
): CustomEvent<ZoomEventDetail> => {
  // One DOM event path works with and without a constructible CustomEvent (including IE10).
  const event = document.createEvent('CustomEvent')
  event.initCustomEvent(type, false, false, detail)
  return event
}

export const getScrollX = (): number =>
  window.pageXOffset ||
  document.documentElement.scrollLeft ||
  document.body.scrollLeft ||
  0

export const getScrollY = (): number =>
  window.pageYOffset ||
  document.documentElement.scrollTop ||
  document.body.scrollTop ||
  0

export const isEscape = (event: KeyboardEvent): boolean => {
  const key = event.key || event.keyCode
  return key === 'Escape' || key === 'Esc' || key === 27
}

// Listeners receive the query, or its change event in newer browsers: both carry `matches`.
export const listenForMotionChange = (
  listener: (change: { matches: boolean }) => void
): (() => void) => {
  const query = matchMedia('(prefers-reduced-motion)')
  query.addListener(listener)
  return () => query.removeListener(listener)
}

// Match the object-spread fallback without installing a global polyfill.
export const assign: typeof Object.assign =
  Object.assign ||
  function (target: Record<string, unknown>) {
    for (let index = 1; index < arguments.length; index++) {
      const source = arguments[index]
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key]
        }
      }
    }
    return target
  }

// Compatibility browsers lack getAnimations(): the zoom settles when its timer fires.
export const hasAnimations = false
export const findRunningTransform: (image: Element) => unknown = () => undefined

export const getViewportScale = (): number =>
  window.visualViewport ? window.visualViewport.scale : 1
