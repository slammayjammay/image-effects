// not sure why I need to use window.require
const { remote, nativeImage } = window.require('electron');
const { dialog, app, ipcMain } = remote;

// node modules
import { dirname, basename, extname, join } from 'path';
import { mkdirSync, readdirSync, writeFile } from 'fs';
import { execSync, fork } from 'child_process';

// npm modules
import dat from 'dat-gui';
import { EffectComposer, RenderPass } from 'postprocessing';
import {
	Vector3, Scene, PerspectiveCamera, WebGLRenderer, Texture, TextureLoader,
	PlaneGeometry, BoxGeometry, MeshBasicMaterial, Mesh, AmbientLight,
	NearestFilter, LinearFilter, WebGLRenderTarget
} from 'three';

// relative modules
import VideoController from './VideoController';
import CanvasScene from './CanvasScene';
import ProgressBar from './ProgressBar';
import { PixelPass, GrayscalePass, BlurPass } from './effects';
import execBinary from './exec-binary';
import VideoSaver from './video-saver';

const SUPPORTED_VIDEO_FILES = ['.mp4'];

class ImageEffect {
	constructor() {
		this.body = document.querySelector('body');
		this.selectImageButton = document.querySelector('.select-image');
		this.submitButton = document.querySelector('.submit');

		// load image from electron dialog
		this.selectImageButton.addEventListener('click', this.onSelectImage.bind(this));

		// load file from drag and drop
		this.body.ondragover = () => false;
		this.body.ondragleave = this.body.ondragend = () => false;
		this.body.ondrop = this.onDragDrop.bind(this);

		// save image
		this.submitButton.addEventListener('click', this.onSave.bind(this));
	}

	onSelectImage() {
		this.selectImageButton.removeEventListener('click', this.onSelectImage.bind(this));

		dialog.showOpenDialog(filePaths => {
			let filePath = filePaths[0];
			this.loadFile(filePath);
		});
	}

	onDragDrop(e) {
		let filePath = e.dataTransfer.files[0].path;
		this.loadFile(filePath);

		this.body.ondrop = null;
		return false;
	}

	async loadFile(filePath) {
		this.uploadPath = filePath;
		this.uploadDirectory = dirname(filePath);
		let { width, height } = await this.getImageSize(this.uploadPath);
		this.width = width;
		this.height = height;
		this.isVideo = SUPPORTED_VIDEO_FILES.includes(extname(filePath));

		this.mainScene = new CanvasScene({ width, height });
		this.mainScene.el.classList.add('scene');
		this.body.append(this.mainScene.el);

		this.constrainImageToScreen({ width, height });

		if (this.isVideo) {
			await this.mainScene.loadVideo(filePath);
		} else {
			await this.mainScene.loadImage(filePath);
		}

		this.addPasses();

		this.submitButton.style.display = 'block';
	}

	addPasses() {
		this.gui = new dat.GUI({ width: 350 });

		this.passes = [
			this.addPixelPass(),
			this.addGrayscalePass(),
			this.addBlurPass()
		];

		this.mainScene.addPasses(this.passes);
		this.mainScene.render();
	}

	addPixelPass() {
		this.pixelOptions = { granularity: 2000	};
		this.gui.add(this.pixelOptions, 'granularity').min(3).max(2000).step(5).onChange(() => {
			this.mainScene.render();
		});

		return { Constructor: PixelPass, options: this.pixelOptions };
	}

	addGrayscalePass() {
		this.grayscaleOptions = { intensity: 0 };

		// allows for custom gui message, instead of using the object property string
		let dummyGrayscale = { 'grayscale intensity': this.grayscaleOptions.intensity };

		this.gui.add(dummyGrayscale, 'grayscale intensity').min(0).max(1).onChange(value => {
			this.grayscaleOptions.intensity = value;
			this.mainScene.render();
		});

		return { Constructor: GrayscalePass, options: this.grayscaleOptions };
	}

	addBlurPass() {
		this.blurOptions = {
			width: this.width,
			height: this.height,
			radius: 0
		};

		let dummyBlur = { 'blur radius': this.blurOptions.radius }; // change gui message
		this.gui.add(dummyBlur, 'blur radius').min(0).max(8).onChange(value => {
			this.blurOptions.radius = value;
			this.mainScene.render();
		});

		return { Constructor: BlurPass, options: this.blurOptions };
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

	constrainImageToScreen({ width, height }) {
		let imageAspect = width / height;
		let viewportAspect = window.innerWidth / window.innerHeight;

		let renderWidth, renderHeight;
		if (imageAspect >= viewportAspect) {
			[renderWidth, renderHeight] = [innerWidth, innerWidth / imageAspect];
		} else {
			[renderWidth, renderHeight] = [innerHeight * imageAspect, innerHeight];
		}

		this.mainScene.setSize(renderWidth, renderHeight);
	}

	onSave() {
		if (this.isVideo) {
			this.saveVideo();
		} else {
			this.saveImage();
		}
	}

	saveImage() {
		let image = this.mainScene.screenshot();

		let filename = basename(this.uploadPath, extname(this.uploadPath));
		const defaultPath = join(this.uploadDirectory, `${filename}-effected.png`);

		// save image
		dialog.showSaveDialog({ defaultPath }, selectedFilename => {
			writeFile(selectedFilename, image, err => {
				if (err) {
					throw err;
				}
			});
		});
	}

	/**
	 * Slow. First save all video frames to a temp directory. Then render multiple
	 * frames to their own canvas, and save all frames to disk. Create a video
	 * from the new frames.
	 */
	async saveVideo() {
		this.progressBar = new ProgressBar();
		this.progressBar.hide();

		let filename = basename(this.uploadPath, extname(this.uploadPath));
		const defaultPath = join(this.uploadDirectory, `${filename}-effected.mp4`);

		const savePath = await new Promise(resolve => {
			dialog.showSaveDialog({ defaultPath }, selectedFilename => {
				resolve(selectedFilename);
			});
		});

		this.progressBar.show();

		const videoSaver = new VideoSaver(this.uploadPath, savePath, this.passes);
		videoSaver.on('progress', progress => this.progressBar.update(progress));

		videoSaver.on('extracting', () => this.progressBar.text('Extracting video frames...'));
		videoSaver.on('rendering', () => this.progressBar.text('Rendering video frames...'));
		videoSaver.on('creating', () => this.progressBar.text('Creating video...'));

		videoSaver.on('done', () => {
			this.progressBar.text('Done!');
			setTimeout(() => this.progressBar.hide(), 2000);
		});

		videoSaver.save();
	}
}

export default ImageEffect;
