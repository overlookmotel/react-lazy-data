/* --------------------
 * react-lazy-data module
 * Tests Babel config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	presets: [
		// Compile for current Node version
		['@babel/preset-env', {targets: {node: 'current'}}],
		'@babel/preset-react'
	]
};
