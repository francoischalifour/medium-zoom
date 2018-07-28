module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': 'off'
  },
  parser: 'babel-eslint',
  env: {
    es6: true,
    browser: true,
    node: true
  }
}
