import mediumZoom from '../medium-zoom'

global.requestAnimationFrame = callback => setTimeout(callback)

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

describe('mediumZoom()', () => {
  test('is defined and returns an object', () => {
    expect(mediumZoom).toBeDefined()
    expect(mediumZoom()).toBeInstanceOf(Object)
  })

  describe('mediumZoom(selector)', () => {
    const root = emptyRootBeforeEach()

    describe('selector', () => {
      test('mediumZoom() does not attach any zoom', () => {
        const image1 = document.createElement('img')
        root.appendChild(image1)

        const zoom = mediumZoom()

        expect(zoom.getImages()).toEqual([])
      })

      test('mediumZoom(Number) does not attach any zoom', () => {
        const image1 = document.createElement('img')
        root.appendChild(image1)

        const zoom = mediumZoom(42)

        expect(zoom.getImages()).toEqual([])
      })

      test('mediumZoom("") throws', () => {
        const image1 = document.createElement('img')
        root.appendChild(image1)

        expect(() => {
          mediumZoom('')
        }).toThrowErrorMatchingSnapshot()
      })

      test('mediumZoom(String) attaches images', () => {
        const image1 = document.createElement('img')
        const image2 = document.createElement('img')
        root.appendChild(image1)
        root.appendChild(image2)

        const zoom = mediumZoom('img')

        expect(zoom.getImages()).toEqual([image1, image2])
      })

      test('mediumZoom(Node) attaches images', () => {
        const image = document.createElement('img')
        root.appendChild(image)

        const zoom = mediumZoom(document.querySelector('img'))

        expect(zoom.getImages()).toEqual([image])
      })

      test('mediumZoom(NodeList) attaches images', () => {
        const image1 = document.createElement('img')
        const image2 = document.createElement('img')
        root.appendChild(image1)
        root.appendChild(image2)

        const zoom = mediumZoom(document.querySelectorAll('img'))

        expect(zoom.getImages()).toEqual([image1, image2])
      })

      test('mediumZoom(HTMLCollection) does not attach images', () => {
        const image1 = document.createElement('img')
        const image2 = document.createElement('img')
        root.appendChild(image1)
        root.appendChild(image2)

        const zoom = mediumZoom(document.images)

        expect(zoom.getImages()).toEqual([])
      })

      test('mediumZoom(Array) attaches images', () => {
        const image1 = document.createElement('img')
        const image2 = document.createElement('img')
        root.appendChild(image1)
        root.appendChild(image2)

        const zoom = mediumZoom(Array.from(document.querySelectorAll('img')))

        expect(zoom.getImages()).toEqual([image1, image2])
      })
    })

    describe('options', () => {
      test('mediumZoom(selector) applies default options', () => {
        const image1 = document.createElement('img')
        root.appendChild(image1)

        const zoom = mediumZoom('img')

        expect(zoom.getOptions()).toEqual({
          margin: 0,
          background: '#fff',
          scrollOffset: 40,
          container: null,
          template: null,
        })
      })
    })
  })

  describe('mediumZoom(options)', () => {
    const root = emptyRootBeforeEach()

    test('mediumZoom() does not attach any images and applies default options', () => {
      const image1 = document.createElement('img')
      root.appendChild(image1)

      const zoom = mediumZoom()

      expect(zoom.getImages()).toEqual([])
      expect(zoom.getOptions()).toEqual({
        margin: 0,
        background: '#fff',
        scrollOffset: 40,
        container: null,
        template: null,
      })
    })

    test('mediumZoom({}) does not attach any images and applies default options', () => {
      const image1 = document.createElement('img')
      root.appendChild(image1)

      const zoom = mediumZoom({})

      expect(zoom.getImages()).toEqual([])
      expect(zoom.getOptions()).toEqual({
        margin: 0,
        background: '#fff',
        scrollOffset: 40,
        container: null,
        template: null,
      })
    })

    test('mediumZoom(options) does not attach any images and applies options', () => {
      const image1 = document.createElement('img')
      root.appendChild(image1)

      const options = {
        margin: 24,
        background: '#BADA55',
        scrollOffset: 124,
      }
      const zoom = mediumZoom(options)

      expect(zoom.getImages()).toEqual([])
      expect(zoom.getOptions()).toEqual({
        margin: 24,
        background: '#BADA55',
        scrollOffset: 124,
        container: null,
        template: null,
      })
    })
  })

  describe('mediumZoom(selector, options)', () => {
    const root = emptyRootBeforeEach()

    describe('selector', () => {
      test('with selector and options attaches images to the zoom and applies options', () => {
        const image1 = document.createElement('img')
        const image2 = document.createElement('img')
        root.appendChild(image1)
        root.appendChild(image2)

        const zoom = mediumZoom('img', { background: '#BADA55' })

        expect(zoom.getImages()).toEqual([image1, image2])
        expect(zoom.getOptions()).toEqual({
          margin: 0,
          background: '#BADA55',
          scrollOffset: 40,
          container: null,
          template: null,
        })
      })
    })

    describe('options', () => {
      test('with selector and empty option object attaches images to zoom and applies default options', () => {
        const image1 = document.createElement('img')
        root.appendChild(image1)

        const zoom = mediumZoom('img', {})

        expect(zoom.getImages()).toEqual([image1])
        expect(zoom.getOptions()).toEqual({
          margin: 0,
          background: '#fff',
          scrollOffset: 40,
          container: null,
          template: null,
        })
      })

      test('with option object attaches images to zoom and applies options', () => {
        const image1 = document.createElement('img')
        root.appendChild(image1)

        const options = {
          margin: 24,
          background: '#BADA55',
          scrollOffset: 124,
        }
        const zoom = mediumZoom('img', options)

        expect(zoom.getImages()).toEqual([image1])
        expect(zoom.getOptions()).toEqual({
          margin: 24,
          background: '#BADA55',
          scrollOffset: 124,
          container: null,
          template: null,
        })
      })
    })
  })
})

describe('attach()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns the zoom', () => {
    const zoom = mediumZoom()

    expect(zoom.attach).toBeInstanceOf(Function)
    expect(zoom.attach()).toEqual(zoom)
  })

  test('attach() does not attach any zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach()

    expect(zoom.getImages()).toEqual([])
  })

  test('attach(Number) does not attach any zoom', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom(42)
    zoom.attach()

    expect(zoom.getImages()).toEqual([])
  })

  test('attach("") throws error', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()

    expect(() => {
      zoom.attach('')
    }).toThrowErrorMatchingSnapshot()

    expect(zoom.getImages()).toEqual([])
  })

  test('attach(String) attaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach('img')

    expect(zoom.getImages()).toEqual([image1, image2])
  })

  test('attach(Node) attaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach(image1)

    expect(zoom.getImages()).toEqual([image1])
  })

  test('attach(Node, Node) attaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach(image1, image2)

    expect(zoom.getImages()).toEqual([image1, image2])
  })

  test('attach(NodeList) attaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach(document.querySelectorAll('img'))

    expect(zoom.getImages()).toEqual([image1, image2])
  })

  test('attach(HTMLCollection) does not attach images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach(document.images)

    expect(zoom.getImages()).toEqual([])
  })

  test('attach(Array) attaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom()
    zoom.attach([image1, image2])

    expect(zoom.getImages()).toEqual([image1, image2])
  })
})

describe('detach()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns the zoom', () => {
    const zoom = mediumZoom()

    expect(zoom.detach).toBeInstanceOf(Function)
    expect(zoom.detach()).toEqual(zoom)
  })

  test('detach() detaches all images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach()

    expect(zoom.getImages()).toEqual([])
    expect(image1.classList).toHaveLength(0)
    expect(image2.classList).toHaveLength(0)
  })

  test('detach(string) detaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach('img')

    expect(zoom.getImages()).toEqual([])
    expect(image1.classList).toHaveLength(0)
    expect(image2.classList).toHaveLength(0)
  })

  test('detach(Node) detaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach(image1)

    expect(zoom.getImages()).toEqual([image2])
    expect(image1.classList).toHaveLength(0)
    expect(image2.classList).toHaveLength(1)
  })

  test('detach(Node, Node) detaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach(image1, image2)

    expect(zoom.getImages()).toEqual([])
    expect(image1.classList).toHaveLength(0)
    expect(image2.classList).toHaveLength(0)
  })

  test('detach(NodeList) detaches images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach(document.querySelectorAll('img'))

    expect(zoom.getImages()).toEqual([])
    expect(image1.classList).toHaveLength(0)
    expect(image2.classList).toHaveLength(0)
  })

  test('detach(HTMLCollection) does not detach images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    zoom.detach(document.images)

    expect(zoom.getImages()).toEqual([image1, image2])
  })

  test('detach() an opened zoom closes the zoom and detaches images', async () => {
    expect.assertions(3)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)

    await zoom.open()
    jest.runAllTimers()
    zoom.detach()

    expect(zoom.getImages()).toEqual([])
    expect(image.classList).toHaveLength(0)
    expect(root).toMatchSnapshot()
  })
})

describe('update()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns the zoom', () => {
    const zoom = mediumZoom()

    expect(zoom.update).toBeInstanceOf(Function)
    expect(zoom.update()).toEqual(zoom)
  })

  test('update() does not change options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update().getOptions()

    expect(updatedOptions).toEqual(initialOptions)
  })

  test('update({}) does not change options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update({}).getOptions()

    expect(updatedOptions).toEqual(initialOptions)
  })

  test('update({ margin }) updates options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update({ margin: 48 }).getOptions()

    expect(updatedOptions).toEqual({ ...initialOptions, margin: 48 })
  })

  test('update({ background }) updates options and renders the background correctly', () => {
    expect.assertions(2)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom
      .update({ background: 'rgb(0, 0, 0)' })
      .getOptions()

    zoom.open()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      background: 'rgb(0, 0, 0)',
    })
    expect(
      document.querySelector('.medium-zoom-overlay').style.backgroundColor
    ).toBe('rgb(0, 0, 0)')
  })

  test('update({ scrollOffset }) updates options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update({ scrollOffset: 0 }).getOptions()

    expect(updatedOptions).toEqual({ ...initialOptions, scrollOffset: 0 })
  })

  test('update({ container: String }) updates options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update({ container: 'body' }).getOptions()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      container: 'body',
    })
  })

  test('update({ container: Element }) updates options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom
      .update({ container: document.body })
      .getOptions()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      container: document.body,
    })
  })

  test('update({ container: Object }) updates options', () => {
    const zoom = mediumZoom({
      container: { top: 64 },
    })
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom
      .update({
        container: {
          left: 64,
        },
      })
      .getOptions()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      container: {
        top: 64,
        left: 64,
      },
    })
  })

  test('update({ template: String }) updates options', () => {
    const template = document.createElement('template')
    root.appendChild(template)

    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update({ template: 'template' }).getOptions()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      template,
    })
  })

  test('update({ template: Element }) updates options', () => {
    const template = document.createElement('template')
    root.appendChild(template)

    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom.update({ template }).getOptions()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      template,
    })
  })

  test('update(options) updates all options', () => {
    const zoom = mediumZoom()
    const initialOptions = zoom.getOptions()
    const updatedOptions = zoom
      .update({
        margin: 24,
        background: '#BADA55',
        scrollOffset: 0,
      })
      .getOptions()

    expect(updatedOptions).toEqual({
      ...initialOptions,
      margin: 24,
      background: '#BADA55',
      scrollOffset: 0,
    })
  })
})

describe('clone()', () => {
  test('is defined and returns a new zoom', () => {
    const zoom = mediumZoom()

    expect(zoom.clone).toBeDefined()
    expect(zoom).not.toEqual(zoom.clone())
    expect(Object.keys(zoom.clone())).toEqual(Object.keys(mediumZoom()))
  })

  test('clone() clones the options', () => {
    const zoom = mediumZoom({ background: '#000' })
    const clonedZoom = zoom.clone()

    expect(clonedZoom.getOptions()).toEqual(zoom.getOptions())
  })

  test('clone({}) clones the options', () => {
    const zoom = mediumZoom({ background: '#000' })
    const clonedZoom = zoom.clone({})

    expect(clonedZoom.getOptions()).toEqual(zoom.getOptions())
  })

  test('mediumZoom({ background }).clone({ background }) overrides the options', () => {
    const zoom = mediumZoom({ background: '#000' })
    const clonedZoom = zoom.clone({ background: 'yellow' })

    expect(clonedZoom.getOptions()).toEqual({
      ...zoom.getOptions(),
      background: 'yellow',
    })
  })

  test('mediumZoom({ background }).clone({ margin }) extends the options', () => {
    const zoom = mediumZoom({ background: '#000' })
    const clonedZoom = zoom.clone({ margin: 48 })

    expect(clonedZoom.getOptions()).toEqual({
      ...zoom.getOptions(),
      margin: 48,
    })
  })
})

describe('getOptions()', () => {
  test('is defined and returns an object', () => {
    const zoom = mediumZoom()

    expect(zoom.getOptions).toBeDefined()
    expect(zoom.getOptions()).toBeInstanceOf(Object)
  })

  test('mediumZoom().getOptions() returns the options', () => {
    const zoom = mediumZoom()

    expect(zoom.getOptions()).toEqual({
      background: '#fff',
      margin: 0,
      scrollOffset: 40,
      container: null,
      template: null,
    })
  })

  test('mediumZoom(options).getOptions() returns the options', () => {
    const zoom = mediumZoom({ background: '#000' })

    expect(zoom.getOptions()).toEqual({
      background: '#000',
      margin: 0,
      scrollOffset: 40,
      container: null,
      template: null,
    })
  })
})

describe('getImages()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns an array', () => {
    const zoom = mediumZoom()

    expect(zoom.getImages).toBeDefined()
    expect(zoom.getImages()).toEqual([])
  })

  test('mediumZoom("img").getImages() returns the images', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')

    expect(zoom.getImages()).toEqual([image1, image2])
  })
})

describe('getZoomedTarget()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns null by default', () => {
    const zoom = mediumZoom()

    expect(zoom.getZoomedTarget).toBeDefined()
    expect(zoom.getZoomedTarget()).toBe(null)
  })

  test('getZoomedTarget() once zoomed is the target', () => {
    expect.assertions(1)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    zoom.open()

    expect(zoom.getZoomedTarget()).toBe(image)
  })
})

describe('open()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns a Promise', () => {
    const zoom = mediumZoom()

    expect(zoom.open).toBeDefined()
    expect(zoom.open()).toBeInstanceOf(Promise)
  })

  test('open() without target does not throw', () => {
    expect.assertions(1)

    const zoom = mediumZoom()

    expect(async () => {
      await zoom.open()
    }).not.toThrow()
  })

  test('open() returns a Promise resolving the zoom', async () => {
    expect.assertions(1)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const openedZoom = await zoom.open()

    expect(openedZoom).toEqual(zoom)
  })

  test('open() sets the active target', async () => {
    expect.assertions(1)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    await zoom.open()

    expect(zoom.getZoomedTarget()).toBe(image)
  })

  test('open({ target }) sets the active target', async () => {
    expect.assertions(1)

    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    await zoom.open({ target: image2 })

    expect(zoom.getZoomedTarget()).toBe(image2)
  })

  test('open() renders correctly', async () => {
    expect.assertions(5)

    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')
    await zoom.open()
    jest.runAllTimers()

    expect([...image1.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('open() a SVG renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    image.src = 'vector.svg'
    root.appendChild(image)

    const zoom = mediumZoom(image)
    await zoom.open()
    jest.runAllTimers()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('open() twice does not zoom twice', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')
    const openedZoom = await zoom.open()
    jest.runAllTimers()
    await openedZoom.open()
    jest.runAllTimers()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('open() with `data-zoom-src` renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    image.src = 'image.jpg'
    image.dataset.zoomSrc = 'image-hd.jpg'

    const zoomedImage = document.createElement('img')
    zoomedImage.src = 'image-hd.jpg'

    root.appendChild(image)

    const zoom = mediumZoom(image)
    await zoom.open()
    jest.runAllTimers()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('open() with `srcset` renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    image.src = 'image.jpg'
    image.srcset = `image-300x200.jpg 300w, image-600x400.jpg 600w, image-800x500.jpg 800w, image-1000x650.jpg 1000w, image-1200x800.jpg 1200w`
    root.appendChild(image)

    const zoom = mediumZoom('img')
    await zoom.open()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ background }).open() renders correctly', async () => {
    expect.assertions(1)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img', { background: '#BADA55' })
    await zoom.open()

    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ container: Node }).open() renders correctly', async () => {
    expect.assertions(1)

    const container = document.createElement('div')
    const image = document.createElement('img')
    root.appendChild(container)
    root.appendChild(image)

    const zoom = mediumZoom('img', { container })
    await zoom.open()

    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ container: String }).open() renders correctly', async () => {
    expect.assertions(1)

    const container = document.createElement('div')
    const image = document.createElement('img')
    root.appendChild(container)
    root.appendChild(image)

    const zoom = mediumZoom('img', { container: 'div' })
    await zoom.open()

    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ container: Object }).open() renders correctly', async () => {
    expect.assertions(1)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img', {
      container: {
        top: 46,
        left: 64,
      },
    })
    await zoom.open()

    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ template: Node }).open() renders correctly', async () => {
    expect.assertions(1)

    const template = document.createElement('template')
    const image = document.createElement('img')
    root.appendChild(template)
    root.appendChild(image)

    const zoom = mediumZoom('img', { template })
    await zoom.open()

    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ template: String }).open() renders correctly', async () => {
    expect.assertions(1)

    const template = document.createElement('template')
    const image = document.createElement('img')
    root.appendChild(template)
    root.appendChild(image)

    const zoom = mediumZoom('img', { template: 'template' })
    await zoom.open()

    expect(root).toMatchSnapshot()
  })
})

describe('close()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns a Promise', () => {
    const zoom = mediumZoom()

    expect(zoom.close).toBeDefined()
    expect(zoom.close()).toBeInstanceOf(Promise)
  })

  test('mediumZoom(Node).close() renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)

    await zoom.open()
    jest.runAllTimers()
    await zoom.close()

    expect([...image.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })

  test('mediumZoom(String).close() renders correctly', async () => {
    expect.assertions(6)

    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom('img')

    await zoom.open()
    jest.runAllTimers()
    await zoom.close()

    expect([...image1.classList]).toEqual(['medium-zoom-image'])
    expect([...image2.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })

  test('close() with `data-zoom-src` renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    image.dataset.zoomSrc = 'image-hd.jpg'
    root.appendChild(image)

    const zoom = mediumZoom(image)

    await zoom.open()
    jest.runAllTimers()
    await zoom.close()

    expect([...image.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })

  test('mediumZoom({ template }).close() renders correctly', async () => {
    expect.assertions(5)

    const template = document.createElement('template')
    const image = document.createElement('img')
    root.appendChild(template)
    root.appendChild(image)

    const zoom = mediumZoom(image, { template })

    await zoom.open()
    jest.runAllTimers()
    await zoom.close()

    expect([...image.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })

  test('close() twice does not throw and renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom('img')

    await zoom.open()
    jest.runAllTimers()
    await zoom.close()
    await zoom.close()

    expect([...image.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })
})

describe('toggle()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns a Promise', () => {
    const zoom = mediumZoom()

    expect(zoom.toggle).toBeDefined()
    expect(zoom.toggle()).toBeInstanceOf(Promise)
  })

  test('toggle() once renders correctly', async () => {
    expect.assertions(5)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)

    await zoom.toggle()
    jest.runAllTimers()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('toggle() twice renders correctly', async () => {
    expect.assertions(10)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)

    await zoom.toggle()
    jest.runAllTimers()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot('opened')

    await zoom.toggle()
    jest.runAllTimers()

    expect([...image.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot('closed')
  })
})

describe('on()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns the zoom', () => {
    const zoom = mediumZoom()

    expect(zoom.on).toBeDefined()
    expect(zoom.on()).toEqual(zoom)
  })

  test('"open" is called', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onOpen = jest.fn()

    zoom.on('open', onOpen)

    zoom.open()

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ target: image, detail: { zoom } })
    )
  })

  test('"opened" is called', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onOpened = jest.fn()

    zoom.on('opened', onOpened)

    zoom.open().then(zoom => {
      expect(onOpened).toHaveBeenCalledTimes(1)
      expect(onOpened).toHaveBeenCalledWith(
        expect.objectContaining({ target: image, detail: { zoom } })
      )
    })
  })

  test('"close" is called', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onClose = jest.fn()

    zoom.on('close', onClose)

    zoom.open().then(zoom =>
      zoom.close().then(zoom => {
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(onClose).toHaveBeenCalledWith(
          expect.objectContaining({ target: image, detail: { zoom } })
        )
      })
    )
  })

  test('"closed" is called', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onClosed = jest.fn()

    zoom.on('closed', onClosed)

    zoom.open().then(zoom =>
      zoom.close().then(zoom => {
        expect(onClosed).toHaveBeenCalledTimes(1)
        expect(onClosed).toHaveBeenCalledWith(
          expect.objectContaining({ target: image, detail: { zoom } })
        )
      })
    )
  })

  test('"update" is called', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onUpdate = jest.fn()

    zoom.on('update', onUpdate)

    zoom.update()

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: image, detail: { zoom } })
    )
  })

  test('"detach" is called for detach(image)', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onDetach = jest.fn()

    zoom.on('detach', onDetach)

    zoom.detach(image)

    expect(onDetach).toHaveBeenCalledTimes(1)
    expect(onDetach).toHaveBeenCalledWith(
      expect.objectContaining({ target: image, detail: { zoom } })
    )
  })

  test('"detach" is called for detach()', () => {
    const image1 = document.createElement('img')
    const image2 = document.createElement('img')
    root.appendChild(image1)
    root.appendChild(image2)

    const zoom = mediumZoom([image1, image2])
    const onDetach = jest.fn()

    zoom.on('detach', onDetach)

    zoom.detach()

    expect(onDetach).toHaveBeenCalledTimes(2)
    expect(onDetach).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ target: image1, detail: { zoom } })
    )
    expect(onDetach).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ target: image2, detail: { zoom } })
    )
  })

  test('event is attached to dynamically attached images', () => {
    const image1 = document.createElement('img')
    root.appendChild(image1)

    const zoom = mediumZoom(image1)
    const onUpdate = jest.fn()

    zoom.on('update', onUpdate)

    const image2 = document.createElement('img')
    root.appendChild(image2)

    zoom.attach(image2)
    zoom.update({ margin: 24 })

    expect(onUpdate).toHaveBeenCalledTimes(2)
    expect(onUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ target: image1, detail: { zoom } })
    )
    expect(onUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ target: image2, detail: { zoom } })
    )
  })

  test('event is called when `CustomEvent` is undefined', async () => {
    expect.assertions(2)

    const image = document.createElement('img')
    root.appendChild(image)

    global.CustomEvent = undefined

    const zoom = mediumZoom(image)
    const onOpen = jest.fn()

    zoom.on('open', onOpen)

    await zoom.open()
    jest.runAllTimers()

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ target: image, detail: { zoom } })
    )
  })

  test('event is called once with the `once` option', async () => {
    expect.assertions(2)

    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onOpen = jest.fn()

    zoom.on('open', onOpen, { once: true })

    await zoom.open()
    jest.runAllTimers()
    await zoom.close()
    await zoom.open()
    jest.runAllTimers()

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ target: image, detail: { zoom } })
    )
  })
})

describe('off()', () => {
  const root = emptyRootBeforeEach()

  test('is defined and returns the zoom', () => {
    const zoom = mediumZoom()

    expect(zoom.off).toBeDefined()
    expect(zoom.off()).toEqual(zoom)
  })

  test('does not call event listeners anymore', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    const zoom = mediumZoom(image)
    const onOpen = jest.fn()

    zoom.on('open', onOpen)
    zoom.open()

    expect(onOpen).toHaveBeenCalledTimes(1)

    zoom.off('open', onOpen)
    zoom.open()

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test('stops calling event handlers when the listener is removed', () => {
    const image1 = document.createElement('img')
    root.appendChild(image1)

    const zoom = mediumZoom(image1)
    const onUpdate = jest.fn()

    zoom.on('update', onUpdate)

    const image2 = document.createElement('img')
    root.appendChild(image2)

    zoom.attach(image2)
    zoom.update({ margin: 24 })

    expect(onUpdate).toHaveBeenCalledTimes(2)

    zoom.off('update', onUpdate)

    const image3 = document.createElement('img')
    root.appendChild(image3)

    zoom.attach(image3)
    zoom.update({ margin: 24 })

    expect(onUpdate).toHaveBeenCalledTimes(2)
  })

  test('keeps calling event handlers when a different listener is removed', () => {
    const image1 = document.createElement('img')
    root.appendChild(image1)

    const zoom = mediumZoom(image1)
    const onUpdate = jest.fn()

    zoom.on('update', onUpdate)

    const image2 = document.createElement('img')
    root.appendChild(image2)

    zoom.attach(image2)
    zoom.update({ margin: 24 })

    expect(onUpdate).toHaveBeenCalledTimes(2)

    function anotherUpdateFunction() {}
    zoom.off('update', anotherUpdateFunction)

    const image3 = document.createElement('img')
    root.appendChild(image3)

    zoom.attach(image3)
    zoom.update({ margin: 24 })

    expect(onUpdate).toHaveBeenCalledTimes(5)
  })
})

describe('browser events', () => {
  const root = emptyRootBeforeEach()

  test('opens zoom on click on the image', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom(image)

    image.click()
    jest.runAllTimers()

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })

  test('closes zoom on click on the overlay', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom(image)

    image.click()
    jest.runAllTimers()

    const overlay = document.querySelector('.medium-zoom-overlay')
    overlay.click()

    expect([...image.classList]).toEqual(['medium-zoom-image'])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })

  test.skip('closes on escape', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom(image)

    image.click()
    jest.runAllTimers()

    document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 27 }))

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeFalsy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeFalsy()
    expect(document.querySelector('.medium-zoom--opened')).toBeFalsy()
    expect(root).toMatchSnapshot()
  })

  test.skip('does not close on other keys', () => {
    const image = document.createElement('img')
    root.appendChild(image)

    mediumZoom(image)

    image.click()
    jest.runAllTimers()

    document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 65 }))

    expect([...image.classList]).toEqual([
      'medium-zoom-image',
      'medium-zoom-image--hidden',
    ])
    expect(document.querySelector('.medium-zoom-image--opened')).toBeTruthy()
    expect(document.querySelector('.medium-zoom-overlay')).toBeTruthy()
    expect(document.querySelector('.medium-zoom--opened')).toBeTruthy()
    expect(root).toMatchSnapshot()
  })
})
