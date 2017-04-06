import { ShaderMaterial } from 'three';

const vertexShader = [
	'uniform sampler2D tDiffuse;',
	'uniform float intensity;',
	'varying vec2 vUv;',

	'void main() {',
		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
	'}'
].join('\n');

const fragmentShader = [
	'uniform sampler2D tDiffuse;',
	'uniform float intensity;',
	'varying vec2 vUv;',

	'vec4 colorDiff(vec4 color, float brightness) {',
		'return vec4(',
			'color.r - brightness,',
			'color.g - brightness,',
			'color.b - brightness,',
			'color.a',
		');',
	'}',

	'void main() {',
		'vec4 color = texture2D(tDiffuse, vUv);',

		// magic grayscale
		'float brightness = (color.r * 3.0 + color.g * 4.0 + color.b);',
		'brightness = brightness * pow(0.5, 3.0);',

		// brightness is the new color for r, g, b. Get the diff between each
		// color's current value and brightness (full intensity grayscale),
		// multiply it by intensity, then subtract it from the original color. It
		// seems to work well.
		'vec4 diff = colorDiff(color, brightness);',
		'vec4 newColor = color - diff * intensity;',

		'gl_FragColor = newColor;',
	'}'
].join('\n');

class GrayscaleMaterial extends ShaderMaterial {
	constructor() {
		super({
			uniforms: {
				tDiffuse: { value: null },
				intensity: { value: null }
			},
			vertexShader,
			fragmentShader
		});
	}
}

export default GrayscaleMaterial;
