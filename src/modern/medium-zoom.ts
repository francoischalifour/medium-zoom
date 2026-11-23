import {
  type CoreZoomOptions,
  createZoom,
  type ZoomSelector,
  type ZoomState,
} from '@/core/index'
import { loadHdImage } from '@/loaders/index'
import { dialog } from '@/renderers/index'
import { bindZoomTriggers } from '@/triggers/index'

export interface ZoomOptions extends CoreZoomOptions {
  signal?: AbortSignal
}

export interface Zoom {
  open(target?: HTMLElement): Promise<void>
  close(): Promise<void>
  attach(...images: ZoomSelector[]): void
  detach(...images: ZoomSelector[]): void
  update(options: CoreZoomOptions): void
  getSnapshot(): ZoomState
  subscribe(listener: () => void): () => void
  destroy(): void
}

export default function mediumZoom(
  images?: ZoomSelector,
  { signal, ...options }: ZoomOptions = {}
): Zoom {
  const lifetime = new AbortController()
  const zoom = createZoom(signal?.aborted ? null : images, {
    ...options,
    background: options.background ?? 'var(--medium-zoom-backdrop, Canvas)',
    loader: loadHdImage,
    renderer: dialog(),
    signal: lifetime.signal,
  })
  bindZoomTriggers(zoom, { signal: lifetime.signal })
  const destroy = () => lifetime.abort()
  signal?.addEventListener('abort', destroy, {
    once: true,
    signal: lifetime.signal,
  })
  if (signal?.aborted) {
    destroy()
  }
  return {
    async open(target) {
      if (!lifetime.signal.aborted) {
        await zoom.open({ target })
      }
    },
    async close() {
      await zoom.close()
    },
    attach(...images) {
      if (!lifetime.signal.aborted) {
        zoom.attach(...images)
      }
    },
    detach(...images) {
      zoom.detach(...images)
    },
    update(options) {
      if (!lifetime.signal.aborted) {
        zoom.update(options)
      }
    },
    getSnapshot: zoom.getSnapshot,
    subscribe(listener) {
      if (lifetime.signal.aborted) {
        return () => {}
      }
      const unsubscribe = zoom.subscribe(listener)
      lifetime.signal.addEventListener('abort', unsubscribe, { once: true })
      return () => {
        lifetime.signal.removeEventListener('abort', unsubscribe)
        unsubscribe()
      }
    },
    destroy,
  }
}

export type { ZoomSelector, ZoomState } from '@/core/index'
