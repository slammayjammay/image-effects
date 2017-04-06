import os from 'os';
import { join } from 'path';
import { exec } from 'child_process';
const { app } = window.require('electron').remote;

const BINARIES = {
	ffprobe: {
		darwin: './assets/darwin/ffmpeg/3.2.4/bin/ffprobe',
		win32: './assets/win32/ffmpeg-3.2.4-win64-static/bin/ffprobe.exe'
	}
};

export default (command, options, callback) => {
	let binary = BINARIES[command];
	if (!binary) {
		throw new Error(`There is no binary named ${command}`);
	}

	let pathToBinary = binary[os.platform()];
	if (!pathToBinary) {
		throw new Error(`Unrecognized platform ${platform}`);
	}

	command = join(app.getAppPath(), pathToBinary);
	exec(command + ' ' + options, callback);
}
