import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import minify from 'rollup-plugin-babel-minify'
import { uglify } from 'rollup-plugin-uglify'
import postcss from 'rollup-plugin-postcss'
import cssnano from 'cssnano'

import {
  name,
  version,
  repository,
  license,
  main as mainPath,
  module as modulePath,
} from './package.json'

const banner = `/*! ${name} ${version} | ${license} License | https://github.com/${repository} */`

const sharedPlugins = [
  postcss({
    extensions: ['.css'],
    plugins: [cssnano()],
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
    comments: false,
    plugins: ['transform-object-rest-spread'],
    presets: [
      [
        'env',
        {
          modules: false,
          loose: true,
          targets: {
            browsers: ['last 2 versions', 'IE >= 11'],
          },
        },
      ],
    ],
  }),
]

const config = [
  {
    file: modulePath,
    format: 'es',
    plugins: [
      ...sharedPlugins,
      minify({
        comments: false,
        banner,
      }),
    ],
  },
  {
    file: mainPath.replace('.min', ''),
    format: 'umd',
    plugins: [
      ...sharedPlugins,
      uglify({
        compress: false,
        mangle: false,
        output: {
          beautify: true,
          indent_level: 2,
          comments: 'all',
        },
      }),
    ],
  },
  {
    file: mainPath,
    format: 'umd',
    plugins: [
      ...sharedPlugins,
      uglify({
        output: {
          preamble: banner,
        },
      }),
    ],
  },
].map(({ file, format, plugins }) => ({
  input: 'src/index.js',
  output: {
    name: 'mediumZoom',
    file,
    format,
    banner,
  },
  plugins,
}))

export default config
