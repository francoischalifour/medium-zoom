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
  main as mainPath,
  module as modulePath,
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
    presets: [
      [
        'env',
        {
          modules: false,
          loose: true,
        },
      ],
    ],
    plugins: ['transform-object-rest-spread'],
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
          preamble: banner,
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
  },
  plugins,
}))

export default config
