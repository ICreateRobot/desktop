const path = require('path');
const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
    target: 'web',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                }
            },
            {
                test: /\.(svg|png|wav|gif|jpg|mp3|woff2|hex)$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'static/assets/',
                    esModule: false
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            importLoaders: 1,
                            localIdentName: '[name]_[local]_[hash:base64:5]',
                            camelCase: true
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    'postcss-import',
                                    'postcss-simple-vars',
                                    'autoprefixer'
                                ]
                            }
                        }
                    }
                ]
            }
        ]
    }
}

module.exports = [
    {
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/gui'),
            filename: 'index.js'
        },
        entry: './src-renderer-webpack/editor/gui/index.jsx',
        plugins: [
            new DefinePlugin({
                'process.env.ROOT': '""'
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'node_modules/scratch-blocks/media',
                        to: 'static/blocks-media/default'
                    },
                    {
                        from: 'node_modules/scratch-blocks/media',
                        to: 'static/blocks-media/high-contrast'
                    },
                    {
                        from: 'node_modules/scratch-gui/src/lib/themes/blocks/high-contrast-media/blocks-media',
                        to: 'static/blocks-media/high-contrast',
                        force: true
                    },
                    {
                        context: 'src-renderer-webpack/editor/gui/',
                        from: '*.html'
                    },

                    { from: path.resolve(__dirname, 'src-static-resourse/assets'), to: path.resolve(__dirname, 'dist-renderer-webpack/editor/assets') },
                    { from: path.resolve(__dirname, 'src-static-resourse/img'), to: path.resolve(__dirname, 'dist-renderer-webpack/editor/img') },
                    { from: path.resolve(__dirname, 'src-static-resourse/js'), to: path.resolve(__dirname, 'dist-renderer-webpack/editor/js') },
                    { from: path.resolve(__dirname, 'src-static-resourse/static'), to: path.resolve(__dirname, 'dist-renderer-webpack/editor/static') },
                    { from: path.resolve(__dirname, 'src-static-resourse/haarcascade_frontalface_default.js'), to: path.resolve(__dirname, 'dist-renderer-webpack/editor') },
                    { from: path.resolve(__dirname, 'src-static-resourse/haarcascade_frontalface_default.js.map'), to: path.resolve(__dirname, 'dist-renderer-webpack/editor') }
                ]
            })
        ],
        resolve: {
            // alias: {
            //     'scratch-gui$': path.resolve(__dirname, 'node_modules/scratch-gui/src/index.js'),
            //     'scratch-render-fonts$': path.resolve(__dirname, 'node_modules/scratch-gui/src/lib/tw-scratch-render-fonts'),
            // }
            symlinks: false,
            alias: {
                'scratch-gui$': path.resolve(__dirname, 'node_modules/scratch-gui/src/index.js'),
                'scratch-render-fonts$': path.resolve(__dirname, 'node_modules/scratch-gui/src/lib/tw-scratch-render-fonts'),
                'react': path.resolve(__dirname, 'node_modules/scratch-gui/node_modules/react'),
                'react-dom': path.resolve(__dirname, 'node_modules/scratch-gui/node_modules/react-dom'),
                '^react(/.*)?$': path.resolve(__dirname, 'node_modules/scratch-gui/node_modules/react$1'),
                '@desktop':path.resolve(__dirname),
            },
            modules: [
                path.resolve(__dirname, 'node_modules/scratch-gui/node_modules'), // 最高优先级
                path.resolve(__dirname, 'node_modules'), // 主项目的 node_modules
                'node_modules' // 默认位置
              ]
        }
    },

    {
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/addons'),
            filename: 'index.js'
        },
        entry: './src-renderer-webpack/editor/addons/index.jsx',
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: 'src-renderer-webpack/editor/addons/',
                        from: '*.html'
                    }
                ]
            })
        ]
    }
];
