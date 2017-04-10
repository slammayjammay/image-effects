const headJS = {
	entry: './src/js/head.js',
	output: {
		path: __dirname + '/dist',
		publicPath: 'dist/',
		filename: 'head.js'
	},
	module: {
		loaders: [
			{
				test: /\.scss$/,
				use: [
					{ loader: 'style-loader' },
					{ loader: 'css-loader' },
					{ loader: 'sass-loader' }
				]
			},
			{
				test: /\.(jpg|png)$/,
				loader: 'url-loader'
			}
		]
	}
};

const mainJS = {
	entry: './src/js/index.js',
	target: 'node',
	output: {
		path: __dirname + '/dist',
		publicPath: 'dist/',
		filename: 'built.js'
	},
	module: {
		loaders: [
			{
				test: /\.scss$/,
				use: [
					{ loader: 'style-loader' },
					{ loader: 'css-loader' },
					{ loader: 'sass-loader' }
				]
			},
			{
				test: /(\.frag|\.vert)/,
				loader: 'raw-loader'
			},
			{
				test: /\.(jpg|png)$/,
				loader: 'url-loader'
			}
		]
	}
};

module.exports = [headJS, mainJS];
