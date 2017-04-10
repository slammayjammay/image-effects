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

		// formula for grayscale. See https://en.wikipedia.org/wiki/Luma_%28video%29
		'float rCoef = 0.2126;',
		'float gCoef = 0.7152;',
		'float bCoef = 0.0722;',

		'float gray = (color.r * rCoef + color.g * gCoef + color.b * bCoef);',

		// gray is the full intensity grayscale. To allow for a spectrum of
		// intensity, find the difference between the two colors and fluctuate
		// between those values
		'vec4 diff = colorDiff(color, gray);',
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
