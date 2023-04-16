const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

//relative to context (src) folder
const copyWebpackPluginOptions = new CopyWebpackPlugin({
    patterns: [
        {
            from: './**/*',
            to: '../dev',
            globOptions: {
                ignore: ['**/node_modules/*', '**/*.html', '**/*.js']
            },
            toType: 'dir'
        },
        {
            from: '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
            to: '../dev/browser-polyfill.min.js',
            toType: 'file'
        },
        {
            from: '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map',
            to: '../dev/browser-polyfill.min.js.map',
            toType: 'file'
        }
    ]
});

//relative to output.path (clears 'dev' folder)
const cleanWebpackPluginOptions = new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: './**/*' });

const htmlWebpackPluginOptions = [
    new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'dev/popup/index.html'),
        title: 'Popup',
        template: path.resolve(__dirname, 'src/popup/index.html'),
        //Only popup.js loaded to html
        chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'dev/options/index.html'),
        title: 'Options',
        template: path.resolve(__dirname, 'src/options/index.html'),
        //Only options.js loaded to html
        chunks: ['options']
    })
];

const moduleExports = {
    stats: { errorDetails: true },
    context: path.resolve(__dirname, 'src'),
    output: {
        path: path.resolve(__dirname, 'dev'),
        //like options/options.js ...
        filename: '[name]/[name].js'
    },
    resolve: {
        //can be used with require('')
        modules: [path.resolve(__dirname, 'modules/utils.js')],
        alias: {
            'modules/utils.js': path.resolve(__dirname, 'modules/utils.js')
        }
    },
    entry: {
        options: path.resolve(__dirname, 'src/options/options.js'),
        popup: path.resolve(__dirname, 'src/popup/popup.js'),
        background: path.resolve(__dirname, 'src/background/background.js'),
        content: path.resolve(__dirname, 'src/content/content.js')
    },
    //prevents csp (Content Security Policy) error in background.js by not using eval()
    devtool: 'inline-cheap-module-source-map',
    mode: 'development',
    plugins: [copyWebpackPluginOptions, cleanWebpackPluginOptions, ...htmlWebpackPluginOptions],
    module:
    {
        rules: [
            {
                loader: 'babel-loader',
                exclude: /node_modules/,
                test: /\.js$/,
                resolve: {
                    extensions: ['.js']
                }
            }
        ]
    }
};

module.exports = moduleExports;