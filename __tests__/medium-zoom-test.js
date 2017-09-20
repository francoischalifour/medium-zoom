/* eslint-env jest */
const mediumZoom = require('../src/medium-zoom')

global.requestAnimationFrame = cb => setTimeout(cb, 0)

/**
 * Returns an empty `document.body` before each test.
 */
const emptyRootBeforeEach = () => {
  const root = document.body

  beforeEach(() => {
    while (root.firstChild) {
      root.removeChild(root.firstChild)
    }
  })

  return root
}

describe('public API', () => {
  test('exports mediumZoom', () => {
    expect(mediumZoom).toBeDefined()
  })

  const zoom = mediumZoom()
  const properties = [
    'images',
    'options',
    'show',
    'hide',
    'toggle',
    'update',
    'addEventListeners',
    'detach'
  ]

  properties.forEach(property => {
    test(`exports ${property}`, () => {
      expect(zoom[property]).toBeDefined()
    })
  })
})

describe('constructor', () => {
  const root = emptyRootBeforeEach()

  test('with empty string selector throws TypeError', () => {
    expect(() => {
      mediumZoom('')
    }).toThrow(TypeError)
  })

  test('without selector attaches the zoom to scaled images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    image1.width = 200
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()

    expect(zoom.images).toEqual([image1])
  })

  test('with a String selector attaches the zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')

    expect(zoom.images).toEqual([image1, image2])
  })

  test('with a Node selector attaches the zoom', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(document.querySelector('img'))

    expect(zoom.images).toEqual([image])
  })

  test('with a NodeList selector attaches the zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom(document.querySelectorAll('img'))

    expect(zoom.images).toEqual([image1, image2])
  })

  test('with an HTMLCollection selector attaches the zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom(document.images)

    expect(zoom.images).toEqual([image1, image2])
  })

  test('with an Array selector attaches the zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom([...document.querySelectorAll('img')])

    expect(zoom.images).toEqual([image1, image2])
  })

  test('with only an option object attaches scaled images and applies options', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    const p = document.createElement('p')
    image1.width = 200
    root.appendChild(image1)
    root.appendChild(image2)
    root.appendChild(p)

    const options = {
      margin: 24,
      background: '#BADA55',
      scrollOffset: 124,
      metaClick: true
    }
    const zoom = mediumZoom(options)

    expect(zoom.images).toEqual([image1])
    expect(zoom.options).toEqual(options)
    expect(image1.className).toBe('medium-zoom-image')
    expect(image2.className).toBe('')
    expect(root).toMatchSnapshot()
  })
})

describe('options', () => {
  test('contains the correct default options', () => {
    const actual = mediumZoom().options
    const expected = {
      margin: 0,
      background: '#fff',
      scrollOffset: 48,
      metaClick: true
    }

    expect(actual).toEqual(expected)
  })
})

describe('images', () => {
  const root = emptyRootBeforeEach()

  test('contains no images by default', () => {
    expect(mediumZoom().images).toEqual([])
  })

  test('contains the images matching the selector', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const images = mediumZoom('img').images

    expect(images).toEqual([image1, image2])
  })
})

describe('update', () => {
  const root = emptyRootBeforeEach()

  test('without options returns correct default options', () => {
    const zoom = mediumZoom()
    const options = zoom.update()
    const expected = {
      margin: 0,
      background: '#fff',
      scrollOffset: 48,
      metaClick: true
    }

    expect(options).toEqual(expected)
    expect(zoom.options).toEqual(expected)
  })

  test('with margin updates the margin option and returns all options', () => {
    const zoom = mediumZoom()
    const options = zoom.update({
      margin: 48
    })
    const expected = {
      margin: 48,
      background: '#fff',
      scrollOffset: 48,
      metaClick: true
    }

    expect(options).toEqual(expected)
    expect(zoom.options).toEqual(expected)
  })

  test('with background updates the background option, returns all options and renders correctly', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    zoom.show()

    const options = zoom.update({
      background: '#000'
    })
    const expected = {
      margin: 0,
      background: '#000',
      scrollOffset: 48,
      metaClick: true
    }

    expect(options).toEqual(expected)
    expect(zoom.options).toEqual(expected)
    expect(root).toMatchSnapshot()
  })

  test('with scroll offset updates the scroll offset option and returns all options', () => {
    const zoom = mediumZoom()
    const options = zoom.update({
      scrollOffset: 0
    })
    const expected = {
      margin: 0,
      background: '#fff',
      scrollOffset: 0,
      metaClick: true
    }

    expect(options).toEqual(expected)
    expect(zoom.options).toEqual(expected)
  })

  test('with meta click updates the meta click option and returns all options', () => {
    const zoom = mediumZoom()
    const options = zoom.update({
      metaClick: false
    })
    const expected = {
      margin: 0,
      background: '#fff',
      scrollOffset: 48,
      metaClick: false
    }

    expect(options).toEqual(expected)
    expect(zoom.options).toEqual(expected)
  })

  test('with all options updates all options and returns all options', () => {
    const expected = {
      margin: 24,
      background: '#BADA55',
      scrollOffset: 124,
      metaClick: true
    }
    const zoom = mediumZoom()
    const options = zoom.update(expected)

    expect(options).toEqual(expected)
    expect(zoom.options).toEqual(expected)
  })
})

describe('show', () => {
  const root = emptyRootBeforeEach()

  test('renders correctly', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    zoom.show()
    const classNames = [...image.classList]

    expect(classNames).toEqual(['medium-zoom-image', 'medium-zoom-image--open'])
    expect(root).toMatchSnapshot()
  })

  test('renders correctly with options overlay background', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img', {
      background: '#BADA55'
    })
    zoom.show()

    expect(root).toMatchSnapshot()
  })
})

describe('hide', () => {
  const root = emptyRootBeforeEach()

  test('renders correctly', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    zoom.hide()
    const classNames = [...image.classList]

    expect(classNames).toEqual(['medium-zoom-image'])
    expect(root).toMatchSnapshot()
  })
})

describe('detach', () => {
  const root = emptyRootBeforeEach()

  test('frees all images from the zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach()

    expect(zoom.images).toHaveLength(0)
    expect(image1.classList).toHaveLength(0)
    expect(image2.classList).toHaveLength(0)
  })
})
