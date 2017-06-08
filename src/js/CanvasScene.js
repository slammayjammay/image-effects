const { nativeImage } = window.require('electron');
const { join } = require('path');
import { EffectComposer, RenderPass } from 'postprocessing';
import {
	WebGLRenderer, Scene, OrthographicCamera, Texture, LinearFilter,
	PlaneGeometry, Mesh, MeshBasicMaterial, AmbientLight, Color
} from 'three';
import VideoController from './VideoController';

import { NoPass, PixelPass } from './effects';

class CanvasScene {
	constructor(options) {
		this.options = options;
		// TODO: do some defaulting for this
		// this.options.width = this.options.width;
		// this.options.height = this.options.height;

		// canvas element to display the scene
		this.el = document.createElement('canvas');

		// canvas used for the material
		this.textureEl = document.createElement('canvas');
		this.textureEl.width = this.options.width;
		this.textureEl.height = this.options.height;
		this.textureContext = this.textureEl.getContext('2d');

		// create renderer
		this.renderer = new WebGLRenderer({
			canvas: this.el,
			preserveDrawingBuffer: true // allows for canvas screenshots
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.setSize(this.options.width, this.options.height);

		// create scene
		this.scene = new Scene();

		// create camera
		this.camera = new OrthographicCamera(
			-this.options.width / 2,
			this.options.width / 2,
			this.options.height / 2,
			-this.options.height / 2,
			1,
			1000
		);
		this.camera.position.z = 1;

		// create composer
		// TODO: Investigate: Instantiating a shader pass before instantiating the
		// composer results in some pretty bizarre rendering.
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));

		// create texture
		this.texture = new Texture(this.textureEl);
		this.texture.minFilter = LinearFilter;
		this.texture.magFilter = LinearFilter;

		// add the image mesh
		const geometry = new PlaneGeometry(this.options.width, this.options.height);
		const material = new MeshBasicMaterial({
			color: 0xFFFFFF,
			map: this.texture
		});
		const mesh = new Mesh(geometry, material);
		this.scene.add(mesh);
	}

	loadImage(imagePath) {
		return new Promise((resolve, reject) => {
			let img = document.createElement('img');
			img.src = imagePath;

			const onLoad = () => {
				img.removeEventListener('load', onLoad);
				this.textureContext.drawImage(img, 0, 0);
				this.texture.needsUpdate = true;
				this.render();

				resolve();
			};

			img.addEventListener('load', onLoad);
		});
	}

	async loadVideo(videoPath) {
		this.videoController = new VideoController();
		this.videoEl = await this.videoController.load(videoPath);

		const playVideo = () => {
			this.textureContext.drawImage(this.videoEl, 0, 0);
			this.texture.needsUpdate = true;
			this.render();
		};

		this.videoController.on('draw', playVideo);
		playVideo();

		return Promise.resolve();
	}

	/**
	 * @param {array|object} passes - An object or array of objects containing the
	 * shader pass constructor and options.
	 */
	addPasses(passes) {
		if (!passes || passes.length === 0) {
			return;
		}

		if (!Array.isArray(passes)) {
			passes = [passes];
		}

		passes = passes.map(({ Constructor, options }) => {
			return new Constructor(options);
		});

		passes[passes.length - 1].renderToScreen = true;
		passes.forEach(pass => this.composer.addPass(pass));
	}

	render() {
		this.composer.render();
	}

	screenshot() {
		let dataURL = this.el.toDataURL('image/png', 1);
		return nativeImage.createFromDataURL(dataURL).toPNG();
	}

	setSize(width, height) {
		this.renderer.setSize(width, height);
	}
}

export default CanvasScene;
