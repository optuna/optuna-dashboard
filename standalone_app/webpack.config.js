const fs = require('fs');
const webpack = require('webpack');
const path = require('path');
const CompressionPlugin = require("compression-webpack-plugin");

// sqlite3.wasm is loaded by the storage Worker through a URL that the extension
// resolves with asWebviewUri(), so nothing in the bundles imports it. Emit it
// explicitly instead of relying on an otherwise unused `*.wasm?url` import.
const sqliteWasmPath = path.join(
    path.dirname(require.resolve('@sqlite.org/sqlite-wasm/package.json', {
        paths: [path.resolve(__dirname, '../tslib/storage')],
    })),
    'sqlite-wasm/jswasm/sqlite3.wasm'
);

class EmitSqliteWasmPlugin {
    apply(compiler) {
        const pluginName = 'EmitSqliteWasmPlugin';
        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            compilation.hooks.processAssets.tapPromise(
                {
                    name: pluginName,
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                },
                async () => {
                    compilation.fileDependencies.add(sqliteWasmPath);
                    const content = await fs.promises.readFile(sqliteWasmPath);
                    compilation.emitAsset(
                        'sqlite3.wasm',
                        new compiler.webpack.sources.RawSource(content)
                    );
                }
            );
        });
    }
}

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
    entry: {
        bundle: __dirname + '/src/vscode_entry.tsx',
        'storage-worker': path.resolve(__dirname, '../tslib/storage/src/storage_worker.ts'),
    },
    output: {
        path: path.resolve(__dirname, '../vscode/assets/'),
        filename: '[name].js',
        publicPath: '/',
        clean: true,
    },
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
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
                // `*.wasm?url` is a Vite-only entrypoint of @optuna/storage. Keep it
                // out of the inline rule so that importing it here fails loudly
                // instead of silently inlining sqlite3.wasm as base64.
                test: /\.wasm$/,
                resourceQuery: { not: [/url/] },
                type: "asset/inline",
            },
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /sqlite3-bundler-friendly\.mjs$/,
                use: path.resolve(__dirname, '../tslib/storage/build/sqlite-wasm-bundler-loader.cjs'),
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js'],
        },
    },
    plugins: [
        new webpack.DefinePlugin({ 'IS_VSCODE': JSON.stringify(true) }),
        new EmitSqliteWasmPlugin(),
        new CompressionPlugin()
    ]
};
