import mediumZoom from 'medium-zoom'

const zoomPaper = mediumZoom('.container img', {
  background: 'rgba(247, 249, 250, 0.97)',
  margin: 16,
  template: '#template-dropbox-paper',
  container: '[data-zoom-container]'
})

// You can start manipulating the DOM after the `shown` event has been triggered
zoomPaper.addEventListeners('shown', () => {
  const closeButton = document.querySelector('[data-zoom-close]')
  closeButton.addEventListener('click', zoomPaper.hide)
})

// Block scroll on zoom
zoomPaper.addEventListeners('show', () => {
  document.body.style.overflow = 'hidden'
})
zoomPaper.addEventListeners('hide', () => {
  document.body.style.overflow = ''
})
