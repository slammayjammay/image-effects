const { BrowserWindow, app, ipcMain } = window.require('electron').remote;
import EventEmitter from 'events';
import { mkdirSync, readdirSync, writeFile } from 'fs';
import { format } from 'url';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import execBinary from '../exec-binary';
import CanvasScene from '../CanvasScene';

const NUM_PROCESSES = 4;

class VideoSaver extends EventEmitter {
	constructor(videoPath, savePath, passes = []) {
		super();

		this.videoPath = videoPath;
		this.savePath = savePath;
		this.passes = passes;
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

	async save() {
		const tmpPath = join(dirname(this.videoPath), `${Date.now()}`);
		const originalFramesPath = `${tmpPath}/original`;
		const renderedFramesPath = `${tmpPath}/affected`;

		[tmpPath, originalFramesPath, renderedFramesPath].forEach(p => mkdirSync(p));

		this.emit('extracting');
		await this.extractVideoFrames(this.videoPath, originalFramesPath);

		this.emit('rendering');

		// get absolute paths of video frames
		const videoFrames = readdirSync(originalFramesPath).map(filename => {
			return join(originalFramesPath, filename);
		});

		const chunks = this.splitEvenly(videoFrames, NUM_PROCESSES);
		this.createBackgroundProcesses(NUM_PROCESSES);

		this.getProcesses().forEach((process, idx) => {
			const chunk = chunks[idx];

			process.browserWindow.webContents.on('did-finish-load', () => {
				process.browserWindow.emit('init', chunk, renderedFramesPath, this.stringifyPasses());
			});

			process.browserWindow.on('progress', progress => process.progress = progress);

			process.browserWindow.on('done', async () => {
				this.processes[process.browserWindow.id] = null;
				process.browserWindow.close();

				if (this.isDone()) {
					this.emit('creating');
					await this.createVideo(renderedFramesPath, this.savePath);

					exec(`rm -rf ${tmpPath}`);
					this.emit('done');
				}
			});
		});

		const firstProcess = this.getProcesses()[0];
		firstProcess.browserWindow.on('progress', () => this.onProgress());
	}

	/**
	 * Segments an array in to smaller arrays, where each sub-array has The
	 * same length as the others (except possibly the last sub-array). Returns an
	 * array of all the sub-arrays.
	 *
	 * @param {array} array - The array to segment.
	 * @param {number} numSegments - The number of segments to separate into.
	 * @return {array}
	 */
	splitEvenly(array, numSegments) {
		const subArrays = [];
		const segmentLength = ~~(array.length / numSegments);

		let startPos, endPos;

		for (let i = 0; i < numSegments; i++) {
			startPos = i * segmentLength;
			endPos = startPos + segmentLength;

			let subArray = array.slice(i * segmentLength, endPos);
			subArrays.push(subArray);
		}

		subArrays[0].push(...array.slice(endPos));

		return subArrays;
	}

	createBackgroundProcesses(num = 1) {
		this.processes = {};

		for (let i = 0; i < num; i++) {
			const browserWindow = new BrowserWindow({ show: true });
			browserWindow.loadURL(format({
				pathname: join(app.getAppPath(), './video-saver.html'),
				protocol: 'file:',
				slashes: true
			}));

			browserWindow.webContents.openDevTools();

			browserWindow.on('error', message => {
				throw message;
			});

			this.processes[browserWindow.id] = {
				browserWindow,
				progress: 0
			};
		}
	}

	getProcesses() {
		return Object.keys(this.processes).map(id => this.processes[id]);
	}

	onProgress() {
		let totalProgress = 0;
		let processes = this.getProcesses();
		processes.forEach(process => {
			if (!process) {
				return;
			}

			totalProgress += process.progress;
		});

		totalProgress /= processes.length;

		this.emit('progress', totalProgress);
	}

	isDone() {
		return this.getProcesses().every(process => process === null);
	}

	stringifyPasses() {
		return this.passes.map(({ Constructor, options }) => {
			return JSON.stringify({
				Constructor: Constructor.name,
				options
			});
		});
	}

	async countVideoFrames(videoPath) {
		let command = 'ffprobe';
		let options = `-v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nokey=1:noprint_wrappers=1 ${videoPath}`;
		const frameCount = await execBinary(command, options);

		return parseInt(frameCount, 10);
	}

	async extractVideoFrames(videoPath, savePath) {
		const frameCount = await this.countVideoFrames(videoPath);

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

	createVideo(framesPath, savePath) {
		const command = 'ffmpeg';
		const options = `-i ${framesPath}/frame%05d.png -c:v libx264 -vf fps=25 -pix_fmt yuv420p ${savePath} -y`;
		return execBinary(command, options);
	}
}

export default VideoSaver;
