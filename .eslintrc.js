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
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'no-shadow': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
}
