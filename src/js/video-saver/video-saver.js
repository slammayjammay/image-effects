const { getCurrentWindow } = window.require('electron').remote;
import EventEmitter from 'events';
import { format } from 'url';
import { join } from 'path';
import VideoFrameRenderer from './VideoFrameRenderer';
import CanvasScene from '../CanvasScene';
import execBinary from '../exec-binary';
const { PixelPass, GrayscalePass, BlurPass } = require('../effects');

const browserWindow = getCurrentWindow();

try {
	browserWindow.on('init', async (frames, savePath, passes) => {
		passes = parsePasses(passes);

		const videoFrameRenderer = new VideoFrameRenderer(frames, savePath, passes);
		videoFrameRenderer.on('progress', progress => browserWindow.emit('progress', progress));

		await videoFrameRenderer.render();

		browserWindow.emit('done');
	});

	function parsePasses(passes) {
		return passes.map(objString => {
			let { Constructor, options } = JSON.parse(objString);
			return { Constructor: eval(Constructor), options };
		});
	}
} catch (e) {
	browserWindow.emit('error', e.message);
}
