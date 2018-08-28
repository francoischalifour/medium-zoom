module.exports = {
  extends: ['eslint:recommended', 'airbnb-base', 'prettier'],
  parser: 'babel-eslint',
  env: {
    es6: true,
    browser: true,
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
}
