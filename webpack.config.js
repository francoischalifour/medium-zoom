const path = require('path')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')
const pkg = require('./package.json')

const libraryName = pkg.name
const banner = `${libraryName} v${pkg.version}
${pkg.description}
Copyright ${new Date().getFullYear()} ${pkg.author.name}
https://github.com/${pkg.repository}
Licensed under ${pkg.license}`

module.exports = {
  entry: {
    [libraryName]: path.join(__dirname, `/src/${libraryName}`),
    [`${libraryName}.min`]: path.join(__dirname, `/src/${libraryName}`)
  },
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
    library: 'mediumZoom',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  resolve: {
    modules: [path.resolve('./src')],
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: require.resolve('babel-loader')
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: require.resolve('style-loader')
          },
          {
            loader: require.resolve('css-loader')
          },
          {
            loader: require.resolve('postcss-loader'),
            options: {
              plugins: [
                autoprefixer
              ]
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.BannerPlugin({ banner }),
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      minimize: true,
      sourceMap: true
    })
  ]
}
