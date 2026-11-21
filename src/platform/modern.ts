import type { ZoomInstance } from '../engine/create-zoom'

export const getPromise = (): PromiseConstructor => Promise

export const createCustomEvent = (
  type: string,
  detail: { zoom: ZoomInstance }
): CustomEvent<{ zoom: ZoomInstance }> => {
  return new CustomEvent(type, { detail })
}

export const getScrollX = (): number => window.scrollX
export const getScrollY = (): number => window.scrollY

export const isEscape = (event: KeyboardEvent): boolean =>
  event.key === 'Escape'

export const listenForMotionChange = (
  query: MediaQueryList,
  listener: () => void
): (() => void) => {
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

export const assign: typeof Object.assign = Object.assign
