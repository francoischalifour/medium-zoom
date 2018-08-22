module.exports = {
  rootDir: process.cwd(),
  testRegex: 'src/(__tests__/.*|(\\.|/)(test|spec))\\.jsx?$',
  collectCoverageFrom: ['src/**/*.js'],
  globals: {
    __TEST__: true,
  },
  timers: 'fake',
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/__mocks__/styleMock.js',
  },
}
