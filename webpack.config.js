const head = {
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

const main = {
	entry: './src/js/index.js',
	target: 'node',
	output: {
		path: __dirname + '/dist',
		publicPath: 'dist/',
		filename: 'main.js'
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

const videoFrameRenderer = {
	entry: './src/js/video-saver/video-saver.js',
	target: 'node',
	output: {
		path: __dirname + `/dist`,
		publicPath: 'dist/',
		filename: 'video-saver.js'
	}
};

module.exports = [head, main, videoFrameRenderer];
