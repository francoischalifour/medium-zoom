import type { Zoom } from '../types'

// Preserve v1's no-Promise behavior without installing a global polyfill.
// This executes the zoom lifecycle but does not implement promise chaining.
export const getPromise = (): PromiseConstructor =>
  window.Promise ||
  (function Promise(executor: (resolve: () => void, reject: () => void) => void) {
    function noop() {}
    executor(noop, noop)
  } as unknown as PromiseConstructor)

export const createCustomEvent = (
  type: string,
  detail: { zoom: Zoom }
): CustomEvent<{ zoom: Zoom }> => {
  if (typeof window.CustomEvent === 'function') {
    return new CustomEvent(type, { detail })
  }
  const event = document.createEvent('CustomEvent')
  event.initCustomEvent(type, false, false, detail)
  return event
}

export const getScrollX = (): number =>
  window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0

export const getScrollY = (): number =>
  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

export const isEscape = (event: KeyboardEvent): boolean => {
  const key = event.key || event.keyCode
  return key === 'Escape' || key === 'Esc' || key === 27
}

export const listenForMotionChange = (
  query: MediaQueryList,
  listener: () => void
): (() => void) => {
  query.addListener(listener)
  return () => query.removeListener(listener)
}
