import { ShaderMaterial } from 'three'

const vertexShader = [
	'uniform sampler2D tDiffuse;',
	'uniform float granularity;',
	'varying vec2 vUv;',

	'void main() {',
		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
	'}'
].join('\n')

const fragmentShader = [
	'uniform sampler2D tDiffuse;',
	'uniform float granularity;',
	'varying vec2 vUv;',

	'void main() {',
		'float fractX = floor(vUv.x * granularity) / granularity;',
		'float fractY = floor(vUv.y * granularity) / granularity;',

		'vec2 newPos = vec2(fractX, fractY);',

		'gl_FragColor = texture2D(tDiffuse, newPos);',
	'}'
].join('\n')

class PixelMaterial extends ShaderMaterial {
	constructor() {
		super({
			uniforms: {
				tDiffuse: { value: null },
				granularity: { value: null }
			},
			vertexShader,
			fragmentShader
		})
	}
}

export default PixelMaterial
