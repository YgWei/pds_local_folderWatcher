const merge = require('webpack-merge')
const baseWebpackConfig = require('./webpack.base')

const webpackConfig = merge(baseWebpackConfig, {
    mode:'development',
    devtool: 'inline-source-map',
    devServer: {
        compress: true,
        port: 8080
    }
})

module.exports = webpackConfig

