/* eslint-env jest */
import mediumZoom from '../src/medium-zoom'

global.requestAnimationFrame = cb => setTimeout(cb, 0)

const root = document.body

beforeEach(() => {
  while (root.firstChild) {
    root.removeChild(root.firstChild)
  }
})

describe('click', () => {
  test('on an image renders correctly', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom('img')

    image.click()

    expect(image.className).toBe('medium-zoom-image')
    expect(document.querySelector('.medium-zoom-image--open')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('on a detached image doesn’t add classes', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    zoom.detach()

    image.click()

    expect(image.classList).toHaveLength(0)
    expect(root).toMatchSnapshot()
  })
})
