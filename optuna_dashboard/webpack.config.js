const webpack = require("webpack")

const mode =
  process.env.NODE_ENV === "production" ? "production" : "development"
const isDev = mode === "development"


var config = {
  mode,
  entry: [__dirname + "/ts/index.tsx"],
  output: {
    path: __dirname + "/public/",
    filename: "bundle.js",
    publicPath: "/public/",
  },
  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.tsx?$/,
            exclude: [/node_modules/],
            loader: "esbuild-loader",
            options: {
              loader: "tsx",
              tsconfigRaw: require("./tsconfig.json"),
            },
          }
        ]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        }
      }
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new webpack.DefinePlugin({
      API_ENDPOINT: JSON.stringify(process.env.API_ENDPOINT),
      URL_PREFIX: JSON.stringify(process.env.URL_PREFIX || "/dashboard"),
    }),
  ],
}

if (isDev) {
  config.devtool = "source-map"
  config.cache = {
    type: "filesystem",
    buildDependencies: {
      config: [__filename],
    },
  }
  console.log("= = = = = = = = = = = = = = = = = = =")
  console.log("DEVELOPMENT BUILD")
  console.log("= = = = = = = = = = = = = = = = = = =")
} else {
  const CompressionPlugin = require("compression-webpack-plugin")
  config.plugins.push(new CompressionPlugin())
}

module.exports = config
