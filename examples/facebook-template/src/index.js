import mediumZoom from 'medium-zoom'

const zoomFacebook = mediumZoom('.container img', {
  background: 'rgba(0, 0, 0, 0.9)',
  template: '#template-facebook',
  container: '[data-zoom-container]'
})

// You can start manipulating the DOM after the `shown` event has been triggered
zoomFacebook.addEventListeners('shown', () => {
  const closeButton = document.querySelector('[data-zoom-close]')
  closeButton.addEventListener('click', zoomFacebook.hide)
})

// Block scroll on zoom
zoomFacebook.addEventListeners('show', () => {
  document.body.style.overflow = 'hidden'
})

zoomFacebook.addEventListeners('hide', () => {
  document.body.style.overflow = ''
})
