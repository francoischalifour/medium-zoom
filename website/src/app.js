import mediumZoom from 'medium-zoom'

const zoomDefault = mediumZoom('#zoom-default')
const zoomMargin = mediumZoom('#zoom-margin', { margin: 48 })
const zoomBackground = mediumZoom('#zoom-background', { background: '#212530' })
const zoomScrollOffset = mediumZoom('#zoom-scrollOffset', {
  scrollOffset: 0,
  background: 'rgba(25, 18, 25, .9)',
})
const zoomNoMetaClick = mediumZoom('#zoom-noMetaClick', { metaClick: false })

// Trigger the zoom when the button is clicked
const zoomToTrigger = mediumZoom('#zoom-trigger')
const button = document.querySelector('#btn-trigger')
button.addEventListener('click', () => zoomToTrigger.show())

// Detach the zoom after having been zoomed once
const zoomToDetach = mediumZoom('#zoom-detach')
zoomToDetach.addEventListeners('hidden', () => zoomToDetach.detach())

// Observe zooms to write the history
const observedZooms = [
  zoomDefault,
  zoomMargin,
  zoomBackground,
  zoomScrollOffset,
  zoomNoMetaClick,
  zoomToTrigger,
  zoomToDetach,
]

// Log all interactions in the history
const history = document.querySelector('#history')

observedZooms.forEach(zoom => {
  zoom.addEventListeners('show', event => {
    const time = new Date().toLocaleTimeString()
    history.innerHTML += `<p>▶ "${event.target.alt}" was zoomed at ${time}</p>`
  })

  zoom.addEventListeners('detach', event => {
    const time = new Date().toLocaleTimeString()
    history.innerHTML += `<p>▶ "${
      event.target.alt
    }" was detached at ${time}</p>`
  })
})
