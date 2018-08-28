module.exports = {
  plugins: ['cypress'],
  env: {
    'cypress/globals': true,
  },
  rules: {
    'import/no-extraneous-dependencies': 0,
  },
}
