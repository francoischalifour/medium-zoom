import mediumZoom from 'medium-zoom'

const zoomFacebook = mediumZoom('.container img', {
  background: 'rgba(0, 0, 0, 0.9)',
  template: '#template-facebook',
  container: '[data-zoom-container]',
})

zoomFacebook.on('opened', () => {
  const closeButton = document.querySelector('[data-zoom-close]')
  closeButton.addEventListener('click', () => zoomFacebook.close())
})

zoomFacebook.on('open', () => {
  document.body.style.overflow = 'hidden'
})

zoomFacebook.on('close', () => {
  document.body.style.overflow = ''
})
