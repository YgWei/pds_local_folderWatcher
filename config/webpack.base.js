// webpack v4
const path = require('path')

module.exports = {
  entry: { 
    'index': './src/index.js' 
  },
  output: {
    path: path.resolve(__dirname, '..', 'dist'),
    filename: '[name].bundle.js'
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  }
}