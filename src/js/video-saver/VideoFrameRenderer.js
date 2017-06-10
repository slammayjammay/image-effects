import EventEmitter from 'events';
import { writeFile } from 'fs';
import { format } from 'url';
import { join, basename } from 'path';
import CanvasScene from '../CanvasScene';
import execBinary from '../exec-binary';

// I don't actually know if increasing this number decreases rendering time
const NUM_CANVASES = 2;

class VideoFrameRenderer extends EventEmitter {
	/**
	 * Takes an array of video frames, renders the passes, and returns an array
	 * of the rendered video frames.
	 *
	 * @param {array} frames - An array of video frames' filenames.
	 * @param {array|ShaderPass} passes - The shader passes to render to each frame.
	 */
	constructor(frames, savePath, passes = []) {
		super();

		this.frames = frames;
		this.savePath = savePath;
		this.passes = [];
		this.renderedFrames = [];

		this.addPasses(passes);
	}

	/**
	 * @param {array|ShaderPass} passes - The shader passes to render to each frame.
	 */
	addPasses(passes) {
		if (!Array.isArray(passes)) {
			passes = [passes];
		}

		this.passes.push(...passes);
	}

	async render() {
		const { width, height } = await this.getImageSize(this.frames[0]);
		this.width = width;
		this.height = height;

		// create multiple canvases to render each frame
		const canvasScenes = this._createCanvasScenes(NUM_CANVASES);
		const promises = canvasScenes.map(() => Promise.resolve());

		let currentFrameIdx = 0, savedFrameIdx = 0;
		let currentCanvasIdx = 0;

		await new Promise(async doneRenderingFrames => {
			let done = false;

			while (!done) {
				let frame = this.frames[currentFrameIdx];
				let promise = promises[currentCanvasIdx];
				let frameCanvas = canvasScenes[currentCanvasIdx];

				if (!frame) {
					done = true;
					await Promise.all(promises);
					doneRenderingFrames();
					break;
				}

				promises[currentCanvasIdx] = promise.then(async () => {
					await frameCanvas.loadImage(frame);

					const image = frameCanvas.screenshot();
					this.saveFrame(basename(frame), image);

					savedFrameIdx += 1;
				});

				currentCanvasIdx = (currentCanvasIdx + 1) % NUM_CANVASES;
				currentFrameIdx += 1;

				let progress = savedFrameIdx / this.frames.length;
				this.emit('progress', progress);

				await Promise.all(promises);
			}
		});

		return Promise.resolve();
	}

	_createCanvasScenes(num = 1) {
		let canvasScenes = [];

		for (let i = 0; i < num; i++) {
			let canvasScene = new CanvasScene({ width: this.width, height: this.height });
			canvasScene.addPasses(this.passes);
			canvasScenes.push(canvasScene);
		}

		return canvasScenes;
	}

	// TODO: put this in some utils file
	getImageSize(filePath) {
		return new Promise((resolve, reject) => {
			let command = 'ffprobe';
			let options = `-v error -show_entries stream=width,height -of default=noprint_wrappers=1 ${filePath}`;

			execBinary(command, options).then(data => {
				let output = data.toString();
				let regex = /width=(\d+)\s*height=(\d+)/;
				let [_, width, height] = regex.exec(output);

				resolve({ width: parseInt(width), height: parseInt(height) });
			}).catch(err => {
				if (err) {
					throw err;
				}
			});
		});
	}

	saveFrame(filename, image) {
		const savePath = join(this.savePath, filename);

		writeFile(savePath, image, err => {
			if (err) {
				throw err;
			}
		});
	}
}

export default VideoFrameRenderer;
