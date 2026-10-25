import { stories } from './stories.ts'

const nav = document.querySelector('nav')!
for (const story of stories) {
  const link = document.createElement('a')
  link.textContent = `${story.kind} / ${story.name}`
  link.href = `frame.html?story=${encodeURIComponent(story.id)}`
  link.target = 'preview'
  link.title = story.notes
  nav.append(link)
}

const query = new URLSearchParams(location.search)
const selected = stories.find(
  story => story.kind === query.get('selectedKind') && story.name === query.get('selectedStory')
)
document.querySelector('iframe')!.src =
  `frame.html?story=${encodeURIComponent((selected || stories[0]).id)}`
