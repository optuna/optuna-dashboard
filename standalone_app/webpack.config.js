const webpack = require('webpack');
const path = require('path');
const CompressionPlugin = require("compression-webpack-plugin");

// TODO: Remove these aliases after pnpm workspace migration.
// Without a shared .pnpm/ store, sibling installs of react/@mui/@emotion
// become separate module instances at identical versions; alias them to
// tslib/react's copies to dedupe.
const tslibReactNodeModules = path.resolve(
    __dirname,
    '../tslib/react/node_modules'
);
// Only top-level packages need aliasing; transitive deps resolve via .pnpm/.
const singletonAliases = Object.fromEntries(
    [
        '@mui/material',
        '@mui/system',
        '@mui/icons-material',
        '@mui/lab',
        '@emotion/react',
        '@emotion/styled',
        'react',
        'react-dom',
    ].map((name) => [name, path.join(tslibReactNodeModules, name)])
);

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
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: singletonAliases
    },
    plugins: [
        new webpack.DefinePlugin({ 'IS_VSCODE': JSON.stringify(true) }),
        new CompressionPlugin()
    ]
};
