const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const buildDirectory = path.resolve(__dirname, "build");

module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: buildDirectory
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      {
        test: /\.(fbx)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "static/[name].[hash:8].[ext]"
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true
    }),
    new CopyPlugin([
      {
        from: "public/scene",
        to: "scene"
      }
    ])
  ],
  optimization: {
    // Automatically split vendor and commons
    // https://twitter.com/wSokra/status/969633336732905474
    // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
    splitChunks: {
      chunks: "all",
      name: false
    },
    // Keep the runtime chunk separated to enable long term caching
    // https://twitter.com/wSokra/status/969679223278505985
    runtimeChunk: true
  },
  devServer: {
    contentBase: buildDirectory,
    compress: true,
    disableHostCheck: true,
    port: 3000
  },
  performance: {
    hints: false
  }
};
