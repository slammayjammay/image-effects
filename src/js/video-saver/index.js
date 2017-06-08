const { remote } = window.require('electron');
const { BrowserWindow, app, ipcMain } = remote;
import EventEmitter from 'events';
import { mkdirSync, readdirSync, writeFile } from 'fs';
import { format } from 'url';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import execBinary from '../exec-binary';
import CanvasScene from '../CanvasScene';

class VideoSaver extends EventEmitter {
	constructor(videoPath, destPath) {
		super();

		this.videoPath = videoPath;
		this.destPath = destPath;
	}

	addPasses(passes) {
		this.passes = passes;
	}

	createWindow() {
		this.window = new BrowserWindow({ show: false });
		this.window.on('closed', () => this.window = null);
	}

	async save(destPath) {
		this.createWindow();

		const { width, height } = await this.getImageSize(this.videoPath);
		this.width = width;
		this.height = height;

		const tmpPath = join(dirname(this.videoPath), `${Date.now()}`);
		const originalFramesPath = `${tmpPath}/original`;
		const renderedFramesPath = `${tmpPath}/affected`;

		[tmpPath, originalFramesPath, renderedFramesPath].forEach(p => mkdirSync(p));

		this.emit('extracting');
		await this.extractVideoFrames(this.videoPath, originalFramesPath);

		this.emit('rendering');
		await this.renderVideoFrames(originalFramesPath, renderedFramesPath);

		this.emit('creating');
		await this.createVideo(renderedFramesPath, this.destPath);

		execSync(`rm -rf ${tmpPath}`);
		this.emit('done');

		return Promise.resolve();
	}

	async countVideoFrames(videoPath) {
		let command = 'ffprobe';
		let options = `-v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nokey=1:noprint_wrappers=1 ${videoPath}`;
		const frameCount = await execBinary(command, options);

		return parseInt(frameCount, 10);
	}

	async extractVideoFrames(videoPath, savePath) {
		const frameCount = await this.countVideoFrames(this.videoPath);

		let command = 'ffmpeg';
		let options = `-i ${videoPath} ${savePath}/frame%05d.png`;
		let child = execBinary(command, options, { returnProcess: true });

		// show progress
		const regex = /frame=\s*(\d+)/;

		child.stderr.on('data', data => {
			data = data.toString();
			let result = regex.exec(data);

			if (!result) {
				return;
			}

			let progress = parseInt(result[1], 10) / frameCount;
			this.emit('progress', progress);
		});

		return new Promise(resolve => child.stderr.on('close', resolve));
	}

	async renderVideoFrames(framesPath, savePath) {
		const NUM_CANVASES = 5; // better than both 4 and 6
		const start = new Date();

		let frames = readdirSync(framesPath);

		// create multiple canvases to render each frame
		let frameCanvases = this._createFrameCanvases(NUM_CANVASES);
		let promises = frameCanvases.map(() => Promise.resolve());

		let currentFrameIdx = 0, savedFrameIdx = 0;
		let currentCanvasIdx = 0;

		await new Promise(async doneRenderingFrames => {
			let done = false;
			while (!done) {
				let frame = frames[currentFrameIdx];
				let promise = promises[currentCanvasIdx];
				let frameCanvas = frameCanvases[currentCanvasIdx];

				if (!frame) {
					done = true;
					await Promise.all(promises);
					doneRenderingFrames();
					break;
				}

				promises[currentCanvasIdx] = promise.then(async () => {
					await frameCanvas.loadImage(`${framesPath}/${frame}`);

					const image = frameCanvas.screenshot();
					const frameSavePath = `${savePath}/${frame}`;

					await this.saveVideoFrame(image, frameSavePath);
					savedFrameIdx += 1;
				});

				currentCanvasIdx = (currentCanvasIdx + 1) % NUM_CANVASES;
				currentFrameIdx += 1;

				let progress = savedFrameIdx / frames.length;
				this.emit('progress', progress);

				await Promise.all(promises);
			}
		});

		const end = new Date();
		console.log(end - start);

		return Promise.resolve();
	}

	_createFrameCanvases(num = 1) {
		let canvases = [];

		for (let i = 0; i < num; i++) {
			let frameCanvas = new CanvasScene({ width: this.width, height: this.height });
			frameCanvas.addPasses(this.passes);
			canvases.push(frameCanvas);
		}

		return canvases;
	}

	async saveVideoFrame(image, filename) {
		return new Promise(resolve => {
			writeFile(filename, image, err => {
				if (err) {
					throw err;
				}
				resolve();
			});
		});
	}

	createVideo(framesPath, savePath) {
		// turn frames into video
		let command = 'ffmpeg';
		let options = `-i ${framesPath}/frame%05d.png -c:v libx264 -vf fps=25 -pix_fmt yuv420p ${savePath} -y`;
		return execBinary(command, options);
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

	close() {
		this.window.close();
	}
}

export default VideoSaver;
