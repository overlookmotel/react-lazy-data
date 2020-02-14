/* --------------------
 * react-lazy-data module
 * Rollup config
 * ------------------*/

'use strict';

// Modules
const pathJoin = require('path').join,
	nodeResolve = require('@rollup/plugin-node-resolve'),
	commonjs = require('@rollup/plugin-commonjs'),
	babel = require('rollup-plugin-babel'),
	{terser} = require('rollup-plugin-terser'),
	replace = require('@rollup/plugin-replace');

// Exports

const globals = {react: 'React'};

// Build configs
module.exports = [
	makeConfig('cjs', 'production'),
	makeConfig('cjs', 'development'),
	makeConfig('umd', 'production'),
	makeConfig('umd', 'development'),
	makeConfig('esm', 'production'),
	makeConfig('esm', 'development')
];

function makeConfig(format, env) {
	const isProduction = env === 'production',
		isUmd = format === 'umd',
		isEsm = format === 'esm';

	return {
		input: 'src/index.js',
		output: {
			file: `dist/${format}/react-lazy-data${isProduction ? '.min' : ''}.js`,
			name: 'ReactLazyData',
			format,
			// Include all external modules except React in UMD build,
			// include none in CJS + ESM builds
			globals: isUmd ? globals : undefined,
			sourcemap: true
		},
		external: isUmd ? Object.keys(globals) : isExternalModule,
		plugins: [
			babel({
				exclude: /node_modules/,
				sourceMaps: true,
				// require/import runtime helpers (ponyfills) in CJS + ESM builds
				runtimeHelpers: !isUmd,
				plugins: !isUmd
					? [['@babel/transform-runtime', {useESModules: isEsm}]]
					: undefined
			}),
			isUmd ? nodeResolve() : undefined,
			isUmd ? commonjs({include: /node_modules/}) : undefined,
			replace({
				// Set NODE_ENV to strip out __DEV__ code-fenced code in production builds
				'process.env.NODE_ENV': JSON.stringify(env)
			}),
			isProduction ? terser() : undefined
		]
	};
}

function isExternalModule(moduleId) {
	return !moduleId.startsWith('.') && !moduleId.startsWith(pathJoin(__dirname, 'src'));
}
