module.exports = {
  rootDir: process.cwd(),
  testRegex: 'src/(__tests__/.*|(\\.|/)(test|spec))\\.jsx?$',
  setupFiles: [require.resolve('./setupEnvironment.js')],
  collectCoverageFrom: ['src/**/*.js'],
  globals: {
    __TEST__: true,
  },
  timers: 'fake',
}
