/* --------------------
 * react-lazy-data module
 * Tests Babel config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				// Loose mode to reduce ponyfills
				loose: true,
				// Compile for current Node version
				targets: {node: 'current'}
			}
		],
		'@babel/react'
	]
};
