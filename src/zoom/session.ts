import type { CoreZoomOptions, ModalOpenOptions, Zoom } from 'medium-zoom/core'

/**
 * Coordinated access to one zoom. Methods never read `this`: pass them around freely, or
 * pass the session as the `commander` of `bindZoomTriggers()` and `createGallery()`.
 */
export interface ZoomSession<
  Options extends CoreZoomOptions = CoreZoomOptions,
> {
  /** The coordinated zoom. Requests made on it directly are not coordinated. */
  readonly zoom: Zoom<Options>
  /**
   * Opens the zoom once the document's previously open zoom has closed. Superseded
   * requests resolve without opening. `trigger` applies to zooms created with a renderer.
   */
  open(this: void, options?: ModalOpenOptions): Promise<Zoom<Options>>
  /** Closes the zoom and cancels its pending open request. */
  close(this: void): Promise<Zoom<Options>>
  /** Closes the zoom when it is open or opening, opens it otherwise. */
  toggle(this: void, options?: ModalOpenOptions): Promise<Zoom<Options>>
  /**
   * Closes and detaches the zoom, then stops coordinating it. The zoom can be reattached
   * and coordinated again with a new session.
   */
  dispose(this: void): Promise<void>
}

const sessions = new WeakMap<object, unknown>()
const active = new WeakMap<
  Document,
  { owner: object; close: () => Promise<unknown> }
>()

/**
 * Coordinates zooms so only one is open per document: opening through a session first closes
 * the document's other session-owned zoom and waits for it. Returns the zoom's existing
 * session when it has one. Hand the session to whatever opens the zoom: triggers, a gallery,
 * or your own controls.
 */
export function createZoomSession<Options extends CoreZoomOptions>(
  zoom: Zoom<Options>
): ZoomSession<Options> {
  const existing = sessions.get(zoom) as ZoomSession<Options> | undefined
  if (existing) {
    return existing
  }
  let disposal: Promise<void> | undefined
  let released = false
  const documents = new Set<Document>()
  let revision = 0
  let owned: { owner: object; close: () => Promise<unknown> } | undefined
  let mounted: typeof owned
  let pending: Promise<Zoom<Options>> | undefined
  let closing: Promise<Zoom<Options>> | undefined
  let completion: Promise<void> | undefined
  let complete: (() => void) | undefined
  const onClose = (event: Event) => {
    if ((event as CustomEvent).detail.zoom !== zoom || completion) {
      return
    }
    completion = new Promise(resolve => {
      complete = resolve
    })
  }
  const onClosed = (event: Event) => {
    if ((event as CustomEvent).detail.zoom !== zoom) {
      return
    }
    const document = event.currentTarget as Document
    if (active.get(document) === mounted) {
      active.delete(document)
    }
    document.removeEventListener('medium-zoom:close', onClose, true)
    document.removeEventListener('medium-zoom:closed', onClosed, true)
    documents.delete(document)
    complete?.()
    completion = undefined
    complete = undefined
  }
  const session: ZoomSession<Options> = {
    zoom,
    open(options) {
      const image = options?.target || zoom.getImages()[0]
      if (disposal || !image || !zoom.getImages().includes(image)) {
        return Promise.resolve(zoom)
      }
      const document = image.ownerDocument
      const previous = active.get(document)
      if (
        previous?.owner === session &&
        !closing &&
        zoom.getZoomedImage() &&
        image !== zoom.getZoomedImage()
      ) {
        return zoom.open(options)
      }
      if (previous?.owner === session && pending) {
        return pending
      }
      if (previous?.owner === session && zoom.getZoomedImage() && !closing) {
        return Promise.resolve(zoom)
      }
      const request = { owner: session, close: () => session.close() }
      active.set(document, request)
      owned = request
      const waiting = previous?.owner === session ? closing : previous?.close()
      const ticket = ++revision
      const opening = Promise.resolve(waiting)
        .then(() => {
          // Another request may have superseded this one while the previous zoom was closing.
          if (
            disposal ||
            ticket !== revision ||
            active.get(document) !== request ||
            !zoom.getImages().includes(image)
          ) {
            return zoom
          }
          if (!documents.has(document)) {
            documents.add(document)
            document.addEventListener('medium-zoom:close', onClose, true)
            document.addEventListener('medium-zoom:closed', onClosed, true)
          }
          mounted = request
          return zoom.open(options)
        })
        .finally(() => {
          if (pending === opening) {
            pending = undefined
          }
          if (!zoom.getZoomedImage() && active.get(document) === request) {
            active.delete(document)
          }
        })
      pending = opening
      return opening
    },
    close() {
      if (released) {
        return Promise.resolve(zoom)
      }
      ++revision
      if (closing) {
        return closing
      }
      const request = owned
      const result = zoom.close()
      const task = Promise.allSettled([pending, result, completion])
        .then(results => {
          for (const document of documents) {
            if (active.get(document) === request) {
              active.delete(document)
            }
          }
          for (const document of documents) {
            document.removeEventListener('medium-zoom:close', onClose, true)
            document.removeEventListener('medium-zoom:closed', onClosed, true)
          }
          documents.clear()
          const physical = results[1]!
          if (physical.status === 'rejected') {
            throw physical.reason
          }
          return zoom
        })
        .finally(() => {
          if (closing === task) {
            closing = undefined
          }
        })
      closing = task
      return task
    },
    toggle(options) {
      return pending || zoom.getZoomedImage()
        ? session.close()
        : session.open(options)
    },
    dispose() {
      if (disposal) {
        return disposal
      }
      const closed = session.close()
      zoom.detach()
      disposal = closed
        .then(() => undefined)
        .finally(() => {
          released = true
          if (sessions.get(zoom) === session) {
            sessions.delete(zoom)
          }
        })
      return disposal
    },
  }
  sessions.set(zoom, session)
  return session
}
