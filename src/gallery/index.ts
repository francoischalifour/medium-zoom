// Import the branded types from core so consumers of both entries share the same type identity.
import type {
  CoreZoomOptions,
  ModalOpenOptions,
  ModalZoom,
  Zoom,
} from 'medium-zoom/core'

/**
 * Why the gallery moved to another image: its stock `previous-press` and `next-press`
 * buttons, `arrow-key`, `home-key` and `end-key` from `bindGalleryKeyboard()`, `swipe`
 * from `bindGalleryGestures()`, or `api` for a command called without a reason.
 */
export type GalleryChangeReason =
  | 'previous-press'
  | 'next-press'
  | 'arrow-key'
  | 'home-key'
  | 'end-key'
  | 'swipe'
  | 'api'

/** Options of the gallery's navigation commands. */
export interface GalleryNavigationOptions {
  /**
   * Why, as reported by the snapshot's `reason` once the image shows.
   *
   * @default 'api'
   */
  reason?: GalleryChangeReason
}

/** An immutable view of the gallery; a new object whenever anything in it changes. */
export interface GallerySnapshot {
  /** The zoom's images, in attach order. */
  readonly images: readonly HTMLElement[]
  /** The open image, or `null` while the zoom is closed. */
  readonly current: HTMLElement | null
  /** The index of `current` in `images`, or `-1` while the zoom is closed. */
  readonly index: number
  /** Whether `previous()` would open an image. */
  readonly canPrevious: boolean
  /** Whether `next()` would open an image. */
  readonly canNext: boolean
  /**
   * Why `current` last changed through the gallery's commands, or `null` when it changed
   * otherwise: when the zoom opened or closed, or opened an image directly.
   */
  readonly reason: GalleryChangeReason | null
}

/**
 * Headless traversal state and commands; compatible with React's `useSyncExternalStore`.
 * Navigation resolves without opening when there is nothing to open.
 */
export interface GalleryController<
  Options extends CoreZoomOptions = CoreZoomOptions,
> {
  /** Returns the current snapshot; the same object until something changes. */
  getSnapshot(this: void): GallerySnapshot
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(this: void, listener: () => void): () => void
  /** Opens the previous image. Bound as a listener, it reports the `api` reason. */
  previous(
    this: void,
    options?: GalleryNavigationOptions
  ): Promise<Zoom<Options>>
  /** Opens the next image. Bound as a listener, it reports the `api` reason. */
  next(this: void, options?: GalleryNavigationOptions): Promise<Zoom<Options>>
  /**
   * Opens the image at `index`; an index out of range resolves without opening. Pass
   * `{ instant: true }` when a gesture already shows the image in place.
   */
  select(
    this: void,
    index: number,
    options?: Omit<ModalOpenOptions, 'target'> & GalleryNavigationOptions
  ): Promise<Zoom<Options>>
  /**
   * Releases this handle: its subscriptions end and its commands stop opening images. The
   * zoom's gallery stops once every handle is released. Does not close or detach the zoom.
   */
  dispose(this: void): void
}

/** Options of `createGallery()`. */
export interface GalleryOptions {
  /** Releases the handle when aborted, as `dispose()` does. */
  signal?: AbortSignal
}

/** What every handle on a zoom's gallery shares. */
interface SharedGallery {
  readonly getSnapshot: () => GallerySnapshot
  /** The reason of each requested image, until it shows or the zoom closes. */
  readonly reasons: Map<HTMLElement, GalleryChangeReason>
  readonly listeners: Set<() => void>
  count: number
  stop(): void
}
const galleries = new WeakMap<object, SharedGallery>()

/**
 * Headless traversal over a rendered zoom's attached images, in attach order. Creates no UI.
 * A zoom has one gallery: each call returns a handle of its own on it, so code that shares
 * a zoom, such as your controls and `galleryControls()`, can release its handle without
 * affecting the others.
 */
export function createGallery<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  { signal }: GalleryOptions = {}
): GalleryController<Options> {
  const shared = galleries.get(zoom) || share(zoom)
  galleries.set(zoom, shared)
  shared.count++
  const { getSnapshot, listeners, reasons } = shared
  const own = new Set<() => void>()
  let released = false
  const choose = (
    index: number,
    options?: ModalOpenOptions & GalleryNavigationOptions
  ) => {
    const target = released ? undefined : getSnapshot().images[index]
    if (!target) {
      return Promise.resolve(zoom) as Promise<Zoom<Options>>
    }
    // Recorded first: the zoom can show the image before open() returns.
    reasons.set(target, options?.reason || 'api')
    return zoom.open({ ...options, target }) as Promise<Zoom<Options>>
  }
  // Past either end, the index is -1: there is nothing to open. Bound as a listener, a
  // command receives an event, which has no reason.
  const step = (by: number) => (options?: GalleryNavigationOptions) => {
    const { index, canPrevious, canNext } = getSnapshot()
    return choose((by > 0 ? canNext : canPrevious) ? index + by : -1, {
      reason: options?.reason,
    })
  }
  const handle: GalleryController<Options> = {
    getSnapshot,
    subscribe(listener) {
      // Wrapped, so two handles subscribing the same function stay independent.
      const entry = () => listener()
      if (!released) {
        listeners.add(entry)
        own.add(entry)
      }
      return () => {
        listeners.delete(entry)
        own.delete(entry)
      }
    },
    previous: step(-1),
    next: step(1),
    select: choose,
    dispose() {
      if (!released) {
        released = true
        signal?.removeEventListener('abort', handle.dispose)
        own.forEach(entry => listeners.delete(entry))
        if (!--shared.count) {
          shared.stop()
          galleries.delete(zoom)
        }
      }
    },
  }
  signal?.addEventListener('abort', handle.dispose)
  if (signal?.aborted) {
    handle.dispose()
  }
  return handle
}

function share<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>
): SharedGallery {
  const listeners = new Set<() => void>()
  const reasons = new Map<HTMLElement, GalleryChangeReason>()
  // Derived from the zoom's frozen state, and frozen too: every subscriber shares it.
  let snapshot: GallerySnapshot = Object.freeze({
    images: [],
    current: null,
    index: -1,
    canPrevious: false,
    canNext: false,
    reason: null,
  })
  const getSnapshot = () => {
    const { images, image: current } = zoom.getSnapshot()
    if (images !== snapshot.images || current !== snapshot.current) {
      const index = current ? images.indexOf(current) : -1
      let reason: GalleryChangeReason | null = null
      if (current === snapshot.current) {
        reason = snapshot.reason
      } else if (current) {
        reason = reasons.get(current) || null
        reasons.delete(current)
      } else {
        reasons.clear()
      }
      snapshot = Object.freeze({
        images,
        current,
        index,
        canPrevious: index > 0,
        canNext: index >= 0 && index < images.length - 1,
        reason,
      })
    }
    return snapshot
  }
  let preloading: ReturnType<typeof setTimeout> | undefined
  const unsubscribe = zoom.subscribe(() => {
    clearTimeout(preloading)
    // Once the user pauses on an image, both neighbours load ahead so they open sharp. Not
    // while stepping, so images passed on the way are never downloaded.
    if (zoom.getSnapshot().status === 'open') {
      preloading = setTimeout(() => {
        const { images, index } = getSnapshot()
        for (const image of [images[index + 1], images[index - 1]]) {
          if (image) {
            zoom.preload(image)
          }
        }
      }, 300)
    }
    const previous = snapshot
    if (getSnapshot() !== previous) {
      listeners.forEach(listener => listener())
    }
  })
  return {
    getSnapshot,
    reasons,
    listeners,
    count: 0,
    stop() {
      clearTimeout(preloading)
      unsubscribe()
    },
  }
}

export { bindGalleryKeyboard, type GalleryKeyboardOptions } from './keyboard'
export { bindGalleryGestures, type GalleryGestureView } from './gestures'
export { galleryControls, type GalleryControlsOptions } from './controls'
