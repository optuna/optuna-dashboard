const webpack = require('webpack');

const externals = [];
var mode = 'development';
if (process.env.NODE_ENV === 'production') {
    mode = 'production';
}
const isDev = mode === 'development';

if (isDev) {
    const _externals = {};
    externals.push(_externals);
}

var config = {
    mode,
    entry: [__dirname + '/dashboard/static/index.tsx'],
    output: {
        path: __dirname + '/dashboard/public/',
        filename: 'bundle.js',
        publicPath: '/public/'
    },
    module: {
        rules: [{
            oneOf: [
                {
                    test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                    loader: require.resolve('url-loader'),
                    options: {
                        limit: 10000,
                        name: 'media/[name].[hash:8].[ext]',
                        publicPath: '/public/'
                    },
                },
                {
                    test: /\.tsx?$/,
                    exclude: [/node_modules/],
                    loader: 'ts-loader',
                    options: {
                        configFile: __dirname + '/tsconfig.json'
                    }
                },
                {
                    test: /\.p?css$/,
                    use: [
                        'style-loader',
                        {
                            loader: require.resolve('css-loader'),
                            options: {
                                importLoaders: 1,
                                sourceMap: isDev
                            },
                        }
                    ]
                },
                {
                    exclude: [/\.(ts|tsx|js)$/, /\.html$/, /\.json$/],
                    loader: require.resolve('file-loader'),
                    options: {
                        name: 'media/[name].[hash:8].[ext]',
                        publicPath: '/public/'
                    }
                }
            ]}]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            'APP_BAR_TITLE': JSON.stringify(process.env.APP_BAR_TITLE || "Optuna Dashboard"),
            'API_ENDPOINT': JSON.stringify(process.env.API_ENDPOINT),
            'URL_PREFIX': JSON.stringify(process.env.API_ENDPOINT || "/dashboard")
        })
    ],
    externals
};

if (isDev) {
    config.devtool = 'source-map';
    console.log('= = = = = = = = = = = = = = = = = = =');
    console.log('DEVELOPMENT BUILD');
    console.log('= = = = = = = = = = = = = = = = = = =');
}

module.exports = config;