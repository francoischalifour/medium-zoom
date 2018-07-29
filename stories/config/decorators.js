export function withPreview(story) {
  const activeZoom = window.zoom

  if (activeZoom) {
    activeZoom.detach()
  }

  const wrapper = document.createElement('div')
  const dom = document.createElement('div')
  const storyHtml = story()

  wrapper.innerHTML = storyHtml

  Array.from(wrapper.childNodes).forEach(node => {
    if (node.tagName === 'SCRIPT') {
      const script = document.createElement('script')
      script.innerHTML = `
          setTimeout(() => {

            ${node.innerHTML}

            if (zoom) {
              // Attach the zoom to the window to detach the zoom
              // when the user goes to another story.
              window.zoom = zoom;
            }
          }, 100);
        `
      dom.appendChild(script)
      return
    }

    dom.appendChild(node)
  })

  dom.id = 'wrapper'

  return dom
}
