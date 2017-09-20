/* eslint-env jest */
const mediumZoom = require('../src/medium-zoom')

global.requestAnimationFrame = cb => setTimeout(cb, 0)

describe('click', () => {
  const root = document.body

  beforeEach(() => {
    while (root.firstChild) {
      root.removeChild(root.firstChild)
    }
  })

  test('on an image adds classes', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom('img')

    image.click()
    const classNames = [...image.classList]

    expect(classNames).toEqual(['medium-zoom-image', 'medium-zoom-image--open'])
  })

  test('on a detached image doesn’t add classes', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    zoom.detach()

    image.click()

    expect(image.classList).toHaveLength(0)
  })
})
