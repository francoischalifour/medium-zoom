import { configure, addDecorator, getStorybook } from '@storybook/html'
import { setOptions } from '@storybook/addon-options'
import { withNotes } from '@storybook/addon-notes'

import { withPreview } from './decorators'
import './style.css'

setOptions({
  name: 'medium-zoom',
  url: 'https://github.com/francoischalifour/medium-zoom',
})

addDecorator(withNotes)
addDecorator(withPreview)

const req = require.context('..', true, /\.stories\.js$/)

function loadStories() {
  req.keys().forEach(filename => req(filename))
}

configure(loadStories, module)
