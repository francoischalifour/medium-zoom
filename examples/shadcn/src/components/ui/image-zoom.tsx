'use client'

import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'
import * as React from 'react'

import './image-zoom.css'

export type RootProps = {
  children: React.ReactNode
  disabled?: boolean
  options?: ZoomOptions
  /** Supply this value to control zoom state from the parent. */
  open?: boolean
  /** Receives the requested next value. Update `open` here when controlled. */
  onOpenChange?: (open: boolean) => void
}

export type TriggerProps = Omit<React.ComponentPropsWithoutRef<'button'>, 'type'>
export type ImageProps = Omit<
  React.ComponentPropsWithoutRef<'img'>,
  'alt' | 'onClick' | 'onKeyDown' | 'onKeyUp' | 'tabIndex' | 'role'
> & { alt: string; 'data-zoom-src'?: string }

export type ImageZoomProps = ImageProps & Omit<RootProps, 'children'>

const ZoomContext = React.createContext<{
  setImage: React.Dispatch<React.SetStateAction<HTMLImageElement | null>>
  alt: string
  setAlt: React.Dispatch<React.SetStateAction<string>>
  disabled: boolean
  zoomed: boolean
  close: () => void
  toggle: () => void
} | null>(null)

function useZoomContext() {
  const context = React.useContext(ZoomContext)
  if (!context) throw new Error('ImageZoom.Trigger and ImageZoom.Image require ImageZoom.Root.')
  return context
}

type Session = {
  zoom: Zoom
  close: () => Promise<Zoom>
  pending: Promise<unknown> | null
}

// The library shares a body class between instances. Finish closing one before opening another.
const activeSessions = new WeakMap<Document, Session>()

export function Root({ children, disabled = false, options, open, onOpenChange }: RootProps) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const [alt, setAlt] = React.useState('')
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const wantedOpen = !disabled && (open ?? uncontrolledOpen)
  const wantedRef = React.useRef(wantedOpen)
  const changeRef = React.useRef(onOpenChange)
  const requestedRef = React.useRef(wantedOpen)
  const sessionRef = React.useRef<Session | null>(null)
  const closingRef = React.useRef<Promise<Zoom> | null>(null)
  const optionsRef = React.useRef(options)
  // React must preserve the library's classes when consumers change className while zoomed.
  const [zoomed, setZoomed] = React.useState(false)

  const requestOpen = React.useCallback((next: boolean) => {
    if (requestedRef.current === next) return
    requestedRef.current = next
    setUncontrolledOpen(next)
    changeRef.current?.(next)
  }, [])

  const close = React.useCallback(() => {
    requestOpen(false)
    void sessionRef.current?.close()
  }, [requestOpen])

  // Read committed props from event handlers and async work, never abandoned renders.
  React.useEffect(() => {
    changeRef.current = onOpenChange
    if (disabled) requestOpen(false)
    wantedRef.current = wantedOpen
    requestedRef.current = wantedOpen
  })

  // Publish options after commit, so an abandoned render cannot affect an active zoom.
  React.useEffect(() => {
    optionsRef.current = options
  }, [options])

  React.useEffect(() => {
    if (disabled || !image) return
    let disposed = false
    let session: Session | null = null
    let closing: Promise<void> | null = null
    let finishClosing: (() => void) | undefined
    const onOpen = () => setZoomed(true)
    const onClose = () => {
      closing ??= new Promise(resolve => (finishClosing = resolve))
      if (!disposed) requestOpen(false)
    }
    const onClosed = () => {
      finishClosing?.()
      closing = null
      if (image.isConnected) setZoomed(false)
    }

    const attach = () => {
      if (disposed) return
      setZoomed(false)
      const zoom = mediumZoom(image)
      image.addEventListener('medium-zoom:open', onOpen)
      image.addEventListener('medium-zoom:close', onClose)
      image.addEventListener('medium-zoom:closed', onClosed)
      session = {
        zoom,
        pending: null,
        close: () => {
          const completion = zoom.close()
          // Escape, scroll, and overlay clicks can start a close outside this component.
          // Core close() resolves immediately on repeated calls; wait for its closed event.
          return Promise.all([session?.pending, closing ?? completion]).then(() => zoom)
        },
      }
      sessionRef.current = session
      if (wantedRef.current) void openSession()
    }

    // Strict Mode and Activity can restart effects while the previous close is animating.
    if (closingRef.current) void closingRef.current.then(attach)
    else attach()

    return () => {
      disposed = true
      if (!session) return
      const previous = session
      sessionRef.current = null
      setUncontrolledOpen(false)
      closingRef.current = previous.close()
      previous.zoom.detach()
      void closingRef.current.then(() => {
        image.removeEventListener('medium-zoom:open', onOpen)
        image.removeEventListener('medium-zoom:close', onClose)
        image.removeEventListener('medium-zoom:closed', onClosed)
        if (activeSessions.get(image.ownerDocument) === previous) {
          activeSessions.delete(image.ownerDocument)
        }
      })
    }
  }, [disabled, image, requestOpen])

  async function openSession() {
    const session = sessionRef.current
    if (!session || !image) return
    if (session.zoom.getZoomedImage()) return
    const document = image.ownerDocument
    const previous = activeSessions.get(document)
    if (previous === session && session.pending) return
    activeSessions.set(document, session)
    session.pending = previous?.close() ?? Promise.resolve()
    await session.pending
    session.pending = null
    if (
      !wantedRef.current ||
      activeSessions.get(document) !== session ||
      sessionRef.current !== session
    )
      return
    // Core merges container objects; discard the previous bounds before each opening.
    session.zoom.update({ container: undefined })
    session.zoom.update(resolveOptions(image, optionsRef.current))
    await session.zoom.open()
  }

  React.useEffect(() => {
    if (wantedOpen) void openSession()
    else void sessionRef.current?.close()
  })

  return (
    <ZoomContext.Provider
      value={{
        setImage,
        alt,
        setAlt,
        disabled,
        zoomed,
        close,
        toggle: () => {
          // A controlled owner may decline a request; each new activation can ask again.
          requestedRef.current = wantedRef.current
          requestOpen(!wantedRef.current)
        },
      }}
    >
      {children}
    </ZoomContext.Provider>
  )
}

export const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(function Trigger(
  { className, onClick, disabled, ...props },
  ref
) {
  const context = useZoomContext()
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      data-slot="image-zoom-trigger"
      disabled={context.disabled || disabled}
      aria-label={
        props['aria-label'] ?? (context.alt ? `Zoom image: ${context.alt}` : 'Zoom image')
      }
      className={['image-zoom-trigger', className].filter(Boolean).join(' ')}
      onClick={event => {
        onClick?.(event)
        if (!event.defaultPrevented) context.toggle()
      }}
    />
  )
})

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(function Image(
  { alt, className, style, ...props },
  forwardedRef
) {
  const { setImage, setAlt, disabled, zoomed, close } = useZoomContext()
  const imageRef = React.useRef<HTMLImageElement>(null)
  const source = [props.src, props.srcSet, props.sizes, props['data-zoom-src']]
  const previousSource = React.useRef(source)
  React.useEffect(() => setAlt(alt), [alt, setAlt])
  React.useImperativeHandle(forwardedRef, () => imageRef.current!, [])
  const attachImage = React.useCallback(
    (image: HTMLImageElement | null) => {
      imageRef.current = image
      setImage(image)
    },
    [setImage]
  )

  // Never keep a clone of a previous source over the replacement image.
  React.useEffect(() => {
    if (source.some((value, index) => value !== previousSource.current[index])) close()
    previousSource.current = source
  }, [props.src, props.srcSet, props.sizes, props['data-zoom-src'], close])

  return (
    <img
      {...props}
      alt={alt}
      ref={attachImage}
      data-slot="image-zoom"
      aria-hidden="true"
      className={[
        className,
        !disabled && 'medium-zoom-image',
        zoomed && 'medium-zoom-image--hidden',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...style, pointerEvents: 'none' }}
    />
  )
})

export const ImageZoom = React.forwardRef<HTMLImageElement, ImageZoomProps>(function ImageZoom(
  { disabled, options, open, onOpenChange, ...props },
  ref
) {
  return (
    <Root disabled={disabled} options={options} open={open} onOpenChange={onOpenChange}>
      <Trigger
        aria-label={
          disabled ? props.alt || 'Image' : props.alt ? `Zoom image: ${props.alt}` : 'Zoom image'
        }
      >
        <Image {...props} ref={ref} />
      </Trigger>
    </Root>
  )
})

function resolveOptions(image: HTMLImageElement, options?: ZoomOptions): ZoomOptions {
  // The overlay lives in document.body, outside themes scoped to the trigger's ancestors.
  const background = image.ownerDocument
    .defaultView!.getComputedStyle(image)
    .getPropertyValue('--background')
    .trim()
  let container = options?.container
  if (container && typeof container === 'object' && 'getBoundingClientRect' in container) {
    const bounds = container.getBoundingClientRect()
    // Core's object form describes viewport bounds with top/left insets.
    container = { width: bounds.right, height: bounds.bottom, left: bounds.left, top: bounds.top }
  }
  return {
    template: undefined,
    ...options,
    container,
    margin: options?.margin ?? 24,
    scrollOffset: options?.scrollOffset ?? 40,
    background:
      options?.background ??
      (!background
        ? '#fff'
        : CSS.supports('color', background)
          ? background
          : `hsl(${background})`),
  }
}
