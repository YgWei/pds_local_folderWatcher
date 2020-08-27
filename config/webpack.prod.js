const merge = require('webpack-merge')
const baseWebpackConfig = require('./webpack.base')

const webpackConfig = merge(baseWebpackConfig, {
    mode: 'production'
})

module.exports = webpackConfig

