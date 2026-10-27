import mediumZoom from 'medium-zoom'

import { stories } from './stories.ts'

import './frame.css'

window.mediumZoom = mediumZoom
const story = stories.find(story => story.id === new URLSearchParams(location.search).get('story'))
if (!story) {
  throw new Error('Unknown story')
}

const wrapper = document.querySelector('#wrapper')!
wrapper.innerHTML = story.render()
const scripts = Array.from(wrapper.querySelectorAll('script'), script => {
  const source = script.textContent
  script.remove()
  return source
})

await Promise.all(Array.from(document.images, image => image.decode()))
const script = document.createElement('script')
script.type = 'module'
script.textContent =
  scripts.join('\n') +
  '\nwindow.zoom = typeof zoom === "undefined" ? undefined : zoom; document.documentElement.dataset.ready = "true";'
document.body.append(script)
