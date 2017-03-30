import { Pass } from 'postprocessing/build/postprocessing';
import PixelMaterial from './material';

class PixelPass extends Pass {
	constructor(options = {}) {
		super();

		this.options = options;
		this.options.granularity = options.granularity || 4096.0;

		this.name = 'PixelPass';
		this.needsSwap = true;

		this.material = new PixelMaterial();
		this.quad.material = this.material;
	}

	render(renderer, readBuffer, writeBuffer) {
		this.material.uniforms.granularity.value = this.options.granularity;

		this.material.uniforms.tDiffuse.value = readBuffer.texture;
		renderer.render(this.scene, this.camera, this.renderToScreen ? null : writeBuffer);
	}
}

export { PixelPass };
