const webpack = require('webpack');
const path = require('path');
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
    mode: "production",
    devtool: 'source-map',
    experiments: {
        syncWebAssembly: true,
        asyncWebAssembly: true,
    },
    cache: {
        type: 'filesystem',
        buildDependencies: {
            config: [__filename],
        }
    },
    entry: [__dirname + '/src/vscode_entry.tsx'],
    output: {
        path: path.resolve(__dirname, '../vscode/assets/'),
        filename: 'bundle.js',
        publicPath: '/'
    },
    module: {
        rules: [
            { oneOf: [{
                test: /\.tsx?$/,
                exclude: [/node_modules/],
                loader: 'esbuild-loader',
                options: {
                    loader: 'tsx',
                    tsconfigRaw: require('./tsconfig.json')
                }
            }] },
            {
                test: /\.wasm$/,
                type: "asset/inline",
            },
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        new webpack.DefinePlugin({ 'IS_VSCODE': JSON.stringify(true) }),
        new CompressionPlugin()
    ]
};
