import mediumZoom from 'medium-zoom'

const zoomPaper = mediumZoom('.container img', {
  background: 'rgba(247, 249, 250, 0.97)',
  margin: 16,
  template: '#template-dropbox-paper',
  container: '[data-zoom-container]',
})

// You can start manipulating the DOM after the `opened` event has been triggered
zoomPaper.on('opened', () => {
  const closeButton = document.querySelector('[data-zoom-close]')
  closeButton.addEventListener('click', () => zoomPaper.close())
})

// Block scroll on zoom
zoomPaper.on('open', () => {
  document.body.style.overflow = 'hidden'
})
zoomPaper.on('close', () => {
  document.body.style.overflow = ''
})
