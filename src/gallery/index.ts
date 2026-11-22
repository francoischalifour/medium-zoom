// Import the branded types from core so consumers of both entries share the same type identity.
import type {
  CoreZoomOptions,
  ModalOpenOptions,
  ModalZoom,
  Zoom,
  ZoomCommander,
  ZoomSelector,
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
  /** Attaches images to the zoom, after the current ones. */
  attach(...selectors: ZoomSelector[]): void
  /** Releases images from the zoom. */
  detach(...selectors: ZoomSelector[]): void
  /** Removes listeners and subscriptions. Does not close or detach the zoom. */
  dispose(): void
}

/** Options of `createGallery()`. */
export interface GalleryOptions<Options extends CoreZoomOptions> {
  /**
   * What opens the gallery's images, such as a session coordinating them with other zooms.
   *
   * @default the zoom
   */
  commander?: ZoomCommander<Options>
}

const galleries = new WeakMap<object, unknown>()

/**
 * Headless traversal over a rendered zoom's attached images, in attach order. Creates no UI.
 * Returns the zoom's existing gallery when it has one, with the commander it was created
 * with: create it with a session before mounting `galleryControls()` to coordinate them.
 */
export function createGallery<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  { commander = zoom }: GalleryOptions<Options> = {}
): GalleryController<Options> {
  const existing = galleries.get(zoom) as GalleryController<Options> | undefined
  if (existing) {
    return existing
  }
  const listeners = new Set<() => void>()
  let disposed = false
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
  const changed = () => {
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
  }
  const choose = (index: number, options?: ModalOpenOptions) => {
    const target = getSnapshot().images[index]
    return (
      !disposed && target
        ? commander.open({ ...options, target })
        : Promise.resolve(zoom)
    ) as Promise<Zoom<Options>>
  }
  const unsubscribe = zoom.subscribe(changed)
  const controller: GalleryController<Options> = {
    getSnapshot,
    subscribe(listener) {
      if (disposed) {
        return () => {}
      }
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    previous() {
      return getSnapshot().canPrevious
        ? choose(snapshot.index - 1)
        : Promise.resolve(zoom)
    },
    next() {
      return getSnapshot().canNext
        ? choose(snapshot.index + 1)
        : Promise.resolve(zoom)
    },
    select: choose,
    attach(...selectors) {
      if (!disposed) {
        zoom.attach(...selectors)
      }
    },
    detach(...selectors) {
      if (!disposed) {
        zoom.detach(...selectors)
      }
    },
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      clearTimeout(preloading)
      unsubscribe()
      listeners.clear()
      galleries.delete(zoom)
    },
  }
  galleries.set(zoom, controller)
  return controller
}

export { bindGalleryKeyboard } from './keyboard'
export { bindGalleryGestures, type GalleryGestureView } from './gestures'
export { galleryControls, type GalleryControlsOptions } from './controls'
