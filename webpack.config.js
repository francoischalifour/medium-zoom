const path = require('path')
const webpack = require('webpack')

const autoprefixer = require('autoprefixer')

const pkg = require('./package.json')

const env = process.env.NODE_ENV

const plugins = []
const libraryName = pkg.name
const banner = `
   ${libraryName} v${pkg.version}
   ${pkg.description}
   Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}
   https://github.com/${pkg.repository}
   ${pkg.license} license
`

let outputFile

plugins.push(new webpack.BannerPlugin(banner))

if (env === 'build') {
  plugins.push(new webpack.optimize.UglifyJsPlugin({ minimize: true, compress: { warnings: false } }))
  outputFile = `${libraryName}.min.js`
} else {
  outputFile = `${libraryName}.js`
}

module.exports = {
  entry: path.join(__dirname, `/src/${libraryName}`),
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader!postcss-loader'
      }
    ]
  },
  plugins,
  postcss: () => [ autoprefixer ],
  resolve: {
    root: path.resolve('./src'),
    extensions: ['', '.js']
  }
}
