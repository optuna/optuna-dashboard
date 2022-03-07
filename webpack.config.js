const webpack = require('webpack');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const isDev = mode === 'development';
const skipTypeCheck = process.env.SKIP_TYPE_CHECK === 'true';

var config = {
    mode,
    entry: [__dirname + '/optuna_dashboard/static/index.tsx'],
    output: {
        path: __dirname + '/optuna_dashboard/public/',
        filename: 'bundle.js',
        publicPath: '/public/'
    },
    module: {
        rules: [{
            oneOf: [
                {
                    test: /\.tsx?$/,
                    exclude: [/node_modules/],
                    loader: 'ts-loader',
                    options: {
                        configFile: __dirname + '/tsconfig.json'
                    }
                }
            ]}]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        new webpack.DefinePlugin({
            'APP_BAR_TITLE': JSON.stringify(process.env.APP_BAR_TITLE || "Optuna Dashboard"),
            'API_ENDPOINT': JSON.stringify(process.env.API_ENDPOINT),
            'URL_PREFIX': JSON.stringify(process.env.URL_PREFIX || "/dashboard")
        })
    ]
};

if (isDev) {
    config.devtool = 'source-map';
    console.log('= = = = = = = = = = = = = = = = = = =');
    console.log('DEVELOPMENT BUILD');
    console.log('= = = = = = = = = = = = = = = = = = =');
}
if (skipTypeCheck) {
    config.module.rules = [{
        test: /\.tsx?$/,
        exclude: [/node_modules/],
        loader: 'esbuild-loader',
        options: {
            loader: 'tsx',
            tsconfigRaw: require('./tsconfig.json')
        }
    }]
    console.log('= = = = = = = = = = = = = = = = = = =');
    console.log('Use esbuild-loader instead of ts-loader');
    console.log('= = = = = = = = = = = = = = = = = = =');
}

module.exports = config;