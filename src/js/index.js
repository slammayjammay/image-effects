// not sure why I need to use window.require
const { remote, nativeImage } = window.require('electron');
const { dialog } = remote;

import { basename, extname } from 'path';
import fs from 'fs';
import imageSize from 'image-size';
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
	AmbientLight
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
	let imagePath = e.dataTransfer.files[0].path;
	buildCanvas(imagePath);

	return false;
}

// ==================================================
// Helper Functions
// ==================================================

// loads image, loads texture, creates threejs scene
async function buildCanvas(imagePath) {
	selectImageButton.style.display = 'none';

	await loadImage(imagePath);
	addEffectControls();

	renderer.render(scene, camera);
	composer.render();

	// show submit button once everything is ready
	submitButton.style.display = 'block';

	// on submit, save image
	submitButton.addEventListener('click', () => {
		saveImage(imagePath);
	});
}

// loads texture and creates scene (canvas dimensions dependent on image)
async function loadImage(imagePath) {
	let { width: imgWidth, height: imgHeight } = imageSize(imagePath);
	let imageAspect = imgWidth / imgHeight;

	initScene(imgWidth, imgHeight);

	let texture = await loadTexture(imagePath);

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
		[renderWidth, renderHeight] = [innerHeight / imageAspect, innerHeight];
	}
	renderer.setSize(renderWidth, renderHeight);

	// init camera
	let dist = 450; // magic numbers
	let fov = 2 * Math.atan((imgWidth / imageAspect) / (2 * dist)) * (180 / Math.PI); // mega sorcery
	camera = new PerspectiveCamera(fov, imageAspect, 1, 10000);
	camera.position.z = dist;
	camera.lookAt(new Vector3(0, 0, 0));
}

// promise wrapper for threejs's TextureLoader
function loadTexture(imagePath) {
	let loader = new TextureLoader();
	return new Promise((resolve, reject) => {
		loader.load(imagePath, resolve, null, reject);
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
function saveImage(imagePath) {
	// get image from canvas
	let dataURL = canvas.toDataURL('image/png', 1);
	let image = nativeImage.createFromDataURL(dataURL).toPNG();

	// append "-effected" to original file name
	let ext = extname(imagePath);
	let filename = basename(imagePath, ext);
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
