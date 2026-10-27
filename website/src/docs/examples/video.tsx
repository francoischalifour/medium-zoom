'use client'

import mediumZoom, { type Zoom } from 'medium-zoom'
import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'

import './video.css'

type ZoomableVideoProps = ComponentPropsWithoutRef<'img'> & {
  videoSrc: string
}

export function ZoomableVideo({
  videoSrc,
  alt,
  ...imageProps
}: ZoomableVideoProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const zoomRef = useRef<Zoom | null>(null)

  useEffect(() => {
    const trigger = triggerRef.current!
    const poster = imageRef.current!
    const zoom = mediumZoom(poster, { margin: 24 })
    zoomRef.current = zoom
    let player: HTMLVideoElement | undefined

    const removePlayer = () => {
      if (!player) {
        return
      }
      const video = player
      player = undefined
      video.pause()
      video.remove()
      video.removeAttribute('src')
      video.load()
    }
    const restoreFocus = () => trigger.focus({ preventScroll: true })

    const startPlayer = () => {
      const video = document.createElement('video')
      player = video
      video.className = 'zoom-video-player'
      video.controls = true
      video.muted = true
      video.playsInline = true
      video.loop = true
      video.poster = poster.currentSrc || poster.src
      video.src = videoSrc
      video.hidden = true
      video.setAttribute('aria-label', poster.alt || 'Video')
      video.addEventListener(
        'loadeddata',
        () => {
          video.hidden = false
        },
        { once: true }
      )
      video.addEventListener('error', removePlayer, { once: true })
      // Start within the gesture; append the player after the image finishes opening.
      void video.play().catch(() => {
        if (player === video) {
          video.hidden = false
        }
      })
    }
    const positionPlayer = () => {
      const image = document.querySelector('.medium-zoom-image--opened')
      if (!player || !image) {
        return
      }
      const { left, top, width, height } = image.getBoundingClientRect()
      Object.assign(player.style, {
        left: `${left + window.scrollX}px`,
        top: `${top + window.scrollY}px`,
        width: `${width}px`,
        height: `${height}px`,
      })
      document.body.append(player)
    }
    zoom.on('open', startPlayer)
    zoom.on('opened', positionPlayer)
    zoom.on('close', removePlayer)
    zoom.on('closed', restoreFocus)

    return () => {
      zoomRef.current = null
      zoom.off('open', startPlayer)
      zoom.off('opened', positionPlayer)
      zoom.off('close', removePlayer)
      zoom.off('closed', restoreFocus)
      removePlayer()
      if (zoom.getZoomedImage()) {
        zoom.on('closed', () => zoom.detach(), { once: true })
        void zoom.close()
      } else {
        zoom.detach()
      }
    }
  }, [videoSrc])

  return (
    <button
      ref={triggerRef}
      className="video-poster-trigger"
      onClick={event => {
        event.stopPropagation()
        void zoomRef.current?.open()
      }}
      type="button"
      aria-label={alt ? `Play video: ${alt}` : 'Play video'}
    >
      <img {...imageProps} ref={imageRef} alt={alt} />
    </button>
  )
}
