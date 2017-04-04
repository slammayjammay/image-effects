import { join } from 'path';
import { exec } from 'child_process';
const { app } = window.require('electron').remote;

const COMMANDS = {
	ffprobe: join(app.getAppPath(), './assets/ffmpeg/3.2.4/bin/ffprobe')
};

export default (command, options, callback) => {
	if (!COMMANDS[command]) {
		throw new Error(`There is no binary named ${command}`);
	}

	command = COMMANDS[command];
	exec(command + ' ' + options, callback);
}
