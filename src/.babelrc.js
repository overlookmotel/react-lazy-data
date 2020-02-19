/* --------------------
 * react-lazy-data module
 * Babel config
 * ------------------*/

'use strict';

// Exports

module.exports = api => ({
	presets: [
		[
			'@babel/preset-env',
			{
				// Loose mode to reduce ponyfills
				loose: true,
				// If running tests, compile for current Node version
				...(api.env('test') && {targets: {node: 'current'}})
			}
		]
	],
	plugins: [
		// All `for (... of ...) ...` loops are over arrays
		['@babel/plugin-transform-for-of', {assumeArray: true}],

		// Replace `__DEV__` with `process.env.NODE_ENV !== 'production'`
		// and remove error messages from `invariant()` in production mode
		'dev-expression'
	]
});
