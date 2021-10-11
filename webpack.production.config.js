const path = require('path');
const WriteFilePlugin = require('write-file-webpack-plugin');
const flow = require('./package.json').flow;

module.exports = function(env) {
    const config = {
        entry: "./src/index.tsx",
        output: {
            filename: flow.filenames.js,
            path: path.resolve(__dirname, 'build')
        },
        devtool: 'source-map',
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".json"]
        },
        mode: 'production',
        module: {
            rules: [
                { 
                    test: /\.tsx?$/, 
                    loader: "awesome-typescript-loader" 
                },
                { 
                    test: /\.js$/, 
                    enforce: "pre", 
                    loader: "source-map-loader" 
                }
            ]
        },
        externals: {
            "react": "React",
            "react-dom": "ReactDOM"
        },
        plugins: [
            new WriteFilePlugin()
        ],
    }

    return config;
};