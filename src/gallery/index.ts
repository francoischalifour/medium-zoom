// Import the branded types from core so consumers of both entries share the same type identity.
import type {
  CoreZoomOptions,
  ModalOpenOptions,
  ModalZoom,
  Zoom,
} from 'medium-zoom/core'

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
  /** Opens the previous image. */
  previous(this: void): Promise<Zoom<Options>>
  /** Opens the next image. */
  next(this: void): Promise<Zoom<Options>>
  /**
   * Opens the image at `index`; an index out of range resolves without opening. Pass
   * `{ instant: true }` when a gesture already shows the image in place.
   */
  select(
    this: void,
    index: number,
    options?: Omit<ModalOpenOptions, 'target'>
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
  const { getSnapshot, listeners } = shared
  const own = new Set<() => void>()
  let released = false
  const choose = (index: number, options?: ModalOpenOptions) => {
    const target = released ? undefined : getSnapshot().images[index]
    return (
      target ? zoom.open({ ...options, target }) : Promise.resolve(zoom)
    ) as Promise<Zoom<Options>>
  }
  // Past either end, the index is -1: there is nothing to open.
  const step = (by: number) => () => {
    const { index, canPrevious, canNext } = getSnapshot()
    return choose((by > 0 ? canNext : canPrevious) ? index + by : -1)
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
  // Derived from the zoom's frozen state, and frozen too: every subscriber shares it.
  let snapshot: GallerySnapshot = Object.freeze({
    images: [],
    current: null,
    index: -1,
    canPrevious: false,
    canNext: false,
  })
  const getSnapshot = () => {
    const { images, image: current } = zoom.getSnapshot()
    if (images !== snapshot.images || current !== snapshot.current) {
      const index = current ? images.indexOf(current) : -1
      snapshot = Object.freeze({
        images,
        current,
        index,
        canPrevious: index > 0,
        canNext: index >= 0 && index < images.length - 1,
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
