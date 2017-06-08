const { app, BrowserWindow } = require('electron');
const { join } = require('path');
const { format } = require('url');

let win;

const createWindow = () => {
	win = new BrowserWindow({ width: 1200, height: 800 });

	win.loadURL(format({
		pathname: join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

	win.on('closed', () => win = null);
};

// start
app.on('ready', createWindow);

// close
app.on('windows-all-closed', () => process.platform !== 'darwin' && app.quit());

// some mac shit
app.on('activate', () => win === null && createWindow());
