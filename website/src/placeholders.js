// Show placeholders for paragraphs
const paragraphs = [].slice.call(document.querySelectorAll('p.placeholder'))

paragraphs.forEach(paragraph => {
  // eslint-disable-next-line no-param-reassign
  paragraph.innerHTML = paragraph.textContent
    .split(' ')
    .filter(text => text.length > 4)
    .map(text => `<span class="placeholder__word">${text}</span>`)
    .join(' ')
})
