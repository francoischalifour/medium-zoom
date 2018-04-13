import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import minify from 'rollup-plugin-babel-minify'
import uglify from 'rollup-plugin-uglify'
import postcss from 'rollup-plugin-postcss'
import cssnano from 'cssnano'

import {
  name,
  description,
  version,
  author,
  repository,
  license,
  main as mainPath,
  module as modulePath
} from './package.json'

const banner =
`/*
 * ${name} v${version}
 * ${description}
 * Copyright ${new Date().getFullYear()} ${author.name}
 * https://github.com/${repository}
 * ${license} License
 */`

const plugins = [
  postcss({
    extensions: ['.css'],
    plugins: [
      cssnano()
    ]
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
    plugins: [
      'transform-object-assign'
    ]
  })
]

const config = [{
  file: modulePath,
  format: 'es',
  plugins: [
    ...plugins,
    minify({
      comments: false,
      banner
    })
  ]
}, {
  file: mainPath.replace('.min', ''),
  format: 'umd',
  plugins: [
    ...plugins,
    uglify({
      compress: false,
      mangle: false,
      output: {
        beautify: true,
        indent_level: 2,
        comments: 'all'
      }
    })
  ]
}, {
  file: mainPath,
  format: 'umd',
  plugins: [
    ...plugins,
    uglify({
      output: {
        preamble: banner
      }
    })
  ]
}].map(({ file, format, plugins }) => ({
  input: 'src/index.js',
  output: {
    name: 'mediumZoom',
    file,
    format,
    banner
  },
  plugins
}))

export default config
