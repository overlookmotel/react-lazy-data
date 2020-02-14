/* --------------------
 * react-lazy-data module
 * ESLint config
 * ------------------*/

'use strict';

module.exports = {
	extends: [
		'@overlookmotel/eslint-config-react'
	],
	globals: {
		__DEV__: true
	},
	overrides: [{
		files: './.eslintrc.js',
		extends: [
			'@overlookmotel/eslint-config-node'
		]
	}]
};
