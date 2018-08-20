module.exports = {
  extends: ['eslint:recommended', 'airbnb-base', 'prettier'],
  parser: 'babel-eslint',
  env: {
    es6: true,
    browser: true,
    node: true,
    jest: true,
  },
  rules: {
    'no-underscore-dangle': 0,
    'no-use-before-define': 0,
    'no-shadow': 0,
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'prefer-spread': 0,
    'no-plusplus': 0,
  },
}
