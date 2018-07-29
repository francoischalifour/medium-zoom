import mediumZoom from 'medium-zoom'

// Show placeholders for paragraphs
const paragraphs = [...document.querySelectorAll('p.placeholder')]
paragraphs.forEach(paragraph => {
  paragraph.innerHTML = paragraph.textContent
    .split(' ')
    .filter(text => text.length > 4)
    .map(text => `<span class="placeholder__word">${text}</span>`)
    .join(' ')
})

// Handle the zoom on click on the button
const zoomToTrigger = mediumZoom('#zoom-trigger')
const button = document.querySelector('#btn-trigger')
button.addEventListener('click', () => {
  zoomToTrigger.show()
})

// Add a zoom to be detached once zoomed
const zoomToDetach = mediumZoom('#zoom-detach')
zoomToDetach.addEventListeners('hidden', zoomToDetach.detach)

// Observe zooms to write the history
const observedZooms = [
  mediumZoom('#zoom-default'),
  mediumZoom('#zoom-margin', {
    margin: 48,
  }),
  mediumZoom('#zoom-background', {
    background: '#212530',
  }),
  mediumZoom('#zoom-scrollOffset', {
    scrollOffset: 0,
    background: 'rgba(25, 18, 25, .9)',
  }),
  mediumZoom('#zoom-noMetaClick', {
    metaClick: false,
  }),
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
