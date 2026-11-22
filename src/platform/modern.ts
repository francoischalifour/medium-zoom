import type { ZoomInstance } from '@/zoom/engine'

type ZoomEventDetail = { zoom: ZoomInstance; reason?: string; event?: Event }

export const getPromise = (): PromiseConstructor => Promise

export const createCustomEvent = (
  type: string,
  detail: ZoomEventDetail
): CustomEvent<ZoomEventDetail> => {
  return new CustomEvent(type, { detail })
}

export const getScrollX = (): number => window.scrollX
export const getScrollY = (): number => window.scrollY

export const isEscape = (event: KeyboardEvent): boolean =>
  event.key === 'Escape'

// Each call matches its own query, so its single handler slot is free.
export const listenForMotionChange = (
  listener: (change: { matches: boolean }) => void
): (() => void) => {
  const query = matchMedia('(prefers-reduced-motion)')
  query.onchange = listener
  return () => (query.onchange = null)
}

export const assign: typeof Object.assign = Object.assign

// Tells a transition running behind wall time from one that ended or never started.
export const hasAnimations = true
export const findRunningTransform = (image: Element): Animation | undefined =>
  image
    .getAnimations()
    .find(
      animation =>
        (animation as CSSTransition).transitionProperty == 'transform'
    )

export const getViewportScale = (): number => visualViewport!.scale
