/* eslint-env jest */
const mediumZoom = require('../medium-zoom')

global.requestAnimationFrame = cb => setTimeout(cb, 0)

describe('click', () => {
  const root = document.body

  beforeEach(() => {
    while (root.firstChild) {
      root.removeChild(root.firstChild)
    }
  })

  test('click on an image should add classes', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom('img')

    image.click()
    const classNames = [...image.classList]

    expect(classNames).toEqual(['medium-zoom-image', 'medium-zoom-image--open'])
  })

  test('click on a detached image should not add classes', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    zoom.detach()

    image.click()

    expect(image.classList).toHaveLength(0)
  })
})
