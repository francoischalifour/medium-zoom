const path = require('path')
const webpack = require('webpack')
const { name, description, version, author, repository, license } = require('./package.json')

const banner = `${name} v${version}
${description}
Copyright ${new Date().getFullYear()} ${author.name}
https://github.com/${repository}
Licensed under ${license}`

module.exports = {
  entry: {
    [name]: path.join(__dirname, `/src/${name}`),
    [`${name}.min`]: path.join(__dirname, `/src/${name}`)
  },
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
    library: 'mediumZoom',
    libraryTarget: 'umd',
    umdNamedDefine: true
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
                require('autoprefixer')
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
