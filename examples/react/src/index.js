import React from 'react'
import ReactDOM from 'react-dom'
import './reset.css'
import './index.css'
import article from './article.md'
import Post from './Post'
import registerServiceWorker from './registerServiceWorker'

(async () => {
  const post = await fetch(article).then(response => response.text())

  ReactDOM.render(<Post post={post} />, document.getElementById('root'))
  registerServiceWorker()
})()
