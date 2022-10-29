const path = require('path');
const RemovePlugin = require('remove-files-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = ({ mode }) => ({
    ...(mode === 'development'
        ? {
              devtool: 'source-map',
              watch: true,
              mode: 'development',
          }
        : {
            mode: 'production',
          }),
    entry: {
        main: './src/main.tsx',
    },
    output: {
        publicPath: '',
        path: path.join(__dirname, 'docs'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: (resourcePath, context) => {
                                return (
                                    path.relative(
                                        path.dirname(resourcePath),
                                        context
                                    ) + '/'
                                );
                            },
                        },
                    },
                    'css-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
        new RemovePlugin({
            before: {
                include: [
                    './docs/main.css',
                    './docs/main.css.map',
                    './docs/main.js',
                    './docs/main.js.LICENSE.txt',
                    './docs/main.js.map'
                ],
            },
        }),
    ],
});
