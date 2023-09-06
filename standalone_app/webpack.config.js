const webpack = require('webpack');
const path = require('path');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const isDev = mode === 'development';
const PUBLIC_PATH = process.env.PUBLIC_PATH ?? '/public/';
if (!PUBLIC_PATH.endsWith('/')) {
    PUBLIC_PATH += '/';
}

const typeScriptLoader = process.env.TYPESCRIPT_LOADER === "esbuild-loader" ? {
    test: /\.tsx?$/,
    exclude: [/node_modules/],
    loader: 'esbuild-loader',
    options: {
        loader: 'tsx',
        tsconfigRaw: require('./tsconfig.json')
    }
} : {
    test: /\.tsx?$/,
    exclude: [/node_modules/],
    loader: 'ts-loader',
    options: {
        configFile: __dirname + '/tsconfig.json',
        transpileOnly: isDev,
        happyPackMode: true
    }
}

var config = [
    {
        mode,
        experiments: {
            syncWebAssembly: true,
            asyncWebAssembly: true,
        },
        entry: [__dirname + '/src/browser_app_entry.tsx'],
        output: {
            path: __dirname + '/public/',
            filename: 'bundle.js',
            publicPath: PUBLIC_PATH
        },
        module: {
            rules: [{ oneOf: [typeScriptLoader] }]
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js']
        },
        plugins: [
            new webpack.DefinePlugin({'IS_VSCODE': JSON.stringify(false)})
        ]
    },
    {
        mode,
        experiments: {
            syncWebAssembly: true,
            asyncWebAssembly: true,
        },
        entry: [__dirname + '/src/vscode_entry.tsx'],
        output: {
            path: path.resolve(__dirname, '../vscode/assets/'),
            filename: 'bundle.js',
            publicPath: '/'
        },
        module: {
            rules: [
                { oneOf: [typeScriptLoader] },
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
            new webpack.DefinePlugin({'IS_VSCODE': JSON.stringify(true)})
        ]
    },
];

if (isDev) {
    config[0].devtool = 'source-map';
    config[0].cache = {
        type: 'filesystem',
        buildDependencies: {
            config: [__filename],
        }
    }
    console.log('= = = = = = = = = = = = = = = = = = =');
    console.log('DEVELOPMENT BUILD');
    console.log(process.env.TYPESCRIPT_LOADER === 'esbuild-loader' ? 'esbuild-loader' : 'ts-loader');
    console.log('= = = = = = = = = = = = = = = = = = =');
} else {
    const CompressionPlugin = require("compression-webpack-plugin");
    config[0].plugins.push(new CompressionPlugin())
    config[1].plugins.push(new CompressionPlugin())
}

module.exports = config;
