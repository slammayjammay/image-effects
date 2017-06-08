import { ShaderMaterial } from 'three';

const vertexShader = [
	'uniform sampler2D tDiffuse;',
	'uniform vec2 resolution;',
	'uniform vec2 dir;',
	'varying vec2 vUv;',

	'void main() {',
		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
	'}'
].join('\n');

const fragmentShader = [
	'uniform sampler2D tDiffuse;',
	'uniform vec2 resolution;',
	'uniform vec2 dir;',
	'varying vec2 vUv;',

	'vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {',
	  'vec4 color = vec4(0.0);',
	  'vec2 off1 = vec2(1.3846153846) * direction;',
	  'vec2 off2 = vec2(3.2307692308) * direction;',
	  'color += texture2D(image, uv) * 0.2270270270;',
	  'color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;',
	  'color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;',
	  'color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;',
	  'color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;',
	  'return color;',
	'}',

	'void main() {',
		'vec4 color = blur9(tDiffuse, vUv, resolution, dir);',
		'gl_FragColor = color;',
	'}'
].join('\n');

class BlurMaterial extends ShaderMaterial {
	constructor() {
		super({
			uniforms: {
				tDiffuse: { value: null },
				resolution: { value: null },
				dir: { value: null }
			},
			vertexShader,
			fragmentShader
		});
	}
}

export default BlurMaterial;
