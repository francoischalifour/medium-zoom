import React from 'react'

const Header = ({
  title,
  description,
  github,
  article
}) =>
  <header className='header' id='header'>
    <h1 className='header__title'>{title}</h1>
    <div className='header__subtitle'>{description}</div>

    <div className='header__info'>
      <a href={github} className='button'>View on GitHub</a>
      <a href={article} className='button'>Read the article</a>
    </div>
  </header>

export default Header
