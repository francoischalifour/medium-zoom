import babel from 'rollup-plugin-babel'
import minify from 'rollup-plugin-babel-minify'
import replace from 'rollup-plugin-replace'
import { uglify } from 'rollup-plugin-uglify'
import postcss from 'rollup-plugin-postcss'
import cssnano from 'cssnano'

import {
  name,
  version,
  repository,
  license,
  main as umdPath,
  module as esmPath,
} from './package.json'

const banner = `/*! ${name} ${version} | ${license} License | https://github.com/${repository} */`

const sharedPlugins = [
  postcss({
    extensions: ['.css'],
    plugins: [cssnano()],
  }),
  replace({
    __TEST__: process.env.NODE_ENV === 'test' ? 'true' : 'false',
  }),
  babel({
    exclude: 'node_modules/**',
    plugins: ['external-helpers', 'transform-object-rest-spread'],
  }),
]

export default [
  {
    input: 'src/index.js',
    output: {
      file: esmPath,
      format: 'es',
    },
    plugins: [
      ...sharedPlugins,
      minify({
        comments: false,
        banner,
      }),
    ],
  },
  {
    input: 'src/index.js',
    output: {
      name: 'mediumZoom',
      file: umdPath.replace('.min', ''),
      format: 'umd',
    },
    plugins: [
      ...sharedPlugins,
      uglify({
        compress: false,
        mangle: false,
        output: {
          beautify: true,
          indent_level: 2,
          preamble: banner,
        },
      }),
    ],
  },
  {
    input: 'src/index.js',
    output: {
      name: 'mediumZoom',
      file: umdPath,
      format: 'umd',
    },
    plugins: [
      ...sharedPlugins,
      uglify({
        output: {
          preamble: banner,
        },
      }),
    ],
  },
]
