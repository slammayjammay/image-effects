import os from 'os';
import { join } from 'path';
import { exec, spawn } from 'child_process';
const { app } = window.require('electron').remote;

const BINARIES = {
	ffprobe: {
		darwin: './assets/darwin/ffmpeg/3.2.4/bin/ffprobe',
		win32: './assets/win32/ffmpeg-3.2.4-win64-static/bin/ffprobe.exe'
	},
	ffmpeg: {
		darwin: './assets/darwin/ffmpeg/3.2.4/bin/ffmpeg'
	}
};

export default (command, commandOptions, options = {}) => {
	let binary = BINARIES[command];
	if (!binary) {
		throw new Error(`There is no binary named ${command}`);
	}

	let pathToBinary = binary[os.platform()];
	if (!pathToBinary) {
		throw new Error(`Unrecognized platform ${platform}`);
	}

	command = join(app.getAppPath(), pathToBinary);

	if (options.returnProcess) {
		return spawn(command, commandOptions.split(' '));
	}

	return new Promise((resolve, reject) => {
		exec(command + ' ' + commandOptions, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}
