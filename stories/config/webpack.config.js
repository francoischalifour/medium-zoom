module.exports = (_baseConfig, _env, defaultConfig) => {
  defaultConfig.module.rules.push({
    test: /\.stories\.js$/,
    loaders: [
      {
        loader: require.resolve('@storybook/addon-storysource/loader'),
      },
    ],
    enforce: 'pre',
  })

  return defaultConfig
}
