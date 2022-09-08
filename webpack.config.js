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

//relative to context (src) folder
const copyWebpackPluginOptions = new CopyWebpackPlugin({
    patterns: [
        {
            from: './**/*',
            to: '../dist',
            globOptions: {
                ignore: ['**/node_modules/*', '**/*.html', '**/*.js']
            },
            toType: 'dir'
        },
        {
            from: '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
            to: '../dist/browser-polyfill.min.js',
            toType: 'file'
        },
        {
            from: '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map',
            to: '../dist/browser-polyfill.min.js.map',
            toType: 'file'
        }
    ]
});

//relative to output.path (clears 'dist' folder)
const cleanWebpackPluginOptions = new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: './**/*' });

const htmlWebpackPluginOptions = [
    new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'dist/popup/index.html'),
        title: 'Popup',
        template: path.resolve(__dirname, 'src/popup/index.html'),
        //Only popup.js loaded to html
        chunks: ["popup"],
        minify: htmlWebpackMinifyProperty
    }),
    new HtmlWebpackPlugin({
        filename: path.resolve(__dirname, 'dist/options/index.html'),
        title: 'Options',
        template: path.resolve(__dirname, 'src/options/index.html'),
        //Only options.js loaded to html
        chunks: ["options"],
        minify: htmlWebpackMinifyProperty
    })
];

const moduleExports = {
    context: path.resolve(__dirname, 'src'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        //like options/options.js ...
        filename: "[name]/[name].js"
    },
    resolve: {
        //can be used with require('')
        modules: [path.resolve(__dirname, 'modules/utils.js')]
    },
    entry: {
        options: path.resolve(__dirname, 'src/options/options.js'),
        popup: path.resolve(__dirname, 'src/popup/popup.js'),
        background: path.resolve(__dirname, 'src/background/background.js'),
        content: path.resolve(__dirname, 'src/content/content.js')
    },
    mode: 'production',
    plugins: [copyWebpackPluginOptions, cleanWebpackPluginOptions, ...htmlWebpackPluginOptions],
    module:
    {
        rules: [
            {
                loader: "babel-loader",
                exclude: /node_modules/,
                test: /\.js$/,
                resolve: {
                    extensions: [".js"]
                }
            }
        ]
    }
};

module.exports = moduleExports;