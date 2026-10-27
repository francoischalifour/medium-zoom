import mediumZoom from 'medium-zoom'

import source from './videos/flower.mp4'

const trigger = document.querySelector('#play')
const poster = document.querySelector('#poster')
const zoom = mediumZoom(poster, { margin: 24 })
let player

trigger.addEventListener('click', event => {
  // Let the button handle both pointer and keyboard activation.
  event.stopPropagation()
  zoom.open()
})

zoom.on('open', () => {
  const video = document.createElement('video')
  player = video
  video.className = 'zoom-video'
  video.controls = true
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.poster = poster.src
  video.src = source
  video.hidden = true
  video.setAttribute('aria-label', 'A pink flower opening')
  video.addEventListener('loadeddata', () => (video.hidden = false), { once: true })
  video.addEventListener('error', () => video.remove(), { once: true })

  // Start during the user gesture, before the image animation finishes.
  // If autoplay is blocked, show the poster and native play control instead.
  video.play().catch(() => (video.hidden = false))
})

zoom.on('opened', () => {
  const image = document.querySelector('.medium-zoom-image--opened')
  const { left, top, width, height } = image.getBoundingClientRect()
  Object.assign(player.style, {
    left: `${left + window.scrollX}px`,
    top: `${top + window.scrollY}px`,
    width: `${width}px`,
    height: `${height}px`,
  })
  if (!player.error) document.body.append(player)
})

zoom.on('close', () => {
  player.pause()
  player.remove()
  player.removeAttribute('src')
  player.load()
  player = null
})

zoom.on('closed', () => trigger.focus({ preventScroll: true }))
