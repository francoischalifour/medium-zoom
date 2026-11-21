import { bindGalleryKeyboard } from '/experimental/dist/gallery/index.mjs'

export function mountCloseControl({ element, close }) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Close image'
  button.autofocus = true
  button.className = 'example-close'
  button.style.cssText =
    'position:absolute;top:16px;right:16px;z-index:2147483647;min-height:44px;padding:12px 16px;background:white;color:black;cursor:pointer;'
  button.addEventListener('click', close)
  element.append(button)
  return () => button.remove()
}

export function mountExampleControls(
  element,
  gallery,
  {
    previousLabel = 'Previous image',
    nextLabel = 'Next image',
    positionLabel = (position, total) => `${position} of ${total}`,
  } = {}
) {
  const bar = document.createElement('div')
  bar.className = 'medium-zoom-gallery'
  const previous = document.createElement('button')
  const next = document.createElement('button')
  const status = document.createElement('span')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  for (const [button, label] of [
    [previous, previousLabel],
    [next, nextLabel],
  ]) {
    button.type = 'button'
    button.textContent = label
  }
  previous.addEventListener('click', () => {
    void gallery.previous()
  })
  next.addEventListener('click', () => {
    void gallery.next()
  })
  const update = () => {
    const state = gallery.getSnapshot()
    // Retain focus when a navigation button reaches the end of the collection.
    previous.setAttribute('aria-disabled', String(!state.canPrevious))
    next.setAttribute('aria-disabled', String(!state.canNext))
    status.textContent = positionLabel(state.index + 1, state.images.length)
  }
  const unsubscribe = gallery.subscribe(update)
  const unbind = bindGalleryKeyboard(element, gallery)
  update()
  bar.append(previous, status, next)
  element.appendChild(bar)
  return () => {
    unsubscribe()
    unbind()
    bar.remove()
  }
}
