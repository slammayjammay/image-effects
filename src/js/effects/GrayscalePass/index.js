import { Pass } from 'postprocessing/build/postprocessing';
import GrayscaleMaterial from './material';

class GrayscalePass extends Pass {
	constructor(options = {}) {
		super();

		this.options = options;
		this.options.intensity = this.options.intensity || 0;

		this.name = 'GrayscalePass';
		this.needsSwap = true;

		this.material = new GrayscaleMaterial();
		this.quad.material = this.material;
	}

	render(renderer, readBuffer, writeBuffer) {
		this.material.uniforms.intensity.value = this.options.intensity;

		this.material.uniforms.tDiffuse.value = readBuffer.texture;
		renderer.render(this.scene, this.camera, this.renderToScreen ? null : writeBuffer);
	}
}

export { GrayscalePass };
