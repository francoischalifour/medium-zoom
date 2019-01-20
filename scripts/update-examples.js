const { readdirSync, statSync } = require('fs')
const { join } = require('path')
const { execSync } = require('child_process')
const { version } = require('../package.json')

const examples = readdirSync('examples')
  .map(file => join('examples', file))
  .filter(file => statSync(file).isDirectory())

examples.forEach(path => {
  execSync(`cd ${path} && yarn upgrade medium-zoom@${version}`, {
    stdio: 'inherit',
  })
})
