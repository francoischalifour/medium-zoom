// A dialog close button for renderer tests that need application content but no gallery.
export function mountCloseControl({ element, close }) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Close image'
  button.autofocus = true
  button.style.cssText =
    'position:absolute;top:16px;right:16px;z-index:2147483647;min-height:44px;padding:12px 16px;background:white;color:black;cursor:pointer;'
  button.addEventListener('click', close)
  element.append(button)
  return () => button.remove()
}
