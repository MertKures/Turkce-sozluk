const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const htmlWebpackMinifyProperty = {
    html5: true,
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
    minifyURLs: false,
    removeComments: true, // false for Vue SSR to find app placeholder
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributese: true,
    useShortDoctype: true,
    caseSensitive: true
};

//relative to ${process.cwd()}/src/
const copyWebpackPluginOptions = new CopyWebpackPlugin({
    patterns: [
        {
            from: './**/*',
            to: '../dist',
            globOptions: {
                ignore: ['**/node_modules/*', '**/template.html']
            },
            toType: 'dir'
        },
        {
            from: '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
            to: '../dist/browser-polyfill.min.js',
            toType: 'file'
        }
    ]
});

//relative to output.path
const cleanWebpackPluginOptions = new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: './**/*' });

const htmlWebpackPluginOptions = [
    new HtmlWebpackPlugin({
        filename: path.resolve('dist/browserAction/index.html'),
        title: 'Popup',
        minify: htmlWebpackMinifyProperty,
        template: path.resolve('src/browserAction/template.html')
    }),
    new HtmlWebpackPlugin({
        filename: path.resolve('dist/options/index.html'),
        title: 'Options',
        minify: htmlWebpackMinifyProperty,
        template: path.resolve('src/options/template.html')
    })
];

const moduleExports = {
    context: path.resolve('src'),
    output: {
        path: path.resolve('dist')
    },
    entry: {},
    mode: 'production',
    plugins: [copyWebpackPluginOptions, cleanWebpackPluginOptions, ...htmlWebpackPluginOptions],
    optimization: {
        minimize: true
    }
};

module.exports = moduleExports;