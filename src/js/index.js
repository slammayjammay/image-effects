// not sure why I need to use window.require
const { remote, nativeImage } = window.require('electron');
const { dialog } = remote;

import { basename, extname, join } from 'path';
import fs from 'fs';
import imageSize from 'image-size';
import ffmpeg from 'fluent-ffmpeg';
import {
	Vector3,
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	Texture,
	TextureLoader,
	PlaneGeometry,
	BoxGeometry,
	MeshBasicMaterial,
	Mesh,
	AmbientLight,
	LinearFilter
} from 'three';
import { EffectComposer, RenderPass } from 'postprocessing';
import { PixelPass } from './effects';

// ==================================================
// "global" variables
// ==================================================
let scene, camera, renderer, composer, gui;

// ==================================================
// DOM els
// ==================================================
const body = document.querySelector('body');
const canvas = document.querySelector('.canvas');
const selectImageButton = document.querySelector('.select-image');
const submitButton = document.querySelector('.submit');

// ==================================================
// Event listeners
// ==================================================
// load image from electron dialog...
selectImageButton.addEventListener('click', () => {
	dialog.showOpenDialog(filePaths => {
		let filePath = filePaths[0];
		buildCanvas(filePath);
	});
});

// ...or load image from a file drop
body.ondragover = () => false;
body.ondragleave = body.ondragend = () => false;
body.ondrop = e => {
	let filePath = e.dataTransfer.files[0].path;
	buildCanvas(filePath);

	return false;
}

// ==================================================
// Helper Functions
// ==================================================

// loads image, loads texture, creates threejs scene
async function buildCanvas(filePath) {
	selectImageButton.style.display = 'none';

	await loadFile(filePath);
	addEffectControls();

	renderer.render(scene, camera);
	composer.render();

	// show submit button once everything is ready
	submitButton.style.display = 'block';

	// on submit, save image
	submitButton.addEventListener('click', () => {
		saveImage(filePath);
	});
}

// loads texture and creates scene (canvas dimensions dependent on image)
async function loadFile(filePath) {
	let { imgWidth, imgHeight } = await getImageSize(filePath);
	let imageAspect = imgWidth / imgHeight;

	let imageToDraw;

	if (['.mp4'].includes(extname(filePath))) {
		imageToDraw = await loadVideo(filePath);
		imageToDraw.loop = true;
		imageToDraw.play();

		// play the video
		const animate = () => {
			requestAnimationFrame(animate);
			canvasContext.drawImage(imageToDraw, 0, 0);
			texture.needsUpdate = true;
			composer.render(scene, camera)
		};
		requestAnimationFrame(animate);
	} else {
		imageToDraw = await loadImage(filePath);
	}

	// create canvas (to be used as texture later)
	let canvasEl = document.createElement('canvas');
	canvasEl.width = imgWidth;
	canvasEl.height = imgHeight;

	// draw the image or video on the canvas
	let canvasContext = canvasEl.getContext('2d');
	// canvasContext.fillStyle = '#000000';
	// canvasContext.fillRect(0, 0, imgWidth, imgHeight);
	canvasContext.drawImage(imageToDraw, 0, 0);

	let texture = new Texture(canvasEl);
	texture.needsUpdate = true;
	texture.minFilter = LinearFilter;
	texture.magFilter = LinearFilter;

	initScene(imgWidth, imgHeight);

	// create mesh
	let geometry = new PlaneGeometry(imgWidth, imgHeight);
	let material = new MeshBasicMaterial({
		color: 0xFFFFFF,
		map: texture
	});
	let mesh = new Mesh(geometry, material);
	mesh.position.set(0, 0, 0);
	scene.add(mesh);

	// ambient light
	scene.add(new AmbientLight(0xFFFFFF));

	return Promise.resolve();
};

function getImageSize(filePath) {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(filePath, (err, data) => {
			err && console.error(err);

			resolve({
				imgWidth: data.streams[0].width,
				imgHeight: data.streams[0].height
			});
		});
	});
}

// create threejs scene
function initScene(imgWidth, imgHeight) {
	let viewportAspect = window.innerWidth / window.innerHeight;
	let imageAspect = imgWidth / imgHeight;

	scene = new Scene();

	renderer = new WebGLRenderer({
		canvas: canvas,
		preserveDrawingBuffer: true // allows for canvas screenshots
	});
	renderer.setPixelRatio(window.devicePixelRatio);

	// contain image inside viewport
	let renderWidth, renderHeight;
	if (imageAspect >= viewportAspect) {
		[renderWidth, renderHeight] = [innerWidth, innerWidth / imageAspect];
	} else {
		[renderWidth, renderHeight] = [innerHeight * imageAspect, innerHeight];
	}
	renderer.setSize(renderWidth, renderHeight);

	// init camera
	let dist = 450; // magic numbers
	let fov = 2 * Math.atan((imgWidth / imageAspect) / (2 * dist)) * (180 / Math.PI); // mega sorcery
	camera = new PerspectiveCamera(fov, imageAspect, 1, 10000);
	camera.position.z = dist;
	camera.lookAt(new Vector3(0, 0, 0));
}

// promise wrapper for loading a video element
function loadVideo(filePath) {
	return new Promise((resolve, reject) => {
		let videoEl = document.createElement('video');
		videoEl.src = filePath;
		videoEl.load();
		videoEl.addEventListener('canplay', () => resolve(videoEl));
	});
}

// promise wrapper for loading an image element
function loadImage(filePath) {
	return new Promise((resolve, reject) => {
		let imageEl = document.createElement('img');
		imageEl.src = filePath;
		imageEl.addEventListener('load', () => resolve(imageEl));
	});
}

// adds any image effects and their gui controls
function addEffectControls() {
	composer = new EffectComposer(renderer);

	// create options for effects
	let pixelOptions = { granularity: 150	};

	// create effects
	let passes = [
		new RenderPass(scene, camera),
		new PixelPass(pixelOptions)
	]

	// add in each effect
	for (let i = 0; i < passes.length; i++) {
		if (i === passes.length - 1) {
			passes[i].renderToScreen = true;
		}
		composer.addPass(passes[i]);
	}

	gui = new dat.GUI({
		height: (passes.length - 1) * 32 - 1
	});

	// add pixelation controls
	gui.add(pixelOptions, 'granularity').min(10).max(4096).step(5).onChange(() => {
		composer.render();
	});
}

// saves image
function saveImage(filePath) {
	// get image from canvas
	let dataURL = canvas.toDataURL('image/png', 1);
	let image = nativeImage.createFromDataURL(dataURL).toPNG();

	// append "-effected" to original file name
	let ext = extname(filePath);
	let filename = basename(filePath, ext);
	filename += '-effected.png';

	// save image
	dialog.showSaveDialog({ defaultPath: filename }, filename => {
		fs.writeFile(filename, image, err => {
			if (err) {
				throw err;
			}

			remote.getCurrentWindow().close();
		});
	});
}
