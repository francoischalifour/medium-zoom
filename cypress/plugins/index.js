const { addMatchImageSnapshotPlugin } = require('cypress-image-snapshot/plugin')

module.exports = on => {
  addMatchImageSnapshotPlugin(on)
}
