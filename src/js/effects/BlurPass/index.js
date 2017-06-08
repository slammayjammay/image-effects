import { Vector2, WebGLRenderTarget } from 'three';
import { Pass } from 'postprocessing/build/postprocessing';
import BlurMaterial from './material';

const ITERATION_COUNT = 8;

class BlurPass extends Pass {
	constructor(options = {}) {
		super();

		this.name = 'BlurPass';
		this.needsSwap = true;

		this.options = options;
		this.options.radius = options.radius || 0;
		this.options.resolution = new Vector2(
			this.options.width,
			this.options.height
		);

		this.tempBuffer1 = new WebGLRenderTarget(
			this.options.width,
			this.options.height
		);
		this.tempBuffer2 = new WebGLRenderTarget(
			this.options.width,
			this.options.height
		);

		this.material = new BlurMaterial();
		this.quad.material = this.material;
	}

	render(renderer, readBuffer, writeBuffer) {
		// https://github.com/Jam3/glsl-fast-gaussian-blur
		// according to that demo, approximate larger blurs by performing multiple
		// passes starting with a large radius
		for (let i = 0; i < ITERATION_COUNT; i++) {
			let radius = this.getRadius(i);

			let firstBuffer = i === 0 ? readBuffer : this.tempBuffer1;

			// the final iteration will render to writeBuffer or the screen
			let finalBuffer = this.tempBuffer1;
			if (i === ITERATION_COUNT - 1) {
				finalBuffer = this.renderToScreen ? null : writeBuffer;
			}

			// horizontal blur
			this._render(renderer, firstBuffer, this.tempBuffer2, {
				dir: [1, 0],
				radius
			});

			// vertical blur
			this._render(renderer, this.tempBuffer2, finalBuffer, {
				dir: [0, 1],
				radius
			});
		}

		this.tempBuffer1.dispose();
		this.tempBuffer2.dispose();
	}

	_render(renderer, readBuffer, writeBuffer, { dir, radius }) {
		this.material.uniforms.dir.value = new Vector2(
			dir[0] * radius,
			dir[1] * radius
		);

		this.material.uniforms.resolution.value = this.options.resolution;
		this.material.uniforms.tDiffuse.value = readBuffer.texture;

		renderer.render(this.scene, this.camera, writeBuffer);
	}

	/**
	 * BlurPass performs multiple iterations for large blur radii. It starts with
	 * a large radius, and gradually decreases per iteration.
	 */
	getRadius(iteration) {
		return Math.max(0, this.options.radius - iteration);
	}
}

export { BlurPass };
